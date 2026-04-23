import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user
from ..database import supabase
from ..schemas import SurahInfo, VerseDetail
from ..services.quran_reader import fetch_surah_list, fetch_surah_verses, fetch_verse_reflection

logger = logging.getLogger(__name__)
router = APIRouter()

UserDep = Annotated[dict | None, Depends(get_optional_user)]


@router.get("/surahs", response_model=list[SurahInfo])
async def get_surahs() -> list[SurahInfo]:
    return await fetch_surah_list()


@router.get("/surahs/{surah_number}", response_model=list[VerseDetail])
async def get_surah(surah_number: int) -> list[VerseDetail]:
    if not 1 <= surah_number <= 114:
        raise HTTPException(status_code=400, detail="Surah number must be between 1 and 114")
    return await fetch_surah_verses(surah_number)


@router.get("/verses/{surah_number}/{ayah_number}/reflection")
async def get_verse_reflection(
    surah_number: int,
    ayah_number: int,
    user: UserDep,
) -> dict:
    reflection = await fetch_verse_reflection(surah_number, ayah_number)

    if user:
        try:
            verse_row = (
                supabase.table("verses")
                .select("arabic_text, translation, surah_name")
                .eq("surah_number", surah_number)
                .eq("ayah_number", ayah_number)
                .limit(1)
                .execute()
            )
            if verse_row.data:
                v = verse_row.data[0]
                supabase.table("user_verse_reflections").upsert(
                    {
                        "user_id": user["user_id"],
                        "surah_number": surah_number,
                        "ayah_number": ayah_number,
                        "surah_name": v["surah_name"],
                        "arabic_text": v["arabic_text"],
                        "translation": v["translation"],
                        "reflection": reflection,
                    },
                    on_conflict="user_id,surah_number,ayah_number",
                ).execute()
        except Exception:
            logger.exception(
                "Failed to save verse reflection history for user %s", user["user_id"]
            )

    return {"reflection": reflection}
