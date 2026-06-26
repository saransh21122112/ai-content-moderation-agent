import { getReviewQueue } from '@/app/actions'
import ReviewCard from '@/components/ReviewCard'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  let data: { items: any[]; total: number } = { items: [], total: 0 }
  try {
    data = await getReviewQueue()
  } catch {
    // API unavailable — show empty state
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Review Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data.total} item{data.total !== 1 ? 's' : ''} awaiting human review
          <span className="ml-2 text-gray-600">· confidence &lt; 85%</span>
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-sm">Queue is clear — all flagged content has been reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item: any) => (
            <ReviewCard key={item.decision_id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
