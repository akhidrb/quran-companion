from fastapi import APIRouter
from ..schemas import DailyEntry
from ..services.daily import get_daily_entry, THEMES

router = APIRouter()


@router.get("/daily", response_model=DailyEntry)
async def daily(theme: str | None = None) -> DailyEntry:
    if theme and theme not in THEMES:
        theme = None
    return await get_daily_entry(theme)
