"""
Ingest one or more tafsir/reflection PDFs into the reflections table.

Usage (from the backend/ directory):

  Single file:
    python scripts/ingest_reflection.py \
        --pdf /path/to/volume1.pdf \
        --source "Fi Zilal al-Quran" --author "Sayyid Qutb"

  Entire directory (processes all PDFs in sorted filename order):
    python scripts/ingest_reflection.py \
        --dir /path/to/fi-zilal-volumes/ \
        --source "Fi Zilal al-Quran" --author "Sayyid Qutb"

The script:
  1. Extracts text from each PDF page by page
  2. Detects surah boundaries using common header patterns
  3. Chunks text into ~400-word passages
  4. Embeds each chunk and stores it in Supabase

Prerequisites:
  - Run supabase/migrations/003_reflections.sql in the Supabase SQL Editor
  - pip install -r requirements.txt  (includes pypdf)
"""

import argparse
import asyncio
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pypdf import PdfReader
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
db = create_client(SUPABASE_URL, SUPABASE_KEY)

EMBED_BATCH = 50
CHUNK_WORDS = 400

# Patterns that signal the start of a new surah section in the PDF
_SURAH_PATTERNS = [
    re.compile(r"surah\s+(\w[\w\s\-']+?)\s*\((\d+)\)", re.IGNORECASE),   # Surah Al-Baqarah (2)
    re.compile(r"chapter\s+(\d+)", re.IGNORECASE),                         # Chapter 2
    re.compile(r"sura[ht]?\s+no\.?\s*(\d+)", re.IGNORECASE),              # Surah No. 2
]

# Patterns for verse references within a section
_VERSE_PATTERNS = [
    re.compile(r"\((\d+):(\d+)(?:\s*[-–]\s*(\d+))?\)"),   # (2:255) or (2:1-5)
    re.compile(r"verse[s]?\s+(\d+)(?:\s*[-–]\s*(\d+))?", re.IGNORECASE),
    re.compile(r"ayah?\s+(\d+)", re.IGNORECASE),
]


def extract_text(pdf_path: str) -> list[str]:
    """Returns list of page texts."""
    reader = PdfReader(pdf_path)
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text.strip())
    return pages


def detect_surah(text: str) -> int | None:
    for pattern in _SURAH_PATTERNS:
        m = pattern.search(text)
        if m:
            # last group is always the number when present
            for g in reversed(m.groups()):
                if g and g.isdigit():
                    return int(g)
    return None


def detect_verse_ref(text: str) -> str | None:
    for pattern in _VERSE_PATTERNS:
        m = pattern.search(text)
        if m:
            groups = [g for g in m.groups() if g]
            if len(groups) >= 2:
                return f"{groups[-2]}-{groups[-1]}"
            elif groups:
                return groups[0]
    return None


def chunk_text(text: str, chunk_words: int = CHUNK_WORDS) -> list[str]:
    """Split text into ~chunk_words-word passages, respecting paragraph breaks."""
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks, current, count = [], [], 0

    for para in paragraphs:
        words = len(para.split())
        if count + words > chunk_words and current:
            chunks.append(" ".join(current))
            current, count = [], 0
        current.append(para)
        count += words

    if current:
        chunks.append(" ".join(current))

    return chunks


def build_pages_by_surah(pages: list[str]) -> list[dict]:
    """Group page texts by detected surah, return list of {surah_number, text}."""
    sections = []
    current_surah: int | None = None
    current_text: list[str] = []

    for page in pages:
        surah = detect_surah(page)
        if surah and surah != current_surah:
            if current_text:
                sections.append({"surah_number": current_surah, "text": "\n\n".join(current_text)})
            current_surah = surah
            current_text = [page]
        else:
            current_text.append(page)

    if current_text:
        sections.append({"surah_number": current_surah, "text": "\n\n".join(current_text)})

    return sections


async def embed_batch(texts: list[str]) -> list[list[float]]:
    r = await openai_client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [item.embedding for item in r.data]


async def ingest(pdf_path: str, source: str, author: str) -> int:
    print(f"Reading {pdf_path}...")
    pages = extract_text(pdf_path)
    print(f"  {len(pages)} pages extracted")

    sections = build_pages_by_surah(pages)
    print(f"  {len(sections)} surah sections detected")

    # Build all chunks
    records = []
    for section in sections:
        chunks = chunk_text(section["text"])
        for chunk in chunks:
            records.append({
                "source": source,
                "author": author,
                "surah_number": section["surah_number"],
                "verse_ref": detect_verse_ref(chunk),
                "content": chunk,
            })

    print(f"  {len(records)} chunks to embed and store")

    total = 0
    for i in range(0, len(records), EMBED_BATCH):
        batch = records[i : i + EMBED_BATCH]
        embeddings = await embed_batch([r["content"][:1000] for r in batch])
        rows = [{**r, "embedding": emb} for r, emb in zip(batch, embeddings)]
        db.table("reflections").insert(rows).execute()
        total += len(rows)
        print(f"  inserted {total}/{len(records)}")

    return total


async def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pdf", help="Path to a single PDF file")
    group.add_argument("--dir", help="Path to a directory containing multiple PDF files")
    parser.add_argument("--source", required=True, help='Source name, e.g. "Fi Zilal al-Quran"')
    parser.add_argument("--author", required=True, help='Author name, e.g. "Sayyid Qutb"')
    args = parser.parse_args()

    if args.pdf:
        pdfs = [Path(args.pdf)]
    else:
        pdfs = sorted(Path(args.dir).glob("*.pdf"))
        if not pdfs:
            print(f"Error: no PDF files found in {args.dir}")
            sys.exit(1)

    missing = [p for p in pdfs if not p.exists()]
    if missing:
        for p in missing:
            print(f"Error: file not found: {p}")
        sys.exit(1)

    print(f"Found {len(pdfs)} PDF(s) to process:")
    for p in pdfs:
        print(f"  {p.name}")
    print()

    t0 = time.monotonic()
    grand_total = 0

    for i, pdf in enumerate(pdfs, 1):
        print(f"[{i}/{len(pdfs)}] {pdf.name}")
        grand_total += await ingest(str(pdf), args.source, args.author)
        print()

    print(f"Done. {grand_total} total chunks ingested in {time.monotonic() - t0:.0f}s.")


if __name__ == "__main__":
    asyncio.run(main())
