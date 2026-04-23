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


class ReflectionResult(BaseModel):
    id: int
    source: str
    author: str
    surah_number: int | None
    verse_ref: str | None
    content: str
    similarity: float


class SurahInfo(BaseModel):
    surah_number: int
    surah_name: str
    surah_name_arabic: str
    ayah_count: int


class VerseDetail(BaseModel):
    surah_number: int
    ayah_number: int
    arabic_text: str
    translations: list[Translation] = []


class VerseReflection(BaseModel):
    id: int
    source: str
    author: str
    verse_ref: str | None
    content: str


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[VerseResult]
    reflections: list[ReflectionResult]
    fallback: bool
    query: str


class GuidanceRequest(BaseModel):
    feeling: str


class GuidanceResponse(BaseModel):
    answer: str
    sources: list[VerseResult]
    query: str


class DailyEntry(BaseModel):
    date: str
    theme: str
    ayah_reference: str
    ayah_arabic: str
    ayah_translation: str
    surah_name: str
    entry: str
