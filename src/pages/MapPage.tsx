import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import maplibregl, { type Map as MLMap } from 'maplibre-gl'
import { ArrowRight, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import LazyMap from '../components/map/LazyMap'
import DifficultyBadge, { DiffShape } from '../components/route/DifficultyBadge'
import { useRegions, useRouteLines, useRoutes } from '../lib/queries'
import { toMapLines } from '../lib/routeLines'
import { DIFFICULTIES, DIFF_LABEL } from '../lib/difficulty'
import { durationLabel, km, meters, num } from '../lib/format'
import { usePageTitle } from '../lib/title'
import type { Difficulty, RouteListItem } from '../lib/types'

const DAYS = [
  { v: '1', label: '1 დღე', test: (r: RouteListItem) => r.days_min <= 1 },
  { v: '2-3', label: '2–3', test: (r: RouteListItem) => r.days_max >= 2 && r.days_min <= 3 },
  { v: '4+', label: '4+', test: (r: RouteListItem) => r.days_max >= 4 },
]

export default function MapPage() {
  usePageTitle('რუკა')
  const [params, setParams] = useSearchParams()
  const routes = useRoutes()
  const lines = useRouteLines()
  const regions = useRegions()
  const mapRef = useRef<MLMap | null>(null)
  const [q, setQ] = useState('')
  const [diffs, setDiffs] = useState<Difficulty[]>([])
  const [days, setDays] = useState('')
  const [hover, setHover] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const selectedSlug = params.get('route')

  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (routes.data ?? []).filter((r) => {
      if (diffs.length && !diffs.includes(r.difficulty)) return false
      if (days) { const o = DAYS.find((d) => d.v === days); if (o && !o.test(r)) return false }
      if (s && !`${r.name} ${r.name_en ?? ''} ${regionName.get(r.region_id) ?? ''} ${r.start_name ?? ''}`.toLowerCase().includes(s)) return false
      return true
    })
  }, [routes.data, q, diffs, days, regionName])

  const mapLines = useMemo(() => {
    const ids = new Set(filtered.map((r) => r.id))
    return toMapLines((lines.data ?? []).filter((l) => ids.has(l.id)))
  }, [filtered, lines.data])

  const selected = (routes.data ?? []).find((r) => r.slug === selectedSlug) ?? null

  const select = (slug: string | null, fly = true) => {
    const next = new URLSearchParams(params)
    if (slug) next.set('route', slug)
    else next.delete('route')
    setParams(next, { replace: true })
    if (!slug || !fly) return
    const map = mapRef.current
    const ln = lines.data?.find((l) => l.slug === slug)
    if (!map || !ln) return
    const pts = ln.geometry_lite?.length ? ln.geometry_lite : ln.start_lng !== null && ln.start_lat !== null ? [[ln.start_lng, ln.start_lat]] : []
    if (pts.length > 1) {
      const b = new maplibregl.LngLatBounds()
      pts.forEach((p) => b.extend([p[0], p[1]]))
      map.fitBounds(b, { padding: { top: 60, bottom: 220, left: 60, right: 60 }, maxZoom: 13, duration: 1000 })
    } else if (pts.length === 1) {
      map.flyTo({ center: [pts[0][0], pts[0][1]], zoom: 12, duration: 1000 })
    }
    setPanelOpen(false)
  }

  const toggleDiff = (d: Difficulty) => setDiffs((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))

  const panel = (
    <>
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="მოძებნე მარშრუტი" aria-label="მარშრუტის ძებნა" />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => toggleDiff(d)} className={`chip !px-2.5 !py-1 text-[12.5px] ${diffs.includes(d) ? 'chip-on' : ''}`} aria-pressed={diffs.includes(d)}>
              <DiffShape d={d} size={9} /> {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DAYS.map((o) => (
            <button key={o.v} onClick={() => setDays(days === o.v ? '' : o.v)} className={`chip !px-2.5 !py-1 text-[12.5px] ${days === o.v ? 'chip-on' : ''}`} aria-pressed={days === o.v}>{o.label}</button>
          ))}
        </div>
      </div>
      <p className="px-3.5 pt-2.5 text-[12.5px] font-semibold text-ink-3">{num(filtered.length)} მარშრუტი</p>
      <ul className="flex-1 overflow-y-auto pb-2">
        {filtered.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => select(r.slug)}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface-2 ${selected?.id === r.id ? 'bg-surface-2' : ''}`}
            >
              <span className="mt-1.5"><DiffShape d={r.difficulty} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-snug text-ink">{r.name}</span>
                <span className="block text-[12px] text-ink-3">{regionName.get(r.region_id)} · {durationLabel(r)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <div className="relative h-[calc(100dvh-64px-64px)] md:h-[calc(100dvh-64px)]">
      <LazyMap
        className="absolute inset-0 h-full w-full"
        routes={mapLines}
        highlightId={hover ?? selected?.id ?? null}
        onRouteClick={(slug) => select(slug, false)}
        onReady={(m) => { mapRef.current = m }}
      >
        {/* desktop side panel */}
        <div className="absolute bottom-3 left-3 top-3 z-10 hidden w-[320px] flex-col overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur md:flex">
          {panel}
        </div>

        {/* mobile: collapsible list */}
        <div className="absolute inset-x-2 top-2 z-10 md:hidden">
          <button onClick={() => setPanelOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] font-semibold text-ink shadow-card" aria-expanded={panelOpen}>
            <span className="flex items-center gap-2"><Search size={16} className="text-ink-3" /> მარშრუტები ({num(filtered.length)})</span>
            {panelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {panelOpen && <div className="mt-1.5 flex max-h-[60vh] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-pop">{panel}</div>}
        </div>

        {/* legend */}
        <div className="absolute bottom-9 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface/95 px-3.5 py-1.5 text-[12px] font-semibold text-ink-2 shadow-card backdrop-blur lg:flex">
          {DIFFICULTIES.map((d) => <span key={d} className="inline-flex items-center gap-1.5"><DiffShape d={d} size={9} />{DIFF_LABEL[d]}</span>)}
        </div>

        {/* selected route card */}
        {selected && (
          <div className="absolute inset-x-2 bottom-2 z-20 md:bottom-4 md:left-auto md:right-16 md:w-[380px]">
            <SelectedCard r={selected} region={regionName.get(selected.region_id)} onClose={() => select(null)} />
          </div>
        )}
      </LazyMap>
    </div>
  )
}

function SelectedCard({ r, region, onClose }: { r: RouteListItem; region?: string; onClose: () => void }) {
  return (
    <div className="animate-slide-up overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
      {r.cover_url && <img src={r.cover_url} alt="" className="h-32 w-full object-cover" />}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {region && <p className="kicker mb-1">{region}</p>}
            <p className="font-serif text-[18px] font-bold leading-snug text-ink">{r.name}</p>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="დახურვა"><X size={18} /></button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-ink-2">
          <DifficultyBadge d={r.difficulty} size="sm" />
          <span>{durationLabel(r)}</span>
          {r.distance_km !== null && <span>{km(r.distance_km)}</span>}
          {r.elevation_gain_m !== null && <span>↑ {meters(r.elevation_gain_m)}</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{r.summary}</p>
        <Link to={`/routes/${r.slug}`} className="btn-primary btn-sm mt-3 w-full">მარშრუტის ნახვა <ArrowRight size={15} /></Link>
      </div>
    </div>
  )
}
