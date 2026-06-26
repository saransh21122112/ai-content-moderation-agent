import { getAnalyticsCategories, getAnalyticsSummary, getAnalyticsTimeline } from '@/app/actions'
import AnalyticsCharts from '@/components/AnalyticsCharts'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  let summary: any = {
    total_decisions: 0, auto_actioned: 0, human_reviewed: 0,
    removed: 0, passed: 0, warned: 0, restricted: 0,
    false_positive_rate: 0, period_days: 30,
  }
  let timeline: any = { timeline: [] }
  let categories: any = { categories: [] }

  try {
    ;[summary, timeline, categories] = await Promise.all([
      getAnalyticsSummary(30),
      getAnalyticsTimeline(7),
      getAnalyticsCategories(30),
    ])
  } catch {
    // API unavailable
  }

  const stats = [
    { label: 'Total', value: summary.total_decisions, color: 'text-white' },
    { label: 'Auto-actioned', value: summary.auto_actioned, sub: 'conf ≥ 85%', color: 'text-green-400' },
    { label: 'Human Reviewed', value: summary.human_reviewed, sub: 'conf < 85%', color: 'text-blue-400' },
    { label: 'Removed', value: summary.removed, color: 'text-red-400' },
    { label: 'Warned', value: summary.warned, color: 'text-yellow-400' },
    { label: 'FP Rate', value: `${(summary.false_positive_rate * 100).toFixed(1)}%`, sub: 'overrides to pass', color: 'text-orange-400' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last {summary.period_days} days</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map(({ label, value, sub, color }) => (
          <div key={label} className="bg-[#111] border border-[#222] rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <AnalyticsCharts
        timeline={timeline.timeline}
        categories={categories.categories}
        actionBreakdown={{
          pass: summary.passed,
          warn: summary.warned,
          restrict: summary.restricted,
          remove: summary.removed,
        }}
      />
    </div>
  )
}
