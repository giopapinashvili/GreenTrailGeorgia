import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, Map as MapIcon, Search, SlidersHorizontal, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import RouteCard from '../components/route/RouteCard'
import { DiffShape } from '../components/route/DifficultyBadge'
import LazyMap from '../components/map/LazyMap'
import Modal from '../components/ui/Modal'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useRegions, useRouteLines, useRoutes, useRouteStats } from '../lib/queries'
import { toMapLines } from '../lib/routeLines'
import { DIFFICULTIES, DIFF_LABEL, effortScore } from '../lib/difficulty'
import { monthName, num } from '../lib/format'
import { FILTER_TAGS, tagLabel } from '../lib/tags'
import { usePageTitle } from '../lib/title'
import type { Difficulty, Region, RouteListItem } from '../lib/types'

const DAY_OPTIONS = [
  { v: '1', label: '1 დღე', test: (r: RouteListItem) => r.days_min <= 1 },
  { v: '2-3', label: '2–3 დღე', test: (r: RouteListItem) => r.days_max >= 2 && r.days_min <= 3 },
  { v: '4+', label: '4+ დღე', test: (r: RouteListItem) => r.days_max >= 4 },
]

const SORTS = [
  { v: 'featured', label: 'რჩეული ჯერ' },
  { v: 'easy', label: 'ჯერ მარტივი' },
  { v: 'hard', label: 'ჯერ რთული' },
  { v: 'short', label: 'ჯერ მოკლე' },
  { v: 'long', label: 'ჯერ გრძელი' },
  { v: 'popular', label: 'პოპულარული' },
  { v: 'name', label: 'ანბანით' },
]

interface Filters {
  q: string
  diffs: Difficulty[]
  days: string
  region: string
  month: number | null
  tags: string[]
}

function readFilters(p: URLSearchParams): Filters {
  const list = (k: string) => (p.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const m = Number(p.get('month'))
  return {
    q: p.get('q') ?? '',
    diffs: list('d').filter((d): d is Difficulty => (DIFFICULTIES as string[]).includes(d)),
    days: p.get('days') ?? '',
    region: p.get('region') ?? '',
    month: m >= 1 && m <= 12 ? m : null,
    tags: list('tags'),
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim()

export default function RoutesPage() {
  usePageTitle('მარშრუტები')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const routes = useRoutes()
  const regions = useRegions()
  const stats = useRouteStats()
  const view = params.get('view') === 'map' ? 'map' : 'list'
  const sort = params.get('sort') ?? 'featured'
  const f = readFilters(params)
  const [sheet, setSheet] = useState(false)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const lines = useRouteLines()

  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const q = norm(f.q)
    const list = (routes.data ?? []).filter((r) => {
      if (f.diffs.length && !f.diffs.includes(r.difficulty)) return false
      if (f.days) { const o = DAY_OPTIONS.find((d) => d.v === f.days); if (o && !o.test(r)) return false }
      if (f.region && r.region_id !== f.region) return false
      if (f.month && !r.season_months.includes(f.month)) return false
      if (f.tags.length && !f.tags.every((t) => r.tags.includes(t))) return false
      if (q) {
        const hay = norm([r.name, r.name_en ?? '', r.summary, r.start_name ?? '', regionName.get(r.region_id) ?? '', ...r.tags.map(tagLabel)].join(' '))
        if (!q.split(' ').every((w) => hay.includes(w))) return false
      }
      return true
    })
    const pop = (r: RouteListItem) => { const s = stats.data?.get(r.id); return s ? s.posts_count * 5 + s.hikers_count * 3 + s.saves_count * 2 + Number(s.views) / 25 : 0 }
    const by: Record<string, (a: RouteListItem, b: RouteListItem) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || pop(b) - pop(a) || a.name.localeCompare(b.name, 'ka'),
      easy: (a, b) => effortScore(a) - effortScore(b),
      hard: (a, b) => effortScore(b) - effortScore(a),
      short: (a, b) => a.days_min - b.days_min || Number(a.distance_km ?? 0) - Number(b.distance_km ?? 0),
      long: (a, b) => b.days_max - a.days_max || Number(b.distance_km ?? 0) - Number(a.distance_km ?? 0),
      popular: (a, b) => pop(b) - pop(a) || Number(b.featured) - Number(a.featured),
      name: (a, b) => a.name.localeCompare(b.name, 'ka'),
    }
    return [...list].sort(by[sort] ?? by.featured)
  }, [routes.data, f.q, f.diffs, f.days, f.region, f.month, f.tags, sort, stats.data, regionName])

  const mapLines = useMemo(() => {
    const ids = new Set(filtered.map((r) => r.id))
    return toMapLines((lines.data ?? []).filter((l) => ids.has(l.id)))
  }, [filtered, lines.data])

  const activeCount = f.diffs.length + (f.days ? 1 : 0) + (f.region ? 1 : 0) + (f.month ? 1 : 0) + f.tags.length
  const clearAll = () => setParams(new URLSearchParams(view === 'map' ? { view: 'map' } : {}), { replace: true })
  const region = (regions.data ?? []).find((r) => r.id === f.region)

  const filterPanel = (
    <FilterPanel f={f} set={set} regions={regions.data ?? []} routes={routes.data ?? []} />
  )

  return (
    <div className="page pb-16">
      <PageHeader
        kicker="მარშრუტები"
        title={region ? `${region.name} — მარშრუტები` : 'სალაშქრო მარშრუტები'}
        text={region?.description ?? 'ყველა მარშრუტს აქვს სირთულე, დღეები, გაჩერებები, საჭირო აღჭურვილობა და გამოცდილი მოლაშქრეების რჩევები.'}
      />

      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6 pr-1">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={f.q}
                onChange={(e) => set({ q: e.target.value })}
                className="input pl-9 pr-9"
                placeholder="ძებნა: სახელი, სოფელი, ტბა…"
                aria-label="მარშრუტის ძებნა"
              />
              {f.q && (
                <button onClick={() => set({ q: null })} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink" aria-label="ძებნის გასუფთავება"><X size={15} /></button>
              )}
            </div>
            <button onClick={() => setSheet(true)} className="btn-secondary lg:hidden">
              <SlidersHorizontal size={16} /> ფილტრები{activeCount > 0 && <span className="rounded-full bg-forest px-1.5 text-[11px] font-bold text-on-forest">{activeCount}</span>}
            </button>
            <select value={sort} onChange={(e) => set({ sort: e.target.value === 'featured' ? null : e.target.value })} className="input w-auto" aria-label="დალაგება">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <div className="flex overflow-hidden rounded-lg border border-line-2 bg-surface" role="group" aria-label="ხედი">
              <button onClick={() => set({ view: null })} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold ${view === 'list' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`} aria-pressed={view === 'list'}>
                <LayoutGrid size={15} /> სია
              </button>
              <button onClick={() => set({ view: 'map' })} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold ${view === 'map' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`} aria-pressed={view === 'map'}>
                <MapIcon size={15} /> რუკა
              </button>
            </div>
          </div>

          {/* active filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-ink-2">{routes.isLoading ? '…' : `${num(filtered.length)} მარშრუტი`}</span>
            {f.diffs.map((d) => <ActiveChip key={d} onRemove={() => set({ d: f.diffs.filter((x) => x !== d).join(',') })}>{DIFF_LABEL[d]}</ActiveChip>)}
            {f.days && <ActiveChip onRemove={() => set({ days: null })}>{DAY_OPTIONS.find((d) => d.v === f.days)?.label ?? f.days}</ActiveChip>}
            {f.region && <ActiveChip onRemove={() => set({ region: null })}>{regionName.get(f.region) ?? f.region}</ActiveChip>}
            {f.month && <ActiveChip onRemove={() => set({ month: null })}>{monthName(f.month)}</ActiveChip>}
            {f.tags.map((t) => <ActiveChip key={t} onRemove={() => set({ tags: f.tags.filter((x) => x !== t).join(',') })}>{tagLabel(t)}</ActiveChip>)}
            {activeCount > 0 && <button onClick={clearAll} className="font-semibold text-forest hover:underline">ყველას გასუფთავება</button>}
          </div>

          {/* results */}
          <div className="mt-5">
            {routes.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <Empty
                icon={<Search size={20} />}
                title="ასეთი მარშრუტი ვერ ვიპოვე"
                text="სცადე ნაკლები ფილტრი ან სხვა სიტყვა. შეიძლება ეს ადგილი ჯერ არ დაგვიმატებია."
                action={<button onClick={clearAll} className="btn-secondary">ფილტრების გასუფთავება</button>}
              />
            ) : view === 'map' ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-xl border border-line">
                  <LazyMap className="h-[62vh] min-h-[420px]" routes={mapLines} highlightId={hoverId} onRouteClick={(slug) => navigate(`/routes/${slug}`)} />
                </div>
                <ul className="max-h-[62vh] min-h-[420px] overflow-y-auto rounded-xl border border-line bg-surface">
                  {filtered.map((r) => (
                    <li key={r.id} onMouseEnter={() => setHoverId(r.id)} onMouseLeave={() => setHoverId(null)}>
                      <button onClick={() => navigate(`/routes/${r.slug}`)} className="flex w-full items-start gap-2.5 border-b border-line px-3.5 py-3 text-left last:border-0 hover:bg-surface-2">
                        <span className="mt-1.5"><DiffShape d={r.difficulty} /></span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-snug text-ink">{r.name}</span>
                          <span className="block text-[12.5px] text-ink-3">{regionName.get(r.region_id)} · {r.days_min === r.days_max ? `${r.days_min} დღე` : `${r.days_min}–${r.days_max} დღე`}{r.distance_km ? ` · ${num(r.distance_km, 1)} კმ` : ''}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((r) => <RouteCard key={r.id} route={r} regionName={regionName.get(r.region_id)} stats={stats.data?.get(r.id)} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        title="ფილტრები"
        footer={
          <>
            {activeCount > 0 && <button className="btn-ghost mr-auto" onClick={clearAll}>გასუფთავება</button>}
            <button className="btn-primary" onClick={() => setSheet(false)}>ნახე {num(filtered.length)} მარშრუტი</button>
          </>
        }
      >
        {filterPanel}
      </Modal>
    </div>
  )
}

function ActiveChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface py-0.5 pl-2.5 pr-1 font-medium text-ink">
      {children}
      <button onClick={onRemove} className="rounded-full p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="ფილტრის მოხსნა"><X size={13} /></button>
    </span>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-4 first:pt-0 last:border-0">
      <p className="kicker mb-2.5">{title}</p>
      {children}
    </div>
  )
}

function FilterPanel({ f, set, regions, routes }: { f: Filters; set: (p: Record<string, string | null>) => void; regions: Region[]; routes: RouteListItem[] }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of routes) m.set(r.region_id, (m.get(r.region_id) ?? 0) + 1)
    return m
  }, [routes])
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(',')
  return (
    <div>
      <FilterGroup title="სირთულე">
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => set({ d: toggle(f.diffs, d) })} className={`chip ${f.diffs.includes(d) ? 'chip-on' : ''}`} aria-pressed={f.diffs.includes(d)}>
              <DiffShape d={d} /> {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="ხანგრძლივობა">
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((o) => (
            <button key={o.v} onClick={() => set({ days: f.days === o.v ? null : o.v })} className={`chip ${f.days === o.v ? 'chip-on' : ''}`} aria-pressed={f.days === o.v}>{o.label}</button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="რეგიონი">
        <div className="grid gap-0.5">
          <button onClick={() => set({ region: null })} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-[14px] ${!f.region ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2'}`}>
            ყველა <span className="text-[12px] text-ink-3">{routes.length}</span>
          </button>
          {regions.filter((r) => counts.get(r.id)).map((r) => (
            <button key={r.id} onClick={() => set({ region: f.region === r.id ? null : r.id })} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-[14px] ${f.region === r.id ? 'bg-surface-2 font-semibold text-forest' : 'text-ink-2 hover:bg-surface-2'}`}>
              {r.name} <span className="text-[12px] text-ink-3">{counts.get(r.id)}</span>
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="როდის მიდიხარ">
        <select value={f.month ?? ''} onChange={(e) => set({ month: e.target.value || null })} className="input" aria-label="თვე">
          <option value="">ნებისმიერ დროს</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup title="რა გინდა ნახო">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TAGS.map((t) => (
            <button key={t} onClick={() => set({ tags: toggle(f.tags, t) })} className={`chip !px-2.5 !py-1 text-[12.5px] ${f.tags.includes(t) ? 'chip-on' : ''}`} aria-pressed={f.tags.includes(t)}>{tagLabel(t)}</button>
          ))}
        </div>
      </FilterGroup>
    </div>
  )
}
