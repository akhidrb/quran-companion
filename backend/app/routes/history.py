from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user
from ..database import supabase
from ..schemas import (
    AskHistoryItem,
    DailyHistoryItem,
    GuidanceHistoryItem,
    VerseReflectionHistoryItem,
)

router = APIRouter()

UserDep = Annotated[dict | None, Depends(get_optional_user)]


def _require_user(user: dict | None) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


@router.get("/history/ask", response_model=list[AskHistoryItem])
async def get_ask_history(user: UserDep) -> list[AskHistoryItem]:
    u = _require_user(user)
    rows = (
        supabase.table("user_ask_history")
        .select("id, question, answer, created_at")
        .eq("user_id", u["user_id"])
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return [AskHistoryItem(**r) for r in rows.data]


@router.get("/history/guidance", response_model=list[GuidanceHistoryItem])
async def get_guidance_history(user: UserDep) -> list[GuidanceHistoryItem]:
    u = _require_user(user)
    rows = (
        supabase.table("user_guidance_history")
        .select("id, feeling, answer, created_at")
        .eq("user_id", u["user_id"])
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return [GuidanceHistoryItem(**r) for r in rows.data]


@router.get("/history/verse-reflections", response_model=list[VerseReflectionHistoryItem])
async def get_verse_reflection_history(user: UserDep) -> list[VerseReflectionHistoryItem]:
    u = _require_user(user)
    rows = (
        supabase.table("user_verse_reflections")
        .select("id, surah_number, ayah_number, surah_name, arabic_text, translation, reflection, created_at")
        .eq("user_id", u["user_id"])
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return [VerseReflectionHistoryItem(**r) for r in rows.data]


@router.get("/history/daily", response_model=list[DailyHistoryItem])
async def get_daily_history(user: UserDep) -> list[DailyHistoryItem]:
    u = _require_user(user)
    rows = (
        supabase.table("user_daily_history")
        .select("id, entry_date, theme, ayah_reference, ayah_arabic, ayah_translation, surah_name, entry, created_at")
        .eq("user_id", u["user_id"])
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return [DailyHistoryItem(**r) for r in rows.data]
