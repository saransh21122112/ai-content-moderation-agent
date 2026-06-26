'use client'

import { useEffect, useState } from 'react'
import {
  ShieldIcon, ScanIcon, LayersIcon, UsersIcon, ScaleIcon,
  BarChartIcon, HistoryIcon, XIcon, ArrowRightIcon, ArrowLeftIcon,
} from './Icons'

const STEPS = [
  {
    tab: null,
    Icon: ShieldIcon,
    accent: 'bg-blue-600',
    title: 'Welcome to Sentinel',
    body: 'Sentinel is a multi-agent AI content moderation platform. This interface lets you test every API endpoint from a single dashboard — no curl commands required.',
    tip: 'Each section in the sidebar maps directly to a set of REST API endpoints. Real responses are returned from the live FastAPI backend.',
  },
  {
    tab: 'moderate',
    Icon: ScanIcon,
    accent: 'bg-indigo-600',
    title: 'Moderate — Real-time scanning',
    body: 'Submit text, images, or video files. A two-agent pipeline runs: a Triage agent (GPT-4o-mini) classifies severity in milliseconds, then an Analysis agent (GPT-4o) delivers the final decision with reasoning.',
    tip: 'Use the sample buttons to instantly test Spam, Hate speech, Harassment, Safe content, Misinformation, and Self-harm scenarios.',
  },
  {
    tab: 'moderate',
    Icon: ScanIcon,
    accent: 'bg-indigo-600',
    title: 'Reading decisions',
    body: 'Every decision returns an Action (pass / warn / restrict / remove), a Confidence score, a Human Review flag (triggers when confidence < 85%), and a plain-English AI explanation.',
    tip: 'Expand the Raw JSON section at the bottom of any result to see the full API response — useful for integration testing.',
  },
  {
    tab: 'jobs',
    Icon: LayersIcon,
    accent: 'bg-violet-600',
    title: 'Async Jobs — Background queue',
    body: 'For high-volume platforms, submit jobs to a Redis-backed queue and poll for results later. The job ID is auto-populated after submission.',
    tip: 'Add a Webhook URL and the API will POST the completed result to your server signed with HMAC-SHA256.',
  },
  {
    tab: 'review',
    Icon: UsersIcon,
    accent: 'bg-sky-600',
    title: 'Review Queue — Human-in-the-loop',
    body: 'Decisions where AI confidence fell below 85% are held here for a human call. Accept the AI decision or override it with a corrected action.',
    tip: 'Overriding a decision also re-embeds the content in the Pinecone vector store so future similar content gets the correct result automatically.',
  },
  {
    tab: 'appeals',
    Icon: ScaleIcon,
    accent: 'bg-amber-600',
    title: 'Appeals — User dispute management',
    body: 'Users can dispute decisions they believe were incorrect. Paste a Decision ID and a reason to open an appeal. Re-analyze with AI to get a fresh GPT-4o opinion before resolving.',
    tip: 'The re-analysis result appears inline as a suggestion — you still make the final approve or reject call.',
  },
  {
    tab: 'analytics',
    Icon: BarChartIcon,
    accent: 'bg-emerald-600',
    title: 'Analytics — Stats and trends',
    body: 'View aggregate stats for the last 7–90 days: total scanned, auto-actioned vs human-reviewed, false positive rate, category breakdown, action distribution, and daily volume charts.',
    tip: 'The Health Check button in the controls bar verifies API reachability before you start testing.',
  },
  {
    tab: 'history',
    Icon: HistoryIcon,
    accent: 'bg-rose-600',
    title: 'History — Audit trail',
    body: 'Browse every moderation decision ever recorded. Filter by action, content type, user ID, or keyword search. Click any row to see the full detail panel including AI reasoning and human review actions.',
    tip: 'The detail panel shows reviewer overrides and their stated reasons — useful for compliance audits.',
  },
]

interface TourProps {
  onTabChange: (tab: string) => void
}

export default function Tour({ onTabChange }: TourProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem('sentinel_tour_v2')) {
      setOpen(true)
      localStorage.setItem('sentinel_tour_v2', '1')
    }
  }, [])

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const pct = ((step + 1) / STEPS.length) * 100

  const go = (next: number) => {
    setStep(next)
    const t = STEPS[next]?.tab
    if (t) onTabChange(t)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setStep(0); setOpen(true) }}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-[#0e0e12] hover:bg-[#131318] border border-[#1c1c24] hover:border-[#25252f] px-3 py-1.5 rounded-lg transition-all duration-150"
      >
        <ShieldIcon size={12} />
        Guide
      </button>
    )
  }

  const { Icon, accent, title, body, tip } = current

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-40" onClick={() => setOpen(false)} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-[#0e0e11] border border-[#1c1c24] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 pointer-events-auto overflow-hidden">

          {/* Progress */}
          <div className="h-[2px] bg-[#1c1c24]">
            <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white leading-tight">{title}</p>
                  {current.tab && (
                    <p className="text-xs text-zinc-600 mt-0.5 font-mono">→ {current.tab}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-all"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Body */}
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">{body}</p>

            {/* Tip */}
            {tip && (
              <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg px-4 py-3 mb-5">
                <p className="text-xs text-blue-300/90 leading-relaxed">
                  <span className="font-semibold text-blue-400">Pro tip: </span>{tip}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={() => go(step - 1)} className="btn-secondary px-3 py-2 text-xs">
                  <ArrowLeftIcon size={13} />
                  Back
                </button>
              )}
              <button
                onClick={() => isLast ? setOpen(false) : go(step + 1)}
                className="btn-primary flex-1 py-2 text-sm"
              >
                {isLast ? 'Start using Sentinel' : 'Next'}
                {!isLast && <ArrowRightIcon size={14} />}
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <span className="text-[10px] text-zinc-700 mr-1">{step + 1}/{STEPS.length}</span>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? 'w-5 bg-blue-500' : 'w-1.5 bg-[#2a2a35] hover:bg-[#3a3a45]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
