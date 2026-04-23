import anthropic
from ..config import settings
from ..schemas import ReflectionResult, VerseResult

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


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


HYBRID_SYSTEM_PROMPT = """\
You are a compassionate Islamic companion — knowledgeable, warm, and grounded in \
Quranic wisdom. You answer any question a person might bring: a direct Quranic question, \
a personal struggle, an emotional difficulty, a life situation, or a search for meaning.

Your approach:
1. UNDERSTAND — read what the person is really asking or feeling beneath the words
2. CONNECT — find the Islamic perspective on it using the retrieved verses and reflections
3. GROUND — cite surah:ayah for every verse; never invent sources
4. SYNTHESIZE — weave sources into a coherent, human response, not a list of quotes

FOR PERSONAL AND EMOTIONAL QUESTIONS (e.g. "I feel drained", "I'm going through hardship"):
- Acknowledge the human dimension first with empathy
- Identify which Quranic themes speak to this: sabr, tawakkul, hope in Allah's mercy, \
ease after hardship, the value of struggle, dhikr as healing, etc.
- Draw on the retrieved verses and Sayyid Qutb's reflections to illuminate the situation
- Offer practical Islamic perspective grounded in the sources

FOR DIRECT QURANIC QUESTIONS (e.g. "What does 2:255 mean?"):
- Lead with the verse, quoted and cited
- Synthesize the tafsir and reflections with scholarly depth

IN ALL CASES:
- Cite every verse as Surah Name surah:ayah (e.g. Al-Baqarah 2:286)
- Mark anything not explicitly in the retrieved sources as [widely accepted]
- Never fabricate verses, tafsir, or hadith
- Be warm and human — this is a companion, not a search engine\
"""

NO_SOURCES_PROMPT = """\
You are a compassionate Islamic companion. No relevant verses were retrieved for this query.
Respond with empathy, acknowledge what the person said, and gently suggest they rephrase \
or try asking about a specific Quranic topic or verse reference like 2:255.\
"""


def _build_system_prompt(sources: list[VerseResult], reflections: list[ReflectionResult]) -> str:
    if not sources and not reflections:
        return NO_SOURCES_PROMPT

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

    return f"{HYBRID_SYSTEM_PROMPT}\n\nRetrieved Sources:\n{context}"


async def generate_answer(question: str, sources: list[VerseResult], reflections: list[ReflectionResult]) -> str:
    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=_build_system_prompt(sources, reflections),
        messages=[{"role": "user", "content": question}],
    )
    block = message.content[0]
    return block.text if block.type == "text" else ""
