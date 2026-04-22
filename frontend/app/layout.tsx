import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
        {children}
      </body>
    </html>
  )
}
