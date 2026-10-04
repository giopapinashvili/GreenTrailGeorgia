import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Map as MLMap } from 'maplibre-gl'
import {
  AlertTriangle, ArrowUpRight, Bus, CalendarDays, ChevronRight, Droplets, FileText, Home, MoveDownRight, MoveUpRight,
  Mountain, PhoneCall, Route as RouteIcon, Signal, Star, Ticket, Users,
} from 'lucide-react'
import LazyMap from '../components/map/LazyMap'
import ElevationProfile from '../components/route/ElevationProfile'
import StopsTimeline from '../components/route/StopsTimeline'
import GearChecklist from '../components/route/GearChecklist'
import SeasonBar from '../components/route/SeasonBar'
import DifficultyBadge, { DiffShape } from '../components/route/DifficultyBadge'
import RouteTips from '../components/route/RouteTips'
import RouteActions from '../components/route/RouteActions'
import RouteCard from '../components/route/RouteCard'
import PostCard from '../components/post/PostCard'
import Empty from '../components/ui/Empty'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { Markdown } from '../lib/md'
import {
  usePosts, useRegions, useRoute, useRouteMonthly, useRoutePhotos, useRoutes, useRouteStats, useRouteStops, useTours,
} from '../lib/queries'
import { supabase } from '../lib/supabase'
import { DIFFICULTIES, DIFF_HINT, DIFF_LABEL, DIFF_LEVEL, difficultyFactors } from '../lib/difficulty'
import { durationLabel, formatDate, km, meters, monthShort, num, seasonLabel } from '../lib/format'
import { haversineKm, kmAlong } from '../lib/geo'
import { ROUTE_TYPE_LABEL, tagLabel } from '../lib/tags'
import { usePageTitle } from '../lib/title'
import type { Route, RouteStop } from '../lib/types'

const SECTIONS = [
  { id: 'overview', label: 'მიმოხილვა' },
  { id: 'stops', label: 'გაჩერებები' },
  { id: 'difficulty', label: 'სირთულე' },
  { id: 'gear', label: 'აღჭურვილობა' },
  { id: 'tips', label: 'რჩევები' },
  { id: 'info', label: 'პრაქტიკული' },
  { id: 'stories', label: 'ისტორიები' },
]

export default function RoutePage() {
  const { slug } = useParams()
  const route = useRoute(slug)
  const r = route.data
  usePageTitle(r?.name ?? (route.isLoading ? null : 'მარშრუტი ვერ მოიძებნა'))

  if (route.isLoading) return <PageSpinner />
  if (!r) {
    return (
      <div className="page py-16">
        <Empty title="მარშრუტი ვერ მოიძებნა" text="შეიძლება ბმული შეიცვალა ან მარშრუტი დროებით დამალულია." action={<Link to="/routes" className="btn-primary">ყველა მარშრუტი</Link>} />
      </div>
    )
  }
  return <RouteView r={r} />
}

function RouteView({ r }: { r: Route }) {
  const stops = useRouteStops(r.id)
  const regions = useRegions()
  const allStats = useRouteStats()
  const monthly = useRouteMonthly(r.id)
  const posts = usePosts({ routeId: r.id, limit: 6 })
  const photos = useRoutePhotos(r.id, 12)
  const tours = useTours({ routeId: r.id })
  const routes = useRoutes()
  const mapRef = useRef<MLMap | null>(null)
  const [hoverKm, setHoverKm] = useState<number | null>(null)
  const [photo, setPhoto] = useState<number | null>(null)

  const region = regions.data?.find((x) => x.id === r.region_id)
  const stats = allStats.data?.get(r.id)
  const stopList: RouteStop[] = stops.data ?? []
  const line = r.geometry && r.geometry.length > 1 ? r.geometry : null
  const profile = r.elevation_profile && r.elevation_profile.length > 1 ? r.elevation_profile : null

  // count a view once per browser session
  useEffect(() => {
    const k = `gt-v-${r.id}`
    try {
      if (sessionStorage.getItem(k)) return
      sessionStorage.setItem(k, '1')
    } catch { /* private mode */ }
    supabase.rpc('bump_route_view', { rid: r.id }).then(() => {})
  }, [r.id])

  // km mark of each stop along the line, and the cumulative distance table for the profile cursor
  const stopKms = useMemo(() => (line && stopList.length ? kmAlong(line, stopList.map((s) => [s.lng, s.lat])) : undefined), [line, stopList])
  const cum = useMemo(() => {
    if (!line) return null
    const c = [0]
    for (let i = 1; i < line.length; i++) c.push(c[i - 1] + haversineKm(line[i - 1], line[i]))
    return c
  }, [line])
  const hoverPoint = useMemo<[number, number] | null>(() => {
    if (hoverKm === null || !line || !cum) return null
    let lo = 0, hi = cum.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < hoverKm) lo = mid + 1; else hi = mid }
    return [line[lo][0], line[lo][1]]
  }, [hoverKm, line, cum])

  const similar = useMemo(() => {
    const all = (routes.data ?? []).filter((x) => x.id !== r.id)
    const score = (x: (typeof all)[number]) => (x.region_id === r.region_id ? 3 : 0) + (x.difficulty === r.difficulty ? 2 : 0) + (Math.abs(x.days_max - r.days_max) <= 1 ? 1 : 0)
    return all.map((x) => ({ x, s: score(x) })).filter((o) => o.s >= 3).sort((a, b) => b.s - a.s).slice(0, 3).map((o) => o.x)
  }, [routes.data, r])

  const focusStop = (s: RouteStop) => {
    mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: Math.max(mapRef.current.getZoom(), 13.5), duration: 900 })
    document.getElementById('route-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const factors = difficultyFactors(r)
  const photoList = photos.data ?? []
  const month = new Date().getMonth() + 1
  const inSeason = r.season_months.includes(month)

  return (
    <div className="pb-16">
      {/* ───────── header ───────── */}
      <div className="page pt-6">
        <nav className="flex items-center gap-1 text-[13px] text-ink-3" aria-label="ნავიგაცია">
          <Link to="/routes" className="hover:text-ink">მარშრუტები</Link>
          <ChevronRight size={14} />
          {region && <Link to={`/routes?region=${region.id}`} className="hover:text-ink">{region.name}</Link>}
        </nav>
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge d={r.difficulty} solid />
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[12.5px] font-semibold text-ink-2"><CalendarDays size={13} /> {durationLabel(r)}</span>
              {inSeason ? (
                <span className="rounded-full bg-easy/10 px-2.5 py-1 text-[12.5px] font-semibold text-easy">ახლა სეზონია</span>
              ) : (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12.5px] font-semibold text-ink-3">სეზონი: {seasonLabel(r.season_months)}</span>
              )}
            </div>
            <h1 className="mt-3 text-[30px] leading-[1.15] sm:text-[40px]">{r.name}</h1>
            <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2">{r.summary}</p>
            <div className="mt-5"><RouteActions route={r} stops={stopList} /></div>
          </div>
          <KeyNumbers r={r} />
        </div>
      </div>

      {/* ───────── cover + map ───────── */}
      <div className="page mt-6">
        <div className={`grid gap-3 ${r.cover_url ? 'lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]' : ''}`}>
          <div id="route-map" className="relative overflow-hidden rounded-2xl border border-line">
            <LazyMap
              className="h-[420px] sm:h-[480px]"
              focusLine={line}
              focusDifficulty={r.difficulty}
              stops={stopList}
              hoverPoint={hoverPoint}
              onReady={(m) => { mapRef.current = m }}
              cooperativeGestures
            />
            {!line && stopList.length > 0 && (
              <div className="pointer-events-none absolute bottom-3 left-3 right-14 sm:right-auto">
                <p className="pointer-events-auto max-w-sm rounded-lg border border-line bg-surface/95 px-3 py-2 text-[12.5px] text-ink-2 shadow-card backdrop-blur">
                  ბილიკის ზუსტი ხაზი ჯერ არ არის დახაზული — რუკაზე გაჩერებებია მიმდევრობით.
                </p>
              </div>
            )}
          </div>
          {r.cover_url && (
            <figure className="relative hidden overflow-hidden rounded-2xl border border-line lg:block">
              <img src={r.cover_url} alt={r.name} className="h-full max-h-[480px] w-full object-cover" />
              {r.cover_credit && (
                <figcaption className="absolute bottom-2 right-2 max-w-[90%] truncate rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">
                  {r.cover_source_url ? <a href={r.cover_source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">ფოტო: {r.cover_credit}</a> : `ფოტო: ${r.cover_credit}`}
                </figcaption>
              )}
            </figure>
          )}
        </div>
        {profile && (
          <div className="card mt-3 p-3 sm:p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-[13px] font-semibold text-ink-2">სიმაღლის პროფილი {r.route_type === 'out_and_back' && <span className="font-normal text-ink-3">· ერთი მიმართულება</span>}</p>
              <p className="text-[12px] text-ink-3">გადაატარე კურსორი — წერტილი რუკაზეც გამოჩნდება</p>
            </div>
            <ElevationProfile
              profile={profile}
              markers={stopKms ? stopList.map((s, i) => ({ km: stopKms[i], label: s.name })) : []}
              onHover={setHoverKm}
            />
          </div>
        )}
      </div>

      {/* ───────── section nav ───────── */}
      <div className="sticky top-16 z-30 mt-8 border-y border-line bg-bg/95 backdrop-blur">
        <div className="page scrollbar-none flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 whitespace-nowrap px-3 py-3 text-[14px] font-semibold text-ink-2 hover:text-forest">{s.label}</a>
          ))}
        </div>
      </div>

      <div className="page mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {/* overview */}
          <Section id="overview" title="მიმოხილვა">
            {r.description ? <Markdown text={r.description} /> : <p className="text-ink-2">{r.summary}</p>}
            {r.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {r.tags.map((t) => <Link key={t} to={`/routes?tags=${t}`} className="chip">{tagLabel(t)}</Link>)}
              </div>
            )}
          </Section>

          {/* stops */}
          <Section id="stops" title="გაჩერებები" kicker={stopList.length ? `${stopList.length} წერტილი` : undefined}>
            {stops.isLoading ? null : stopList.length ? (
              <>
                <p className="mb-3 text-[14px] text-ink-3">დააჭირე გაჩერებას — რუკა იქ მიგიყვანს. მწვანე წრე ღამისთევის ადგილს ნიშნავს.</p>
                <StopsTimeline stops={stopList} kms={stopKms} onFocus={focusStop} />
              </>
            ) : <p className="text-ink-3">გაჩერებები ჯერ არ არის დამატებული.</p>}
          </Section>

          {/* difficulty */}
          <Section id="difficulty" title="რამდენად რთულია">
            <div className="card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-end gap-1" aria-label={`სირთულე: ${DIFF_LABEL[r.difficulty]}`}>
                  {DIFFICULTIES.map((d) => (
                    <span key={d} className="w-9 rounded-sm" style={{ height: 10 + DIFF_LEVEL[d] * 7, background: DIFF_LEVEL[d] <= DIFF_LEVEL[r.difficulty] ? `rgb(var(--${r.difficulty}))` : 'rgb(var(--surface-3))' }} />
                  ))}
                </div>
                <div>
                  <p className="font-serif text-[20px] font-bold" style={{ color: `rgb(var(--${r.difficulty}))` }}>{DIFF_LABEL[r.difficulty]}</p>
                  <p className="text-[14px] text-ink-2">{DIFF_HINT[r.difficulty]}</p>
                </div>
              </div>
              {r.difficulty_notes && <p className="mt-4 border-t border-line pt-4 text-[15px] leading-relaxed text-ink">{r.difficulty_notes}</p>}
              {factors.length > 0 && (
                <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  {factors.map((fct) => (
                    <div key={fct.label}>
                      <div className="flex justify-between text-[13px]"><span className="text-ink-2">{fct.label}</span><span className="font-semibold text-ink">{fct.value}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(6, fct.weight * 100)}%`, background: fct.weight > 0.75 ? 'rgb(var(--hard))' : fct.weight > 0.45 ? 'rgb(var(--moderate))' : 'rgb(var(--easy))' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* gear */}
          <Section id="gear" title="რა წაიღო">
            {r.gear?.length ? <div className="card p-4 sm:p-5"><GearChecklist routeId={r.id} gear={r.gear} /></div> : <p className="text-ink-3">სია ჯერ არ არის.</p>}
          </Section>

          {/* tips */}
          <Section id="tips" title="რჩევები">
            <RouteTips routeId={r.id} editorial={r.tips ?? []} />
          </Section>

          {/* practical info */}
          <Section id="info" title="პრაქტიკული ინფორმაცია">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={<Bus size={18} />} title="როგორ მიხვიდე" text={r.getting_there} wide />
              <Info icon={<Home size={18} />} title="ღამის გათევა" text={r.accommodation} />
              <Info icon={<Droplets size={18} />} title="წყალი" text={r.water} />
              <Info icon={<Ticket size={18} />} title="საშვი და რეგისტრაცია" text={r.permits} />
              <Info icon={<Signal size={18} />} title="მობილური კავშირი" text={r.mobile_coverage} />
              <Info icon={<AlertTriangle size={18} />} title="საფრთხეები" text={r.dangers} wide tone="warn" />
            </div>
          </Section>

          {/* photos */}
          {photoList.length > 0 && (
            <Section id="photos" title="მოლაშქრეების ფოტოები">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photoList.map((p, i) => (
                  <button key={p.id} onClick={() => setPhoto(i)} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                    <img src={p.url} alt={p.caption ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* stories */}
          <Section id="stories" title="ისტორიები ამ მარშრუტზე" action={posts.data?.length ? <Link to={`/blog?route=${r.id}`} className="link text-[14px]">ყველა</Link> : undefined}>
            {posts.data && posts.data.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {posts.data.slice(0, 4).map((p) => <PostCard key={p.id} post={p} hideRoute />)}
              </div>
            ) : (
              <Empty
                compact
                icon={<FileText size={20} />}
                title="ჯერ არავის დაუწერია"
                text="გაიარე ეს მარშრუტი? მოყევი როგორ წავიდა, ატვირთე ფოტოები — შემდეგ მოლაშქრეებს ძალიან გამოადგება."
                action={<Link to={`/blog/new?route=${r.id}`} className="btn-primary">დაწერე პირველი</Link>}
              />
            )}
          </Section>

          {/* tours */}
          {tours.data && tours.data.length > 0 && (
            <Section id="tours" title="ტურები გიდთან ერთად">
              <div className="grid gap-3">
                {tours.data.map((t) => (
                  <Link key={t.id} to={`/tours/${t.id}`} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-pop">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t.title}</p>
                      <p className="text-[13px] text-ink-3">{t.guide?.display_name} · {t.days} დღე · {t.price_gel ? `${num(t.price_gel)} ₾` : 'ფასი შეთანხმებით'}</p>
                    </div>
                    <ArrowUpRight size={18} className="text-ink-3" />
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {r.sources && (
            <section className="border-t border-line pt-6 text-[13px] text-ink-3">
              <p className="font-semibold text-ink-2">წყაროები</p>
              <ul className="mt-1.5 space-y-1">
                {r.sources.split(/\s*;\s*/).filter(Boolean).map((s) => (
                  <li key={s} className="break-all">{/^https?:\/\//.test(s) ? <a href={s} target="_blank" rel="noopener noreferrer" className="hover:text-forest hover:underline">{s.replace(/^https?:\/\/(www\.)?/, '')}</a> : s}</li>
                ))}
              </ul>
              <p className="mt-3">ბოლო განახლება: {formatDate(r.updated_at)}. პირობები იცვლება — წასვლამდე ადგილზე გადაამოწმე. ხედავ შეცდომას? დაამატე რჩევა ან მოგვწერე.</p>
            </section>
          )}
        </div>

        {/* ───────── sidebar ───────── */}
        <aside className="space-y-5">
          <div className="card p-5">
            <p className="kicker mb-3">საუკეთესო სეზონი</p>
            <SeasonBar months={r.season_months} />
            <p className="mt-2.5 text-[13px] text-ink-2">{seasonLabel(r.season_months)}</p>
          </div>

          <div className="card p-5">
            <p className="kicker mb-3">საზოგადოება</p>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Users size={15} />} value={num(stats?.hikers_count ?? 0)} label="გაიარა" />
              <Stat icon={<FileText size={15} />} value={num(stats?.posts_count ?? 0)} label="ისტორია" />
              <Stat icon={<Star size={15} />} value={stats?.avg_rating ? `${num(stats.avg_rating, 1)}` : '—'} label={stats?.ratings_count ? `${stats.ratings_count} შეფასება` : 'შეფასება'} />
              <Stat icon={<Mountain size={15} />} value={num(stats?.photos_count ?? 0)} label="ფოტო" />
            </div>
            {monthly.data && monthly.data.some((m) => Number(m.hikes) > 0) && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-[12.5px] font-semibold text-ink-2">როდის დადიან</p>
                <MonthBars data={monthly.data.map((m) => Number(m.hikes))} />
              </div>
            )}
            <p className="mt-4 text-[12px] text-ink-3">{num(stats?.views ?? 0)} ნახვა · {num(stats?.saves_count ?? 0)} შენახვა</p>
          </div>

          <div className="rounded-xl border border-hard/30 bg-hard/5 p-5">
            <p className="flex items-center gap-2 font-semibold text-ink"><PhoneCall size={16} className="text-hard" /> გადაუდებელი დახმარება: 112</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">წასვლამდე ვინმეს უთხარი, სად მიდიხარ და როდის დაბრუნდები. მთაში ამინდი სწრაფად იცვლება — ცუდ ამინდში უკან დაბრუნება ნორმალურია.</p>
          </div>

          {similar.length > 0 && (
            <div>
              <p className="kicker mb-3">მსგავსი მარშრუტები</p>
              <div className="grid gap-4">
                {similar.map((x) => <RouteCard key={x.id} route={x} regionName={regions.data?.find((g) => g.id === x.region_id)?.name} compact />)}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* photo viewer */}
      <Modal open={photo !== null} onClose={() => setPhoto(null)} size="xl" title={photoList[photo ?? 0]?.author ? `ფოტო: ${photoList[photo ?? 0]?.author?.display_name}` : 'ფოტო'}>
        {photo !== null && photoList[photo] && (
          <div>
            <img src={photoList[photo].url} alt={photoList[photo].caption ?? ''} className="mx-auto max-h-[70vh] w-auto rounded-lg" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button className="btn-ghost btn-sm" disabled={photo === 0} onClick={() => setPhoto((p) => Math.max(0, (p ?? 0) - 1))}>წინა</button>
              <Link to={`/blog/${photoList[photo].post_id}`} className="link text-[14px]">ისტორიის ნახვა</Link>
              <button className="btn-ghost btn-sm" disabled={photo >= photoList.length - 1} onClick={() => setPhoto((p) => Math.min(photoList.length - 1, (p ?? 0) + 1))}>შემდეგი</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function KeyNumbers({ r }: { r: Route }) {
  const items: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <RouteIcon size={15} />, label: 'მანძილი', value: km(r.distance_km) + (r.route_type === 'out_and_back' ? ' (ორივე მხარე)' : '') },
    { icon: <MoveUpRight size={15} />, label: 'აღმართი', value: meters(r.elevation_gain_m) },
    { icon: <MoveDownRight size={15} />, label: 'დაღმართი', value: meters(r.elevation_loss_m) },
    { icon: <Mountain size={15} />, label: 'მაქს. სიმაღლე', value: meters(r.max_altitude_m) },
    { icon: <CalendarDays size={15} />, label: 'ხანგრძლივობა', value: durationLabel(r) },
    { icon: <RouteIcon size={15} />, label: 'ტიპი', value: ROUTE_TYPE_LABEL[r.route_type] ?? r.route_type },
  ]
  return (
    <div className="card grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">{it.icon}{it.label}</p>
          <p className="mt-0.5 font-semibold text-ink">{it.value}</p>
        </div>
      ))}
      <div className="col-span-full flex items-center gap-2 border-t border-line pt-3 text-[12.5px] text-ink-3">
        <DiffShape d={r.difficulty} /> სტარტი: <span className="font-semibold text-ink-2">{r.start_name ?? '—'}</span>
        {r.end_name && r.end_name !== r.start_name && <> · ფინიში: <span className="font-semibold text-ink-2">{r.end_name}</span></>}
      </div>
    </div>
  )
}

function Section({ id, title, kicker, action, children }: { id: string; title: string; kicker?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          {kicker && <p className="kicker mb-1">{kicker}</p>}
          <h2 className="text-[24px]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Info({ icon, title, text, wide, tone }: { icon: ReactNode; title: string; text: string | null; wide?: boolean; tone?: 'warn' }) {
  if (!text) return null
  return (
    <div className={`rounded-xl border p-4 ${tone === 'warn' ? 'border-moderate/40 bg-moderate/10' : 'border-line bg-surface'} ${wide ? 'sm:col-span-2' : ''}`}>
      <p className={`flex items-center gap-2 text-[14px] font-semibold ${tone === 'warn' ? 'text-ink' : 'text-ink'}`}>
        <span className={tone === 'warn' ? 'text-moderate' : 'text-forest'}>{icon}</span>{title}
      </p>
      <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{text}</p>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[18px] font-bold text-ink"><span className="text-ink-3">{icon}</span>{value}</p>
      <p className="text-[12px] text-ink-3">{label}</p>
    </div>
  )
}

function MonthBars({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  return (
    <div className="grid grid-cols-12 items-end gap-1" style={{ height: 56 }}>
      {data.map((v, i) => (
        <div key={i} className="flex h-full flex-col items-center justify-end gap-1" title={`${monthShort(i + 1)}: ${v}`}>
          <div className="w-full rounded-sm bg-forest/80" style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} />
          <span className="text-[9px] leading-none text-ink-3">{monthShort(i + 1)}</span>
        </div>
      ))}
    </div>
  )
}
