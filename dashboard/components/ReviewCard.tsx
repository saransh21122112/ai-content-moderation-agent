'use client'

import { useState, useTransition } from 'react'
import ActionBadge from './ActionBadge'
import ConfidenceMeter from './ConfidenceMeter'
import { takeReviewAction } from '@/app/actions'

const REVIEWER_ID = 'reviewer_001'
const ACTIONS = ['pass', 'warn', 'restrict', 'remove'] as const

interface ReviewItem {
  decision_id: string
  content_text: string | null
  content_type: string
  user_id: string | null
  action: string
  confidence: number
  categories: string[]
  explanation: string
  triage_result: string
  created_at: string
}

export default function ReviewCard({ item }: { item: ReviewItem }) {
  const [done, setDone] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideAction, setOverrideAction] = useState<string>('pass')
  const [overrideReason, setOverrideReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (done) return null

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await takeReviewAction(item.decision_id, { reviewer_id: REVIEWER_ID, action_taken: 'accept' })
        setDone(true)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleOverride = () => {
    if (!overrideReason.trim()) return
    startTransition(async () => {
      try {
        await takeReviewAction(item.decision_id, { reviewer_id: REVIEWER_ID, action_taken: 'override', override_action: overrideAction, override_reason: overrideReason })
        setDone(true)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const triageColor = item.triage_result === 'critical' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Content preview */}
          <p
            className={`text-sm text-gray-300 leading-relaxed cursor-pointer select-none ${!expanded ? 'line-clamp-2' : ''}`}
            onClick={() => setExpanded(v => !v)}
          >
            {item.content_text || <span className="italic text-gray-600">[content not stored]</span>}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <ActionBadge action={item.action} />
            <span className="text-xs text-gray-600">
              triage: <span className={triageColor}>{item.triage_result}</span>
            </span>
            {item.user_id && (
              <span className="text-xs text-gray-600">user: {item.user_id}</span>
            )}
            <span className="text-xs text-gray-700">
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          {/* Categories */}
          {item.categories.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {item.categories.map(cat => (
                <span key={cat} className="text-xs bg-[#1a1a1a] text-gray-500 px-2 py-0.5 rounded border border-[#252525]">
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Confidence bar */}
          <div className="mt-3 max-w-44">
            <p className="text-xs text-gray-700 mb-1">AI Confidence</p>
            <ConfidenceMeter confidence={item.confidence} />
          </div>

          {/* Expanded explanation */}
          {expanded && item.explanation && (
            <div className="mt-3 p-3 bg-[#0f0f0f] border border-[#1e1e1e] rounded text-xs text-gray-400 leading-relaxed">
              <p className="text-gray-600 mb-1 font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>
                AI Reasoning
              </p>
              {item.explanation}
            </div>
          )}

          {/* Override panel */}
          {showOverride && (
            <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
              <p className="text-xs text-gray-500 mb-3 font-medium">Select new action</p>
              <div className="flex gap-2 mb-3">
                {ACTIONS.map(a => (
                  <button
                    key={a}
                    onClick={() => setOverrideAction(a)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      overrideAction === a
                        ? 'bg-white text-black font-medium'
                        : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)"
                rows={2}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-gray-300 placeholder:text-gray-700 resize-none focus:outline-none focus:border-[#3a3a3a] mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleOverride}
                  disabled={isPending || !overrideReason.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded transition-colors"
                >
                  {isPending ? 'Saving…' : 'Confirm Override'}
                </button>
                <button
                  onClick={() => setShowOverride(false)}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-gray-400 text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        {/* Action buttons */}
        {!showOverride && (
          <div className="flex flex-col gap-2 shrink-0 pt-0.5">
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 text-gray-300 text-xs rounded border border-[#2a2a2a] transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => setShowOverride(true)}
              disabled={isPending}
              className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 disabled:opacity-40 text-blue-300 text-xs rounded border border-blue-800 transition-colors"
            >
              Override
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
