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
  const [panelWidth, setPanelWidth] = useState(384)
  const [isMobile, setIsMobile] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSurahs().then(setSurahs).catch(console.error)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function onDragStart(e: React.MouseEvent) {
    const startX = e.clientX
    const startWidth = panelWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    function onMove(e: MouseEvent) {
      const delta = startX - e.clientX
      setPanelWidth(Math.min(Math.max(startWidth + delta, 300), 900))
    }
    function onUp() {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    e.preventDefault()
  }

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
      <div
        className="flex-1 transition-[margin] duration-300"
        style={{ marginRight: selectedVerse && !isMobile ? panelWidth : 0 }}
      >
        {/* Surah picker */}
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3 md:px-6">
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

        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
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
                  className={`mb-3 w-full rounded-2xl border p-4 text-left transition-all hover:border-emerald-300 hover:shadow-sm md:p-5 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    <span
                      className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {verse.ayah_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="mb-3 font-amiri text-xl leading-loose text-stone-800 md:text-2xl md:mb-4"
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
          {/* Backdrop — covers bottom nav on mobile (z-40 > z-30) */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setSelectedVerse(null)}
          />
          {/* Panel */}
          <div
            ref={panelRef}
            className={`fixed z-50 flex flex-col overflow-y-auto bg-white shadow-2xl ${
              isMobile
                ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl border-t border-stone-200'
                : 'bottom-0 right-0 top-[57px] border-l border-stone-200'
            }`}
            style={isMobile ? {} : { width: panelWidth }}
          >
            {/* Desktop drag handle */}
            {!isMobile && (
              <div
                onMouseDown={onDragStart}
                className="absolute bottom-0 left-0 top-0 w-1 cursor-col-resize bg-transparent transition-colors hover:bg-emerald-400/30 active:bg-emerald-400/50"
              />
            )}

            {/* Mobile drag indicator pill */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-stone-300" />
              </div>
            )}

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
            <div className="flex-1 px-5 py-5">
              {loadingReflection && (
                <div className="flex flex-col items-center gap-3 pt-8 text-stone-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                  <p className="text-xs">Reflecting…</p>
                </div>
              )}

              {!loadingReflection && reflection && (
                <div className="rounded-2xl bg-emerald-900 p-5 text-white shadow">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Reflection
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
                      ol: ({ children }) => (
                        <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                          {children}
                        </h3>
                      ),
                    }}
                  >
                    {reflection}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
