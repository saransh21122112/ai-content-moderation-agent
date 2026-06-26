'use client'

import { useState, useTransition } from 'react'
import { submitModerationJob, getJobStatus } from '@/app/actions'
import { LayersIcon, SearchIcon, CheckCircleIcon, AlertIcon, SpinnerIcon, ClockIcon } from '../Icons'
import JsonViewer from '../JsonViewer'

const STATUS_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  pending:    { text: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-900/50' },
  processing: { text: 'text-blue-400',   bg: 'bg-blue-950/30',   border: 'border-blue-900/50' },
  completed:  { text: 'text-green-400',  bg: 'bg-green-950/30',  border: 'border-green-900/50' },
  failed:     { text: 'text-red-400',    bg: 'bg-red-950/30',    border: 'border-red-900/50' },
}

const ACTION_BADGE: Record<string, string> = {
  remove: 'badge-remove', restrict: 'badge-restrict', warn: 'badge-warn', pass: 'badge-pass',
}

export default function JobsTab() {
  const [content, setContent] = useState('This is a test message for async moderation.')
  const [userId, setUserId] = useState('user_123')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, startSubmit] = useTransition()

  const [pollJobId, setPollJobId] = useState('')
  const [pollResult, setPollResult] = useState<any>(null)
  const [pollError, setPollError] = useState('')
  const [isPolling, startPoll] = useTransition()

  const handleSubmit = () => {
    if (!content.trim()) return
    setSubmitError(''); setSubmitResult(null)
    startSubmit(async () => {
      try {
        const res = await submitModerationJob({
          content,
          user_id: userId || undefined,
          webhook_url: webhookUrl || undefined,
        })
        setSubmitResult(res)
        setPollJobId(res.job_id || '')
      } catch (e: any) { setSubmitError(e.message) }
    })
  }

  const handlePoll = () => {
    if (!pollJobId.trim()) return
    setPollError('')
    startPoll(async () => {
      try { setPollResult(await getJobStatus(pollJobId.trim())) }
      catch (e: any) { setPollError(e.message) }
    })
  }

  const ss = pollResult?.status ? (STATUS_STYLE[pollResult.status] ?? STATUS_STYLE.pending) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left */}
      <div className="space-y-4">
        {/* Submit */}
        <Panel method="POST" path="/api/v1/moderate/async">
          <div>
            <label className="field-label">Content <span className="text-red-500">*</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              className="field-input resize-none" placeholder="Content to moderate…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">User ID</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} className="field-input" placeholder="user_123" />
            </div>
            <div>
              <label className="field-label">Webhook URL <span className="text-zinc-700">(optional)</span></label>
              <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="field-input" placeholder="https://…" />
            </div>
          </div>

          {webhookUrl && (
            <div className="p-3 bg-[#0a0a0e] border border-[#1c1c24] rounded-lg">
              <p className="text-xs text-zinc-600 leading-relaxed">
                The API will POST the result to this URL signed with <span className="text-zinc-500 font-mono">HMAC-SHA256</span> when the job completes.
              </p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={isSubmitting || !content.trim()} className="btn-primary w-full py-2.5">
            {isSubmitting ? <><SpinnerIcon size={14} />Queuing job…</> : <><LayersIcon size={14} />Submit to Queue</>}
          </button>

          {submitResult && (
            <div className="flex items-start gap-3 p-3 bg-green-950/20 border border-green-900/40 rounded-lg">
              <CheckCircleIcon size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-400 mb-0.5">Job queued successfully</p>
                <p className="text-xs text-zinc-500 font-mono break-all">{submitResult.job_id}</p>
              </div>
            </div>
          )}
          {submitError && <ErrorBox msg={submitError} />}
        </Panel>

        {/* Poll */}
        <Panel method="GET" path="/api/v1/jobs/{job_id}">
          <div>
            <label className="field-label">Job ID</label>
            <input value={pollJobId} onChange={e => setPollJobId(e.target.value)}
              className="field-input font-mono text-xs" placeholder="Paste or auto-filled from submission…"
              onKeyDown={e => e.key === 'Enter' && handlePoll()} />
          </div>
          <button onClick={handlePoll} disabled={isPolling || !pollJobId.trim()} className="btn-secondary w-full py-2">
            {isPolling ? <><SpinnerIcon size={14} />Checking…</> : <><SearchIcon size={14} />Check Status</>}
          </button>
          {pollError && <ErrorBox msg={pollError} />}
        </Panel>
      </div>

      {/* Right: result */}
      <div>
        {!pollResult && !isPolling && (
          <div className="card p-10 flex flex-col items-center gap-3 text-center h-full justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
              <ClockIcon size={20} className="text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">Submit a job then check its status here</p>
          </div>
        )}

        {isPolling && (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <SpinnerIcon size={24} className="text-blue-500" />
            <p className="text-sm text-zinc-500">Fetching job status…</p>
          </div>
        )}

        {pollResult && !isPolling && (
          <div className="card p-5 space-y-4">
            {ss && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${ss.bg} ${ss.border}`}>
                {pollResult.status === 'processing' ? <SpinnerIcon size={13} className={ss.text} /> :
                 pollResult.status === 'completed'  ? <CheckCircleIcon size={13} className={ss.text} /> :
                 pollResult.status === 'failed'     ? <AlertIcon size={13} className={ss.text} /> :
                 <ClockIcon size={13} className={ss.text} />}
                <p className={`text-xs font-semibold ${ss.text}`}>{pollResult.status.toUpperCase()}</p>
              </div>
            )}

            {pollResult.result && (
              <div className="grid grid-cols-2 gap-2">
                {pollResult.result.action && (
                  <div className="stat-box">
                    <p className="text-[10px] text-zinc-600 mb-1.5">Action</p>
                    <span className={`badge ${ACTION_BADGE[pollResult.result.action] ?? 'border-[#1c1c24] text-zinc-400'}`}>
                      {pollResult.result.action.toUpperCase()}
                    </span>
                  </div>
                )}
                {pollResult.result.confidence != null && (
                  <div className="stat-box">
                    <p className="text-[10px] text-zinc-600 mb-1">Confidence</p>
                    <p className="text-xl font-bold text-zinc-300">{Math.round(pollResult.result.confidence * 100)}%</p>
                  </div>
                )}
                {pollResult.result.processing_time_ms != null && (
                  <div className="stat-box">
                    <p className="text-[10px] text-zinc-600 mb-1">Latency</p>
                    <p className="text-xl font-bold text-zinc-400">{pollResult.result.processing_time_ms}<span className="text-xs ml-0.5">ms</span></p>
                  </div>
                )}
              </div>
            )}

            {pollResult.result?.explanation && (
              <div className="bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3">
                <p className="text-xs font-medium text-zinc-600 mb-1.5">AI Reasoning</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{pollResult.result.explanation}</p>
              </div>
            )}

            <details className="overflow-hidden rounded-lg border border-[#1c1c24]">
              <summary className="px-3 py-2 text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none flex items-center justify-between">
                <span>Raw JSON</span><span className="text-zinc-700">▾</span>
              </summary>
              <div className="border-t border-[#1c1c24]"><JsonViewer data={pollResult} /></div>
            </details>
          </div>
        )}
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
      <div className="space-y-3.5">{children}</div>
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
