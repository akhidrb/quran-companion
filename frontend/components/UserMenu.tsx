'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function UserMenu() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  if (isLoading) return null

  if (!user) {
    return (
      <Link
        href="/auth"
        className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
      >
        Sign in
      </Link>
    )
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-xs text-stone-500">
        <span className="text-stone-400">Signed in as </span>
        <span className="font-medium text-stone-600">{user.username}</span>
      </span>
      <button
        onClick={handleLogout}
        className="rounded-lg px-2 py-1 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
      >
        Sign out
      </button>
    </div>
  )
}
