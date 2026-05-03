import StarRating from './StarRating'
import type { Hotel } from '../../types'

export default function HotelCard({ hotel, compact = false }: { hotel: Hotel; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-colors hover:bg-white/5">
        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
          <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{hotel.name}</p>
          <p className="text-slate-500 text-[11px]">{hotel.location}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating value={hotel.rating} size={10} />
            <span className="text-yellow-400 text-[10px] font-semibold">{hotel.rating}</span>
            <span className="text-slate-600 text-[10px]">({hotel.reviews})</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-green-400 font-bold text-sm">{hotel.price} {hotel.currency}</p>
          <p className="text-slate-600 text-[10px]">/დღე</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-hover rounded-2xl overflow-hidden cursor-pointer group" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
      <div className="h-40 overflow-hidden">
        <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4">
        <p className="text-slate-500 text-[11px] uppercase tracking-widest mb-1">{hotel.location}</p>
        <h3 className="text-white font-bold text-sm mb-2">{hotel.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StarRating value={hotel.rating} size={12} />
            <span className="text-yellow-400 text-xs font-semibold ml-1">{hotel.rating}</span>
            <span className="text-slate-500 text-xs">({hotel.reviews})</span>
          </div>
          <div className="text-right">
            <span className="text-green-400 font-bold">{hotel.price} {hotel.currency}</span>
            <span className="text-slate-500 text-xs"> /დღე</span>
          </div>
        </div>
      </div>
    </div>
  )
}
