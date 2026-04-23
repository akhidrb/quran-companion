from typing import Literal
from pydantic import BaseModel


class Translation(BaseModel):
    name: str
    text: str


class Verse(BaseModel):
    id: int
    surah_number: int
    ayah_number: int
    arabic_text: str
    translation: str
    tafsir: str | None = None
    tafsir_source: str
    surah_name: str
    surah_name_arabic: str


class VerseResult(Verse):
    similarity: float
    confidence: Literal["direct", "related"]  # direct >= 0.65, related < 0.65
    translations: list[Translation] = []


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[VerseResult]
    fallback: bool
    query: str
