import asyncio
import httpx
from ..config import settings

BASE = settings.alquran_api_url
EDITIONS = "en.sahih,en.yusufali,en.asad"

EDITION_LABELS = {
    "en.sahih": "Saheeh International",
    "en.yusufali": "Yusuf Ali",
    "en.asad": "Muhammad Asad",
}

# Fresh client per request avoids stale connections after idle periods
_TIMEOUT = httpx.Timeout(6.0, connect=3.0)
_LIMITS = httpx.Limits(max_keepalive_connections=10, max_connections=20)


async def fetch_translations(surah: int, ayah: int) -> list[dict]:
    """Returns [{name, text}, ...] for the configured editions. Falls back to [] on error."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, limits=_LIMITS) as client:
            r = await client.get(f"{BASE}/ayah/{surah}:{ayah}/editions/{EDITIONS}")
        if r.status_code != 200:
            return []
        return [
            {
                "name": EDITION_LABELS.get(item["edition"]["identifier"], item["edition"]["name"]),
                "text": item["text"],
            }
            for item in r.json().get("data", [])
        ]
    except Exception:
        return []


async def enrich_verses(verses: list[dict]) -> list[dict]:
    """Fetch translations for all verses concurrently and attach them."""
    translations_list = await asyncio.gather(
        *[fetch_translations(v["surah_number"], v["ayah_number"]) for v in verses]
    )
    for verse, translations in zip(verses, translations_list):
        verse["translations"] = translations
    return verses
