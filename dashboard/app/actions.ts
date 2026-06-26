'use server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_KEY = process.env.API_KEY || ''

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

// Health
export async function getHealth() {
  return apiFetch('/health')
}

// Moderation — sync
export async function moderateContent(payload: {
  content: string
  user_id?: string
  content_type?: string
  context?: Record<string, string>
}) {
  return apiFetch('/api/v1/moderate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Moderation — async job
export async function submitModerationJob(payload: {
  content: string
  user_id?: string
  content_type?: string
  webhook_url?: string
  context?: Record<string, string>
}) {
  return apiFetch('/api/v1/moderate/async', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getJobStatus(jobId: string) {
  return apiFetch(`/api/v1/jobs/${jobId}`)
}

// Review queue
export async function getReviewQueue(page = 1) {
  return apiFetch(`/api/v1/review-queue?page=${page}&limit=20`)
}

export async function takeReviewAction(
  decisionId: string,
  payload: {
    reviewer_id: string
    action_taken: string
    override_action?: string
    override_reason?: string
  },
) {
  return apiFetch(`/api/v1/review-queue/${decisionId}/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Appeals
export async function createAppeal(decisionId: string, appealReason: string) {
  return apiFetch('/api/v1/appeals', {
    method: 'POST',
    body: JSON.stringify({ decision_id: decisionId, appeal_reason: appealReason }),
  })
}

export async function getAppeals(status?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (status) params.set('status', status)
  return apiFetch(`/api/v1/appeals?${params}`)
}

export async function reanalyzeAppeal(appealId: string) {
  return apiFetch(`/api/v1/appeals/${appealId}/reanalyze`, { method: 'POST' })
}

export async function resolveAppeal(
  appealId: string,
  action: string,
  reviewerId: string,
  reviewNotes?: string,
) {
  return apiFetch(`/api/v1/appeals/${appealId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action, reviewer_id: reviewerId, review_notes: reviewNotes }),
  })
}

// Analytics
export async function getAnalyticsSummary(days = 30) {
  return apiFetch(`/api/v1/analytics/summary?days=${days}`)
}

export async function getAnalyticsTimeline(days = 7) {
  return apiFetch(`/api/v1/analytics/timeline?days=${days}`)
}

export async function getAnalyticsCategories(days = 30) {
  return apiFetch(`/api/v1/analytics/categories?days=${days}`)
}

// History
export async function getDecisions(params: {
  page?: number
  action?: string
  content_type?: string
  user_id?: string
  search?: string
} = {}) {
  const p = new URLSearchParams()
  if (params.page) p.set('page', String(params.page))
  if (params.action) p.set('action', params.action)
  if (params.content_type) p.set('content_type', params.content_type)
  if (params.user_id) p.set('user_id', params.user_id)
  if (params.search) p.set('search', params.search)
  return apiFetch(`/api/v1/decisions?${p}`)
}

export async function getDecision(decisionId: string) {
  return apiFetch(`/api/v1/decisions/${decisionId}`)
}
