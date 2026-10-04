import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Award, CalendarDays, ChevronLeft, ChevronRight, Footprints, Heart, Image as ImageIcon, Languages, Lightbulb, MapPin, MessageCircle, PenLine, Route as RouteIcon, Settings } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Tabs from '../components/ui/Tabs'
import Empty from '../components/ui/Empty'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { CardSkeleton } from '../components/ui/Skeleton'
import ReportButton from '../components/common/ReportButton'
import PostCard from '../components/post/PostCard'
import RouteCard from '../components/route/RouteCard'
import TourCard from '../components/guides/TourCard'
import { langLabel, socialUrl, telHref, webUrl } from '../components/guides/tourUtils'
import { useAuth } from '../lib/auth'
import { useCompletions, useGuideProfile, usePosts, useProfileByUsername, useProfileStats, useRegions, useTours } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { formatDate, num } from '../lib/format'
import { usePageTitle } from '../lib/title'
import type { Profile } from '../lib/types'

type Tab = 'posts' | 'photos' | 'routes' | 'tours'

export default function ProfilePage() {
  const { username } = useParams()
  const profile = useProfileByUsername(username)
  usePageTitle(profile.data?.display_name ?? (profile.isLoading ? null : 'პროფილი ვერ მოიძებნა'))
  if (profile.isLoading) return <PageSpinner />
  if (!profile.data) {
    return <div className="page py-16"><Empty title="ასეთი მომხმარებელი ვერ მოიძებნა" text="შეიძლება სახელი შეიცვალა." action={<Link to="/" className="btn-primary">მთავარი</Link>} /></div>
  }
  return <ProfileView p={profile.data} />
}

function ProfileView({ p }: { p: Profile }) {
  const { user } = useAuth()
  const regions = useRegions()
  const stats = useProfileStats(p.id)
  const isGuide = p.role === 'guide'
  const [tab, setTab] = useState<Tab>('posts')
  const me = user?.id === p.id
  const regionName = (id: string | null | undefined) => regions.data?.find((g) => g.id === id)?.name
  const s = stats.data

  const tabs = [
    { id: 'posts' as const, label: 'ისტორიები', count: s?.posts },
    { id: 'photos' as const, label: 'ფოტოები', count: s?.photos },
    { id: 'routes' as const, label: 'გავლილი მარშრუტები', count: s?.completed },
    ...(isGuide ? [{ id: 'tours' as const, label: 'ტურები' }] : []),
  ]

  return (
    <div className="page pb-16 pt-8">
      {/* header */}
      <div className="topo-texture card overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar url={p.avatar_url} name={p.display_name} size={96} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] leading-tight">{p.display_name}</h1>
              {p.role === 'guide' && <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-0.5 text-[12px] font-bold text-on-forest"><Award size={13} /> გიდი</span>}
              {p.role === 'admin' && <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[12px] font-bold text-ink-2">ადმინი</span>}
            </div>
            <p className="text-[14px] text-ink-3">@{p.username}</p>
            {p.bio && <p className="mt-2 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{p.bio}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
              {p.home_region && regionName(p.home_region) && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {regionName(p.home_region)}</span>}
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> შემოგვიერთდა {formatDate(p.created_at)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {me ? (
              <Link to="/settings" className="btn-secondary"><Settings size={16} /> რედაქტირება</Link>
            ) : (
              <>
                <Link to={user ? `/messages?to=${p.id}` : `/login?next=${encodeURIComponent(`/messages?to=${p.id}`)}`} className="btn-primary"><MessageCircle size={16} /> მიწერა</Link>
                <ReportButton type="user" id={p.id} className="self-center" />
              </>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Stat icon={<PenLine size={15} />} value={s?.posts} label="ისტორია" />
          <Stat icon={<ImageIcon size={15} />} value={s?.photos} label="ფოტო" />
          <Stat icon={<Footprints size={15} />} value={s?.completed} label="მარშრუტი" />
          <Stat icon={<RouteIcon size={15} />} value={s ? Math.round(Number(s.km)) : undefined} label="კმ" />
          <Stat icon={<Heart size={15} />} value={s?.likes} label="მოწონება" />
          <Stat icon={<Lightbulb size={15} />} value={s?.tips} label="რჩევა" />
        </div>
      </div>

      {isGuide && <GuideInfo userId={p.id} regionName={regionName} />}

      <Tabs className="mt-8" tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === 'posts' && <PostsTab uid={p.id} me={me} />}
        {tab === 'photos' && <PhotosTab uid={p.id} />}
        {tab === 'routes' && <RoutesTab uid={p.id} regionName={regionName} me={me} />}
        {tab === 'tours' && <ToursTab uid={p.id} regionName={regionName} />}
      </div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | undefined; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[19px] font-bold text-ink"><span className="text-ink-3">{icon}</span>{value === undefined ? '—' : num(value)}</p>
      <p className="text-[12px] text-ink-3">{label}</p>
    </div>
  )
}

function GuideInfo({ userId, regionName }: { userId: string; regionName: (id: string) => string | undefined }) {
  const g = useGuideProfile(userId).data
  if (!g || g.status !== 'approved') return null
  const links = [
    g.phone ? { href: telHref(g.phone), label: g.phone } : null,
    g.email ? { href: `mailto:${g.email}`, label: g.email } : null,
    webUrl(g.website) ? { href: webUrl(g.website)!, label: 'ვებგვერდი' } : null,
    socialUrl('facebook', g.facebook) ? { href: socialUrl('facebook', g.facebook)!, label: 'Facebook' } : null,
    socialUrl('instagram', g.instagram) ? { href: socialUrl('instagram', g.instagram)!, label: 'Instagram' } : null,
  ].filter(Boolean) as { href: string; label: string }[]
  return (
    <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <p className="kicker mb-1.5">{g.kind === 'company' && g.company_name ? g.company_name : 'გიდი'}</p>
        <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{g.about}</p>
      </div>
      <div className="grid content-start gap-2 text-[13.5px]">
        {g.regions.length > 0 && <p className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" />{g.regions.map((r) => regionName(r) ?? r).join(', ')}</p>}
        {g.languages.length > 0 && <p className="flex gap-2"><Languages size={15} className="mt-0.5 shrink-0 text-ink-3" />{g.languages.map(langLabel).join(', ')}</p>}
        {g.experience_years ? <p className="flex gap-2"><Award size={15} className="mt-0.5 shrink-0 text-ink-3" />{g.experience_years} წლის გამოცდილება</p> : null}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {links.map((l) => <a key={l.href} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="link">{l.label}</a>)}
          </div>
        )}
      </div>
    </div>
  )
}

function PostsTab({ uid, me }: { uid: string; me: boolean }) {
  const posts = usePosts({ authorId: uid, limit: 60 })
  if (posts.isLoading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
  if (!posts.data?.length) {
    return <Empty compact icon={<PenLine size={20} />} title="ისტორიები ჯერ არ არის" text={me ? 'გაიარე მარშრუტი? მოყევი, როგორ წავიდა — სხვებს ძალიან გამოადგება.' : undefined} action={me ? <Link to="/blog/new" className="btn-primary">დაწერე ისტორია</Link> : undefined} />
  }
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.data.map((p) => <PostCard key={p.id} post={p} />)}</div>
}

function PhotosTab({ uid }: { uid: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const photos = useQuery({
    queryKey: ['user-photos', uid],
    queryFn: async () => {
      const { data, error } = await supabase.from('post_photos').select('id,url,caption,post_id').eq('author_id', uid).order('created_at', { ascending: false }).limit(90)
      if (error) throw error
      return (data ?? []) as { id: number; url: string; caption: string | null; post_id: number }[]
    },
  })
  const list = photos.data ?? []
  if (photos.isLoading) return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface-3/60" />)}</div>
  if (!list.length) return <Empty compact icon={<ImageIcon size={20} />} title="ფოტოები ჯერ არ არის" />
  const cur = open !== null ? list[open] : null
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {list.map((ph, i) => (
          <button key={ph.id} onClick={() => setOpen(i)} className="group aspect-square overflow-hidden rounded-lg bg-surface-2">
            <img src={ph.url} alt={ph.caption ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          </button>
        ))}
      </div>
      <Modal open={!!cur} onClose={() => setOpen(null)} size="xl" title={cur?.caption || 'ფოტო'}>
        {cur && (
          <div>
            <img src={cur.url} alt={cur.caption ?? ''} className="mx-auto max-h-[70vh] w-auto rounded-lg" />
            <div className="mt-3 flex items-center justify-between">
              <button className="btn-ghost btn-sm" disabled={open === 0} onClick={() => setOpen((x) => Math.max(0, (x ?? 0) - 1))}><ChevronLeft size={16} /> წინა</button>
              <Link to={`/blog/${cur.post_id}`} className="link text-[14px]">ისტორიის ნახვა</Link>
              <button className="btn-ghost btn-sm" disabled={open === list.length - 1} onClick={() => setOpen((x) => Math.min(list.length - 1, (x ?? 0) + 1))}>შემდეგი <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function RoutesTab({ uid, regionName, me }: { uid: string; regionName: (id: string) => string | undefined; me: boolean }) {
  const done = useCompletions(uid)
  const byRegion = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of done.data ?? []) if (c.route) m.set(c.route.region_id, (m.get(c.route.region_id) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [done.data])
  if (done.isLoading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
  const list = (done.data ?? []).filter((c) => c.route)
  if (!list.length) {
    return <Empty compact icon={<Footprints size={20} />} title="გავლილი მარშრუტები ჯერ არ არის" text={me ? 'მარშრუტის გვერდზე დააჭირე „გავიარე“ ან დაწერე ისტორია თარიღით.' : undefined} />
  }
  return (
    <div>
      {byRegion.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {byRegion.map(([id, n]) => <span key={id} className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink-2"><b className="text-ink">{regionName(id) ?? id}</b> · {n}</span>)}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div key={c.route_id} className="flex flex-col gap-1.5">
            <RouteCard route={c.route} regionName={regionName(c.route.region_id)} compact />
            {c.completed_on && <p className="px-1 text-[12.5px] text-ink-3">გაიარა {formatDate(c.completed_on)}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ToursTab({ uid, regionName }: { uid: string; regionName: (id: string) => string | undefined }) {
  const tours = useTours({ guideId: uid })
  if (tours.isLoading) return null
  if (!tours.data?.length) return <Empty compact title="აქტიური ტური ჯერ არ არის" />
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tours.data.map((t) => <TourCard key={t.id} tour={t} regionName={t.route ? regionName(t.route.region_id) : undefined} />)}</div>
}
