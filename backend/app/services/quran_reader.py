import asyncio
import httpx
from ..config import settings
from ..database import supabase
from ..schemas import SurahInfo, VerseDetail, Translation
from .retrieval import retrieve
from .generation import generate_answer

BASE = settings.alquran_api_url
EDITIONS = "en.sahih,en.yusufali,en.asad"
EDITION_LABELS = {
    "en.sahih": "Saheeh International",
    "en.yusufali": "Yusuf Ali",
    "en.asad": "Muhammad Asad",
}
_TIMEOUT = httpx.Timeout(10.0, connect=3.0)


def _fetch_surah_list_sync() -> list[dict]:
    result = supabase.rpc("get_surah_list").execute()
    return result.data or []


def _fetch_verses_sync(surah_number: int) -> list[dict]:
    result = (
        supabase.table("verses")
        .select("surah_number, ayah_number, arabic_text")
        .eq("surah_number", surah_number)
        .order("ayah_number")
        .execute()
    )
    return result.data or []


def _get_cached_reflection_sync(surah_number: int, ayah_number: int) -> str | None:
    result = (
        supabase.table("verse_reflections")
        .select("reflection")
        .eq("surah_number", surah_number)
        .eq("ayah_number", ayah_number)
        .maybe_single()
        .execute()
    )
    return result.data["reflection"] if result.data else None


def _save_reflection_sync(surah_number: int, ayah_number: int, reflection: str) -> None:
    supabase.table("verse_reflections").upsert(
        {"surah_number": surah_number, "ayah_number": ayah_number, "reflection": reflection},
        on_conflict="surah_number,ayah_number",
    ).execute()


def _get_surah_name_sync(surah_number: int) -> str:
    result = (
        supabase.table("verses")
        .select("surah_name")
        .eq("surah_number", surah_number)
        .limit(1)
        .execute()
    )
    return result.data[0]["surah_name"] if result.data else f"Surah {surah_number}"


async def _fetch_surah_translations(surah_number: int) -> dict[int, list[dict]]:
    """Single request for all translations of a surah. Returns {ayah_number: [{name, text}]}."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{BASE}/surah/{surah_number}/editions/{EDITIONS}")
        if r.status_code != 200:
            return {}
        result: dict[int, list[dict]] = {}
        for edition_data in r.json().get("data", []):
            label = EDITION_LABELS.get(
                edition_data["edition"]["identifier"],
                edition_data["edition"]["name"],
            )
            for ayah in edition_data.get("ayahs", []):
                n = ayah["numberInSurah"]
                result.setdefault(n, []).append({"name": label, "text": ayah["text"]})
        return result
    except Exception:
        return {}


async def fetch_surah_list() -> list[SurahInfo]:
    rows = await asyncio.to_thread(_fetch_surah_list_sync)
    return [SurahInfo(**row) for row in rows]


async def fetch_surah_verses(surah_number: int) -> list[VerseDetail]:
    verse_rows, translations_map = await asyncio.gather(
        asyncio.to_thread(_fetch_verses_sync, surah_number),
        _fetch_surah_translations(surah_number),
    )
    return [
        VerseDetail(
            surah_number=row["surah_number"],
            ayah_number=row["ayah_number"],
            arabic_text=row["arabic_text"],
            translations=[Translation(**t) for t in translations_map.get(row["ayah_number"], [])],
        )
        for row in verse_rows
    ]


async def fetch_verse_reflection(surah_number: int, ayah_number: int) -> str:
    """Return cached reflection from DB, or generate live and cache it for next time."""
    cached = await asyncio.to_thread(_get_cached_reflection_sync, surah_number, ayah_number)
    if cached:
        return cached

    surah_name = await asyncio.to_thread(_get_surah_name_sync, surah_number)
    question = f"Reflect on verse {surah_name} {surah_number}:{ayah_number}"
    sources, reflections = await retrieve(question, top_k=7)
    reflection = await generate_answer(question, sources, reflections)

    await asyncio.to_thread(_save_reflection_sync, surah_number, ayah_number, reflection)
    return reflection
