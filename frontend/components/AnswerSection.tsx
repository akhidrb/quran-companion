import ReactMarkdown from 'react-markdown'
import VerseCard from './VerseCard'
import ReflectionCard from './ReflectionCard'
import type { AskResponse } from '@/types/quran'

export default function AnswerSection({ result }: { result: AskResponse }) {
  const direct = result.sources.filter((v) => v.confidence === 'direct')
  const related = result.sources.filter((v) => v.confidence === 'related')

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
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 text-sm leading-relaxed last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-amber-300">{children}</strong>,
            em: ({ children }) => <em className="italic text-emerald-200">{children}</em>,
            ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1 text-sm">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal text-sm">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            h3: ({ children }) => <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-300">{children}</h3>,
          }}
        >
          {result.answer}
        </ReactMarkdown>
      </div>

      {/* Direct matches */}
      {direct.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Direct Matches ({direct.length})
          </h3>
          <div className="space-y-3">
            {direct.map((verse) => (
              <VerseCard
                key={`${verse.surah_number}:${verse.ayah_number}`}
                verse={verse}
                showSimilarity
              />
            ))}
          </div>
        </div>
      )}

      {/* Related verses */}
      {related.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Related Verses ({related.length})
          </h3>
          <div className="space-y-3">
            {related.map((verse) => (
              <VerseCard
                key={`${verse.surah_number}:${verse.ayah_number}`}
                verse={verse}
                showSimilarity
              />
            ))}
          </div>
        </div>
      )}

      {/* Reflections */}
      {result.reflections.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Reflections — Fi Zilal al-Quran ({result.reflections.length})
          </h3>
          <div className="space-y-3">
            {result.reflections.map((r) => (
              <ReflectionCard key={r.id} reflection={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
