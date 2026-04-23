import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import NavLinks from '@/components/NavLinks'
import UserMenu from '@/components/UserMenu'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quran Companion',
  description: 'AI-powered Quran companion grounded in classical Tafsir',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-stone-50 text-stone-900`}>
        <AuthProvider>
          <header className="border-b border-stone-200 bg-white px-6 py-3">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 font-amiri text-lg text-white">
                  ق
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-stone-800">Quran Companion</h1>
                  <p className="text-xs text-stone-400">Islamic guidance for any question</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NavLinks />
                <div className="h-4 w-px bg-stone-200" />
                <UserMenu />
              </div>
            </div>
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
