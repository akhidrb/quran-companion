# Quran Companion

An AI-powered Quran assistant that answers questions grounded exclusively in Quranic verses and classical Tafsir. Built on Retrieval-Augmented Generation (RAG) — the assistant never answers from its own training data, only from what it retrieves from trusted Islamic sources.

---

## What it does

Users can ask questions in natural language or by verse reference:

- _"What does Ayat Al-Kursi mean?"_
- _"Show verses about patience (sabr)"_
- _"What is the tafsir of 2:286?"_
- _"Summarize Surah Al-Fatiha"_
- _"2:255"_ — direct verse lookup

Every answer includes:
- **Arabic text** of the retrieved verse(s)
- **Three English translations** — Saheeh International, Yusuf Ali, Muhammad Asad
- **Tafsir excerpt** from Ibn Kathir (expandable)
- **Source citation** — Surah name + ayah number
- **Similarity score** — how closely each verse matched the query
- **Low confidence flag** — shown when retrieval confidence is below 50%

---

## How it works — RAG Pipeline

```
User question
     │
     ▼
1. EMBED          OpenAI text-embedding-3-small converts the question to a 1,536-dim vector
     │
     ▼
2. RETRIEVE       pgvector (Supabase) finds the top-5 most similar verses via cosine similarity
     │             If the query contains a verse reference like "2:255", that verse is pinned at position 0
     ▼
3. ENRICH         alquran.cloud fetches 3 translations for each retrieved verse in parallel
     │
     ▼
4. GENERATE       Claude (claude-sonnet-4-6) receives only the retrieved verses + tafsir as context
     │             It is instructed to cite sources and never add unsupported claims
     ▼
5. RESPOND        Structured JSON returned to the frontend:
                  { answer, sources, fallback, query }
```

### Why RAG instead of a plain chatbot

A standard LLM can hallucinate Quranic content, misattribute tafsir, or mix interpretations from different schools. RAG grounds every answer in retrieved text — if the source doesn't say it, Claude doesn't say it either.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | Next.js 15 (React + TypeScript) |
| Vector database | Supabase (PostgreSQL + pgvector) |
| Embeddings | OpenAI `text-embedding-3-small` (1,536 dims) |
| Generation | Anthropic Claude `claude-sonnet-4-6` |
| Arabic/Quran text | alquran.cloud API |
| Tafsir (Ibn Kathir) | spa5k CDN via jsDelivr |

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
│   │   │   └── ask.py               # POST /api/ask
│   │   └── services/
│   │       ├── embeddings.py        # OpenAI embedding calls
│   │       ├── retrieval.py         # Vector search + verse enrichment
│   │       ├── alquran.py           # alquran.cloud runtime API calls
│   │       └── generation.py        # Claude prompt + generation
│   ├── scripts/
│   │   └── ingest.py                # One-time data ingestion (all 6,236 verses)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Main Q&A page
│   │   └── globals.css
│   ├── components/
│   │   ├── QuestionInput.tsx        # Search input with Enter-to-submit
│   │   ├── AnswerSection.tsx        # Answer + sources layout
│   │   └── VerseCard.tsx            # Verse card with Arabic, translations, tafsir
│   ├── lib/
│   │   └── api.ts                   # fetch wrapper for /api/ask
│   └── types/
│       └── quran.ts                 # TypeScript interfaces
└── supabase/
    └── migrations/
        └── 001_verses.sql           # Table, ivfflat index, match_verses function
```

---

## Database schema

```sql
CREATE TABLE verses (
  id                BIGSERIAL PRIMARY KEY,
  surah_number      INT  NOT NULL,
  ayah_number       INT  NOT NULL,
  arabic_text       TEXT NOT NULL,
  translation       TEXT NOT NULL,   -- Saheeh International (fallback)
  tafsir            TEXT,            -- Ibn Kathir English (from jsDelivr CDN)
  tafsir_source     TEXT DEFAULT 'Ibn Kathir',
  surah_name        TEXT NOT NULL,
  surah_name_arabic TEXT NOT NULL,
  embedding         vector(1536),    -- text-embedding-3-small
  UNIQUE (surah_number, ayah_number)
);
```

Similarity search uses an **IVFFlat index** (`lists = 80`, approximately `sqrt(6236)`) with cosine distance.

The `match_verses` SQL function returns the top-k verses above a similarity threshold, ordered by cosine distance.

---

## Embedding strategy

Each verse is embedded as:

```
{surah_name} ({surah}:{ayah}): {english_translation}

Tafsir: {first 300 chars of Ibn Kathir tafsir}
```

Including the tafsir excerpt in the embedding text means thematic queries ("forgiveness", "patience", "day of judgement") match against both the verse language and the classical commentary.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run `supabase/migrations/001_verses.sql`

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in your API keys
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Ingest data (one-time, ~15 min)

Fetches all 6,236 verses from alquran.cloud + Ibn Kathir tafsir from jsDelivr, embeds them, and stores in Supabase.

```bash
python scripts/ingest.py
```

Approximate cost: **~$0.01** (OpenAI embeddings for 6,236 verses).

### 4. Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend

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
| Embeddings (ingest) | ~$0.01 | ~$0.00003 |
| Translations (alquran.cloud) | free | free |
| Claude generation | — | ~$0.005 |
| Supabase | free tier | free tier |

At 100 questions/month the total cost is under **$1/month**.
