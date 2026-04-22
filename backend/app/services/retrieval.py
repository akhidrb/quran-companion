import re
from ..database import supabase
from ..schemas import VerseResult
from .embeddings import embed


def _parse_verse_ref(query: str) -> tuple[int, int] | None:
    match = re.search(r"\b(\d{1,3}):(\d{1,3})\b", query)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None


async def retrieve(query: str, top_k: int = 5) -> list[VerseResult]:
    verse_ref = _parse_verse_ref(query)
    query_embedding = await embed(query)

    result = supabase.rpc(
        "match_verses",
        {
            "query_embedding": query_embedding,
            "match_threshold": 0.4,
            "match_count": top_k,
        },
    ).execute()

    results: list[VerseResult] = [VerseResult(**row) for row in (result.data or [])]

    if verse_ref:
        surah, ayah = verse_ref
        direct = (
            supabase.table("verses")
            .select("*")
            .eq("surah_number", surah)
            .eq("ayah_number", ayah)
            .maybe_single()
            .execute()
        )
        if direct.data:
            existing_ids = {r.id for r in results}
            if direct.data["id"] not in existing_ids:
                results.insert(0, VerseResult(**direct.data, similarity=1.0))
                results = results[:top_k]

    return results
