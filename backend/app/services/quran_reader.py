import asyncio
import httpx
from ..config import settings
from ..database import supabase
from ..schemas import SurahInfo, VerseDetail, VerseReflection, Translation

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


def _fetch_reflections_for_surah_sync(surah_number: int) -> list[dict]:
    result = (
        supabase.table("reflections")
        .select("id, source, author, verse_ref, content")
        .eq("surah_number", surah_number)
        .execute()
    )
    return result.data or []


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


def _verse_ref_matches(verse_ref: str | None, ayah: int) -> bool:
    if not verse_ref:
        return True  # surah-level reflection
    for part in verse_ref.split(","):
        part = part.strip()
        if "-" in part:
            try:
                start, end = part.split("-", 1)
                if int(start.strip()) <= ayah <= int(end.strip()):
                    return True
            except ValueError:
                pass
        elif part.isdigit() and int(part) == ayah:
            return True
    return False


def _ref_specificity(verse_ref: str | None) -> int:
    """Lower = more specific. Exact ayah < range < surah-level."""
    if not verse_ref:
        return 2
    if verse_ref.strip().lstrip("0123456789") == "":
        return 0  # single digit — exact match
    return 1  # range


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


async def fetch_verse_reflection(surah_number: int, ayah_number: int) -> list[VerseReflection]:
    rows = await asyncio.to_thread(_fetch_reflections_for_surah_sync, surah_number)
    matches = [r for r in rows if _verse_ref_matches(r.get("verse_ref"), ayah_number)]
    matches.sort(key=lambda r: _ref_specificity(r.get("verse_ref")))
    return [VerseReflection(**r) for r in matches[:5]]
