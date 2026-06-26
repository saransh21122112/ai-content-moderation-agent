import { getAppeals } from '@/app/actions'
import AppealCard from '@/components/AppealCard'

export const dynamic = 'force-dynamic'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

export default async function AppealsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const activeStatus = searchParams.status || ''
  let data: { items: any[]; total: number } = { items: [], total: 0 }
  try {
    data = await getAppeals(activeStatus || undefined)
  } catch {
    // API unavailable
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Appeals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.items.length} appeal{data.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-lg p-1">
          {STATUS_FILTERS.map(({ label, value }) => (
            <a
              key={value}
              href={value ? `?status=${value}` : '/appeals'}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeStatus === value
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <div className="text-5xl mb-4">⚖️</div>
          <p className="text-sm">No appeals found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((appeal: any) => (
            <AppealCard key={appeal.appeal_id} appeal={appeal} />
          ))}
        </div>
      )}
    </div>
  )
}
