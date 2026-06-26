'use client'

import { useEffect, useState, useTransition } from 'react'
import { getAnalyticsSummary, getAnalyticsTimeline, getAnalyticsCategories, getHealth } from '@/app/actions'
import { BarChartIcon, RefreshIcon, GlobeIcon, ActivityIcon, SpinnerIcon, AlertIcon } from '../Icons'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const ACTION_COLORS: Record<string, string> = {
  pass:     '#22c55e',
  warn:     '#eab308',
  restrict: '#f97316',
  remove:   '#ef4444',
}

const ACTION_LABELS: Record<string, string> = {
  pass: 'Pass', warn: 'Warn', restrict: 'Restrict', remove: 'Remove',
}

// ── Custom Tooltip for Pie ──────────────────────────────────────────
function PieTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
  const color = ACTION_COLORS[name] ?? '#888'
  return (
    <div className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111] shadow-xl text-xs">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-zinc-300 font-medium">{ACTION_LABELS[name] ?? name}</span>
      </div>
      <p className="text-white font-bold text-sm">{value.toLocaleString()} decisions</p>
      <p className="text-zinc-500">{pct}% of total</p>
    </div>
  )
}

// ── Custom Tooltip for Line/Bar ─────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111] shadow-xl text-xs min-w-[120px]">
      <p className="text-zinc-500 mb-1.5 font-mono">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-zinc-400">{ACTION_LABELS[p.dataKey] ?? p.dataKey}</span>
          </div>
          <span className="text-white font-medium">{p.value ?? 0}</span>
        </div>
      ))}
    </div>
  )
}

// ── Donut center label via SVG ──────────────────────────────────────
function DonutCenter({ cx, cy, total }: { cx?: number; cy?: number; total: number }) {
  if (!cx || !cy) return null
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize={22} fontWeight={700} fill="#fff">{total.toLocaleString()}</tspan>
      <tspan x={cx} dy="1.4em" fontSize={10} fill="#555">decisions</tspan>
    </text>
  )
}

export default function AnalyticsTab() {
  const [days, setDays] = useState(30)
  const [health, setHealth] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState('')
  const [healthError, setHealthError] = useState('')
  const [isFetching, startFetch] = useTransition()
  const [isHealthChecking, startHealth] = useTransition()

  const fetchAll = () => {
    setError('')
    startFetch(async () => {
      try {
        const [s, t, c] = await Promise.all([
          getAnalyticsSummary(days),
          getAnalyticsTimeline(Math.min(days, 30)),
          getAnalyticsCategories(days),
        ])
        setSummary(s)
        const byDate = (t.timeline as any[]).reduce((acc: Record<string, any>, row: any) => {
          const d = row.date.slice(5)
          if (!acc[d]) acc[d] = { date: d }
          acc[d][row.action] = row.count
          return acc
        }, {})
        setTimeline(Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date)))
        setCategories(c.categories)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const fetchHealth = () => {
    setHealthError('')
    startHealth(async () => {
      try { setHealth(await getHealth()) }
      catch (e: any) { setHealthError(e.message) }
    })
  }

  useEffect(() => { fetchAll() }, [])

  const pieData = summary
    ? [
        { name: 'pass',     value: summary.passed     ?? 0 },
        { name: 'warn',     value: summary.warned      ?? 0 },
        { name: 'restrict', value: summary.restricted  ?? 0 },
        { name: 'remove',   value: summary.removed     ?? 0 },
      ].filter(d => d.value > 0)
    : []

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  const statCards = summary ? [
    { label: 'Total Scanned',  value: summary.total_decisions,                           border: 'border-blue-900/30',   text: 'text-blue-400'    },
    { label: 'Auto-actioned',  value: summary.auto_actioned,                             border: 'border-green-900/30',  text: 'text-green-400'   },
    { label: 'Human Review',   value: summary.human_reviewed,                            border: 'border-purple-900/30', text: 'text-purple-400'  },
    { label: 'Removed',        value: summary.removed,                                   border: 'border-red-900/30',    text: 'text-red-400'     },
    { label: 'Warned',         value: summary.warned,                                    border: 'border-yellow-900/30', text: 'text-yellow-400'  },
    { label: 'False Positive', value: `${(summary.false_positive_rate * 100).toFixed(1)}%`, border: 'border-orange-900/30', text: 'text-orange-400' },
  ] : []

  return (
    <div className="space-y-4">

      {/* ── Controls bar ── */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Period</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="field-input w-36 text-xs">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <button onClick={fetchAll} disabled={isFetching} className="btn-primary px-3.5 py-1.5 text-xs">
          {isFetching ? <><SpinnerIcon size={12} />Loading…</> : <><RefreshIcon size={12} />Refresh</>}
        </button>

        <button onClick={fetchHealth} disabled={isHealthChecking} className="btn-secondary px-3.5 py-1.5 text-xs">
          {isHealthChecking ? <><SpinnerIcon size={12} />Checking…</> : <><GlobeIcon size={12} />Health Check</>}
        </button>

        {health && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 bg-green-950/20 border border-green-900/40 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            API healthy · v{health.version ?? '—'}
          </span>
        )}
        {healthError && <span className="ml-auto text-xs text-red-400">{healthError}</span>}
        {error && <span className="text-xs text-red-400 ml-auto">{error}</span>}
      </div>

      {/* ── Stat cards ── */}
      {isFetching && !summary && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-2 w-16 bg-[#1c1c24] rounded mb-3" />
              <div className="h-7 w-10 bg-[#1c1c24] rounded" />
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, border, text }) => (
            <div key={label} className={`card p-4 border ${border}`}>
              <p className={`text-2xl font-bold ${text}`}>{value}</p>
              <p className="text-xs text-zinc-600 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts grid ── */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Timeline — spans 2 cols */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-white">Decision Volume</p>
                <p className="text-xs text-zinc-600 mt-0.5">Daily breakdown by action</p>
              </div>
              <div className="flex gap-3">
                {Object.entries(ACTION_COLORS).map(([k, c]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className="text-xs text-zinc-600">{ACTION_LABELS[k]}</span>
                  </div>
                ))}
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-zinc-700 text-sm">No timeline data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  {Object.entries(ACTION_COLORS).map(([action, color]) => (
                    <Line
                      key={action}
                      type="monotone"
                      dataKey={action}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut — 1 col */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-1">Action Distribution</p>
            <p className="text-xs text-zinc-600 mb-4">Share of each decision type</p>

            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-zinc-700 text-sm">No data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map(({ name }) => (
                        <Cell
                          key={name}
                          fill={ACTION_COLORS[name] ?? '#555'}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip total={pieTotal} />} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <tspan x="50%" dy="-0.3em" fontSize={20} fontWeight={700} fill="#fff">{pieTotal.toLocaleString()}</tspan>
                      <tspan x="50%" dy="1.3em" fontSize={9} fill="#555" textAnchor="middle">TOTAL</tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                {/* Custom legend with counts + % */}
                <div className="mt-1 space-y-1.5">
                  {pieData.map(({ name, value }) => {
                    const pct = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) : '0'
                    const color = ACTION_COLORS[name] ?? '#888'
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-zinc-400 flex-1">{ACTION_LABELS[name]}</span>
                        <span className="text-xs text-zinc-500">{value.toLocaleString()}</span>
                        <div className="w-16 h-1 rounded-full bg-[#222] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-xs text-zinc-600 w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Top Categories */}
          <div className="card p-5 lg:col-span-3">
            <p className="text-sm font-semibold text-white mb-1">Top Categories Detected</p>
            <p className="text-xs text-zinc-600 mb-4">Most flagged content types across all decisions</p>

            {categories.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-zinc-700 text-sm">No category data yet</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar chart */}
                <ResponsiveContainer width="100%" height={Math.max(180, categories.length * 32)}>
                  <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={110}
                      tick={{ fontSize: 10, fill: '#777' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {categories.map((_: any, i: number) => (
                        <Cell key={i} fill={`hsl(${210 + i * 18}, 70%, 55%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Category table */}
                <div className="space-y-1">
                  {categories.slice(0, 10).map((c: any, i: number) => {
                    const max = categories[0]?.count ?? 1
                    const pct = ((c.count / max) * 100).toFixed(0)
                    return (
                      <div key={c.category} className="flex items-center gap-2 group">
                        <span className="text-xs text-zinc-700 w-4 text-right">{i + 1}</span>
                        <span className="text-xs text-zinc-400 flex-1 truncate">{c.category}</span>
                        <div className="w-24 h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: `hsl(${210 + i * 18}, 70%, 55%)` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-600 w-6 text-right">{c.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!summary && !isFetching && (
        <div className="card flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#131318] border border-[#1c1c24] flex items-center justify-center">
            <BarChartIcon size={20} className="text-zinc-700" />
          </div>
          <p className="text-sm text-zinc-600">Analytics will appear here</p>
          <button onClick={fetchAll} className="text-xs text-blue-500 hover:text-blue-400">Load analytics</button>
        </div>
      )}
    </div>
  )
}
