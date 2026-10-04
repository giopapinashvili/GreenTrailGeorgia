import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import PostCard from '../components/post/PostCard'
import RoutePicker from '../components/route/RoutePicker'
import { DiffShape } from '../components/route/DifficultyBadge'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useAuth } from '../lib/auth'
import { usePosts, useRegions, useRoutes, useRouteStats } from '../lib/queries'
import { num } from '../lib/format'
import { usePageTitle } from '../lib/title'

export default function BlogPage() {
  usePageTitle('ბლოგი')
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const routeId = Number(params.get('route')) || null
  const region = params.get('region') ?? ''
  const sort = params.get('sort') === 'popular' ? 'popular' : 'new'
  const [limit, setLimit] = useState(24)
  const routes = useRoutes()
  const regions = useRegions()
  const stats = useRouteStats()

  const regionRouteIds = useMemo(
    () => (region ? (routes.data ?? []).filter((r) => r.region_id === region).map((r) => r.id) : undefined),
    [region, routes.data],
  )
  const posts = usePosts({ routeId: routeId ?? undefined, regionRouteIds: routeId ? undefined : regionRouteIds, sort, limit })

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) { if (!v) next.delete(k); else next.set(k, v) }
    setParams(next, { replace: true })
    setLimit(24)
  }

  const active = useMemo(() => {
    const list = (routes.data ?? []).map((r) => ({ r, n: stats.data?.get(r.id)?.posts_count ?? 0 })).filter((x) => x.n > 0)
    return list.sort((a, b) => Number(b.n) - Number(a.n)).slice(0, 8)
  }, [routes.data, stats.data])

  const regionsWithRoutes = (regions.data ?? []).filter((g) => (routes.data ?? []).some((r) => r.region_id === g.id))
  const write = user ? '/blog/new' : `/login?next=${encodeURIComponent('/blog/new')}`
  const list = posts.data ?? []

  return (
    <div className="page pb-16">
      <PageHeader
        kicker="ბლოგი"
        title="მოლაშქრეების ისტორიები"
        text="ვინ სად იყო, როგორ წავიდა, რა დახვდათ გზაზე. ყველა ისტორია კონკრეტულ მარშრუტზეა მიბმული — ასე ადვილად იპოვი იმას, რაც გაინტერესებს."
        actions={<Link to={routeId ? `${write}${user ? `?route=${routeId}` : ''}` : write} className="btn-primary"><PenLine size={16} /> დაწერე ისტორია</Link>}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-80"><RoutePicker value={routeId} onChange={(id) => set({ route: id ? String(id) : null, region: null })} allowEmpty placeholder="ყველა მარშრუტი" /></div>
            <div className="flex gap-1 rounded-lg border border-line-2 bg-surface p-0.5 sm:ml-auto" role="group" aria-label="დალაგება">
              <button onClick={() => set({ sort: null })} className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${sort === 'new' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`}>ახალი</button>
              <button onClick={() => set({ sort: 'popular' })} className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${sort === 'popular' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`}>პოპულარული</button>
            </div>
          </div>
          {!routeId && (
            <div className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => set({ region: null })} className={`chip shrink-0 ${!region ? 'chip-on' : ''}`}>ყველა რეგიონი</button>
              {regionsWithRoutes.map((g) => (
                <button key={g.id} onClick={() => set({ region: region === g.id ? null : g.id })} className={`chip shrink-0 ${region === g.id ? 'chip-on' : ''}`}>{g.name}</button>
              ))}
            </div>
          )}

          <div className="mt-6">
            {posts.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}</div>
            ) : list.length === 0 ? (
              <Empty
                icon={<PenLine size={20} />}
                title={routeId || region ? 'აქ ჯერ ისტორია არ არის' : 'ბლოგი ჯერ ცარიელია'}
                text="იყავი პირველი: მოყევი შენი ლაშქრობის შესახებ, ატვირთე ფოტოები და მონიშნე მარშრუტი."
                action={<Link to={write} className="btn-primary">დაწერე ისტორია</Link>}
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">{list.map((p) => <PostCard key={p.id} post={p} />)}</div>
                {list.length >= limit && (
                  <div className="mt-8 text-center"><button onClick={() => setLimit((l) => l + 24)} className="btn-secondary">მეტის ნახვა</button></div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <p className="kicker mb-3">რას წერენ ყველაზე ხშირად</p>
            {active.length ? (
              <ul className="grid gap-1">
                {active.map(({ r, n }) => (
                  <li key={r.id}>
                    <button onClick={() => set({ route: String(r.id), region: null })} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[14px] hover:bg-surface-2">
                      <DiffShape d={r.difficulty} />
                      <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                      <span className="text-[12px] text-ink-3">{num(n)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13.5px] text-ink-3">როცა ისტორიები დაგროვდება, აქ გამოჩნდება ყველაზე განხილვადი მარშრუტები.</p>}
          </div>
          <div className="topo-texture card p-5">
            <p className="font-serif text-[17px] font-bold">რა დაწერო?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] text-ink-2">
              <li>როდის წახვედი და როგორი ამინდი იყო</li>
              <li>როგორ მიხვედი და დაბრუნდი</li>
              <li>სად გაათიე ღამე, რა ღირდა</li>
              <li>სად იყო წყალი, ხიდები, თოვლი</li>
              <li>რას გააკეთებდი სხვანაირად</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
