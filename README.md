# Quran Companion

A personal Islamic study companion with two modes: ask any question and get a grounded AI answer, or read through the full Quran and reflect on any verse. Built on a hybrid RAG architecture — retrieval provides grounding and citations from classical sources, Claude provides synthesis, scholarly voice, and depth.

---

## What it does

### Ask tab — Islamic Q&A

Ask anything in natural language, from direct verse lookups to personal questions:

- _"What does Ayat Al-Kursi mean?"_
- _"Show verses about patience (sabr)"_
- _"What is the tafsir of 2:286?"_
- _"I feel drained and have no energy"_
- _"How do I deal with anxiety?"_
- _"2:255"_ — direct verse lookup

Every answer includes:
- **Synthesized answer** — Claude adapts tone to the question: scholarly depth for Quranic questions, compassionate guidance for personal ones
- **Arabic text** of the retrieved verse(s)
- **Three English translations** — Saheeh International, Yusuf Ali, Muhammad Asad (fetched live from alquran.cloud)
- **Tafsir excerpt** from Ibn Kathir (expandable)
- **Reflections** from Fi Zilal al-Quran — Sayyid Qutb (expandable)
- **Source citations** — Surah name + ayah number on every claim
- **Confidence classification** — Direct Matches (≥ 0.65 similarity) vs Related Verses
- **Low confidence flag** — shown when retrieval confidence is below 50%

### Read tab — Quran reader

Browse all 114 surahs and read every verse with Arabic text and English translation. Click any verse to open a reflection panel — the AI draws on Fi Zilal al-Quran and Ibn Kathir to generate a reflection grounded in classical scholarship. Reflections are pre-generated and cached so they load instantly after the first request. The reflection panel is resizable by dragging its left edge.

---

## Architecture — Hybrid RAG

The core principle: **retrieval grounds, LLM synthesizes**.

```
User question
      │
      ▼
 EMBED ──────── OpenAI text-embedding-3-small → 1,536-dim vector
      │
      ▼
 RETRIEVE ───── Supabase pgvector (concurrent searches)
      │          ├── match_verses   → top-7 Quran verses + Ibn Kathir tafsir
      │          └── match_reflections → top-3 Fi Zilal al-Quran passages
      │          If query contains "2:255", that verse is pinned at position 0
      ▼
 ENRICH ─────── alquran.cloud (concurrent per verse)
      │          └── 3 English translations: Saheeh International, Yusuf Ali, Asad
      ▼
 GENERATE ───── Claude claude-sonnet-4-6 (hybrid prompt)
      │          ├── GROUNDING: cite surah:ayah for every claim
      │          ├── SYNTHESIS: connect verses, draw out themes
      │          ├── REFLECTIONS: weave in Sayyid Qutb's insights
      │          └── TONE: adapt to question type (spiritual / academic)
      ▼
 RESPOND ─────── { answer, sources, reflections, fallback, query }
```

### Why hybrid instead of pure RAG or pure LLM

| Approach | Problem |
|----------|---------|
| Pure LLM | Hallucinations — fabricates verses, misattributes tafsir |
| Pure RAG | Robotic — presents retrieved chunks with no synthesis or depth |
| **Hybrid** | Retrieval provides grounding + citations, Claude provides voice + connections |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | Next.js 15 (React + TypeScript) |
| Vector database | Supabase (PostgreSQL + pgvector) |
| Embeddings | OpenAI `text-embedding-3-small` (1,536 dims) |
| Generation | Anthropic Claude `claude-sonnet-4-6` |
| Quran text + translations | alquran.cloud API |
| Tafsir (Ibn Kathir) | spa5k CDN via jsDelivr |
| Reflections (Fi Zilal) | User-provided PDF → ingested into Supabase |

---

## External dependencies

| Service | URL | Used for | When |
|---------|-----|---------|------|
| alquran.cloud | `https://api.alquran.cloud/v1` | Arabic text + 3 English translations | Ingest + runtime |
| spa5k tafsir CDN | `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/...` | Ibn Kathir tafsir (English) | Ingest only |
| Supabase | `https://supabase.com` | Vector storage + similarity search | Runtime |
| OpenAI | `https://platform.openai.com` | Embeddings | Ingest + runtime |
| Anthropic | `https://console.anthropic.com` | Claude generation | Runtime |

---

## Project structure

```
quran-companion/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS config
│   │   ├── config.py                # Settings from .env (pydantic-settings)
│   │   ├── database.py              # Supabase client
│   │   ├── schemas.py               # Pydantic models
│   │   ├── routes/
│   │   │   ├── ask.py               # POST /api/ask
│   │   │   └── quran.py             # GET /api/quran/surahs, /surahs/{n}, /verses/{s}/{a}/reflection
│   │   └── services/
│   │       ├── embeddings.py        # OpenAI embedding calls
│   │       ├── retrieval.py         # Concurrent verse + reflection search
│   │       ├── alquran.py           # alquran.cloud runtime enrichment
│   │       ├── generation.py        # Hybrid Claude prompt + generation
│   │       └── quran_reader.py      # Surah list, verse fetch, cached reflection lookup
│   ├── scripts/
│   │   ├── ingest.py                # One-time: all 6,236 verses + Ibn Kathir tafsir
│   │   ├── ingest_reflection.py     # Per-book: ingest any PDF into reflections table
│   │   └── generate_reflections.py  # Background worker: pre-generate verse reflections
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Shared header + nav (Ask / Read tabs)
│   │   ├── page.tsx                 # Ask tab — Q&A with RAG answers
│   │   ├── quran/
│   │   │   └── page.tsx             # Read tab — Quran reader with reflection panel
│   │   └── globals.css
│   ├── components/
│   │   ├── NavLinks.tsx             # Active-tab nav links
│   │   ├── QuestionInput.tsx        # Search input with Enter-to-submit
│   │   ├── AnswerSection.tsx        # Answer + direct/related/reflections layout
│   │   ├── VerseCard.tsx            # Arabic, 3 translations, tafsir toggle
│   │   └── ReflectionCard.tsx       # Fi Zilal passage with expand toggle
│   ├── lib/
│   │   └── api.ts                   # fetch wrappers for all API endpoints
│   └── types/
│       └── quran.ts                 # TypeScript interfaces
└── supabase/
    └── migrations/
        ├── 001_verses.sql           # verses table, ivfflat index, match_verses fn
        ├── 003_reflections.sql      # reflections table, ivfflat index, match_reflections fn
        ├── 004_quran_reader.sql     # get_surah_list() postgres function
        └── 005_verse_reflections.sql # verse_reflections table (pre-generated AI reflections)
```

---

## Database schema

### verses

```sql
CREATE TABLE verses (
  id                BIGSERIAL PRIMARY KEY,
  surah_number      INT  NOT NULL,
  ayah_number       INT  NOT NULL,
  arabic_text       TEXT NOT NULL,
  translation       TEXT NOT NULL,   -- Saheeh International (stored fallback)
  tafsir            TEXT,            -- Ibn Kathir English (from jsDelivr CDN)
  tafsir_source     TEXT DEFAULT 'Ibn Kathir',
  surah_name        TEXT NOT NULL,
  surah_name_arabic TEXT NOT NULL,
  embedding         vector(1536),
  UNIQUE (surah_number, ayah_number)
);
```

### reflections

```sql
CREATE TABLE reflections (
  id           BIGSERIAL PRIMARY KEY,
  source       TEXT NOT NULL,   -- e.g. 'Fi Zilal al-Quran'
  author       TEXT NOT NULL,   -- e.g. 'Sayyid Qutb'
  surah_number INT,             -- detected from PDF text, nullable
  verse_ref    TEXT,            -- e.g. '255' or '1-5', nullable
  content      TEXT NOT NULL,   -- ~400-word chunk
  embedding    vector(1536)
);
```

### verse_reflections

```sql
CREATE TABLE verse_reflections (
    id           SERIAL PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    ayah_number  INTEGER NOT NULL,
    reflection   TEXT    NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (surah_number, ayah_number)
);
```

Both vector tables use **IVFFlat indexes** with cosine distance. The `reflections` table is reusable — any number of books can be ingested with different `source` and `author` values. The `verse_reflections` table acts as a cache for pre-generated AI reflections; it is populated by the `generate_reflections.py` worker.

---

## Embedding strategy

**Verses** are embedded as:
```
{surah_name} ({surah}:{ayah}): {english_translation}
Tafsir: {first 300 chars of Ibn Kathir}
```

**Reflections** are embedded as raw ~400-word text chunks extracted from the PDF, with surah and verse context prepended where detected.

Including tafsir in the verse embedding means thematic queries ("forgiveness", "patience", "day of judgement") match against both the verse language and classical commentary.

---

## Confidence classification

Retrieved verses are classified at query time:

| Label | Similarity | Meaning |
|-------|-----------|---------|
| **Direct Match** | ≥ 0.65 | Highly relevant — central to the answer |
| **Related Verse** | 0.3–0.65 | Thematically connected — adds context |

This classification is passed to Claude in the prompt so it knows which verses to lead with and which to treat as supplementary.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor run: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Run `supabase/migrations/001_verses.sql`
4. Run `supabase/migrations/003_reflections.sql`
5. Run `supabase/migrations/004_quran_reader.sql`
6. Run `supabase/migrations/005_verse_reflections.sql`

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in your API keys
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Ingest Quran data (one-time, ~15 min)

Fetches all 6,236 verses from alquran.cloud + Ibn Kathir tafsir from jsDelivr, embeds and stores in Supabase.

```bash
python scripts/ingest.py
```

### 4. Ingest reflection books (one-time per book)

```bash
# Single volume
python scripts/ingest_reflection.py \
    --pdf /path/to/volume.pdf \
    --source "Fi Zilal al-Quran" --author "Sayyid Qutb"

# All volumes at once (sorted by filename)
python scripts/ingest_reflection.py \
    --dir /path/to/volumes/ \
    --source "Fi Zilal al-Quran" --author "Sayyid Qutb"
```

Any book can be added later using the same script with a different `--source` and `--author`.

### 5. Pre-generate verse reflections (optional, background worker)

The Quran reader tab shows an AI reflection when you click any verse. Reflections are generated on-demand and cached in `verse_reflections`. To pre-populate the cache so every verse loads instantly, run the worker:

```bash
# Test with a single surah first
python scripts/generate_reflections.py --surah 1

# Process a batch of N unprocessed verses (safe to re-run — skips already-done verses)
python scripts/generate_reflections.py --limit 100

# Process only a specific surah
python scripts/generate_reflections.py --surah 2

# Adjust delay between API calls (default 0.5s — lower is faster but uses more rate limit)
python scripts/generate_reflections.py --limit 100 --delay 0.3

# Combine flags — e.g. process 50 verses from Al-Imran
python scripts/generate_reflections.py --surah 3 --limit 50

# Full Quran — run unattended (will take several hours)
python scripts/generate_reflections.py
```

The script prints live progress with an estimated time remaining and skips any verse that already has a stored reflection, so it is safe to stop and resume at any time.

**Cost estimate:** each verse costs roughly $0.012 (Claude Sonnet input + output). Full Quran (6,236 verses) ≈ **$75 total**.

### 6. Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 7. Frontend

```bash
cd frontend
npm install
npm run dev     # proxies /api/* → localhost:8000
```

App available at `http://localhost:3000`.

---

## Cost estimate

| Component | One-time | Per query |
|-----------|----------|-----------|
| Verse ingest (OpenAI embeddings) | ~$0.01 | — |
| Reflection ingest (OpenAI embeddings) | ~$0.02–0.05 | — |
| Translations (alquran.cloud) | free | free |
| Query embedding (OpenAI) | — | ~$0.00003 |
| Claude generation | — | ~$0.008 |
| Supabase | free tier | free tier |

At 100 questions/month the total cost is under **$1/month**.
