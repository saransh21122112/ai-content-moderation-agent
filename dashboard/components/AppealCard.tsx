'use client'

import { useState, useTransition } from 'react'
import ActionBadge from './ActionBadge'
import { reanalyzeAppeal, resolveAppeal } from '@/app/actions'

const REVIEWER_ID = 'reviewer_001'

interface Appeal {
  appeal_id: string
  decision_id: string
  appeal_reason: string
  status: string
  created_at: string
  resolved_at: string | null
  content_preview: string | null
  original_action: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  approved: 'bg-green-950 text-green-400 border-green-800',
  rejected: 'bg-red-950 text-red-400 border-red-800',
}

export default function AppealCard({ appeal }: { appeal: Appeal }) {
  const [localStatus, setLocalStatus] = useState(appeal.status)
  const [aiSuggestion, setAiSuggestion] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleReanalyze = () => {
    startTransition(async () => {
      try {
        const result = await reanalyzeAppeal(appeal.appeal_id)
        setAiSuggestion(result)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleResolve = (action: string) => {
    startTransition(async () => {
      try {
        await resolveAppeal(appeal.appeal_id, action, REVIEWER_ID, notes || undefined)
        setLocalStatus(action === 'approve' ? 'approved' : 'rejected')
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const statusStyle = STATUS_STYLES[localStatus] ?? 'bg-gray-800 text-gray-400 border-gray-700'

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Status + original action */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusStyle}`}>
              {localStatus.toUpperCase()}
            </span>
            {appeal.original_action && (
              <>
                <span className="text-gray-700 text-xs">original:</span>
                <ActionBadge action={appeal.original_action} />
              </>
            )}
            <span className="text-xs text-gray-700 ml-auto">
              {new Date(appeal.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })}
            </span>
          </div>

          {/* Content preview */}
          {appeal.content_preview && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">{appeal.content_preview}</p>
          )}

          {/* Appeal reason */}
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded p-3 mb-3">
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide font-medium" style={{ fontSize: 10 }}>
              Appeal Reason
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">{appeal.appeal_reason}</p>
          </div>

          {/* AI re-analysis suggestion */}
          {aiSuggestion && (
            <div className="bg-blue-950/30 border border-blue-900 rounded p-3 mb-3">
              <p className="text-xs text-blue-400 mb-2 font-medium">AI Re-analysis Suggestion</p>
              <div className="flex items-center gap-2 mb-1.5">
                <ActionBadge action={aiSuggestion.suggested_action ?? 'pass'} />
                <span className="text-xs text-gray-500">
                  {Math.round((aiSuggestion.confidence ?? 0) * 100)}% confidence
                </span>
              </div>
              {aiSuggestion.explanation && (
                <p className="text-xs text-gray-400 leading-relaxed">{aiSuggestion.explanation}</p>
              )}
            </div>
          )}

          {/* Notes input for pending appeals */}
          {localStatus === 'pending' && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Review notes (optional)"
              rows={1}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-gray-300 placeholder:text-gray-700 resize-none focus:outline-none focus:border-[#3a3a3a]"
            />
          )}

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        {/* Action buttons */}
        {localStatus === 'pending' && (
          <div className="flex flex-col gap-2 shrink-0 pt-0.5">
            <button
              onClick={handleReanalyze}
              disabled={isPending}
              className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 disabled:opacity-40 text-blue-300 text-xs rounded border border-blue-800 transition-colors whitespace-nowrap"
            >
              {isPending && !aiSuggestion ? 'Analyzing…' : 'Re-analyze'}
            </button>
            <button
              onClick={() => handleResolve('approve')}
              disabled={isPending}
              className="px-3 py-1.5 bg-green-950 hover:bg-green-900 disabled:opacity-40 text-green-300 text-xs rounded border border-green-800 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleResolve('reject')}
              disabled={isPending}
              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 disabled:opacity-40 text-red-300 text-xs rounded border border-red-800 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
