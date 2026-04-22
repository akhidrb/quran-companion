import VerseCard from './VerseCard'
import type { AskResponse } from '@/types/quran'

export default function AnswerSection({ result }: { result: AskResponse }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Synthesized answer */}
      <div className="rounded-2xl bg-emerald-900 p-6 text-white shadow">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Answer
          </span>
          {result.fallback && (
            <span className="ml-auto rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-300">
              Low confidence
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>
      </div>

      {/* Source verses */}
      {result.sources.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Retrieved Sources ({result.sources.length})
          </h3>
          <div className="space-y-3">
            {result.sources.map((verse) => (
              <VerseCard
                key={`${verse.surah_number}:${verse.ayah_number}`}
                verse={verse}
                showSimilarity
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
