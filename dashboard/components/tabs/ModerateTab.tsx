'use client'

import { useRef, useState, useTransition } from 'react'
import { moderateContent } from '@/app/actions'
import {
  ScanIcon, UploadIcon, FileVideoIcon, FileImageIcon,
  CheckCircleIcon, AlertIcon, SearchIcon, SpinnerIcon,
} from '../Icons'
import JsonViewer from '../JsonViewer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_KEY = 'test-api-key-12345'

const SAMPLES = [
  { label: 'Spam',          value: 'Buy cheap followers now! Click here!!! 10x your growth guaranteed!!', sev: 'low' },
  { label: 'Hate speech',   value: 'I hate [group] people, they should all be removed from society.', sev: 'high' },
  { label: 'Harassment',    value: 'You are worthless. I will find you and make you regret this.', sev: 'high' },
  { label: 'Safe',          value: 'Just had the most amazing cup of coffee this morning!', sev: 'none' },
  { label: 'Misinformation',value: 'BREAKING: Scientists confirm vaccines cause autism. Share before deleted!', sev: 'med' },
  { label: 'Self-harm',     value: "I've been hurting myself and don't want to be here anymore.", sev: 'high' },
]

const ACTION_STYLE: Record<string, { border: string; bg: string; text: string; label: string }> = {
  remove:   { border: 'border-red-900/50',    bg: 'bg-red-950/20',    text: 'text-red-400',    label: 'Removed' },
  restrict: { border: 'border-orange-900/50', bg: 'bg-orange-950/20', text: 'text-orange-400', label: 'Restricted' },
  warn:     { border: 'border-yellow-900/50', bg: 'bg-yellow-950/20', text: 'text-yellow-400', label: 'Warning' },
  pass:     { border: 'border-green-900/50',  bg: 'bg-green-950/20',  text: 'text-green-400',  label: 'Cleared' },
}

const SEV_DOT: Record<string, string> = {
  high: 'bg-red-500', med: 'bg-yellow-500', low: 'bg-orange-500', none: 'bg-green-500',
}

export default function ModerateTab() {
  const [mode, setMode] = useState<'text' | 'file'>('text')

  const [content, setContent] = useState('')
  const [userId, setUserId] = useState('user_123')
  const [contentType, setContentType] = useState('text')
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Key, setS3Key] = useState('')
  const [isPending, startTransition] = useTransition()

  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [fileUserId, setFileUserId] = useState('user_123')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const reset = () => { setResult(null); setError('') }

  const handleTextSubmit = () => {
    if (!content.trim()) return
    reset()
    startTransition(async () => {
      try {
        const payload: any = { content, user_id: userId || undefined, content_type: contentType }
        if (contentType === 'image' && s3Bucket) {
          payload.context = { s3_bucket: s3Bucket, s3_key: s3Key || content }
        }
        setResult(await moderateContent(payload))
      } catch (e: any) { setError(e.message) }
    })
  }

  const handleFileUpload = async () => {
    if (!pickedFile) return
    reset(); setUploading(true)
    const isVideo = /\.(mp4|mov|avi|wmv|webm|mkv|flv|m4v)$/i.test(pickedFile.name)
    setUploadMsg(isVideo ? 'Uploading to S3 and starting Rekognition video scan — typically 30–90s…' : 'Sending to Rekognition image scanner…')
    try {
      const form = new FormData()
      form.append('file', pickedFile)
      form.append('user_id', fileUserId)
      const res = await fetch(`${API_URL}/api/v1/moderate/file`, {
        method: 'POST', headers: { 'X-API-Key': API_KEY }, body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false); setUploadMsg('') }
  }

  const busy = isPending || uploading
  const s = result?.action ? (ACTION_STYLE[result.action] ?? null) : null
  const ext = pickedFile?.name.split('.').pop()?.toLowerCase() ?? ''
  const isVideoFile = ['mp4','mov','avi','wmv','webm','mkv','flv','m4v'].includes(ext)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── Left ── */}
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-[#0a0a0e] border border-[#1c1c24] rounded-xl">
          {[['text','Text & S3',ScanIcon],['file','Upload File',UploadIcon]] .map(([id,lbl,Ic]: any) => (
            <button key={id} onClick={() => { setMode(id); reset() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === id ? 'bg-white/[0.07] text-white border border-white/[0.08]' : 'text-zinc-600 hover:text-zinc-400'
              }`}>
              <Ic size={13} />{lbl}
            </button>
          ))}
        </div>

        {mode === 'text' && (
          <Panel method="POST" path="/api/v1/moderate">
            <div>
              <p className="field-label">Quick samples</p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLES.map(s => (
                  <button key={s.label}
                    onClick={() => { setContent(s.value); setContentType('text') }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-[#0e0e12] hover:bg-[#131318] text-zinc-500 hover:text-zinc-300 border border-[#1c1c24] hover:border-[#25252f] rounded-lg transition-all">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[s.sev]}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Content <span className="text-red-500">*</span></label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.metaKey && handleTextSubmit()}
                placeholder="Enter text, or pick a sample above…" rows={4}
                className="field-input resize-none" />
              <p className="text-[10px] text-zinc-700 mt-1">Cmd+Enter to submit</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">User ID</label>
                <input value={userId} onChange={e => setUserId(e.target.value)} className="field-input" placeholder="user_123" />
              </div>
              <div>
                <label className="field-label">Content Type</label>
                <select value={contentType} onChange={e => setContentType(e.target.value)} className="field-input">
                  <option value="text">Text</option>
                  <option value="image">Image (S3)</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            {contentType === 'image' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#0a0a0e] border border-[#1c1c24] rounded-lg">
                <div>
                  <label className="field-label">S3 Bucket</label>
                  <input value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} className="field-input" placeholder="my-bucket" />
                </div>
                <div>
                  <label className="field-label">S3 Key</label>
                  <input value={s3Key} onChange={e => setS3Key(e.target.value)} className="field-input" placeholder="images/photo.jpg" />
                </div>
              </div>
            )}

            <button onClick={handleTextSubmit} disabled={busy || !content.trim()} className="btn-primary w-full py-2.5">
              {isPending ? <><SpinnerIcon size={14} />Analyzing…</> : <><ScanIcon size={14} />Analyze Content</>}
            </button>
          </Panel>
        )}

        {mode === 'file' && (
          <Panel method="POST" path="/api/v1/moderate/file">
            <div className="text-xs text-zinc-600 bg-[#0a0a0e] border border-[#1c1c24] rounded-lg p-3 space-y-1">
              <p><span className="text-zinc-500 font-medium">Images</span> — Bytes sent to Rekognition directly, ~1s</p>
              <p><span className="text-zinc-500 font-medium">Videos</span> — Uploaded to S3 eu-west-1, Rekognition Video API, 30–90s</p>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) setPickedFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 ${
                dragOver ? 'border-blue-500 bg-blue-950/10' : 'border-[#1c1c24] hover:border-[#25252f] hover:bg-white/[0.02]'
              }`}>
              {pickedFile ? (
                <div className="flex flex-col items-center gap-2">
                  {isVideoFile ? <FileVideoIcon size={28} className="text-blue-400" /> : <FileImageIcon size={28} className="text-emerald-400" />}
                  <p className="text-sm text-white font-medium truncate max-w-full px-4">{pickedFile.name}</p>
                  <p className="text-xs text-zinc-600">{(pickedFile.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon size={24} className="text-zinc-600" />
                  <p className="text-sm text-zinc-400">Drop a file here, or click to browse</p>
                  <p className="text-xs text-zinc-700">Images: JPG PNG WEBP · Videos: MP4 MOV AVI WEBM</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => e.target.files?.[0] && setPickedFile(e.target.files[0])} />

            <div>
              <label className="field-label">User ID</label>
              <input value={fileUserId} onChange={e => setFileUserId(e.target.value)} className="field-input" placeholder="user_123" />
            </div>

            <button onClick={handleFileUpload} disabled={!pickedFile || uploading} className="btn-primary w-full py-2.5">
              {uploading ? <><SpinnerIcon size={14} />Scanning…</> : <><ScanIcon size={14} />Scan File</>}
            </button>

            {uploadMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-blue-950/20 border border-blue-900/40 rounded-lg">
                <SpinnerIcon size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">{uploadMsg}</p>
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* ── Right: Result ── */}
      <div className="space-y-3">
        {busy && !result && (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <SpinnerIcon size={28} className="text-blue-500" />
            <p className="text-sm text-zinc-400">{uploadMsg || 'Running two-agent analysis pipeline…'}</p>
          </div>
        )}

        {!result && !busy && !error && (
          <div className="card p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
              <SearchIcon size={20} className="text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">Submit content to see the AI decision here</p>
          </div>
        )}

        {error && (
          <div className="card p-4 border-red-900/40 bg-red-950/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertIcon size={13} className="text-red-400" />
              <p className="text-xs font-medium text-red-400">Request failed</p>
            </div>
            <pre className="text-xs text-red-400/70 whitespace-pre-wrap break-all">{error}</pre>
          </div>
        )}

        {result && !busy && (
          <div className="space-y-3">
            {result.rekognition && (
              <div className={`card p-4 ${!result.rekognition.available ? '' : result.rekognition.flagged ? 'border-red-900/40 bg-red-950/10' : 'border-green-900/40 bg-green-950/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {!result.rekognition.available
                    ? <AlertIcon size={13} className="text-zinc-600" />
                    : result.rekognition.flagged
                      ? <AlertIcon size={13} className="text-red-400" />
                      : <CheckCircleIcon size={13} className="text-green-400" />
                  }
                  <p className="text-xs font-medium text-zinc-400">
                    Rekognition — {!result.rekognition.available ? 'Unavailable' : result.rekognition.flagged ? 'Violations detected' : 'No violations'}
                  </p>
                </div>
                {result.rekognition.flagged && result.rekognition.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.rekognition.categories.map((c: string) => (
                      <span key={c} className="badge badge-remove">{c}</span>
                    ))}
                  </div>
                )}
                {result.rekognition.error && <p className="text-xs text-zinc-600 mt-1">{result.rekognition.error}</p>}
              </div>
            )}

            {s && (
              <div className={`card p-5 ${s.border} ${s.bg}`}>
                <p className="text-xs text-zinc-600 mb-1">Final Decision</p>
                <p className={`text-4xl font-bold tracking-tight ${s.text}`}>{s.label}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="stat-box">
                <p className="text-[10px] text-zinc-600 mb-1">Confidence</p>
                <p className={`text-xl font-bold ${(result.confidence ?? 0) >= 0.85 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {Math.round((result.confidence ?? 0) * 100)}%
                </p>
              </div>
              <div className="stat-box">
                <p className="text-[10px] text-zinc-600 mb-1">Human Review</p>
                <p className={`text-xs font-semibold mt-1.5 ${result.requires_human_review ? 'text-yellow-400' : 'text-green-400'}`}>
                  {result.requires_human_review ? 'Required' : 'Not needed'}
                </p>
              </div>
              <div className="stat-box">
                <p className="text-[10px] text-zinc-600 mb-1">Latency</p>
                <p className="text-xl font-bold text-zinc-400">{result.processing_time_ms ?? '—'}<span className="text-xs font-normal ml-0.5">ms</span></p>
              </div>
            </div>

            {result.categories?.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-medium text-zinc-600 mb-2">Detected categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.categories.map((c: string) => (
                    <span key={c} className="badge border-[#1c1c24] text-zinc-400">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {result.explanation && (
              <div className="card p-4">
                <p className="text-xs font-medium text-zinc-600 mb-2">AI reasoning</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.explanation}</p>
              </div>
            )}

            <details className="card overflow-hidden">
              <summary className="px-4 py-3 text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none flex items-center justify-between">
                <span>Raw JSON</span><span className="text-zinc-700">▾</span>
              </summary>
              <div className="border-t border-[#1c1c24]"><JsonViewer data={result} /></div>
            </details>

            {result.decision_id && (
              <p className="text-[10px] text-zinc-700 font-mono px-1">id: {result.decision_id}</p>
            )}
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
