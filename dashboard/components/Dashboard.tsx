'use client'

import { useState, useEffect } from 'react'
import ModerateTab from './tabs/ModerateTab'
import JobsTab from './tabs/JobsTab'
import ReviewTab from './tabs/ReviewTab'
import AppealsTab from './tabs/AppealsTab'
import AnalyticsTab from './tabs/AnalyticsTab'
import HistoryTab from './tabs/HistoryTab'
import Tour from './Tour'
import {
  ShieldIcon, ScanIcon, LayersIcon, UsersIcon,
  ScaleIcon, BarChartIcon, HistoryIcon, GlobeIcon,
} from './Icons'

const NAV = [
  { id: 'moderate',  label: 'Moderate',    Icon: ScanIcon,      desc: 'Real-time content scanning' },
  { id: 'jobs',      label: 'Async Jobs',  Icon: LayersIcon,    desc: 'Background job queue' },
  { id: 'review',    label: 'Review Queue',Icon: UsersIcon,     desc: 'Human-in-the-loop decisions' },
  { id: 'appeals',   label: 'Appeals',     Icon: ScaleIcon,     desc: 'User appeal management' },
  { id: 'analytics', label: 'Analytics',   Icon: BarChartIcon,  desc: 'Stats and trends' },
  { id: 'history',   label: 'History',     Icon: HistoryIcon,   desc: 'All past decisions' },
]

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  moderate:  { title: 'Moderate Content',   subtitle: 'Submit text, images, or video files for real-time AI analysis' },
  jobs:      { title: 'Async Jobs',         subtitle: 'Queue moderation jobs and retrieve results asynchronously' },
  review:    { title: 'Review Queue',       subtitle: 'Low-confidence decisions awaiting human judgement' },
  appeals:   { title: 'Appeals',            subtitle: 'Manage user appeals and re-analysis requests' },
  analytics: { title: 'Analytics',          subtitle: 'Trends, distributions, and performance metrics' },
  history:   { title: 'Decision History',   subtitle: 'Browse and audit all past moderation decisions' },
}

export default function Dashboard() {
  const [tab, setTab] = useState('moderate')
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.ok ? setApiStatus('ok') : setApiStatus('error'))
      .catch(() => setApiStatus('error'))
  }, [])

  const page = PAGE_TITLES[tab]

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#08080b] border-r border-[#1c1c24]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1c1c24]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldIcon size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Sentinel</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Content Moderation</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-wider px-2 mb-2">Workspace</p>
          {NAV.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium border transition-all duration-150 text-left ${
                  active
                    ? 'nav-item-active border-blue-900/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <Icon size={15} className={active ? 'text-blue-400' : 'text-zinc-600'} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Bottom: status + key */}
        <div className="px-4 py-4 border-t border-[#1c1c24] space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              apiStatus === 'ok' ? 'bg-green-400' : apiStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
            }`} />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 leading-none">
                {apiStatus === 'ok' ? 'API connected' : apiStatus === 'error' ? 'API unreachable' : 'Connecting…'}
              </p>
              <p className="text-[10px] text-zinc-700 mt-0.5 font-mono truncate">localhost:8000</p>
            </div>
          </div>
          <div className="px-2.5 py-1.5 bg-[#0e0e12] rounded-lg border border-[#1c1c24]">
            <p className="text-[10px] text-zinc-700 mb-0.5">API Key</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">test-api-key-12345</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-[#1c1c24] bg-[#08080b]/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">{page.title}</h1>
              <p className="text-xs text-zinc-600 truncate hidden sm:block">{page.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {apiStatus === 'ok' && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600 bg-[#0e0e12] border border-[#1c1c24] px-2.5 py-1 rounded-lg">
                <GlobeIcon size={11} className="text-green-500" />
                Connected
              </span>
            )}
            <Tour onTabChange={setTab} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {tab === 'moderate'  && <ModerateTab />}
            {tab === 'jobs'      && <JobsTab />}
            {tab === 'review'    && <ReviewTab />}
            {tab === 'appeals'   && <AppealsTab />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'history'   && <HistoryTab />}
          </div>
        </main>
      </div>
    </div>
  )
}
