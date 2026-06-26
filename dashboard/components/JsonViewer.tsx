export default function JsonViewer({ data }: { data: unknown }) {
  return (
    <pre className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3 text-xs text-green-400 font-mono overflow-auto max-h-64 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
