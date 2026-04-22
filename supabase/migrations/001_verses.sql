-- Run this in the Supabase SQL Editor before running the ingest script.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS verses (
  id                BIGSERIAL PRIMARY KEY,
  surah_number      INT  NOT NULL,
  ayah_number       INT  NOT NULL,
  arabic_text       TEXT NOT NULL,
  translation       TEXT NOT NULL,
  tafsir            TEXT,
  tafsir_source     TEXT NOT NULL DEFAULT 'Ibn Kathir',
  surah_name        TEXT NOT NULL,
  surah_name_arabic TEXT NOT NULL,
  embedding         vector(1536),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (surah_number, ayah_number)
);

-- IVFFlat index for approximate nearest-neighbor search.
-- lists ≈ sqrt(6236) ≈ 79; round up to 80.
-- Build this AFTER inserting data for best performance.
CREATE INDEX IF NOT EXISTS verses_embedding_idx
  ON verses USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 80);

-- Similarity search function called by the FastAPI retrieval service.
CREATE OR REPLACE FUNCTION match_verses(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count     int   DEFAULT 5
)
RETURNS TABLE (
  id                bigint,
  surah_number      int,
  ayah_number       int,
  arabic_text       text,
  translation       text,
  tafsir            text,
  tafsir_source     text,
  surah_name        text,
  surah_name_arabic text,
  similarity        float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.surah_number,
    v.ayah_number,
    v.arabic_text,
    v.translation,
    v.tafsir,
    v.tafsir_source,
    v.surah_name,
    v.surah_name_arabic,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM verses v
  WHERE 1 - (v.embedding <=> query_embedding) > match_threshold
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
