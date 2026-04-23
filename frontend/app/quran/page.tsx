'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { getSurahs, getSurahVerses, getVerseReflection } from '@/lib/api'
import type { SurahInfo, VerseDetail } from '@/types/quran'

export default function QuranPage() {
  const [surahs, setSurahs] = useState<SurahInfo[]>([])
  const [selectedSurah, setSelectedSurah] = useState<SurahInfo | null>(null)
  const [verses, setVerses] = useState<VerseDetail[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [selectedVerse, setSelectedVerse] = useState<VerseDetail | null>(null)
  const [reflection, setReflection] = useState<string | null>(null)
  const [loadingReflection, setLoadingReflection] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSurahs().then(setSurahs).catch(console.error)
  }, [])

  async function handleSelectSurah(surahNumber: number) {
    const surah = surahs.find((s) => s.surah_number === surahNumber) ?? null
    setSelectedSurah(surah)
    setSelectedVerse(null)
    setReflection(null)
    setLoadingVerses(true)
    try {
      setVerses(await getSurahVerses(surahNumber))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingVerses(false)
    }
  }

  async function handleSelectVerse(verse: VerseDetail) {
    if (selectedVerse?.ayah_number === verse.ayah_number) return
    setSelectedVerse(verse)
    setReflection(null)
    setLoadingReflection(true)
    panelRef.current?.scrollTo({ top: 0 })
    try {
      setReflection(await getVerseReflection(verse.surah_number, verse.ayah_number))
    } catch (e) {
      console.error(e)
      setReflection('Could not load reflection. Please try again.')
    } finally {
      setLoadingReflection(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-57px)]">
      {/* Verse list */}
      <div className={`flex-1 transition-all duration-300 ${selectedVerse ? 'md:mr-[24rem]' : ''}`}>
        {/* Surah picker */}
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3">
          <div className="mx-auto max-w-3xl">
            <select
              defaultValue=""
              onChange={(e) => handleSelectSurah(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Select a Surah…
              </option>
              {surahs.map((s) => (
                <option key={s.surah_number} value={s.surah_number}>
                  {s.surah_number}. {s.surah_name} — {s.surah_name_arabic} ({s.ayah_count} verses)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-6">
          {!selectedSurah && !loadingVerses && (
            <div className="mt-20 flex flex-col items-center gap-3 text-stone-400">
              <span className="font-amiri text-5xl">ق</span>
              <p className="text-sm">Select a surah to begin reading</p>
            </div>
          )}

          {loadingVerses && (
            <div className="mt-20 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
            </div>
          )}

          {!loadingVerses && selectedSurah && (
            <div className="mb-6 text-center">
              <p className="font-amiri text-3xl text-stone-800">{selectedSurah.surah_name_arabic}</p>
              <p className="mt-1 text-sm font-medium text-stone-500">
                {selectedSurah.surah_name} · {selectedSurah.ayah_count} verses
              </p>
            </div>
          )}

          {!loadingVerses &&
            verses.map((verse) => {
              const isSelected = selectedVerse?.ayah_number === verse.ayah_number
              return (
                <button
                  key={verse.ayah_number}
                  onClick={() => handleSelectVerse(verse)}
                  className={`mb-3 w-full rounded-2xl border p-5 text-left transition-all hover:border-emerald-300 hover:shadow-sm ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {verse.ayah_number}
                    </span>
                    <div className="flex-1">
                      <p
                        className="mb-4 font-amiri text-2xl leading-loose text-stone-800"
                        dir="rtl"
                        lang="ar"
                      >
                        {verse.arabic_text}
                      </p>
                      {verse.translations[0] && (
                        <>
                          <p className="text-sm leading-relaxed text-stone-600">
                            {verse.translations[0].text}
                          </p>
                          <p className="mt-1 text-xs text-stone-400">
                            — {verse.translations[0].name}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
        </div>
      </div>

      {/* Reflection panel */}
      {selectedVerse && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            onClick={() => setSelectedVerse(null)}
          />
          {/* Panel */}
          <div
            ref={panelRef}
            className="fixed bottom-0 right-0 top-[57px] z-30 flex w-full flex-col overflow-y-auto border-l border-stone-200 bg-white shadow-2xl md:w-96"
          >
            {/* Panel header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Reflection
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  {selectedSurah?.surah_name} {selectedVerse.surah_number}:
                  {selectedVerse.ayah_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedVerse(null)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="Close reflection"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Verse preview */}
            <div className="border-b border-stone-100 bg-stone-50 px-5 py-4">
              <p className="font-amiri text-lg leading-loose text-stone-700" dir="rtl" lang="ar">
                {selectedVerse.arabic_text}
              </p>
              {selectedVerse.translations[0] && (
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  {selectedVerse.translations[0].text}
                </p>
              )}
            </div>

            {/* AI reflection */}
            <div className="flex-1 px-5 py-4">
              {loadingReflection && (
                <div className="flex flex-col items-center gap-3 pt-8 text-stone-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                  <p className="text-xs">Reflecting…</p>
                </div>
              )}

              {!loadingReflection && reflection && (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 text-sm leading-relaxed text-stone-700 last:mb-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-emerald-800">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-stone-600">{children}</em>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-3 ml-4 space-y-1 text-sm">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed text-stone-700">{children}</li>
                    ),
                  }}
                >
                  {reflection}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
