import { Link } from 'react-router-dom'
import { Award, Compass, Languages, MapPin, MessageCircle } from 'lucide-react'
import type { GuideProfile } from '../../lib/types'
import Avatar from '../ui/Avatar'
import { excerpt } from '../../lib/format'
import { langLabel, messageHref } from './tourUtils'

interface Props {
  guide: GuideProfile
  regionName: (id: string) => string | undefined
  toursCount?: number
  isMe?: boolean
  signedIn: boolean
}

/** Approved guide: who they are, where they work, languages, and a way to reach them. */
export default function GuideCard({ guide: g, regionName, toursCount = 0, isMe = false, signedIn }: Props) {
  const p = g.profile
  if (!p) return null
  const company = g.kind === 'company' && g.company_name ? g.company_name : null
  const title = company ?? p.display_name
  const regions = g.regions.map(regionName).filter(Boolean) as string[]
  return (
    <article className="card flex flex-col p-5">
      <Link to={`/u/${p.username}`} className="group flex items-center gap-3">
        <Avatar url={p.avatar_url} name={p.display_name} size={52} />
        <span className="min-w-0">
          <span className="block truncate font-serif text-[17px] font-bold leading-snug text-ink group-hover:text-forest">{title}</span>
          <span className="block truncate text-[12.5px] text-ink-3">{company ? p.display_name : `@${p.username}`}</span>
        </span>
      </Link>

      {g.about && <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{excerpt(g.about, 220)}</p>}

      <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
        {regions.length > 0 && (
          <li className="flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden /><span><span className="sr-only">რეგიონები: </span>{regions.join(', ')}</span></li>
        )}
        {g.languages.length > 0 && (
          <li className="flex gap-2"><Languages size={14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden /><span><span className="sr-only">ენები: </span>{g.languages.map(langLabel).join(', ')}</span></li>
        )}
        {!!g.experience_years && g.experience_years > 0 && (
          <li className="flex gap-2"><Award size={14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />{g.experience_years} წლის გამოცდილება</li>
        )}
        {toursCount > 0 && (
          <li className="flex gap-2"><Compass size={14} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />{toursCount} აქტიური ტური</li>
        )}
      </ul>

      <div className="mt-auto flex gap-2 pt-5">
        <Link to={`/u/${p.username}`} className="btn-secondary btn-sm flex-1">პროფილი</Link>
        {isMe ? (
          <Link to="/settings/guide" className="btn-ghost btn-sm flex-1">ჩემი გვერდი</Link>
        ) : (
          <Link to={messageHref(g.user_id, signedIn)} className="btn-primary btn-sm flex-1"><MessageCircle size={15} aria-hidden /> მიწერა</Link>
        )}
      </div>
    </article>
  )
}
