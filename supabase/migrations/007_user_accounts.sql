-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (LOWER(username));

-- Ask Q&A history
CREATE TABLE IF NOT EXISTS user_ask_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_ask_history_user_id ON user_ask_history (user_id, created_at DESC);

-- Personal guidance history
CREATE TABLE IF NOT EXISTS user_guidance_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feeling TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_guidance_history_user_id ON user_guidance_history (user_id, created_at DESC);

-- Verse reflections history
CREATE TABLE IF NOT EXISTS user_verse_reflections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  surah_name TEXT NOT NULL,
  arabic_text TEXT NOT NULL,
  translation TEXT NOT NULL,
  reflection TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, surah_number, ayah_number)
);
CREATE INDEX IF NOT EXISTS user_verse_reflections_user_id ON user_verse_reflections (user_id, created_at DESC);

-- Daily companion history
CREATE TABLE IF NOT EXISTS user_daily_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  theme TEXT NOT NULL,
  ayah_reference TEXT NOT NULL,
  ayah_arabic TEXT NOT NULL,
  ayah_translation TEXT NOT NULL,
  surah_name TEXT NOT NULL,
  entry TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_date, theme)
);
CREATE INDEX IF NOT EXISTS user_daily_history_user_id ON user_daily_history (user_id, created_at DESC);
