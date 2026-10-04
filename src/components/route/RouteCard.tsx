import { Link } from 'react-router-dom'
import { CalendarDays, MoveUpRight, Route as RouteIcon, Users } from 'lucide-react'
import type { RouteListItem, RouteStats } from '../../lib/types'
import DifficultyBadge from './DifficultyBadge'
import TopoCover from './TopoCover'
import { durationLabel, km, num } from '../../lib/format'

interface Props {
  route: RouteListItem
  regionName?: string
  stats?: RouteStats
  compact?: boolean
}

export default function RouteCard({ route: r, regionName, stats, compact }: Props) {
  return (
    <Link to={`/routes/${r.slug}`} className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      <div className="relative aspect-[4/3] overflow-hidden">
        {r.cover_url ? (
          <img src={r.cover_url} alt={r.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <TopoCover seed={r.slug} className="h-full w-full" />
        )}
        <div className="absolute left-3 top-3"><DifficultyBadge d={r.difficulty} size="sm" /></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {regionName && <p className="kicker mb-1">{regionName}</p>}
        <h3 className="font-serif text-[17px] leading-snug text-ink group-hover:text-forest">{r.name}</h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{r.summary}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-3 text-[12.5px] font-medium text-ink-2">
          <span className="inline-flex items-center gap-1"><CalendarDays size={13} className="text-ink-3" />{durationLabel(r)}</span>
          {r.distance_km !== null && <span className="inline-flex items-center gap-1"><RouteIcon size={13} className="text-ink-3" />{km(r.distance_km)}</span>}
          {r.elevation_gain_m !== null && <span className="inline-flex items-center gap-1"><MoveUpRight size={13} className="text-ink-3" />{num(r.elevation_gain_m)} მ</span>}
          {stats && stats.hikers_count > 0 && <span className="inline-flex items-center gap-1"><Users size={13} className="text-ink-3" />{num(stats.hikers_count)}</span>}
        </div>
      </div>
    </Link>
  )
}
