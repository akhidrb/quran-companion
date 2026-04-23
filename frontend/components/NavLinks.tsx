'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Ask', href: '/' },
  { label: 'Read', href: '/quran' },
  { label: 'Guidance', href: '/guidance' },
  { label: 'Daily', href: '/daily' },
]

export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {TABS.map(({ label, href }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
