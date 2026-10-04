import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, ChevronLeft, ChevronRight, Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Stars from '../components/ui/Stars'
import Modal from '../components/ui/Modal'
import Confirm from '../components/ui/Confirm'
import Empty from '../components/ui/Empty'
import { PageSpinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import ReportButton from '../components/common/ReportButton'
import DifficultyBadge from '../components/route/DifficultyBadge'
import PostCard from '../components/post/PostCard'
import { PlainText } from '../lib/md'
import { useAuth } from '../lib/auth'
import { useComments, usePost, usePosts, useRegions, useRoutes } from '../lib/queries'
import { supabase, errorText } from '../lib/supabase'
import { removeFiles } from '../lib/storage'
import { durationLabel, formatDate, km, num, timeAgo } from '../lib/format'
import { usePageTitle } from '../lib/title'
import type { Comment, Post } from '../lib/types'

export default function PostPage() {
  const { id } = useParams()
  const postId = Number(id) || undefined
  const post = usePost(postId)
  usePageTitle(post.data?.title ?? (post.isLoading ? null : 'ისტორია ვერ მოიძებნა'))
  if (post.isLoading) return <PageSpinner />
  if (!post.data) {
    return (
      <div className="page py-16">
        <Empty title="ისტორია ვერ მოიძებნა" text="შეიძლება ავტორმა წაშალა." action={<Link to="/blog" className="btn-primary">ბლოგზე დაბრუნება</Link>} />
      </div>
    )
  }
  return <PostView p={post.data} />
}

function PostView({ p }: { p: Post }) {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const routes = useRoutes()
  const regions = useRegions()
  const more = usePosts({ routeId: p.route_id, limit: 4 })
  const [viewer, setViewer] = useState<number | null>(null)
  const [del, setDel] = useState(false)
  const own = user?.id === p.author_id
  const photos = p.photos ?? []
  const route = routes.data?.find((r) => r.id === p.route_id)
  const region = regions.data?.find((g) => g.id === route?.region_id)
  const likes = p.likes?.[0]?.count ?? 0

  const liked = useQuery({
    queryKey: ['liked', user?.id, p.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.from('post_likes').select('post_id').eq('post_id', p.id).eq('user_id', user!.id).maybeSingle()).data,
  })

  const toggleLike = async () => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/blog/${p.id}`)}`)
    const { error } = liked.data
      ? await supabase.from('post_likes').delete().eq('post_id', p.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: p.id })
    if (error) return toast(errorText(error), 'error')
    qc.invalidateQueries({ queryKey: ['liked', user.id, p.id] })
    qc.invalidateQueries({ queryKey: ['post', p.id] })
    qc.invalidateQueries({ queryKey: ['posts'] })
  }

  const remove = async () => {
    const paths = photos.map((ph) => ph.storage_path)
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) { toast(errorText(error), 'error'); return }
    if (own) await removeFiles('post-photos', paths)
    qc.invalidateQueries({ queryKey: ['posts'] })
    qc.invalidateQueries({ queryKey: ['route-stats'] })
    qc.invalidateQueries({ queryKey: ['route-photos'] })
    toast('ისტორია წაიშალა.')
    navigate('/blog', { replace: true })
  }

  return (
    <div className="page pb-16 pt-6">
      <Link to="/blog" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3 hover:text-ink"><ChevronLeft size={15} /> ბლოგი</Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          {p.is_hidden && <p className="mb-4 rounded-lg border border-moderate/40 bg-moderate/10 px-3 py-2 text-[13.5px] text-ink">ეს ისტორია დამალულია მოდერატორის მიერ და სხვებისთვის არ ჩანს.</p>}
          {p.route && (
            <Link to={`/routes/${p.route.slug}`} className="kicker inline-flex items-center gap-2 hover:text-forest"><span className="blaze" />{p.route.name}</Link>
          )}
          <h1 className="mt-2 text-[30px] leading-tight sm:text-[38px]">{p.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {p.author && (
              <Link to={`/u/${p.author.username}`} className="flex items-center gap-2.5 hover:text-forest">
                <Avatar url={p.author.avatar_url} name={p.author.display_name} size={38} />
                <span>
                  <span className="block text-[14.5px] font-semibold leading-tight">{p.author.display_name}</span>
                  <span className="block text-[12.5px] text-ink-3">{formatDate(p.created_at)}</span>
                </span>
              </Link>
            )}
            {p.hiked_on && <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2"><CalendarCheck size={15} className="text-forest" /> გაიარა {formatDate(p.hiked_on)}</span>}
            {p.rating ? <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2"><Stars value={p.rating} size={14} /> შეფასება</span> : null}
          </div>

          {photos.length > 0 && <Gallery photos={photos} onOpen={setViewer} />}

          <PlainText text={p.body} className="prose-gt mt-6" />

          <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-line py-3">
            <button onClick={toggleLike} className={`btn-sm ${liked.data ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={!!liked.data}>
              <Heart size={16} className={liked.data ? 'fill-current' : ''} /> {num(likes)}
            </button>
            <a href="#comments" className="btn-ghost btn-sm"><MessageCircle size={16} /> {num(p.comments?.[0]?.count ?? 0)}</a>
            <div className="ml-auto flex items-center gap-3">
              {own && <Link to={`/blog/${p.id}/edit`} className="btn-ghost btn-sm"><Pencil size={15} /> რედაქტირება</Link>}
              {(own || isAdmin) && <button onClick={() => setDel(true)} className="btn-ghost btn-sm text-hard"><Trash2 size={15} /> წაშლა</button>}
              {!own && <ReportButton type="post" id={p.id} />}
            </div>
          </div>

          <Comments post={p} />
        </article>

        <aside className="space-y-5">
          {route && (
            <div className="card overflow-hidden">
              {route.cover_url && <img src={route.cover_url} alt="" className="h-32 w-full object-cover" />}
              <div className="p-4">
                <p className="kicker mb-1">{region?.name ?? 'მარშრუტი'}</p>
                <Link to={`/routes/${route.slug}`} className="font-serif text-[17px] font-bold leading-snug hover:text-forest">{route.name}</Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
                  <DifficultyBadge d={route.difficulty} size="sm" />
                  <span>{durationLabel(route)}</span>
                  {route.distance_km !== null && <span>· {km(route.distance_km)}</span>}
                </div>
                <Link to={`/routes/${route.slug}`} className="btn-secondary btn-sm mt-3 w-full">მარშრუტის ნახვა</Link>
              </div>
            </div>
          )}
          {p.author && !own && (
            <div className="card flex items-center gap-3 p-4">
              <Avatar url={p.author.avatar_url} name={p.author.display_name} size={44} />
              <div className="min-w-0 flex-1">
                <Link to={`/u/${p.author.username}`} className="block truncate font-semibold hover:text-forest">{p.author.display_name}</Link>
                <span className="text-[12.5px] text-ink-3">@{p.author.username}</span>
              </div>
              <Link to={user ? `/messages?to=${p.author.id}` : `/login?next=${encodeURIComponent(`/messages?to=${p.author.id}`)}`} className="btn-secondary btn-sm">მიწერა</Link>
            </div>
          )}
          {(more.data ?? []).filter((x) => x.id !== p.id).length > 0 && (
            <div>
              <p className="kicker mb-3">სხვა ისტორიები ამ მარშრუტზე</p>
              <div className="grid gap-4">{(more.data ?? []).filter((x) => x.id !== p.id).slice(0, 2).map((x) => <PostCard key={x.id} post={x} hideRoute />)}</div>
            </div>
          )}
        </aside>
      </div>

      <Modal open={viewer !== null} onClose={() => setViewer(null)} size="xl" title={photos[viewer ?? 0]?.caption || `ფოტო ${(viewer ?? 0) + 1} / ${photos.length}`}>
        {viewer !== null && photos[viewer] && (
          <div>
            <img src={photos[viewer].url} alt={photos[viewer].caption ?? ''} className="mx-auto max-h-[72vh] w-auto rounded-lg" />
            {photos.length > 1 && (
              <div className="mt-3 flex justify-between">
                <button className="btn-ghost btn-sm" disabled={viewer === 0} onClick={() => setViewer((v) => Math.max(0, (v ?? 0) - 1))}><ChevronLeft size={16} /> წინა</button>
                <button className="btn-ghost btn-sm" disabled={viewer >= photos.length - 1} onClick={() => setViewer((v) => Math.min(photos.length - 1, (v ?? 0) + 1))}>შემდეგი <ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Confirm open={del} onClose={() => setDel(false)} title="ისტორიის წაშლა?" text="ისტორია, ფოტოები და კომენტარები სამუდამოდ წაიშლება." confirmLabel="წაშლა" danger onConfirm={remove} />
    </div>
  )
}

function Gallery({ photos, onOpen }: { photos: NonNullable<Post['photos']>; onOpen: (i: number) => void }) {
  const [first, ...rest] = photos
  return (
    <div className="mt-6 grid gap-2">
      <button onClick={() => onOpen(0)} className="overflow-hidden rounded-xl bg-surface-2">
        <img src={first.url} alt={first.caption ?? ''} className="max-h-[560px] w-full object-cover" />
      </button>
      {first.caption && <p className="text-[13px] text-ink-3">{first.caption}</p>}
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {rest.map((ph, i) => (
            <button key={ph.id} onClick={() => onOpen(i + 1)} className="aspect-square overflow-hidden rounded-lg bg-surface-2">
              <img src={ph.url} alt={ph.caption ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Comments({ post }: { post: Post }) {
  const { user, profile } = useAuth()
  const comments = useComments(post.id)
  const qc = useQueryClient()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useMemo(() => (comments.data ?? []).filter((c) => !c.is_hidden || c.author_id === profile?.id), [comments.data, profile?.id])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['comments', post.id] })
    qc.invalidateQueries({ queryKey: ['post', post.id] })
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    const { error } = await supabase.from('comments').insert({ post_id: post.id, body: text })
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    setBody('')
    refresh()
  }
  const remove = async (c: Comment) => {
    const { error } = await supabase.from('comments').delete().eq('id', c.id)
    if (error) return toast(errorText(error), 'error')
    refresh()
  }

  return (
    <section id="comments" className="mt-8 scroll-mt-24">
      <h2 className="text-[22px]">კომენტარები {list.length > 0 && <span className="text-ink-3">({list.length})</span>}</h2>
      {user ? (
        <form onSubmit={submit} className="mt-4 flex gap-3">
          <Avatar url={profile?.avatar_url} name={profile?.display_name ?? '?'} size={36} />
          <div className="flex-1">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} className="input" placeholder="დაწერე კომენტარი ან კითხვა ავტორს" />
            <div className="mt-2 flex justify-end"><button className="btn-primary btn-sm" disabled={busy || !body.trim()}>გაგზავნა</button></div>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-[14px] text-ink-2"><Link to={`/login?next=${encodeURIComponent(`/blog/${post.id}#comments`)}`} className="link">შედი</Link>, რომ დაწერო კომენტარი.</p>
      )}
      <ul className="mt-6 grid gap-5">
        {list.map((c) => {
          const mine = c.author_id === profile?.id
          const canDelete = mine || post.author_id === profile?.id
          return (
            <li key={c.id} className="flex gap-3">
              {c.author && <Link to={`/u/${c.author.username}`}><Avatar url={c.author.avatar_url} name={c.author.display_name} size={34} /></Link>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  {c.author && <Link to={`/u/${c.author.username}`} className="text-[14px] font-semibold hover:text-forest">{c.author.display_name}</Link>}
                  <span className="text-[12px] text-ink-3">{timeAgo(c.created_at)}</span>
                </div>
                <PlainText text={c.body} className="mt-0.5 text-[14.5px] leading-relaxed text-ink" />
                <div className="mt-1 flex gap-3">
                  {canDelete && <button onClick={() => remove(c)} className="text-[12.5px] text-ink-3 hover:text-hard">წაშლა</button>}
                  {!mine && <ReportButton type="comment" id={c.id} />}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
