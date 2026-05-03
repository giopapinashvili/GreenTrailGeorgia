import ReviewCard from '../../components/common/ReviewCard'
import { reviews } from '../../data/mockData'
import { Star } from 'lucide-react'

export default function UserReviews() {
  const myReviews = reviews.slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white mb-1">ჩემი შეფასებები</h1>
        <p className="text-slate-500 text-sm">{myReviews.length} შეფასება</p>
      </div>

      {myReviews.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Star size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">ჯერ შეფასება არ გაქვს</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          {myReviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  )
}
