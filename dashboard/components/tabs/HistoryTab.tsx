'use client'

import { useState, useTransition } from 'react'
import { getDecisions, getDecision } from '@/app/actions'
import { HistoryIcon, SearchIcon, AlertIcon, SpinnerIcon, XIcon, CheckCircleIcon } from '../Icons'

const ACTION_BADGE: Record<string, string> = {
  remove: 'badge-remove', restrict: 'badge-restrict', warn: 'badge-warn', pass: 'badge-pass',
}

const TRIAGE_COLOR: Record<string, string> = {
  critical: 'text-red-400', suspicious: 'text-yellow-400', safe: 'text-green-400',
}

function Badge({ action }: { action: string }) {
  return <span className={`badge ${ACTION_BADGE[action] ?? 'border-[#1c1c24] text-zinc-500'}`}>{action?.toUpperCase()}</span>
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryTab() {
  const [filters, setFilters] = useState({ action: '', content_type: '', user_id: '', search: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [error, setError] = useState('')
  const [isFetching, startFetch] = useTransition()
  const [isLoadingDetail, startDetail] = useTransition()

  const load = (p = page, f = filters) => {
    setError('')
    startFetch(async () => {
      try { setData(await getDecisions({ page: p, ...f })); setSelected(null) }
      catch (e: any) { setError(e.message) }
    })
  }

  const loadDetail = (id: string) => {
    startDetail(async () => {
      try { setSelected(await getDecision(id)) }
      catch (e: any) { setError(e.message) }
    })
  }

  const applyFilters = () => { setPage(1); load(1) }
  const clearFilters = () => {
    const empty = { action: '', content_type: '', user_id: '', search: '' }
    setFilters(empty); setPage(1); load(1, empty)
  }

  const hasFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#1c1c24]">
          <span className="method-get">GET</span>
          <span className="text-xs text-zinc-600 font-mono">/api/v1/decisions</span>
          {data && (
            <span className="ml-auto text-xs text-zinc-600">
              <span className="text-zinc-400 font-medium">{data.total}</span> total · page {data.page}/{data.pages}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="field-label">Search</label>
            <div className="relative">
              <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="keyword…" className="field-input pl-8" />
            </div>
          </div>
          <div>
            <label className="field-label">Action</label>
            <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="field-input">
              <option value="">All actions</option>
              <option value="pass">Pass</option>
              <option value="warn">Warn</option>
              <option value="restrict">Restrict</option>
              <option value="remove">Remove</option>
            </select>
          </div>
          <div>
            <label className="field-label">Content Type</label>
            <select value={filters.content_type} onChange={e => setFilters(f => ({ ...f, content_type: e.target.value }))} className="field-input">
              <option value="">All types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="field-label">User ID</label>
            <input value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
              placeholder="user_123" className="field-input" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={applyFilters} disabled={isFetching} className="btn-primary px-4 py-2 text-sm">
            {isFetching ? <><SpinnerIcon size={13} />Loading…</> : <><SearchIcon size={13} />{data ? 'Search' : 'Load History'}</>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary px-3 py-2 text-sm">
              <XIcon size={13} /> Clear
            </button>
          )}
          {error && <p className="ml-auto text-xs text-red-400">{error}</p>}
        </div>
      </div>

      {/* Empty state */}
      {!data && !isFetching && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
            <HistoryIcon size={20} className="text-zinc-700" />
          </div>
          <p className="text-sm text-zinc-600">Load history to browse all past moderation decisions</p>
        </div>
      )}

      {/* Main grid */}
      {data && (
        <div className={`grid gap-4 ${selected ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          {/* List */}
          <div className="space-y-2 min-w-0">
            {data.items.length === 0 && (
              <div className="card p-10 flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium text-white">No decisions found</p>
                <p className="text-xs text-zinc-600">Try broadening your filters</p>
              </div>
            )}

            {data.items.map((item: any) => (
              <div key={item.decision_id}
                onClick={() => loadDetail(item.decision_id)}
                className={`card p-4 cursor-pointer transition-all duration-150 hover:border-[#25252f] hover:bg-white/[0.01] ${
                  selected?.decision_id === item.decision_id ? 'border-blue-900/50 bg-blue-950/10' : ''
                }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed mb-2">
                      {item.content_text || <span className="italic text-zinc-700">No content stored</span>}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge action={item.action} />
                      {item.triage_result && (
                        <span className={`text-xs ${TRIAGE_COLOR[item.triage_result] ?? 'text-zinc-600'}`}>
                          {item.triage_result}
                        </span>
                      )}
                      <span className="text-xs text-zinc-600">{Math.round(item.confidence * 100)}%</span>
                      {item.user_id && <span className="text-xs text-zinc-700 font-mono">{item.user_id}</span>}
                      <span className="text-xs text-zinc-700 ml-auto">{fmt(item.created_at)}</span>
                    </div>
                    {item.categories?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {item.categories.slice(0,4).map((c: string) => (
                          <span key={c} className="badge border-[#1c1c24] text-zinc-600 text-[10px]">{c}</span>
                        ))}
                        {item.categories.length > 4 && (
                          <span className="text-[10px] text-zinc-700">+{item.categories.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confidence indicator */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                    <div className="w-1 h-10 bg-[#1c1c24] rounded-full overflow-hidden">
                      <div className={`w-full rounded-full transition-all ${
                        item.confidence >= 0.85 ? 'bg-green-500' : item.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} style={{ height: `${Math.round(item.confidence * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2">
                <button onClick={() => { const p = page - 1; setPage(p); load(p) }} disabled={page === 1 || isFetching}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">
                  ← Prev
                </button>
                {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPage(p); load(p) }} disabled={isFetching}
                    className={`w-8 h-8 text-xs rounded-lg transition-all border ${
                      p === page ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#0e0e12] text-zinc-500 hover:text-zinc-300 border-[#1c1c24] hover:border-[#25252f]'
                    }`}>
                    {p}
                  </button>
                ))}
                {data.pages > 7 && <span className="text-zinc-700 text-xs px-1">…{data.pages}</span>}
                <button onClick={() => { const p = page + 1; setPage(p); load(p) }} disabled={page === data.pages || isFetching}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="card p-5 space-y-4 h-fit sticky top-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Decision Detail</p>
                <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-all">
                  <XIcon size={14} />
                </button>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerIcon size={20} className="text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Action', content: <Badge action={selected.action} /> },
                      { label: 'Confidence', content: <p className={`text-lg font-bold ${selected.confidence >= 0.85 ? 'text-green-400' : 'text-yellow-400'}`}>{Math.round(selected.confidence * 100)}%</p> },
                      { label: 'Triage', content: <p className={`text-sm font-medium ${TRIAGE_COLOR[selected.triage_result] ?? 'text-zinc-400'}`}>{selected.triage_result || '—'}</p> },
                      { label: 'Latency', content: <p className="text-sm text-zinc-400">{selected.processing_time_ms ?? '—'}ms</p> },
                    ].map(({ label, content }) => (
                      <div key={label} className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                        <p className="text-[10px] text-zinc-600 mb-1.5">{label}</p>
                        {content}
                      </div>
                    ))}
                  </div>

                  {selected.content_text && (
                    <div>
                      <p className="field-label">Content</p>
                      <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                        <p className="text-sm text-zinc-300 leading-relaxed">{selected.content_text}</p>
                      </div>
                    </div>
                  )}

                  {selected.categories?.length > 0 && (
                    <div>
                      <p className="field-label">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.categories.map((c: string) => (
                          <span key={c} className="badge border-[#1c1c24] text-zinc-400">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.explanation && (
                    <div>
                      <p className="field-label">AI Reasoning</p>
                      <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                        <p className="text-xs text-zinc-400 leading-relaxed">{selected.explanation}</p>
                      </div>
                    </div>
                  )}

                  {selected.reviewer_actions?.length > 0 && (
                    <div>
                      <p className="field-label">Human Review</p>
                      <div className="space-y-2">
                        {selected.reviewer_actions.map((ra: any, i: number) => (
                          <div key={i} className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] text-zinc-600 font-mono">{ra.reviewer_id}</span>
                              <span className={`badge text-[10px] ${
                                ra.action_taken === 'override' ? 'bg-blue-950/40 text-blue-400 border-blue-900/50' : 'badge-pass'
                              }`}>{ra.action_taken}</span>
                              {ra.override_action && <Badge action={ra.override_action} />}
                            </div>
                            {ra.override_reason && (
                              <p className="text-xs text-zinc-500 leading-relaxed">{ra.override_reason}</p>
                            )}
                            {ra.created_at && (
                              <p className="text-[10px] text-zinc-700 mt-1">{new Date(ra.created_at).toLocaleString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#1c1c24]">
                    <p className="text-[10px] text-zinc-700 font-mono break-all">{selected.decision_id}</p>
                    {selected.created_at && (
                      <p className="text-[10px] text-zinc-700 mt-0.5">{new Date(selected.created_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
