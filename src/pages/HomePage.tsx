import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Search, Sparkles, Compass, Users, PenLine } from 'lucide-react'
import LazyMap from '../components/map/LazyMap'
import RouteCard from '../components/route/RouteCard'
import SectionTitle from '../components/common/SectionTitle'
import PostCard from '../components/post/PostCard'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useArticles, usePosts, useRegions, useRouteLines, useRoutes, useRouteStats, useSiteCounts } from '../lib/queries'
import { toMapLines } from '../lib/routeLines'
import { DIFFICULTIES, DIFF_LABEL } from '../lib/difficulty'
import { monthName, num } from '../lib/format'
import { useAuth } from '../lib/auth'
import type { Difficulty } from '../lib/types'

const DAY_CHOICES = [
  { v: '1', label: '1 დღე' },
  { v: '2-3', label: '2–3 დღე' },
  { v: '4-5', label: '4–5 დღე' },
  { v: '6+', label: '6+ დღე' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const routes = useRoutes()
  const regions = useRegions()
  const stats = useRouteStats()
  const lines = useRouteLines()
  const counts = useSiteCounts()
  const posts = usePosts({ limit: 3 })
  const articles = useArticles()
  const [q, setQ] = useState('')
  const [days, setDays] = useState('2-3')
  const [diff, setDiff] = useState<Difficulty | 'any'>('moderate')

  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])
  const month = new Date().getMonth() + 1
  const featured = (routes.data ?? []).filter((r) => r.featured).slice(0, 6)
  const inSeason = (routes.data ?? []).filter((r) => r.season_months.includes(month) && !r.featured).slice(0, 4)
  const regionCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of routes.data ?? []) m.set(r.region_id, (m.get(r.region_id) ?? 0) + 1)
    return m
  }, [routes.data])
  const mapLines = useMemo(() => toMapLines(lines.data), [lines.data])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/routes?q=${encodeURIComponent(q.trim())}` : '/routes')
  }

  return (
    <div>
      {/* hero: the map is the hero (on phones the card sits above the map so nothing overlaps) */}
      <section className="page pt-5">
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line">
          <div className="order-2 sm:order-none">
            <LazyMap className="h-[380px] sm:h-[620px]" routes={mapLines} cooperativeGestures />
          </div>
          <div className="pointer-events-none order-1 sm:absolute sm:inset-x-0 sm:top-0 sm:order-none sm:p-7">
            <div className="pointer-events-auto border-b border-line bg-surface p-5 sm:max-w-[460px] sm:rounded-2xl sm:border sm:bg-surface/95 sm:p-6 sm:shadow-pop sm:backdrop-blur">
              <p className="kicker flex items-center gap-2"><span className="blaze" />სალაშქრო მარშრუტები</p>
              <h1 className="mt-2 text-[28px] leading-[1.15] sm:text-[38px]">იპოვე შენი ბილიკი საქართველოში</h1>
              <p className="mt-2.5 text-[15px] text-ink-2">
                სირთულე, დღეები, გაჩერებები, აღჭურვილობა და გამოცდილი მოლაშქრეების რჩევები — ყველა მარშრუტზე.
              </p>
              <form onSubmit={submit} className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="მაგ: უშგული, ტბა, ყაზბეგი…" aria-label="მარშრუტის ძებნა" />
                </div>
                <button className="btn-primary">ძებნა</button>
              </form>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
                <span><b className="text-ink">{num(counts.data?.routes ?? routes.data?.length ?? 0)}</b> მარშრუტი</span>
                <span><b className="text-ink">{num(counts.data?.regions ?? 0)}</b> რეგიონი</span>
                {!!counts.data?.posts && <span><b className="text-ink">{num(counts.data.posts)}</b> ისტორია</span>}
                {!!counts.data?.tours && <span><b className="text-ink">{num(counts.data.tours)}</b> ტური</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* quick planner */}
      <section className="page mt-6">
        <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center gap-3 lg:w-64">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><Sparkles size={22} /></div>
            <div>
              <p className="font-serif text-[17px] font-bold leading-tight">რამდენი დღე გაქვს?</p>
              <p className="text-[13px] text-ink-3">შეგირჩევ მარშრუტს, მზა გეგმას და ტურს</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {DAY_CHOICES.map((d) => (
              <button key={d.v} onClick={() => setDays(d.v)} className={`chip ${days === d.v ? 'chip-on' : ''}`}>{d.label}</button>
            ))}
            <span className="mx-1 hidden w-px self-stretch bg-line sm:block" />
            {(['any', ...DIFFICULTIES] as const).map((d) => (
              <button key={d} onClick={() => setDiff(d)} className={`chip ${diff === d ? 'chip-on' : ''}`}>{d === 'any' ? 'ნებისმიერი' : DIFF_LABEL[d]}</button>
            ))}
          </div>
          <button onClick={() => navigate(`/planner?days=${days}&difficulty=${diff}`)} className="btn-primary shrink-0">
            დამიგეგმე <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* featured */}
      <section className="page mt-14">
        <SectionTitle kicker="რჩეული" title="ყველაზე ლამაზი მარშრუტები" to="/routes" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.isLoading
            ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
            : featured.map((r) => <RouteCard key={r.id} route={r} regionName={regionName.get(r.region_id)} stats={stats.data?.get(r.id)} />)}
        </div>
      </section>

      {/* in season now */}
      {inSeason.length > 0 && (
        <section className="page mt-14">
          <SectionTitle kicker={`${monthName(month)}`} title="ახლა სეზონია" to={`/routes?month=${month}`} linkLabel="ყველა ამ თვისთვის" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {inSeason.map((r) => <RouteCard key={r.id} route={r} regionName={regionName.get(r.region_id)} stats={stats.data?.get(r.id)} compact />)}
          </div>
        </section>
      )}

      {/* regions */}
      <section className="page mt-14">
        <SectionTitle kicker="რეგიონები" title="სად წავიდეთ?" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(regions.data ?? []).filter((r) => regionCounts.get(r.id)).map((r) => (
            <Link key={r.id} to={`/routes?region=${r.id}`} className="topo-texture group card relative overflow-hidden p-4 transition-shadow hover:shadow-pop">
              <p className="font-serif text-[18px] font-bold group-hover:text-forest">{r.name}</p>
              <p className="mt-0.5 text-[13px] text-ink-3">{regionCounts.get(r.id)} მარშრუტი</p>
              <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-2">{r.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* community */}
      <section className="page mt-14">
        <SectionTitle kicker="ბლოგი" title="მოლაშქრეების ისტორიები" to="/blog" />
        {posts.data && posts.data.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {posts.data.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        ) : (
          <Empty
            icon={<PenLine size={20} />}
            title="აქ შენი ისტორია იქნება"
            text="გაიარე მარშრუტი? დაწერე როგორ წავიდა, ატვირთე ფოტოები და მონიშნე მარშრუტი — სხვებს ძალიან დაეხმარება."
            action={<Link to={user ? '/blog/new' : '/register'} className="btn-primary">{user ? 'დაწერე პირველი პოსტი' : 'შემოგვიერთდი'}</Link>}
          />
        )}
      </section>

      {/* tips */}
      {articles.data && articles.data.length > 0 && (
        <section className="page mt-14">
          <SectionTitle kicker="რჩევები" title="სანამ მთაში წახვალ" to="/tips" />
          <div className="grid gap-5 md:grid-cols-3">
            {articles.data.slice(0, 3).map((a) => (
              <Link key={a.id} to={`/tips/${a.slug}`} className="group card p-5 transition-shadow hover:shadow-pop">
                <p className="kicker">{ARTICLE_CAT[a.category]}</p>
                <h3 className="mt-1.5 text-[18px] group-hover:text-forest">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-[14px] text-ink-2">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* guides band */}
      <section className="page mt-14">
        <div className="topo-texture card grid gap-6 overflow-hidden p-6 sm:p-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="kicker flex items-center gap-2"><Compass size={14} /> გიდები და ტურები</p>
            <h2 className="mt-2 text-[26px]">გინდა გამოცდილ გიდთან ერთად წასვლა?</h2>
            <p className="mt-2 text-ink-2">ადგილობრივი გიდები აქვეყნებენ ტურებს თარიღებით, ფასით და სირთულით. მისწერე პირდაპირ საიტიდან.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/guides" className="btn-primary"><Users size={16} /> ტურების ნახვა</Link>
            <Link to="/settings/guide" className="btn-secondary">ხარ გიდი? დარეგისტრირდი</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export const ARTICLE_CAT: Record<string, string> = {
  safety: 'უსაფრთხოება', gear: 'აღჭურვილობა', planning: 'დაგეგმვა', transport: 'ტრანსპორტი', nature: 'ბუნება', tips: 'რჩევები',
}
