import { Heart, Clock, Mountain, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import StarRating from './StarRating'
import type { Route } from '../../types'

const DIFF_COLORS: Record<string, string> = {
  easy:   '#22c55e',
  medium: '#eab308',
  hard:   '#ef4444',
}
const DIFF_LABELS: Record<string, string> = {
  easy:   'მარტივი',
  medium: 'საშუალო',
  hard:   'რთული',
}

export default function RouteCard({ route }: { route: Route }) {
  const [liked, setLiked] = useState(false)
  const dc = DIFF_COLORS[route.difficulty]

  return (
    <div
      className="card-hover rounded-2xl overflow-hidden cursor-pointer group flex flex-col"
      style={{ background: '#0f1826', border: '1px solid #1a2640' }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden shrink-0">
        <img
          src={route.image}
          alt={route.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {route.badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: '#22c55e' }}>
              {route.badge}
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: dc }}
          >
            {DIFF_LABELS[route.difficulty]}
          </span>
        </div>

        {/* Heart */}
        <button
          onClick={e => { e.stopPropagation(); setLiked(!liked) }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(8,14,26,0.8)' }}
        >
          <Heart size={13} fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : '#94a3b8'} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-slate-500 text-[11px] uppercase tracking-widest mb-1">{route.location}</p>
        <h3 className="text-white font-bold text-sm mb-1 line-clamp-1">{route.titleKa}</h3>
        <p className="text-slate-500 text-[11px] mb-3">{route.title}</p>

        <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto">
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-green-400" />
            {route.duration}
          </span>
          <span className="flex items-center gap-1">
            <Mountain size={11} className="text-green-400" />
            {route.distance} კმ
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <StarRating value={route.rating} size={11} />
            <span className="text-yellow-400 font-semibold">{route.rating}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
