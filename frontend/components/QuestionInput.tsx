'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface Props {
  onAsk: (question: string) => void
  loading: boolean
}

export default function QuestionInput({ onAsk, loading }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function submit() {
    const q = value.trim()
    if (q && !loading) onAsk(q)
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder='Ask a question or enter a verse reference like "2:255"…'
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-5 py-4 pr-24 text-base text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
      />
      <button
        onClick={submit}
        disabled={loading || !value.trim()}
        className="absolute bottom-3 right-3 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
      >
        {loading ? 'Asking…' : 'Ask'}
      </button>
    </div>
  )
}
