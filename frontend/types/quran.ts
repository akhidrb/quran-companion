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
