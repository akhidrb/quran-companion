import anthropic
from ..config import settings
from ..schemas import VerseResult

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_NO_SOURCES_PROMPT = (
    "You are a Quran Companion assistant. No relevant verses were found for this query. "
    "Tell the user you couldn't find relevant information in the sources and suggest they "
    "try rephrasing or use a direct verse reference like 2:255."
)


def _build_system_prompt(sources: list[VerseResult]) -> str:
    if not sources:
        return _NO_SOURCES_PROMPT

    verse_blocks = []
    for v in sources:
        block = f"[{v.surah_name} {v.surah_number}:{v.ayah_number}]\n"
        if v.translations:
            for t in v.translations:
                block += f"Translation ({t.name}): {t.text}\n"
        else:
            block += f"Translation: {v.translation}\n"
        if v.tafsir:
            block += f"Tafsir (Ibn Kathir): {v.tafsir[:600]}…"
        verse_blocks.append(block)

    context = "\n\n---\n\n".join(verse_blocks)

    return f"""You are a Quran Companion assistant. Answer ONLY from the retrieved verses and tafsir below.

RULES:
1. Always cite surah and ayah (e.g. "Al-Baqarah 2:255").
2. Quote the translation when relevant.
3. Summarize tafsir in 2–4 sentences maximum.
4. Never add religious claims absent from the provided context.
5. If context doesn't clearly answer the question, say: "I don't have sufficient information from the retrieved sources. The closest I found was [cite it]."
6. Be respectful and scholarly.

Retrieved Context:
{context}"""


async def generate_answer(question: str, sources: list[VerseResult]) -> str:
    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=_build_system_prompt(sources),
        messages=[{"role": "user", "content": question}],
    )
    block = message.content[0]
    return block.text if block.type == "text" else ""
