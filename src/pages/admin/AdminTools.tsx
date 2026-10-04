import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Image as ImageIcon, LoaderCircle, Play, Square, TriangleAlert, Wand2, XCircle } from 'lucide-react'
import Tabs from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/Toast'
import { ADMIN_OVERVIEW_KEY } from '../../components/admin/DashOverview'
import { invalidateRoutes } from '../../lib/queries'
import { supabase, errorText } from '../../lib/supabase'
import { buildLineFromStops, lineLooksRight, type PackedLine } from '../../lib/routeLine'
import { commonsNear, type CommonsPhoto } from '../../lib/commons'
import { haversineKm } from '../../lib/geo'
import { num } from '../../lib/format'
import { usePageTitle } from '../../lib/title'

interface Row { id: number; slug: string; name: string; distance_km: number | null; route_type: string; tags: string[]; has_line: boolean; cover_url: string | null }
interface StopPt { route_id: number; position: number; lat: number; lng: number }
type Result = { state: 'ok' | 'review' | 'error'; text: string; line?: PackedLine }

function useToolData() {
  return useQuery({
    queryKey: ['admin-tools-data'],
    queryFn: async () => {
      const [{ data: routes, error }, { data: stops, error: e2 }] = await Promise.all([
        supabase.from('routes').select('id,slug,name,distance_km,route_type,tags,cover_url,line:geometry_lite->0').order('name'),
        supabase.from('route_stops').select('route_id,position,lat,lng').order('route_id').order('position'),
      ])
      if (error) throw error
      if (e2) throw e2
      const byRoute = new Map<number, StopPt[]>()
      for (const s of (stops ?? []) as StopPt[]) {
        const l = byRoute.get(s.route_id) ?? []
        l.push(s)
        byRoute.set(s.route_id, l)
      }
      const rows = ((routes ?? []) as unknown as (Omit<Row, 'has_line'> & { line: unknown })[]).map((r) => ({ ...r, has_line: r.line !== null && r.line !== undefined }))
      return { rows: rows as Row[], stops: byRoute }
    },
  })
}

export default function AdminTools() {
  usePageTitle('ხელსაწყოები — ადმინი')
  const [tab, setTab] = useState<'lines' | 'covers'>('lines')
  return (
    <div>
      <h1 className="text-[26px]">ხელსაწყოები</h1>
      <Tabs className="mt-4" tabs={[{ id: 'lines', label: 'ბილიკების ხაზები' }, { id: 'covers', label: 'ქავერის ფოტოები' }]} value={tab} onChange={setTab} />
      <div className="mt-6">{tab === 'lines' ? <LinesTool /> : <CoversTool />}</div>
    </div>
  )
}

/** Why a route probably should not get an automatic line. */
function skipReason(r: Row, stops: StopPt[]): string | null {
  if (stops.length < 2) return 'გაჩერება ორზე ნაკლებია'
  if (r.tags.includes('4x4')) return 'მოძრაობა მანქანით — ბილიკის ხაზი არ ერგება'
  if (r.tags.includes('mountaineering')) return 'მყინვარული ასვლა — ბილიკი რუკაზე არ არის'
  for (let i = 1; i < stops.length; i++) {
    if (haversineKm([stops[i - 1].lng, stops[i - 1].lat], [stops[i].lng, stops[i].lat]) > 12) return 'გაჩერებები ერთმანეთისგან შორსაა — ჯობს GPX'
  }
  return null
}

function LinesTool() {
  const data = useToolData()
  const qc = useQueryClient()
  const toast = useToast()
  const [picked, setPicked] = useState<Set<number> | null>(null)
  const [results, setResults] = useState<Record<number, Result>>({})
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const stop = useRef(false)

  const todo = useMemo(() => (data.data?.rows ?? []).filter((r) => !r.has_line), [data.data])
  const defaults = useMemo(() => new Set(todo.filter((r) => !skipReason(r, data.data?.stops.get(r.id) ?? [])).map((r) => r.id)), [todo, data.data])
  const sel = picked ?? defaults
  const toggle = (id: number) => setPicked(() => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const save = async (r: Row, line: PackedLine) => {
    const { error } = await supabase.from('routes').update({ geometry: line.geometry, geometry_lite: line.geometry_lite, elevation_profile: line.elevation_profile, geometry_source: 'brouter' }).eq('id', r.id)
    if (error) throw error
  }

  const run = async () => {
    const list = todo.filter((r) => sel.has(r.id))
    if (!list.length) return
    stop.current = false
    setRunning(true)
    let ok = 0
    for (const r of list) {
      if (stop.current) break
      setCurrent(r.id)
      try {
        const pts = (data.data?.stops.get(r.id) ?? []).map((s) => ({ lat: s.lat, lng: s.lng }))
        const line = await buildLineFromStops(pts)
        const check = lineLooksRight(line.stats.distanceKm, r)
        if (check.ok) {
          await save(r, line)
          ok++
          setResults((x) => ({ ...x, [r.id]: { state: 'ok', text: `${num(line.stats.distanceKm, 1)} კმ` } }))
        } else {
          setResults((x) => ({ ...x, [r.id]: { state: 'review', text: `ხაზი ${num(line.stats.distanceKm, 1)} კმ — მითითებულს არ ემთხვევა (×${check.ratio})`, line } }))
        }
      } catch (err) {
        setResults((x) => ({ ...x, [r.id]: { state: 'error', text: errorText(err) } }))
      }
      await new Promise((res) => setTimeout(res, 1500))
    }
    setCurrent(null)
    setRunning(false)
    invalidateRoutes(qc)
    qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
    qc.invalidateQueries({ queryKey: ['admin-routes'] })
    toast(`დასრულდა: ${ok} ხაზი შეინახა.`)
  }

  const saveAnyway = async (r: Row) => {
    const line = results[r.id]?.line
    if (!line) return
    try {
      await save(r, line)
      setResults((x) => ({ ...x, [r.id]: { state: 'ok', text: `შენახულია (${num(line.stats.distanceKm, 1)} კმ)` } }))
      invalidateRoutes(qc)
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }

  if (data.isLoading) return <LoaderCircle className="animate-spin text-forest" />
  const done = Object.keys(results).length
  const total = todo.filter((r) => sel.has(r.id)).length

  return (
    <div>
      <p className="max-w-3xl text-[14.5px] text-ink-2">
        ავტომატურად აგებს ნამდვილ ბილიკის ხაზს გაჩერებების თანმიმდევრობით (OpenStreetMap-ის ბილიკებზე). ხაზი მხოლოდ მაშინ ინახება, თუ მისი სიგრძე მარშრუტის მითითებულ მანძილს შეესაბამება — დანარჩენს „შესამოწმებელი“ ეწერება.
        ჯიპით სავალი პარკები, მყინვარული ასვლები და გრძელი უბილიკო მონაკვეთები ავტომატურად მოხსნილია — მათთვის GPX ჯობს.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!running ? (
          <button onClick={run} disabled={!total} className="btn-primary"><Play size={16} /> დაწყება ({total})</button>
        ) : (
          <button onClick={() => { stop.current = true }} className="btn-danger"><Square size={15} /> გაჩერება</button>
        )}
        <span className="text-[13px] text-ink-3">{todo.length} მარშრუტს ხაზი არ აქვს</span>
      </div>
      {running && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-forest transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      )}
      <ul className="card mt-4 divide-y divide-line">
        {todo.map((r) => {
          const stops = data.data?.stops.get(r.id) ?? []
          const reason = skipReason(r, stops)
          const res = results[r.id]
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} disabled={running || stops.length < 2} className="h-4 w-4 accent-[rgb(var(--forest))]" aria-label={r.name} />
              <div className="min-w-0 flex-1">
                <Link to={`/admin/routes/${r.id}`} className="font-semibold hover:text-forest">{r.name}</Link>
                <p className="text-[12.5px] text-ink-3">{stops.length} გაჩერება{r.distance_km ? ` · ${num(r.distance_km, 1)} კმ` : ''}{reason ? ` · ${reason}` : ''}</p>
              </div>
              {current === r.id && <LoaderCircle size={17} className="animate-spin text-forest" />}
              {res && (
                <span className={`inline-flex items-center gap-1.5 text-[13px] ${res.state === 'ok' ? 'text-easy' : res.state === 'review' ? 'text-moderate' : 'text-hard'}`}>
                  {res.state === 'ok' ? <CheckCircle2 size={15} /> : res.state === 'review' ? <TriangleAlert size={15} /> : <XCircle size={15} />}
                  {res.text}
                </span>
              )}
              {res?.state === 'review' && <button onClick={() => saveAnyway(r)} className="btn-ghost btn-sm">მაინც შენახვა</button>}
            </li>
          )
        })}
        {todo.length === 0 && <li className="px-4 py-8 text-center text-ink-3">ყველა მარშრუტს უკვე აქვს ხაზი.</li>}
      </ul>
    </div>
  )
}

function CoversTool() {
  const data = useToolData()
  const qc = useQueryClient()
  const toast = useToast()
  const [i, setI] = useState(0)
  const [cands, setCands] = useState<Record<number, CommonsPhoto[] | 'loading' | 'error'>>({})
  const missing = useMemo(() => (data.data?.rows ?? []).filter((r) => !r.cover_url), [data.data])
  const r = missing[Math.min(i, Math.max(0, missing.length - 1))]

  const load = async (route: Row) => {
    const stops = data.data?.stops.get(route.id) ?? []
    if (!stops.length) { setCands((x) => ({ ...x, [route.id]: [] })); return }
    setCands((x) => ({ ...x, [route.id]: 'loading' }))
    try {
      const last = stops[stops.length - 1]
      let list = await commonsNear(last.lat, last.lng, 8000, 36)
      if (list.length < 6 && stops.length > 1) list = [...list, ...(await commonsNear(stops[0].lat, stops[0].lng, 8000, 24))]
      const seen = new Set<string>()
      setCands((x) => ({ ...x, [route.id]: list.filter((p) => (seen.has(p.page) ? false : (seen.add(p.page), true))) }))
    } catch {
      setCands((x) => ({ ...x, [route.id]: 'error' }))
    }
  }
  const choose = async (route: Row, p: CommonsPhoto) => {
    const { error } = await supabase.from('routes').update({ cover_url: p.thumb, cover_credit: `${p.author}${p.license ? ` · ${p.license}` : ''} · Wikimedia Commons`, cover_source_url: p.page }).eq('id', route.id)
    if (error) return toast(errorText(error), 'error')
    toast('ფოტო შეინახა.')
    invalidateRoutes(qc)
    qc.invalidateQueries({ queryKey: ['admin-tools-data'] })
    qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
  }

  if (data.isLoading) return <LoaderCircle className="animate-spin text-forest" />
  if (!missing.length) return <p className="text-ink-3">ყველა მარშრუტს აქვს ფოტო.</p>
  const c = cands[r.id]

  return (
    <div>
      <p className="max-w-3xl text-[14.5px] text-ink-2">ფოტოები Wikimedia Commons-იდან, მარშრუტის ბოლო გაჩერების (ჩვეულებრივ მთავარი სანახაობის) ახლოს. ავტომატურად არაფერი ინიშნება — აირჩიე ფოტო, რომელიც მართლა ამ ადგილს აჩვენებს.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn-ghost btn-sm">წინა</button>
        <span className="text-[13px] text-ink-3">{Math.min(i, missing.length - 1) + 1} / {missing.length}</span>
        <button onClick={() => setI((x) => Math.min(missing.length - 1, x + 1))} disabled={i >= missing.length - 1} className="btn-ghost btn-sm">შემდეგი</button>
      </div>
      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-[19px] font-bold">{r.name}</p>
          <button onClick={() => load(r)} disabled={c === 'loading'} className="btn-secondary btn-sm">{c === 'loading' ? <LoaderCircle size={15} className="animate-spin" /> : <Wand2 size={15} />} ფოტოების ძებნა</button>
        </div>
        {c === 'error' && <p className="mt-3 text-[14px] text-hard">ძებნა ვერ მოხერხდა.</p>}
        {Array.isArray(c) && c.length === 0 && <p className="mt-3 text-[14px] text-ink-3">ახლომახლო ფოტო ვერ ვიპოვე. შეგიძლია მარშრუტის რედაქტორში საკუთარი ატვირთო.</p>}
        {Array.isArray(c) && c.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {c.map((p) => (
              <div key={p.page} className="overflow-hidden rounded-lg border border-line">
                <a href={p.page} target="_blank" rel="noopener noreferrer"><img src={p.thumb} alt={p.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /></a>
                <div className="flex items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3" title={`${p.author} · ${p.license}`}>{p.author} · {p.license}</span>
                  <button onClick={() => choose(r, p)} className="btn-primary btn-sm !px-2 !py-1 text-[12px]"><ImageIcon size={13} /> არჩევა</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
