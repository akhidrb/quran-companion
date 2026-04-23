import type { AskResponse, SurahInfo, VerseDetail, VerseReflection } from '@/types/quran'

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Failed to get a response')
  }
  return res.json()
}

export async function getSurahs(): Promise<SurahInfo[]> {
  const res = await fetch('/api/quran/surahs')
  if (!res.ok) throw new Error('Failed to load surahs')
  return res.json()
}

export async function getSurahVerses(surahNumber: number): Promise<VerseDetail[]> {
  const res = await fetch(`/api/quran/surahs/${surahNumber}`)
  if (!res.ok) throw new Error('Failed to load verses')
  return res.json()
}

export async function getVerseReflection(
  surahNumber: number,
  ayahNumber: number,
): Promise<VerseReflection[]> {
  const res = await fetch(`/api/quran/verses/${surahNumber}/${ayahNumber}/reflection`)
  if (!res.ok) throw new Error('Failed to load reflection')
  return res.json()
}
