const STYLES: Record<string, string> = {
  remove: 'bg-red-950 text-red-400 border-red-800',
  restrict: 'bg-orange-950 text-orange-400 border-orange-800',
  warn: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  pass: 'bg-green-950 text-green-400 border-green-800',
}

export default function ActionBadge({ action }: { action: string }) {
  const style = STYLES[action] ?? 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {action.toUpperCase()}
    </span>
  )
}
