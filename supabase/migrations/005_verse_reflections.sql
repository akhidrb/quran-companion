CREATE TABLE verse_reflections (
    id          SERIAL PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    ayah_number  INTEGER NOT NULL,
    reflection   TEXT    NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (surah_number, ayah_number)
);

CREATE INDEX ON verse_reflections (surah_number, ayah_number);
