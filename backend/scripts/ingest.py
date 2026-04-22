"""
One-time script to ingest all 6,236 Quran verses with Ibn Kathir tafsir into Supabase.

Usage (from the backend/ directory):
    python scripts/ingest.py

Prerequisites:
    1. Copy .env.example to .env and fill in your keys
    2. Run supabase/migrations/001_verses.sql in the Supabase SQL Editor
    3. pip install -r requirements.txt
"""

import asyncio
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from openai import AsyncOpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
db = create_client(SUPABASE_URL, SUPABASE_KEY)

ALQURAN_BASE = "https://api.alquran.cloud/v1"
TAFSIR_CDN = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir"
TOTAL_SURAHS = 114
EMBED_BATCH = 100
TAFSIR_CONCURRENCY = 10


async def fetch_surah(http: httpx.AsyncClient, n: int) -> dict:
    url = f"{ALQURAN_BASE}/surah/{n}/editions/en.sahih,ar.alquran-uthmani"
    r = await http.get(url)
    r.raise_for_status()
    data = r.json()["data"]
    return {"english": data[0], "arabic": data[1]}


async def fetch_tafsir(http: httpx.AsyncClient, sem: asyncio.Semaphore, surah: int, ayah: int) -> str | None:
    async with sem:
        try:
            r = await http.get(f"{TAFSIR_CDN}/{surah}/{ayah}.json", timeout=10.0)
            if r.status_code == 200:
                return r.json().get("text")
        except Exception:
            pass
    return None


async def embed_batch(texts: list[str]) -> list[list[float]]:
    r = await openai_client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [item.embedding for item in r.data]


async def process_surah(http: httpx.AsyncClient, sem: asyncio.Semaphore, n: int) -> list[dict]:
    surah_data = await fetch_surah(http, n)
    en_ayahs = surah_data["english"]["ayahs"]
    ar_ayahs = surah_data["arabic"]["ayahs"]
    surah_name = surah_data["english"]["englishName"]
    surah_name_ar = surah_data["arabic"]["name"]

    tafsirs = await asyncio.gather(
        *[fetch_tafsir(http, sem, n, a["numberInSurah"]) for a in en_ayahs]
    )

    verses = []
    for i, ayah in enumerate(en_ayahs):
        tafsir = tafsirs[i]
        embed_text = f"{surah_name} ({n}:{ayah['numberInSurah']}): {ayah['text']}"
        if tafsir:
            embed_text += f"\n\nTafsir: {tafsir[:300]}"

        verses.append({
            "surah_number": n,
            "ayah_number": ayah["numberInSurah"],
            "arabic_text": ar_ayahs[i]["text"],
            "translation": ayah["text"],
            "tafsir": tafsir,
            "tafsir_source": "Ibn Kathir",
            "surah_name": surah_name,
            "surah_name_arabic": surah_name_ar,
            "_embed": embed_text,
        })

    return verses


async def upsert(verses: list[dict]) -> None:
    rows = [{k: v for k, v in verse.items() if not k.startswith("_")} for verse in verses]
    db.table("verses").upsert(rows, on_conflict="surah_number,ayah_number").execute()


async def main() -> None:
    sem = asyncio.Semaphore(TAFSIR_CONCURRENCY)
    total = 0

    async with httpx.AsyncClient(timeout=30.0) as http:
        for n in range(1, TOTAL_SURAHS + 1):
            t0 = time.monotonic()
            print(f"[{n:3}/{TOTAL_SURAHS}] Fetching...", end=" ", flush=True)

            verses = await process_surah(http, sem, n)

            # embed in batches
            for i in range(0, len(verses), EMBED_BATCH):
                batch = verses[i : i + EMBED_BATCH]
                embeddings = await embed_batch([v["_embed"] for v in batch])
                for v, emb in zip(batch, embeddings):
                    v["embedding"] = emb

            await upsert(verses)
            total += len(verses)
            print(f"{len(verses)} verses | {time.monotonic() - t0:.1f}s | total={total}")

            await asyncio.sleep(0.15)  # gentle rate limiting

    print(f"\nDone. Ingested {total} verses.")


if __name__ == "__main__":
    asyncio.run(main())
