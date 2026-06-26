'use client'

import { useState, useTransition } from 'react'
import { createAppeal, getAppeals, reanalyzeAppeal, resolveAppeal } from '@/app/actions'
import { ScaleIcon, CheckCircleIcon, AlertIcon, SpinnerIcon, RefreshIcon, SearchIcon } from '../Icons'
import JsonViewer from '../JsonViewer'

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected',
}

const ACTION_BADGE: Record<string, string> = {
  remove: 'badge-remove', restrict: 'badge-restrict', warn: 'badge-warn', pass: 'badge-pass',
}

const REVIEWER_ID = 'reviewer_001'

export default function AppealsTab() {
  const [newDecisionId, setNewDecisionId] = useState('')
  const [newReason, setNewReason] = useState('')
  const [createResult, setCreateResult] = useState<any>(null)
  const [createError, setCreateError] = useState('')
  const [isCreating, startCreate] = useTransition()

  const [statusFilter, setStatusFilter] = useState('')
  const [appeals, setAppeals] = useState<any>(null)
  const [listError, setListError] = useState('')
  const [isFetching, startFetch] = useTransition()

  const [appealState, setAppealState] = useState<Record<string, any>>({})
  const [isActing, startAction] = useTransition()

  const setField = (id: string, key: string, val: any) =>
    setAppealState(s => ({ ...s, [id]: { ...s[id], [key]: val } }))

  const handleCreate = () => {
    if (!newDecisionId.trim() || !newReason.trim()) return
    setCreateError('')
    startCreate(async () => {
      try {
        const res = await createAppeal(newDecisionId.trim(), newReason.trim())
        setCreateResult(res)
        setNewDecisionId(''); setNewReason('')
      } catch (e: any) { setCreateError(e.message) }
    })
  }

  const fetchAppeals = () => {
    setListError('')
    startFetch(async () => {
      try { setAppeals(await getAppeals(statusFilter || undefined)) }
      catch (e: any) { setListError(e.message) }
    })
  }

  const handleReanalyze = (id: string) => {
    setField(id, 'loading', true)
    startAction(async () => {
      try {
        setField(id, 'aiSuggestion', await reanalyzeAppeal(id))
        setField(id, 'loading', false)
      } catch (e: any) { setField(id, 'error', e.message); setField(id, 'loading', false) }
    })
  }

  const handleResolve = (id: string, action: string) => {
    startAction(async () => {
      try {
        await resolveAppeal(id, action, REVIEWER_ID, appealState[id]?.notes)
        setField(id, 'resolvedStatus', action === 'approve' ? 'approved' : 'rejected')
      } catch (e: any) { setField(id, 'error', e.message) }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left: forms */}
      <div className="space-y-4">
        {/* Create */}
        <Panel method="POST" path="/api/v1/appeals">
          <div>
            <label className="field-label">Decision ID <span className="text-red-500">*</span></label>
            <input value={newDecisionId} onChange={e => setNewDecisionId(e.target.value)}
              className="field-input font-mono text-xs" placeholder="UUID from a moderation result" />
          </div>
          <div>
            <label className="field-label">Appeal Reason <span className="text-red-500">*</span></label>
            <textarea value={newReason} onChange={e => setNewReason(e.target.value)}
              rows={3} className="field-input resize-none"
              placeholder="Why should this decision be reconsidered?" />
          </div>
          <button onClick={handleCreate} disabled={isCreating || !newDecisionId.trim() || !newReason.trim()}
            className="btn-primary w-full py-2">
            {isCreating ? <><SpinnerIcon size={13} />Submitting…</> : 'Submit Appeal'}
          </button>
          {createResult && (
            <div className="flex items-start gap-2.5 p-3 bg-green-950/20 border border-green-900/40 rounded-lg">
              <CheckCircleIcon size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-green-400 font-medium mb-0.5">Appeal submitted</p>
                <p className="text-[10px] text-zinc-600 font-mono break-all">{createResult.appeal_id}</p>
              </div>
            </div>
          )}
          {createError && <ErrorBox msg={createError} />}
        </Panel>

        {/* List */}
        <Panel method="GET" path="/api/v1/appeals">
          <div>
            <label className="field-label">Filter by status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field-input">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button onClick={fetchAppeals} disabled={isFetching} className="btn-secondary w-full py-2">
            {isFetching ? <><SpinnerIcon size={13} />Loading…</> : <><SearchIcon size={13} />{appeals ? 'Refresh' : 'Load Appeals'}</>}
          </button>
          {listError && <ErrorBox msg={listError} />}
          {appeals && (
            <p className="text-xs text-zinc-600">
              <span className="text-zinc-400 font-medium">{appeals.items?.length ?? 0}</span> appeal{appeals.items?.length !== 1 ? 's' : ''} found
            </p>
          )}
        </Panel>
      </div>

      {/* Right: list */}
      <div className="lg:col-span-2 space-y-3">
        {!appeals && !isFetching && (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
              <ScaleIcon size={20} className="text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">Load appeals to review and resolve them here</p>
          </div>
        )}

        {isFetching && (
          <div className="card p-8 flex items-center justify-center">
            <SpinnerIcon size={24} className="text-blue-500" />
          </div>
        )}

        {appeals?.items?.length === 0 && (
          <div className="card p-10 flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-white">No appeals found</p>
            <p className="text-xs text-zinc-600">Try changing the status filter</p>
          </div>
        )}

        {appeals?.items?.map((appeal: any) => {
          const st = appealState[appeal.appeal_id] || {}
          const currentStatus = st.resolvedStatus || appeal.status

          return (
            <div key={appeal.appeal_id} className="card p-5 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${STATUS_BADGE[currentStatus] ?? 'border-[#1c1c24] text-zinc-500'}`}>
                  {currentStatus.toUpperCase()}
                </span>
                {appeal.original_action && (
                  <span className="text-xs text-zinc-600">
                    Original: <span className={`badge ml-1 ${ACTION_BADGE[appeal.original_action] ?? 'border-[#1c1c24] text-zinc-500'}`}>{appeal.original_action.toUpperCase()}</span>
                  </span>
                )}
                <span className="text-[10px] text-zinc-700 font-mono ml-auto">{appeal.appeal_id.slice(0, 12)}…</span>
              </div>

              {/* Content preview */}
              {appeal.content_preview && (
                <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                  <p className="text-[10px] text-zinc-600 mb-1">Flagged content</p>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{appeal.content_preview}</p>
                </div>
              )}

              {/* Reason */}
              <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                <p className="text-[10px] text-zinc-600 mb-1">Appeal reason</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{appeal.appeal_reason}</p>
              </div>

              {/* AI Suggestion */}
              {st.aiSuggestion && (
                <div className="bg-blue-950/15 border border-blue-900/40 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-400 mb-2">AI Re-analysis</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${ACTION_BADGE[st.aiSuggestion.suggested_action] ?? 'border-[#1c1c24] text-zinc-500'}`}>
                      {st.aiSuggestion.suggested_action?.toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-600">{Math.round((st.aiSuggestion.confidence ?? 0) * 100)}% confidence</span>
                  </div>
                  {st.aiSuggestion.explanation && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{st.aiSuggestion.explanation}</p>
                  )}
                </div>
              )}

              {st.error && <ErrorBox msg={st.error} />}

              {/* Actions */}
              {currentStatus === 'pending' && (
                <div className="space-y-2 pt-3 border-t border-[#1c1c24]">
                  <textarea value={st.notes || ''} onChange={e => setField(appeal.appeal_id, 'notes', e.target.value)}
                    placeholder="Review notes (optional)" rows={1}
                    className="w-full field-input resize-none" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleReanalyze(appeal.appeal_id)} disabled={isActing}
                      className="btn-secondary text-xs px-3 py-1.5">
                      {st.loading ? <><SpinnerIcon size={12} />Analyzing…</> : 'Re-analyze with AI'}
                    </button>
                    <div className="flex gap-1.5 ml-auto">
                      <button onClick={() => handleResolve(appeal.appeal_id, 'approve')} disabled={isActing}
                        className="text-xs px-3 py-1.5 bg-green-950/40 hover:bg-green-950/70 text-green-400 border border-green-900/50 rounded-lg transition-all disabled:opacity-40">
                        Approve
                      </button>
                      <button onClick={() => handleResolve(appeal.appeal_id, 'reject')} disabled={isActing}
                        className="text-xs px-3 py-1.5 bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/50 rounded-lg transition-all disabled:opacity-40">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentStatus !== 'pending' && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  currentStatus === 'approved' ? 'bg-green-950/20 border-green-900/40' : 'bg-red-950/20 border-red-900/40'
                }`}>
                  {currentStatus === 'approved'
                    ? <CheckCircleIcon size={13} className="text-green-400" />
                    : <AlertIcon size={13} className="text-red-400" />}
                  <p className={`text-xs font-medium ${currentStatus === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                    Appeal {currentStatus}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Panel({ method, path, children }: { method?: string; path?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      {(method || path) && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1c1c24]">
          {method && <span className={`method-${method.toLowerCase()}`}>{method}</span>}
          {path && <span className="text-xs text-zinc-600 font-mono">{path}</span>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
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
