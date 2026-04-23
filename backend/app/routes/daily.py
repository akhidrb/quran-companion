import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from ..auth import get_optional_user
from ..database import supabase
from ..schemas import DailyEntry
from ..services.daily import THEMES, get_daily_entry

logger = logging.getLogger(__name__)
router = APIRouter()

UserDep = Annotated[dict | None, Depends(get_optional_user)]


@router.get("/daily", response_model=DailyEntry)
async def daily(user: UserDep, theme: str | None = None) -> DailyEntry:
    if theme and theme not in THEMES:
        theme = None
    entry = await get_daily_entry(theme)

    if user:
        try:
            supabase.table("user_daily_history").upsert(
                {
                    "user_id": user["user_id"],
                    "entry_date": entry.date,
                    "theme": entry.theme,
                    "ayah_reference": entry.ayah_reference,
                    "ayah_arabic": entry.ayah_arabic,
                    "ayah_translation": entry.ayah_translation,
                    "surah_name": entry.surah_name,
                    "entry": entry.entry,
                },
                on_conflict="user_id,entry_date,theme",
            ).execute()
        except Exception:
            logger.exception("Failed to save daily history for user %s", user["user_id"])

    return entry
