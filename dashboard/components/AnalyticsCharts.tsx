'use client'

import {
  Bar, BarChart, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const ACTION_COLORS: Record<string, string> = {
  pass: '#22c55e',
  warn: '#eab308',
  restrict: '#f97316',
  remove: '#ef4444',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  fontSize: 12,
  color: '#ccc',
}

interface Props {
  timeline: Array<{ date: string; action: string; count: number }>
  categories: Array<{ category: string; count: number }>
  actionBreakdown: Record<string, number>
}

export default function AnalyticsCharts({ timeline, categories, actionBreakdown }: Props) {
  // Pivot timeline: [{date, pass, warn, restrict, remove}]
  const byDate = timeline.reduce<Record<string, any>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { date: row.date.slice(5) } // "MM-DD"
    acc[row.date][row.action] = row.count
    return acc
  }, {})
  const timelineData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))

  const pieData = Object.entries(actionBreakdown)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const emptyChart = (label: string) => (
    <div className="flex items-center justify-center h-48 text-gray-700 text-sm">{label}</div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Timeline — full width */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 lg:col-span-2">
        <p className="text-sm font-medium text-gray-400 mb-4">Decision Volume — last 7 days</p>
        {timelineData.length === 0 ? (
          emptyChart('No data yet')
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineData}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#555' }} />
              <YAxis tick={{ fontSize: 11, fill: '#555' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              {Object.entries(ACTION_COLORS).map(([action, color]) => (
                <Line
                  key={action}
                  type="monotone"
                  dataKey={action}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
              <Legend
                formatter={v => <span style={{ color: '#777', fontSize: 12 }}>{v}</span>}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category breakdown */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5">
        <p className="text-sm font-medium text-gray-400 mb-4">Categories — last 30 days</p>
        {categories.length === 0 ? (
          emptyChart('No category data yet')
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categories} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#555' }} />
              <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Action distribution */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5">
        <p className="text-sm font-medium text-gray-400 mb-4">Action Distribution — last 30 days</p>
        {pieData.length === 0 ? (
          emptyChart('No action data yet')
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {pieData.map(({ name }) => (
                  <Cell key={name} fill={ACTION_COLORS[name] ?? '#555'} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                formatter={v => <span style={{ color: '#777', fontSize: 12 }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
