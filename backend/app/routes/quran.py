from fastapi import APIRouter, HTTPException
from ..schemas import SurahInfo, VerseDetail
from ..services.quran_reader import fetch_surah_list, fetch_surah_verses, fetch_verse_reflection

router = APIRouter()


@router.get("/surahs", response_model=list[SurahInfo])
async def get_surahs() -> list[SurahInfo]:
    return await fetch_surah_list()


@router.get("/surahs/{surah_number}", response_model=list[VerseDetail])
async def get_surah(surah_number: int) -> list[VerseDetail]:
    if not 1 <= surah_number <= 114:
        raise HTTPException(status_code=400, detail="Surah number must be between 1 and 114")
    return await fetch_surah_verses(surah_number)


@router.get("/verses/{surah_number}/{ayah_number}/reflection")
async def get_verse_reflection(surah_number: int, ayah_number: int) -> dict:
    reflection = await fetch_verse_reflection(surah_number, ayah_number)
    return {"reflection": reflection}
