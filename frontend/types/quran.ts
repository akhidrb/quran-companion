export interface Translation {
  name: string
  text: string
}

export interface Verse {
  id: number
  surah_number: number
  ayah_number: number
  arabic_text: string
  translation: string
  tafsir: string | null
  tafsir_source: string
  surah_name: string
  surah_name_arabic: string
}

export interface VerseResult extends Verse {
  similarity: number
  confidence: 'direct' | 'related'
  translations: Translation[]
}

export interface ReflectionResult {
  id: number
  source: string
  author: string
  surah_number: number | null
  verse_ref: string | null
  content: string
  similarity: number
}

export interface AskResponse {
  answer: string
  sources: VerseResult[]
  reflections: ReflectionResult[]
  fallback: boolean
  query: string
}

export interface SurahInfo {
  surah_number: number
  surah_name: string
  surah_name_arabic: string
  ayah_count: number
}

export interface VerseDetail {
  surah_number: number
  ayah_number: number
  arabic_text: string
  translations: Translation[]
}

export interface VerseReflection {
  id: number
  source: string
  author: string
  verse_ref: string | null
  content: string
}

export interface GuidanceResponse {
  answer: string
  sources: VerseResult[]
  query: string
}

export interface DailyEntry {
  date: string
  theme: string
  ayah_reference: string
  ayah_arabic: string
  ayah_translation: string
  surah_name: string
  entry: string
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  username: string
}

export interface TokenResponse {
  token: string
  username: string
  user_id: number
}

// ── History ─────────────────────────────────────────────────────────────────

export interface AskHistoryItem {
  id: number
  question: string
  answer: string
  created_at: string
}

export interface GuidanceHistoryItem {
  id: number
  feeling: string
  answer: string
  created_at: string
}

export interface VerseReflectionHistoryItem {
  id: number
  surah_number: number
  ayah_number: number
  surah_name: string
  arabic_text: string
  translation: string
  reflection: string
  created_at: string
}

export interface DailyHistoryItem {
  id: number
  entry_date: string
  theme: string
  ayah_reference: string
  ayah_arabic: string
  ayah_translation: string
  surah_name: string
  entry: string
  created_at: string
}
