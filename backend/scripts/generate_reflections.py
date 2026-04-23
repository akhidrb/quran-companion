"""
Pre-generate AI reflections for every verse and store them in verse_reflections.

Usage:
    python scripts/generate_reflections.py                  # all unprocessed verses
    python scripts/generate_reflections.py --surah 2        # only Al-Baqarah
    python scripts/generate_reflections.py --limit 50       # first 50 unprocessed
    python scripts/generate_reflections.py --delay 0.3      # faster (default 0.5s)

The script skips verses that already have a stored reflection, so it is safe
to interrupt and re-run — it will resume from where it left off.

Cost estimate: each verse costs roughly $0.012 (Claude Sonnet input + output).
Full Quran (6,236 verses) ≈ $75. Use --limit to process in batches.
"""

import asyncio
import os
import sys
import argparse
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.database import supabase
from app.services.retrieval import retrieve
from app.services.generation import generate_answer


def _fetch_verses(surah_filter: int | None) -> list[dict]:
    q = (
        supabase.table("verses")
        .select("surah_number, ayah_number, surah_name")
        .order("surah_number")
        .order("ayah_number")
    )
    if surah_filter:
        q = q.eq("surah_number", surah_filter)
    return q.execute().data or []


def _fetch_done() -> set[tuple[int, int]]:
    rows = supabase.table("verse_reflections").select("surah_number, ayah_number").execute().data or []
    return {(r["surah_number"], r["ayah_number"]) for r in rows}


def _save(surah: int, ayah: int, reflection: str) -> None:
    supabase.table("verse_reflections").upsert(
        {"surah_number": surah, "ayah_number": ayah, "reflection": reflection},
        on_conflict="surah_number,ayah_number",
    ).execute()


async def _reflect(surah: int, ayah: int, surah_name: str) -> str:
    question = f"Reflect on verse {surah_name} {surah}:{ayah}"
    sources, reflections = await retrieve(question, top_k=7)
    return await generate_answer(question, sources, reflections)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Pre-generate verse reflections")
    parser.add_argument("--surah", type=int, help="Process only this surah number")
    parser.add_argument("--limit", type=int, help="Max number of verses to process")
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between API calls (default 0.5)")
    args = parser.parse_args()

    print("Fetching verses from database…")
    all_verses = _fetch_verses(args.surah)
    done = _fetch_done()

    todo = [v for v in all_verses if (v["surah_number"], v["ayah_number"]) not in done]
    if args.limit:
        todo = todo[: args.limit]

    total = len(todo)
    if total == 0:
        print("Nothing to do — all verses already have reflections.")
        return

    est_cost = total * 0.012
    print(f"\n{total} verses to process  |  estimated cost: ${est_cost:.2f}")
    print("Press Ctrl+C to stop — progress is saved after each verse.\n")

    success = 0
    errors = 0
    start = time.time()

    for i, verse in enumerate(todo, 1):
        s, a, name = verse["surah_number"], verse["ayah_number"], verse["surah_name"]
        try:
            reflection = await _reflect(s, a, name)
            _save(s, a, reflection)
            success += 1

            elapsed = time.time() - start
            rate = i / elapsed
            remaining = (total - i) / rate if rate > 0 else 0
            mins = int(remaining // 60)
            secs = int(remaining % 60)
            print(f"  ✓  {name} {s}:{a:<4}  ({i}/{total})  ~{mins}m{secs:02d}s left")
        except KeyboardInterrupt:
            print(f"\nStopped. {success} saved, {errors} errors.")
            return
        except Exception as e:
            errors += 1
            print(f"  ✗  {s}:{a} — {e}")

        if i < total:
            await asyncio.sleep(args.delay)

    print(f"\nDone. {success} saved, {errors} errors  |  {time.time() - start:.0f}s elapsed")


if __name__ == "__main__":
    asyncio.run(main())
