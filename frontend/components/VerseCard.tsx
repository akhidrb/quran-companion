'use client'

import { useState } from 'react'
import type { VerseResult } from '@/types/quran'

interface Props {
  verse: VerseResult
  showSimilarity?: boolean
}

export default function VerseCard({ verse, showSimilarity }: Props) {
  const [tafsirOpen, setTafsirOpen] = useState(false)
  const [translationsOpen, setTranslationsOpen] = useState(false)

  const primaryTranslation =
    verse.translations.find((t) => t.name === 'Saheeh International')?.text ?? verse.translation

  const otherTranslations = verse.translations.filter((t) => t.name !== 'Saheeh International')

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {verse.surah_name} {verse.surah_number}:{verse.ayah_number}
        </span>
        {showSimilarity && (
          <span className="text-xs text-stone-400">
            {Math.round(verse.similarity * 100)}% match
          </span>
        )}
      </div>

      <p dir="rtl" className="mb-3 font-amiri text-xl leading-loose text-stone-800">
        {verse.arabic_text}
      </p>

      {/* Primary translation */}
      <p className="mb-2 text-sm italic leading-relaxed text-stone-600">
        &ldquo;{primaryTranslation}&rdquo;
      </p>

      {/* Other translations toggle */}
      {otherTranslations.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setTranslationsOpen(!translationsOpen)}
            className="text-xs font-medium text-stone-400 hover:text-stone-600"
          >
            {translationsOpen ? 'Hide' : 'Show'} other translations
          </button>
          {translationsOpen && (
            <div className="mt-2 space-y-2">
              {otherTranslations.map((t) => (
                <div key={t.name}>
                  <span className="text-xs font-medium text-stone-400">{t.name}</span>
                  <p className="text-xs italic leading-relaxed text-stone-500">&ldquo;{t.text}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tafsir */}
      {verse.tafsir && (
        <div className="border-t border-stone-100 pt-3">
          <button
            onClick={() => setTafsirOpen(!tafsirOpen)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
          >
            {tafsirOpen ? 'Hide' : 'Show'} Tafsir — Ibn Kathir
          </button>
          {tafsirOpen && (
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {verse.tafsir.length > 800 ? verse.tafsir.slice(0, 800) + '…' : verse.tafsir}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
