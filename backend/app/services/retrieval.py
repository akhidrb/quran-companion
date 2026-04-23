import asyncio
import re
from ..database import supabase
from ..schemas import Translation, VerseResult
from .embeddings import embed
from .alquran import enrich_verses


def _parse_verse_ref(query: str) -> tuple[int, int] | None:
    match = re.search(r"\b(\d{1,3}):(\d{1,3})\b", query)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None


def _confidence(similarity: float) -> str:
    return "direct" if similarity >= 0.65 else "related"


def _search_verses_sync(embedding: list[float], top_k: int) -> list[dict]:
    result = supabase.rpc(
        "match_verses",
        {"query_embedding": embedding, "match_threshold": 0.3, "match_count": top_k},
    ).execute()
    return result.data or []


def _fetch_verse_direct_sync(surah: int, ayah: int) -> dict | None:
    result = (
        supabase.table("verses")
        .select("*")
        .eq("surah_number", surah)
        .eq("ayah_number", ayah)
        .maybe_single()
        .execute()
    )
    return result.data


async def retrieve(query: str, top_k: int = 7) -> list[VerseResult]:
    verse_ref = _parse_verse_ref(query)
    query_embedding = await embed(query)

    rows = await asyncio.to_thread(_search_verses_sync, query_embedding, top_k)

    if verse_ref:
        surah, ayah = verse_ref
        direct = await asyncio.to_thread(_fetch_verse_direct_sync, surah, ayah)
        if direct:
            existing_ids = {r["id"] for r in rows}
            if direct["id"] not in existing_ids:
                rows.insert(0, {**direct, "similarity": 1.0})
                rows = rows[:top_k]

    enriched = await enrich_verses(rows)

    return [
        VerseResult(
            **{k: v for k, v in row.items() if k != "translations"},
            confidence=_confidence(row["similarity"]),
            translations=[Translation(**t) for t in row.get("translations", [])],
        )
        for row in enriched
    ]
