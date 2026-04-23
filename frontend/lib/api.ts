import type {
  AskHistoryItem,
  AskResponse,
  DailyEntry,
  DailyHistoryItem,
  GuidanceHistoryItem,
  GuidanceResponse,
  SurahInfo,
  TokenResponse,
  VerseDetail,
  VerseReflectionHistoryItem,
} from '@/types/quran'

// Attaches the JWT (if present) and handles expired-token cleanup.
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('qc_token') : null
  const base = (options.headers ?? {}) as Record<string, string>
  const headers: Record<string, string> = token
    ? { ...base, Authorization: `Bearer ${token}` }
    : base
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401 && token) {
    localStorage.removeItem('qc_token')
    localStorage.removeItem('qc_user')
    window.dispatchEvent(new CustomEvent('auth:expired'))
  }
  return res
}

// ── Core features ────────────────────────────────────────────────────────────

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await apiFetch('/api/ask', {
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
  const res = await apiFetch('/api/quran/surahs')
  if (!res.ok) throw new Error('Failed to load surahs')
  return res.json()
}

export async function getSurahVerses(surahNumber: number): Promise<VerseDetail[]> {
  const res = await apiFetch(`/api/quran/surahs/${surahNumber}`)
  if (!res.ok) throw new Error('Failed to load verses')
  return res.json()
}

export async function getVerseReflection(
  surahNumber: number,
  ayahNumber: number,
): Promise<string> {
  const res = await apiFetch(`/api/quran/verses/${surahNumber}/${ayahNumber}/reflection`)
  if (!res.ok) throw new Error('Failed to load reflection')
  const data = await res.json()
  return data.reflection
}

export async function getGuidance(feeling: string): Promise<GuidanceResponse> {
  const res = await apiFetch('/api/guidance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feeling }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Failed to get a response')
  }
  return res.json()
}

export async function getDailyEntry(theme?: string): Promise<DailyEntry> {
  const url = theme ? `/api/daily?theme=${encodeURIComponent(theme)}` : '/api/daily'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Failed to load daily entry')
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(username: string, pin: string): Promise<TokenResponse> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? 'Failed to create account')
  return data
}

export async function login(username: string, pin: string): Promise<TokenResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? 'Failed to sign in')
  return data
}

// ── History ──────────────────────────────────────────────────────────────────

export async function getAskHistory(): Promise<AskHistoryItem[]> {
  const res = await apiFetch('/api/history/ask')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

export async function getGuidanceHistory(): Promise<GuidanceHistoryItem[]> {
  const res = await apiFetch('/api/history/guidance')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

export async function getVerseReflectionHistory(): Promise<VerseReflectionHistoryItem[]> {
  const res = await apiFetch('/api/history/verse-reflections')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

export async function getDailyHistory(): Promise<DailyHistoryItem[]> {
  const res = await apiFetch('/api/history/daily')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}
