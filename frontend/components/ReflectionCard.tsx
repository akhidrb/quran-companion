'use client'

import { useState } from 'react'
import type { ReflectionResult } from '@/types/quran'

export default function ReflectionCard({ reflection }: { reflection: ReflectionResult }) {
  const [expanded, setExpanded] = useState(false)
  const preview = reflection.content.slice(0, 320)
  const hasMore = reflection.content.length > 320

  const ref = reflection.surah_number
    ? `Surah ${reflection.surah_number}${reflection.verse_ref ? `:${reflection.verse_ref}` : ''}`
    : null

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
            {reflection.source}
          </span>
          {ref && (
            <span className="text-xs text-stone-400">{ref}</span>
          )}
        </div>
        <span className="text-xs text-stone-400">{reflection.author}</span>
      </div>

      <p className="text-sm leading-relaxed text-stone-700">
        {expanded ? reflection.content : preview}
        {!expanded && hasMore && '…'}
      </p>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-violet-700 hover:text-violet-900"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
