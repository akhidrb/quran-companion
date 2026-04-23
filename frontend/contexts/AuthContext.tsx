'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AuthUser } from '@/types/quran'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('qc_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // corrupted storage — clear it
      localStorage.removeItem('qc_token')
      localStorage.removeItem('qc_user')
    }
    setIsLoading(false)

    // Listen for token invalidation fired by apiFetch on 401
    function onExpired() {
      setUser(null)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  function login(token: string, u: AuthUser) {
    localStorage.setItem('qc_token', token)
    localStorage.setItem('qc_user', JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    localStorage.removeItem('qc_token')
    localStorage.removeItem('qc_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
