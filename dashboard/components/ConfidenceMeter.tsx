export default function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right tabular-nums">{pct}%</span>
    </div>
  )
}
