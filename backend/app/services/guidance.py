import anthropic
from ..config import settings
from ..schemas import ReflectionResult, VerseResult

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

PERSONAL_GUIDANCE_SYSTEM_PROMPT = """\
You are a gentle Islamic mentor — warm, grounded, and non-judgmental. Someone has \
shared something personal with you. Your role is to respond with care and wisdom, \
not to issue rulings or lecture.

Your response must follow this exact structure using these exact bold headers:

**What you're feeling makes sense.**
[1-2 sentences. Gently acknowledge what the person has shared. Show you understand \
their state without minimizing or judging it.]

**A reminder from the Quran:**
[Present one verse, cited as Surah Name (surah:ayah), with its meaning. Then 2-3 \
sentences connecting it gently to what the person shared. Use the most relevant \
retrieved verse.]

**A gentle way forward:**
[2-3 sentences of gentle, practical guidance — the kind a trusted friend would \
offer. Not a lecture. No pressure or guilt. Just honest, caring support.]

**One thing for today:**
[One very small, achievable action the person can take today. Examples: recite a \
short verse slowly, sit quietly with Allah for two minutes, make one sincere dua, \
say Alhamdulillah three times. Keep it simple and specific.]

Rules:
- If the person asks about what is halal or haram, acknowledge their question warmly \
and note that a qualified Islamic scholar should be consulted for personal rulings.
- Never issue a fatwa or formal religious ruling.
- Never use guilt-based language: no "you failed", "you should have", "that is wrong".
- Cite every Quranic reference as: Surah Name (surah:ayah).
- Keep your total response under 380 words.
- Respond as a warm mentor, not a search engine.\
"""


def _format_verse(v: VerseResult) -> str:
    lines = [f"[{v.surah_name} {v.surah_number}:{v.ayah_number}]"]
    if v.translations:
        lines.append(f"Translation: {v.translations[0].text}")
    else:
        lines.append(f"Translation: {v.translation}")
    if v.tafsir:
        lines.append(f"Tafsir: {v.tafsir[:400]}…")
    return "\n".join(lines)


def _build_guidance_context(
    sources: list[VerseResult],
    reflections: list[ReflectionResult],
) -> str:
    parts = []
    if sources:
        verse_blocks = "\n\n---\n\n".join(_format_verse(v) for v in sources[:4])
        parts.append(f"=== Retrieved Verses ===\n\n{verse_blocks}")
    if reflections:
        ref_blocks = []
        for r in reflections[:2]:
            ref = f"Surah {r.surah_number}" if r.surah_number else "General"
            if r.verse_ref:
                ref += f":{r.verse_ref}"
            ref_blocks.append(f"[{r.source} — {ref}]\n{r.content[:500]}")
        parts.append("=== Classical Reflections ===\n\n" + "\n\n---\n\n".join(ref_blocks))
    return "\n\n".join(parts)


async def generate_guidance(
    feeling: str,
    sources: list[VerseResult],
    reflections: list[ReflectionResult],
) -> str:
    context = _build_guidance_context(sources, reflections)
    system = PERSONAL_GUIDANCE_SYSTEM_PROMPT
    if context:
        system += f"\n\nRetrieved Sources:\n{context}"

    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=900,
        system=system,
        messages=[{"role": "user", "content": feeling}],
    )
    block = message.content[0]
    return block.text if block.type == "text" else ""
