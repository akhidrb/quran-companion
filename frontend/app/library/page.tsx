'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAskHistory,
  getDailyHistory,
  getGuidanceHistory,
  getVerseReflectionHistory,
} from '@/lib/api'
import type {
  AskHistoryItem,
  DailyHistoryItem,
  GuidanceHistoryItem,
  VerseReflectionHistoryItem,
} from '@/types/quran'

const THEME_LABELS: Record<string, string> = {
  patience: 'Patience',
  rizq: 'Provision & Rizq',
  anxiety: 'Anxiety & Worry',
  gratitude: 'Gratitude',
  repentance: 'Repentance',
  consistency: 'Consistency',
  'low energy': 'Low Energy',
  'closeness to Allah': 'Nearness to Allah',
}

type Tab = 'ask' | 'guidance' | 'verses' | 'daily'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ask', label: 'Q&A' },
  { id: 'guidance', label: 'Guidance' },
  { id: 'verses', label: 'Verses' },
  { id: 'daily', label: 'Daily' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-amber-300">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-emerald-200">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 ml-4 space-y-1 text-sm">{children}</ul>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

function AskCard({ item }: { item: AskHistoryItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs text-stone-400">{formatDate(item.created_at)}</p>
          <p className="truncate text-sm font-medium text-stone-700">{item.question}</p>
        </div>
        <svg
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          <p className="mb-3 text-sm font-medium text-stone-500">{item.question}</p>
          <div className="rounded-xl bg-emerald-900 p-4 text-white">
            <MarkdownContent text={item.answer} />
          </div>
        </div>
      )}
    </div>
  )
}

function GuidanceCard({ item }: { item: GuidanceHistoryItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs text-stone-400">{formatDate(item.created_at)}</p>
          <p className="truncate text-sm font-medium text-stone-700">{item.feeling}</p>
        </div>
        <svg
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          <p className="mb-3 text-sm font-medium text-stone-500">{item.feeling}</p>
          <div className="rounded-xl bg-emerald-900 p-4 text-white">
            <MarkdownContent text={item.answer} />
          </div>
        </div>
      )}
    </div>
  )
}

function VerseCard({ item }: { item: VerseReflectionHistoryItem }) {
  const [open, setOpen] = useState(false)
  const ref = `${item.surah_name} ${item.surah_number}:${item.ayah_number}`
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs text-stone-400">{formatDate(item.created_at)}</p>
          <p className="text-sm font-medium text-emerald-700">{ref}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{item.translation}</p>
        </div>
        <svg
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4 space-y-3">
          <div className="rounded-xl border border-emerald-100 bg-stone-50 p-4">
            <p
              className="font-amiri text-xl leading-loose text-stone-800"
              dir="rtl"
              lang="ar"
            >
              {item.arabic_text}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">{item.translation}</p>
          </div>
          <div className="rounded-xl bg-emerald-900 p-4 text-white">
            <MarkdownContent text={item.reflection} />
          </div>
        </div>
      )}
    </div>
  )
}

function DailyCard({ item }: { item: DailyHistoryItem }) {
  const [open, setOpen] = useState(false)
  const themeLabel = THEME_LABELS[item.theme] ?? item.theme
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs text-stone-400">{formatDate(item.created_at)}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {themeLabel}
            </span>
            <span className="text-xs text-stone-500">
              {item.surah_name} · {item.ayah_reference}
            </span>
          </div>
        </div>
        <svg
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4 space-y-3">
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className="mb-1 text-xs font-semibold text-emerald-600">
              {item.surah_name} · {item.ayah_reference}
            </p>
            <p
              className="mt-2 font-amiri text-xl leading-loose text-stone-800"
              dir="rtl"
              lang="ar"
            >
              {item.ayah_arabic}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {item.ayah_translation}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-900 p-4 text-white">
            <MarkdownContent text={item.entry} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function LibraryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('ask')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [askItems, setAskItems] = useState<AskHistoryItem[]>([])
  const [guidanceItems, setGuidanceItems] = useState<GuidanceHistoryItem[]>([])
  const [verseItems, setVerseItems] = useState<VerseReflectionHistoryItem[]>([])
  const [dailyItems, setDailyItems] = useState<DailyHistoryItem[]>([])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth?next=/library')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    loadTab(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  async function loadTab(tab: Tab) {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'ask') setAskItems(await getAskHistory())
      else if (tab === 'guidance') setGuidanceItems(await getGuidanceHistory())
      else if (tab === 'verses') setVerseItems(await getVerseReflectionHistory())
      else if (tab === 'daily') setDailyItems(await getDailyHistory())
    } catch {
      setError('Could not load your history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredAsk = useMemo(
    () =>
      askItems.filter(
        (i) =>
          i.question.toLowerCase().includes(search.toLowerCase()) ||
          i.answer.toLowerCase().includes(search.toLowerCase()),
      ),
    [askItems, search],
  )

  const filteredGuidance = useMemo(
    () =>
      guidanceItems.filter(
        (i) =>
          i.feeling.toLowerCase().includes(search.toLowerCase()) ||
          i.answer.toLowerCase().includes(search.toLowerCase()),
      ),
    [guidanceItems, search],
  )

  const filteredVerses = useMemo(
    () =>
      verseItems.filter(
        (i) =>
          i.surah_name.toLowerCase().includes(search.toLowerCase()) ||
          i.translation.toLowerCase().includes(search.toLowerCase()) ||
          i.reflection.toLowerCase().includes(search.toLowerCase()),
      ),
    [verseItems, search],
  )

  const filteredDaily = useMemo(
    () =>
      dailyItems.filter(
        (i) =>
          (THEME_LABELS[i.theme] ?? i.theme).toLowerCase().includes(search.toLowerCase()) ||
          i.surah_name.toLowerCase().includes(search.toLowerCase()) ||
          i.entry.toLowerCase().includes(search.toLowerCase()),
      ),
    [dailyItems, search],
  )

  if (isLoading) return null

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="mb-4 text-stone-500">
            Create a simple account to save your reflections and return to them later.
          </p>
          <Link
            href="/auth?next=/library"
            className="inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Create account or sign in
          </Link>
        </div>
      </main>
    )
  }

  function currentItems() {
    if (activeTab === 'ask') return filteredAsk
    if (activeTab === 'guidance') return filteredGuidance
    if (activeTab === 'verses') return filteredVerses
    return filteredDaily
  }

  const empty = !loading && !error && currentItems().length === 0

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-stone-800">Your Library</h1>
          <p className="mt-1 text-sm text-stone-500">
            Everything you have explored, saved automatically as you go.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your saved content…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setSearch('')
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {empty && (
          <div className="py-16 text-center text-stone-400">
            <p className="text-sm">
              {search
                ? 'No results match your search.'
                : 'Nothing saved here yet. Your activity will appear as you use the app.'}
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {activeTab === 'ask' &&
              filteredAsk.map((item) => <AskCard key={item.id} item={item} />)}
            {activeTab === 'guidance' &&
              filteredGuidance.map((item) => <GuidanceCard key={item.id} item={item} />)}
            {activeTab === 'verses' &&
              filteredVerses.map((item) => <VerseCard key={item.id} item={item} />)}
            {activeTab === 'daily' &&
              filteredDaily.map((item) => <DailyCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </main>
  )
}
