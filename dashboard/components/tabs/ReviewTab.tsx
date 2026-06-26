'use client'

import { useState, useTransition } from 'react'
import { getReviewQueue, takeReviewAction } from '@/app/actions'
import { UsersIcon, CheckCircleIcon, AlertIcon, SpinnerIcon, RefreshIcon } from '../Icons'
import JsonViewer from '../JsonViewer'

const ACTION_BADGE: Record<string, string> = {
  remove: 'badge-remove', restrict: 'badge-restrict', warn: 'badge-warn', pass: 'badge-pass',
}

const OVERRIDE_ACTIONS = ['pass','warn','restrict','remove'] as const

const REVIEWER_ID = 'reviewer_001'

export default function ReviewTab() {
  const [queue, setQueue] = useState<any>(null)
  const [error, setError] = useState('')
  const [isFetching, startFetch] = useTransition()
  const [actionState, setActionState] = useState<Record<string, any>>({})
  const [isActing, startAction] = useTransition()

  const fetchQueue = () => {
    setError('')
    startFetch(async () => {
      try { setQueue(await getReviewQueue()) }
      catch (e: any) { setError(e.message) }
    })
  }

  const setField = (id: string, key: string, val: any) =>
    setActionState(s => ({ ...s, [id]: { ...s[id], [key]: val } }))

  const handleAccept = (id: string) => {
    startAction(async () => {
      try {
        const res = await takeReviewAction(id, { reviewer_id: REVIEWER_ID, action_taken: 'accept' })
        setField(id, 'done', true); setField(id, 'result', res)
      } catch (e: any) { setField(id, 'error', e.message) }
    })
  }

  const handleOverride = (id: string) => {
    const st = actionState[id] || {}
    if (!st.reason?.trim() || !st.overrideAction) return
    startAction(async () => {
      try {
        const res = await takeReviewAction(id, {
          reviewer_id: REVIEWER_ID,
          action_taken: 'override',
          override_action: st.overrideAction,
          override_reason: st.reason,
        })
        setField(id, 'done', true); setField(id, 'result', res)
      } catch (e: any) { setField(id, 'error', e.message) }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white">Review Queue</p>
            <span className="method-get">GET</span>
            <span className="text-xs text-zinc-600 font-mono">/api/v1/review-queue</span>
          </div>
          <p className="text-xs text-zinc-600">Decisions with AI confidence below 85% — pending human judgement</p>
        </div>
        <button onClick={fetchQueue} disabled={isFetching} className="btn-secondary flex-shrink-0 gap-2">
          {isFetching ? <SpinnerIcon size={13} /> : <RefreshIcon size={13} />}
          {isFetching ? 'Loading…' : queue ? 'Refresh' : 'Load Queue'}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {queue && queue.total === 0 && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-950/30 border border-green-900/40 flex items-center justify-center">
            <CheckCircleIcon size={20} className="text-green-500" />
          </div>
          <p className="text-sm font-medium text-white">Queue is clear</p>
          <p className="text-xs text-zinc-600">All decisions have been reviewed</p>
        </div>
      )}

      {!queue && !isFetching && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
            <UsersIcon size={20} className="text-zinc-700" />
          </div>
          <p className="text-sm text-zinc-600">Load the queue to see decisions awaiting review</p>
        </div>
      )}

      {queue && queue.total > 0 && (
        <p className="text-xs text-zinc-600 px-1">
          <span className="text-zinc-300 font-medium">{queue.total}</span> item{queue.total !== 1 ? 's' : ''} awaiting review
        </p>
      )}

      {queue?.items?.map((item: any) => {
        const st = actionState[item.decision_id] || {}

        if (st.done) return (
          <div key={item.decision_id} className="card p-4 border-green-900/30 bg-green-950/10 flex items-center gap-3">
            <CheckCircleIcon size={15} className="text-green-400 flex-shrink-0" />
            <p className="text-xs text-zinc-400 flex-1">Decision <span className="font-mono text-zinc-500">{item.decision_id.slice(0,8)}…</span> actioned successfully</p>
            {st.result && (
              <details><summary className="text-xs text-zinc-700 cursor-pointer hover:text-zinc-500">View response</summary>
                <div className="mt-2"><JsonViewer data={st.result} /></div></details>
            )}
          </div>
        )

        return (
          <div key={item.decision_id} className="card p-5">
            {/* Top row */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
                  {item.content_text || <span className="italic text-zinc-700">No content stored</span>}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className={`badge ${ACTION_BADGE[item.action] ?? 'border-[#1c1c24] text-zinc-500'}`}>
                  {item.action?.toUpperCase()}
                </span>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium">{Math.round(item.confidence * 100)}%</p>
                  <p className="text-[10px] text-zinc-700">confidence</p>
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-3">
              <div className="h-1 bg-[#1c1c24] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500 transition-all" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
              </div>
            </div>

            {/* Categories */}
            {item.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.categories.map((c: string) => (
                  <span key={c} className="badge border-[#1c1c24] text-zinc-500">{c}</span>
                ))}
              </div>
            )}

            {/* Explanation */}
            {item.explanation && (
              <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3 mb-4">
                <p className="text-xs text-zinc-500 leading-relaxed">{item.explanation}</p>
              </div>
            )}

            <p className="text-[10px] text-zinc-700 font-mono mb-4">{item.decision_id}</p>

            {/* Action panel */}
            {!st.override ? (
              <div className="flex items-center gap-2 pt-3 border-t border-[#1c1c24]">
                <button onClick={() => handleAccept(item.decision_id)} disabled={isActing} className="btn-secondary text-xs px-3 py-1.5">
                  {isActing ? <SpinnerIcon size={12} /> : <CheckCircleIcon size={12} />}
                  Accept AI Decision
                </button>
                <button onClick={() => setField(item.decision_id, 'override', true)} className="btn-primary text-xs px-3 py-1.5">
                  Override
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-3 border-t border-[#1c1c24]">
                <p className="text-xs font-medium text-zinc-500">Select correct action</p>
                <div className="flex gap-2 flex-wrap">
                  {OVERRIDE_ACTIONS.map(a => (
                    <button key={a}
                      onClick={() => setField(item.decision_id, 'overrideAction', a)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        st.overrideAction === a
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-[#0e0e12] text-zinc-500 border-[#1c1c24] hover:border-[#25252f] hover:text-zinc-300'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
                <textarea value={st.reason || ''} onChange={e => setField(item.decision_id, 'reason', e.target.value)}
                  placeholder="Reason for override (required)" rows={2}
                  className="w-full field-input resize-none" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOverride(item.decision_id)}
                    disabled={isActing || !st.reason?.trim() || !st.overrideAction}
                    className="btn-primary text-xs px-3 py-1.5">
                    {isActing ? <SpinnerIcon size={12} /> : null}
                    Confirm Override
                  </button>
                  <button onClick={() => setField(item.decision_id, 'override', false)}
                    className="btn-ghost text-xs">Cancel</button>
                </div>
                {st.error && <ErrorBox msg={st.error} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
      <AlertIcon size={13} className="text-red-400 flex-shrink-0" />
      <p className="text-xs text-red-400">{msg}</p>
    </div>
  )
}
