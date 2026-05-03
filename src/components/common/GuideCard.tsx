import { CheckCircle2 } from 'lucide-react'
import StarRating from './StarRating'
import type { Guide } from '../../types'

export default function GuideCard({ guide }: { guide: Guide }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-green-500/20">
          <img src={guide.avatar} alt={guide.name} className="w-full h-full object-cover" />
        </div>
        {guide.verified && (
          <CheckCircle2 size={13} className="absolute -bottom-0.5 -right-0.5 text-green-400" fill="#0f1826" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{guide.name}</p>
        <p className="text-slate-500 text-[11px]">{guide.specialty}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <StarRating value={guide.rating} size={10} />
          <span className="text-yellow-400 text-[10px] font-semibold">{guide.rating}</span>
          <span className="text-slate-600 text-[10px]">({guide.reviews})</span>
        </div>
      </div>
      <button
        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all"
        style={{ background: '#22c55e', color: '#080e1a' }}
        onMouseOver={e => (e.currentTarget.style.background = '#16a34a')}
        onMouseOut={e => (e.currentTarget.style.background = '#22c55e')}
      >
        დაჯავშნე
      </button>
    </div>
  )
}
