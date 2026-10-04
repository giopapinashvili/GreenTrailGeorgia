import { Link } from 'react-router-dom'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import type { Tour } from '../../lib/types'
import Avatar from '../ui/Avatar'
import TopoCover from '../route/TopoCover'
import DifficultyBadge from '../route/DifficultyBadge'
import { daysLabel } from '../../lib/format'
import { dayShort, nextStartDate, priceLabel } from './tourUtils'

/** Tour card for listings: cover, title, route, length, next departure, guide and price. */
export default function TourCard({ tour: t, regionName }: { tour: Tour; regionName?: string }) {
  const next = nextStartDate(t.start_dates)
  return (
    <article className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      <Link to={`/tours/${t.id}`} className="relative block aspect-[4/3] overflow-hidden" tabIndex={-1} aria-hidden>
        {t.cover_url ? (
          <img src={t.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <TopoCover seed={`tour-${t.id}`} className="h-full w-full" />
        )}
        <span className="absolute left-3 top-3"><DifficultyBadge d={t.difficulty} size="sm" /></span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {regionName && <p className="kicker mb-1">{regionName}</p>}
        <Link to={`/tours/${t.id}`} className="font-serif text-[17px] font-bold leading-snug text-ink hover:text-forest">
          {t.title}
        </Link>
        {t.route && (
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
            <MapPin size={13} className="shrink-0 text-ink-3" aria-hidden />
            <span className="truncate">{t.route.name}</span>
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] font-medium text-ink-2">
          <span className="inline-flex items-center gap-1"><Clock size={13} className="text-ink-3" aria-hidden />{daysLabel(t.days, t.days)}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} className="text-ink-3" aria-hidden />
            {next ? `უახლოესი: ${dayShort(next)}` : 'თარიღი შეთანხმებით'}
          </span>
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-3 border-t border-line pt-3">
            {t.guide && (
              <Link to={`/u/${t.guide.username}`} className="flex min-w-0 items-center gap-2 hover:text-forest">
                <Avatar url={t.guide.avatar_url} name={t.guide.display_name} size={26} />
                <span className="truncate text-[13px] font-semibold">{t.guide.display_name}</span>
              </Link>
            )}
            <span className="ml-auto shrink-0 text-[14px] font-bold text-ink">{priceLabel(t.price_gel)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
