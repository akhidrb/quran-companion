'use client'

import { useState } from 'react'
import QuestionInput from '@/components/QuestionInput'
import AnswerSection from '@/components/AnswerSection'
import { askQuestion } from '@/lib/api'
import type { AskResponse } from '@/types/quran'

const EXAMPLES = [
  'What does Ayat Al-Kursi mean?',
  'Show verses about patience (sabr)',
  'What is the tafsir of 2:286?',
  'Verses about gratitude to Allah',
  'Summarize Surah Al-Fatiha',
]

export default function Home() {
  const [result, setResult] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk(question: string) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await askQuestion(question))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 font-amiri text-lg text-white">
            ق
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-800">Quran Companion</h1>
            <p className="text-xs text-stone-400">Answers grounded in Quran and Tafsir</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <QuestionInput onAsk={handleAsk} loading={loading} />

        {!result && !loading && !error && (
          <div className="mt-5">
            <p className="mb-2 text-xs text-stone-400">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-stone-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
            <p className="text-sm">Retrieving from sources…</p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && !loading && <AnswerSection result={result} />}
      </div>
    </main>
  )
}
