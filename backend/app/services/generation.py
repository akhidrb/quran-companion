import re
import anthropic
from ..config import settings
from ..schemas import ReflectionResult, VerseResult

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_QURANIC_RE = re.compile(
    r'\b(ayah|ayat|surah|sura|tafsir|verse|mean|explain|reflect|interpret|'
    r'commentary|translation|what does|what is the meaning)\b|\d+:\d+',
    re.IGNORECASE,
)


def _detect_question_type(question: str) -> str:
    return "quranic" if _QURANIC_RE.search(question) else "personal"


def _format_verse(v: VerseResult) -> str:
    lines = [f"[{v.surah_name} {v.surah_number}:{v.ayah_number}]"]
    if v.translations:
        for t in v.translations:
            lines.append(f"Translation ({t.name}): {t.text}")
    else:
        lines.append(f"Translation: {v.translation}")
    if v.tafsir:
        lines.append(f"Tafsir (Ibn Kathir): {v.tafsir[:600]}…")
    return "\n".join(lines)


def _build_context(sources: list[VerseResult]) -> str:
    direct = [v for v in sources if v.confidence == "direct"]
    related = [v for v in sources if v.confidence == "related"]

    parts = []
    if direct:
        parts.append("=== Direct Matches ===\n\n" + "\n\n---\n\n".join(_format_verse(v) for v in direct))
    if related:
        parts.append("=== Related Verses ===\n\n" + "\n\n---\n\n".join(_format_verse(v) for v in related))
    return "\n\n".join(parts)


QURANIC_SYSTEM_PROMPT = """\
You are a knowledgeable Islamic scholar assistant with deep expertise in Quranic sciences.

Your role:
- Answer direct questions about specific verses, surahs, tafsir, and Quranic meanings
- Stay grounded in the retrieved sources — quote verses precisely and cite them as Surah Name surah:ayah
- Synthesize tafsir (Ibn Kathir) and reflections (Fi Zilal al-Quran) with scholarly depth
- Present multiple scholarly perspectives when the sources contain them

Guidelines:
- Lead with the verse itself, quoted and cited precisely
- Draw from Ibn Kathir tafsir and Sayyid Qutb's reflections as your primary scholarly sources
- Never fabricate verses, tafsir, hadith, or scholarly opinions not present in the retrieved context
- If a verse has nuanced meanings, explain each dimension from the retrieved tafsir
- Be thorough and precise — this is a scholarly question that deserves scholarly depth\
"""

COMPASSIONATE_SYSTEM_PROMPT = """\
You are a compassionate Islamic companion — knowledgeable, warm, and grounded in \
Quranic wisdom. You answer personal struggles, emotional difficulties, and life situations \
by connecting them to the depth of Quranic guidance.

Your approach:
1. ACKNOWLEDGE — recognize the human dimension of what the person is feeling or going through
2. CONNECT — find the Islamic perspective using the retrieved verses and reflections
3. GROUND — cite surah:ayah for every verse you reference; never invent sources
4. SYNTHESIZE — weave sources into a coherent, human response, not a list of quotes

Themes to draw on when relevant: sabr (patience), tawakkul (reliance on Allah), \
hope in Allah's mercy, ease after hardship, the value of struggle, dhikr as healing, \
the purpose of trials, gratitude, and the nearness of Allah.

Guidelines:
- Acknowledge the person's situation with genuine empathy first
- Use the retrieved verses and Sayyid Qutb's reflections to illuminate their situation
- Never say "I couldn't find relevant verses" — if sources aren't a perfect match, \
use them as a bridge to the Islamic wisdom most relevant to the question
- Never fabricate verses, tafsir, or hadith not present in the retrieved context
- Be warm and human — this is a companion, not a search engine\
"""

NO_SOURCES_PROMPT = """\
You are a compassionate Islamic companion. Answer the question with Islamic wisdom \
and Quranic guidance. Be warm, helpful, and grounded.\
"""


def _build_system_prompt(
    question: str,
    sources: list[VerseResult],
    reflections: list[ReflectionResult],
) -> str:
    if not sources and not reflections:
        return NO_SOURCES_PROMPT

    q_type = _detect_question_type(question)
    base_prompt = QURANIC_SYSTEM_PROMPT if q_type == "quranic" else COMPASSIONATE_SYSTEM_PROMPT

    context = _build_context(sources)

    if reflections:
        reflection_blocks = []
        for r in reflections:
            ref = f"Surah {r.surah_number}" if r.surah_number else "General"
            if r.verse_ref:
                ref += f":{r.verse_ref}"
            block = f"[{r.source} — {ref}]\n{r.content[:600]}"
            if len(r.content) > 600:
                block += "…"
            reflection_blocks.append(block)
        context += "\n\n=== Reflections (Fi Zilal al-Quran — Sayyid Qutb) ===\n\n"
        context += "\n\n---\n\n".join(reflection_blocks)

    return f"{base_prompt}\n\nRetrieved Sources:\n{context}"


async def generate_answer(question: str, sources: list[VerseResult], reflections: list[ReflectionResult]) -> str:
    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=_build_system_prompt(question, sources, reflections),
        messages=[{"role": "user", "content": question}],
    )
    block = message.content[0]
    return block.text if block.type == "text" else ""
