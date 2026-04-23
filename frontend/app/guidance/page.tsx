'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { getGuidance } from '@/lib/api'
import type { GuidanceResponse } from '@/types/quran'

const PROMPTS = [
  "I feel spiritually disconnected lately",
  "I'm struggling with anxiety and can't find peace",
  "I feel like my prayers have no life in them",
  "I'm going through a hard time and feel alone",
  "I want to be closer to Allah but don't know how",
  "I feel guilty about my past and can't move forward",
]

export default function GuidancePage() {
  const [result, setResult] = useState<GuidanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSubmit(feeling: string) {
    const trimmed = feeling.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    setInput(trimmed)
    try {
      setResult(await getGuidance(trimmed))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(input)
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-stone-800">Personal Guidance</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
            Share what is on your heart — spiritually, emotionally, or in your daily life.
            You will receive gentle Islamic guidance, grounded in the Quran.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <textarea
            ref={textareaRef}
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How are you feeling? What are you struggling with? Share as little or as much as you like…"
            disabled={loading}
            className="w-full resize-none rounded-2xl px-5 pt-4 pb-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-xs text-stone-400">Press Enter to send · Shift+Enter for newline</p>
            <button
              onClick={() => handleSubmit(input)}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Reflecting…' : 'Find Guidance'}
            </button>
          </div>
        </div>

        {/* Example prompts */}
        {!result && !loading && !error && (
          <div className="mt-5">
            <p className="mb-2 text-xs text-stone-400">Or try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setInput(p)
                    handleSubmit(p)
                  }}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-stone-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
            <p className="text-sm">Finding guidance for you…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="mt-8 space-y-5">
            {/* Guidance response */}
            <div className="rounded-2xl bg-emerald-900 p-6 text-white shadow">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Guidance
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
                {result.answer}
              </ReactMarkdown>
            </div>

            {/* Supporting verses */}
            {result.sources.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Related Verses
                </p>
                <div className="space-y-3">
                  {result.sources.slice(0, 3).map((v) => (
                    <div
                      key={`${v.surah_number}:${v.ayah_number}`}
                      className="rounded-xl border border-stone-200 bg-white p-4"
                    >
                      <p className="mb-1 text-xs font-medium text-emerald-700">
                        {v.surah_name} {v.surah_number}:{v.ayah_number}
                      </p>
                      <p
                        className="mb-2 font-amiri text-xl leading-loose text-stone-800"
                        dir="rtl"
                        lang="ar"
                      >
                        {v.arabic_text}
                      </p>
                      {v.translations[0] && (
                        <p className="text-xs leading-relaxed text-stone-500">
                          {v.translations[0].text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-xs leading-relaxed text-stone-400">
              This guidance is for reflection and support, not a formal religious ruling.
              For personal rulings, please consult a qualified Islamic scholar.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
