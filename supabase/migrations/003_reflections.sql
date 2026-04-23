-- Run this in the Supabase SQL Editor after 001_verses.sql

CREATE TABLE IF NOT EXISTS reflections (
  id           BIGSERIAL PRIMARY KEY,
  source       TEXT NOT NULL,   -- e.g. 'Fi Zilal al-Quran'
  author       TEXT NOT NULL,   -- e.g. 'Sayyid Qutb'
  surah_number INT,             -- NULL when not detectable from text
  verse_ref    TEXT,            -- e.g. '255' or '1-5'
  content      TEXT NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- lists ≈ sqrt(~8000 expected chunks) ≈ 90
CREATE INDEX IF NOT EXISTS reflections_embedding_idx
  ON reflections USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 90);

CREATE OR REPLACE FUNCTION match_reflections(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.35,
  match_count     int   DEFAULT 3
)
RETURNS TABLE (
  id           bigint,
  source       text,
  author       text,
  surah_number int,
  verse_ref    text,
  content      text,
  similarity   float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.source,
    r.author,
    r.surah_number,
    r.verse_ref,
    r.content,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM reflections r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
