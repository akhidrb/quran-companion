from datetime import date, datetime, timezone
import anthropic
from ..config import settings
from ..database import supabase
from ..schemas import DailyEntry, ReflectionResult, VerseResult

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

THEMES = [
    "patience",
    "rizq",
    "anxiety",
    "gratitude",
    "repentance",
    "consistency",
    "low energy",
    "closeness to Allah",
]

THEME_QUERIES = {
    "patience": "patience sabr steadfastness hardship difficulty trial",
    "rizq": "sustenance provision rizq trust Allah livelihood worry",
    "anxiety": "peace heart ease after hardship anxiety worry calm relief",
    "gratitude": "gratitude shukr blessings thankfulness Allah",
    "repentance": "tawbah repentance forgiveness returning Allah mercy",
    "consistency": "istiqamah steadfastness small consistent deeds worship",
    "low energy": "ease burden rest relief Allah near tired weary",
    "closeness to Allah": "nearness Allah dhikr love remembrance relationship heart",
}

DAILY_COMPANION_SYSTEM_PROMPT = """\
You are a gentle Islamic companion generating a short daily entry to help someone \
build a daily relationship with the Quran.

Your response must have exactly these three sections with these exact bold headers:

**Meaning:**
[1-2 sentences explaining what this verse means in warm, accessible language — \
like a wise friend sharing its meaning, not an academic explanation.]

**Reflection:**
[2-3 sentences connecting this verse to real human experience on the theme given. \
Help the reader feel this verse speaks directly to a moment like theirs.]

**Today's action:**
[One specific, gentle invitation — a short dhikr, a moment of gratitude, reading \
the verse again slowly, a brief dua. Simple and achievable. An invitation, not a duty.]

Rules:
- Total response must be under 220 words.
- No guilt-based language. No "you should", "you must", "don't waste time".
- No extra sections beyond the three above. No introductory or closing sentences.
- Write as a calm, warm companion — not a teacher, not a chatbot.\
"""


def get_daily_theme(entry_date: date) -> str:
    epoch = date(2024, 1, 1)
    day_number = (entry_date - epoch).days
    return THEMES[day_number % len(THEMES)]


async def _generate_entry(verse: VerseResult, theme: str, reflections: list[ReflectionResult]) -> str:
    translation = verse.translations[0].text if verse.translations else verse.translation
    context_lines = [
        f"Verse: {verse.surah_name} ({verse.surah_number}:{verse.ayah_number})",
        f"Translation: {translation}",
    ]
    if verse.tafsir:
        context_lines.append(f"Tafsir context: {verse.tafsir[:350]}…")
    if reflections:
        context_lines.append(
            f"\nReflection from Fi Zilal al-Quran:\n{reflections[0].content[:350]}"
        )
    context = "\n".join(context_lines)

    user_msg = f"Theme: {theme}\n\n{context}\n\nGenerate the daily companion entry."

    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=DAILY_COMPANION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    block = message.content[0]
    return block.text if block.type == "text" else ""


async def get_daily_entry(theme: str | None = None) -> DailyEntry:
    from .retrieval import retrieve

    today = datetime.now(timezone.utc).date()
    effective_theme = theme if theme and theme in THEMES else get_daily_theme(today)
    date_str = today.isoformat()

    cached = (
        supabase.table("daily_entries")
        .select("*")
        .eq("entry_date", date_str)
        .eq("theme", effective_theme)
        .limit(1)
        .execute()
    )
    if cached.data:
        row = cached.data[0]
        return DailyEntry(
            date=row["entry_date"],
            theme=row["theme"],
            ayah_reference=row["ayah_reference"],
            ayah_arabic=row["ayah_arabic"],
            ayah_translation=row["ayah_translation"],
            surah_name=row["surah_name"],
            entry=row["entry"],
        )

    query = THEME_QUERIES[effective_theme]
    sources, reflections = await retrieve(query, top_k=5)

    if not sources:
        raise RuntimeError(f"No verses found for theme: {effective_theme}")

    verse = sources[0]
    translation = verse.translations[0].text if verse.translations else verse.translation
    entry_text = await _generate_entry(verse, effective_theme, reflections)

    ayah_ref = f"{verse.surah_number}:{verse.ayah_number}"

    supabase.table("daily_entries").upsert(
        {
            "entry_date": date_str,
            "theme": effective_theme,
            "ayah_reference": ayah_ref,
            "ayah_arabic": verse.arabic_text,
            "ayah_translation": translation,
            "surah_name": verse.surah_name,
            "entry": entry_text,
        },
        on_conflict="entry_date,theme",
    ).execute()

    return DailyEntry(
        date=date_str,
        theme=effective_theme,
        ayah_reference=ayah_ref,
        ayah_arabic=verse.arabic_text,
        ayah_translation=translation,
        surah_name=verse.surah_name,
        entry=entry_text,
    )
