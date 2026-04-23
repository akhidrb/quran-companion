import re
from typing import Literal
from pydantic import BaseModel, field_validator


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


# ── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str
    pin: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if len(v) > 30:
            raise ValueError("Username must be at most 30 characters.")
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError("Username can only contain letters, numbers, and underscores.")
        return v

    @field_validator("pin")
    @classmethod
    def pin_valid(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise ValueError("PIN must be exactly 6 digits.")
        return v


class LoginRequest(BaseModel):
    username: str
    pin: str

    @field_validator("username")
    @classmethod
    def normalise(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    token: str
    username: str
    user_id: int


# ── History ─────────────────────────────────────────────────────────────────

class AskHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    created_at: str


class GuidanceHistoryItem(BaseModel):
    id: int
    feeling: str
    answer: str
    created_at: str


class VerseReflectionHistoryItem(BaseModel):
    id: int
    surah_number: int
    ayah_number: int
    surah_name: str
    arabic_text: str
    translation: str
    reflection: str
    created_at: str


class DailyHistoryItem(BaseModel):
    id: int
    entry_date: str
    theme: str
    ayah_reference: str
    ayah_arabic: str
    ayah_translation: str
    surah_name: str
    entry: str
    created_at: str
