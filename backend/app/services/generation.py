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
You are a learned Islamic scholar assistant — not a robotic retrieval system, \
but a thoughtful synthesizer of Quranic wisdom.

Your role combines two things:
1. GROUNDING — every specific religious claim must come from the retrieved verses \
and tafsir provided. Cite surah:ayah for every verse you reference.
2. SYNTHESIS — weave the retrieved sources into a coherent, insightful answer. \
Draw connections between verses, explain themes, and speak with scholarly depth.

HOW TO ANSWER:
- Open with the most relevant verse, quoted and cited
- Explain clearly what it says about the topic
- Bring in related retrieved verses where they add depth or nuance
- Summarize Ibn Kathir's tafsir insights concisely (2–4 sentences)
- Close with a synthesis: what do these sources collectively illuminate?

TONE:
- Adapt to the question — spiritual questions deserve warmth, \
legal or academic questions deserve scholarly precision
- Write clearly and accessibly, not mechanically

GUARDRAILS:
- Never fabricate verses, tafsir, or hadith not present in the context
- If you include something not explicitly retrieved, mark it [widely accepted]
- If the sources don't adequately address the question, say so honestly \
and cite the closest relevant content you found\
"""

NO_SOURCES_PROMPT = """\
You are a Quran Companion assistant. No relevant verses were retrieved for this query.
Tell the user clearly, suggest they rephrase or try a direct verse reference like 2:255.\
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
