'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { getDailyEntry } from '@/lib/api'
import type { DailyEntry } from '@/types/quran'

const THEMES = [
  { id: 'patience', label: 'Patience' },
  { id: 'rizq', label: 'Provision & Rizq' },
  { id: 'anxiety', label: 'Anxiety & Worry' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'repentance', label: 'Repentance' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'low energy', label: 'Low Energy' },
  { id: 'closeness to Allah', label: 'Nearness to Allah' },
]

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function DailyPage() {
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<string | null>(null)

  async function load(theme?: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await getDailyEntry(theme)
      setEntry(data)
      setActiveTheme(data.theme)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today\'s entry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-stone-800">Daily Companion</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
            A short daily entry to help you return to the Quran — gently, one day at a time.
          </p>
        </div>

        {/* Theme picker */}
        <div className="mb-7 flex flex-wrap gap-2">
          {THEMES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id !== activeTheme) load(id)
              }}
              disabled={loading}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                activeTheme === id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-stone-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
            <p className="text-sm">Preparing today's entry…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Entry */}
        {!loading && entry && (
          <div className="space-y-5">
            {/* Date + theme */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-400">{formatDate(entry.date)}</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {THEMES.find((t) => t.id === entry.theme)?.label ?? entry.theme}
              </span>
            </div>

            {/* Verse */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                {entry.surah_name} · {entry.ayah_reference}
              </p>
              <p
                className="mt-3 font-amiri text-2xl leading-loose text-stone-800"
                dir="rtl"
                lang="ar"
              >
                {entry.ayah_arabic}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                {entry.ayah_translation}
              </p>
            </div>

            {/* Companion entry */}
            <div className="rounded-2xl bg-emerald-900 p-6 text-white shadow">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Today's Reflection
                </span>
              </div>
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-relaxed last:mb-0">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-amber-300">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-emerald-200">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 ml-4 space-y-1 text-sm">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                }}
              >
                {entry.entry}
              </ReactMarkdown>
            </div>

            {/* Refresh nudge */}
            <p className="text-center text-xs text-stone-400">
              A new entry awaits you tomorrow. Come back then.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
