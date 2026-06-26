'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/review', label: 'Review Queue', icon: '⚡' },
  { href: '/appeals', label: 'Appeals', icon: '⚖️' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-[#0f0f0f] border-r border-[#1a1a1a] flex flex-col">
      <div className="px-5 py-5 border-b border-[#1a1a1a]">
        <p className="text-xs font-bold text-white tracking-widest uppercase">Moderation</p>
        <p className="text-xs text-gray-600 mt-0.5">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[#1a1a1a]">
        <p className="text-xs text-gray-700">reviewer_001</p>
      </div>
    </aside>
  )
}
