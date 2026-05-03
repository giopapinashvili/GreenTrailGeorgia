import StarRating from './StarRating'
import type { Review } from '../../types'

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
        <img src={review.avatar} alt={review.author} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-white text-xs font-semibold">{review.author}</p>
          <span className="text-slate-600 text-[10px]">{review.timeAgo}</span>
        </div>
        <p className="text-slate-500 text-[11px] mb-1">{review.target}</p>
        <StarRating value={review.rating} size={11} />
        <p className="text-slate-400 text-[11px] mt-1 leading-relaxed line-clamp-2">{review.comment}</p>
      </div>
    </div>
  )
}
