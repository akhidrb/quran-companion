'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signup, login } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type Mode = 'signin' | 'create'

function AuthForm() {
  const { user, isLoading, login: storeLogin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) router.replace(next)
  }, [user, isLoading, next, router])

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setPin('')
    setConfirmPin('')
  }

  function handlePinKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Enter']
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'create' && pin !== confirmPin) {
      setError('PINs do not match. Please try again.')
      return
    }

    setSubmitting(true)
    try {
      const result =
        mode === 'create'
          ? await signup(username.trim(), pin)
          : await login(username.trim(), pin)

      storeLogin(result.token, { id: result.user_id, username: result.username })
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-800 font-amiri text-2xl text-white">
            ق
          </div>
          <h1 className="mt-1 text-lg font-semibold text-stone-800">
            {mode === 'create' ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm leading-relaxed text-stone-500">
            {mode === 'create'
              ? 'Create a simple account to save your reflections and return to them later.'
              : 'Sign in to access your saved reflections and history.'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-xl border border-stone-200 bg-stone-50 p-1">
          {(['signin', 'create'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ibrahim_k"
              autoComplete="username"
              autoFocus
              required
              minLength={3}
              maxLength={30}
              disabled={submitting}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            {mode === 'create' && (
              <p className="mt-1 text-xs text-stone-400">
                Letters, numbers, and underscores only. 3–30 characters.
              </p>
            )}
          </div>

          {/* PIN */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              6-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handlePinKeyDown}
              placeholder="••••••"
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              maxLength={6}
              disabled={submitting}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Confirm PIN — only for create */}
          {mode === 'create' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                onKeyDown={handlePinKeyDown}
                placeholder="••••••"
                autoComplete="new-password"
                required
                minLength={6}
                maxLength={6}
                disabled={submitting}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || pin.length < 6 || !username.trim()}
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'create'
              ? 'Create account'
              : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-stone-400">
          We ask for no email, no personal information, and no data beyond your
          username and PIN. Your reflections are yours alone.
        </p>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  )
}
