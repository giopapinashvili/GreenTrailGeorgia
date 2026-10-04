import { Link } from 'react-router-dom'
import { Heart, MessageSquare, Images, MapPin } from 'lucide-react'
import type { Post } from '../../lib/types'
import Avatar from '../ui/Avatar'
import Stars from '../ui/Stars'
import TopoCover from '../route/TopoCover'
import { DiffShape } from '../route/DifficultyBadge'
import { excerpt, num, timeAgo } from '../../lib/format'

/** Blog post card: cover photo, route tag, author and counts. */
export default function PostCard({ post: p, hideRoute = false }: { post: Post; hideRoute?: boolean }) {
  const cover = p.cover_url ?? p.photos?.[0]?.url ?? null
  const likes = p.likes?.[0]?.count ?? 0
  const comments = p.comments?.[0]?.count ?? 0
  const photos = p.photos?.length ?? 0
  return (
    <article className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      <Link to={`/blog/${p.id}`} className="relative block aspect-[16/10] overflow-hidden" tabIndex={-1} aria-hidden>
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <TopoCover seed={`post-${p.id}`} className="h-full w-full" />
        )}
        {photos > 1 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold text-white">
            <Images size={12} /> {photos}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {!hideRoute && p.route && (
          <Link to={`/routes/${p.route.slug}`} className="mb-1.5 inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:text-forest">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{p.route.name}</span>
            <DiffShape d={p.route.difficulty} size={8} />
          </Link>
        )}
        <Link to={`/blog/${p.id}`} className="font-serif text-[17px] font-bold leading-snug text-ink hover:text-forest">{p.title}</Link>
        {p.rating ? <div className="mt-1"><Stars value={p.rating} size={13} /></div> : null}
        <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">{excerpt(p.body, 200)}</p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          {p.author && (
            <Link to={`/u/${p.author.username}`} className="flex min-w-0 items-center gap-2 hover:text-forest">
              <Avatar url={p.author.avatar_url} name={p.author.display_name} size={26} />
              <span className="truncate text-[13px] font-semibold">{p.author.display_name}</span>
            </Link>
          )}
          <span className="text-[12px] text-ink-3">· {timeAgo(p.created_at)}</span>
          <span className="ml-auto flex shrink-0 items-center gap-3 text-[12.5px] text-ink-3">
            <span className="inline-flex items-center gap-1"><Heart size={13} />{num(likes)}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare size={13} />{num(comments)}</span>
          </span>
        </div>
      </div>
    </article>
  )
}
