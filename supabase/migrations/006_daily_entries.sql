CREATE TABLE IF NOT EXISTS daily_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL,
  theme TEXT NOT NULL,
  ayah_reference TEXT NOT NULL,
  ayah_arabic TEXT NOT NULL,
  ayah_translation TEXT NOT NULL,
  surah_name TEXT NOT NULL,
  entry TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entry_date, theme)
);

CREATE INDEX IF NOT EXISTS daily_entries_date_theme ON daily_entries (entry_date, theme);
