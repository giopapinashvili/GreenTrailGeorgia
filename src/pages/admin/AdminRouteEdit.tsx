import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Map as MLMap, MapMouseEvent } from 'maplibre-gl'
import { AlertTriangle, ArrowDown, ArrowUp, Download, ExternalLink, FileUp, LoaderCircle, Plus, Route as RouteIcon, Save, Trash2, Wand2, X } from 'lucide-react'
import LazyMap from '../../components/map/LazyMap'
import ElevationProfile from '../../components/route/ElevationProfile'
import RouteStopsEditor from '../../components/admin/RouteStopsEditor'
import RouteCoverPicker from '../../components/admin/RouteCoverPicker'
import Field from '../../components/ui/Field'
import Empty from '../../components/ui/Empty'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import {
  KNOWN_TAGS, ROUTE_TYPE_LABEL, TEXT_FIELDS, emptyForm, located, newKey, rowToForm, statsOfLine, stopToDraft, toRouteRow, toStopRows, validate,
  type Problems, type RouteForm, type RouteRow, type StopDraft,
} from '../../components/admin/RouteEditorModel'
import { ADMIN_OVERVIEW_KEY } from '../../components/admin/DashOverview'
import { invalidateRoutes, useRegions } from '../../lib/queries'
import { supabase, errorText } from '../../lib/supabase'
import { DIFFICULTIES, DIFF_LABEL } from '../../lib/difficulty'
import { buildLineFromStops, lineLooksRight, packLine } from '../../lib/routeLine'
import { downloadText, parseGpx, toGpx } from '../../lib/geo'
import { monthShort, num } from '../../lib/format'
import { slugify } from '../../lib/slug'
import { tagLabel } from '../../lib/tags'
import { usePageTitle } from '../../lib/title'
import type { RouteStop, RouteType } from '../../lib/types'

export default function AdminRouteEdit() {
  const { id } = useParams()
  const routeId = id ? Number(id) : null
  const route = useQuery({
    queryKey: ['admin-route', routeId],
    enabled: routeId !== null,
    queryFn: async () => {
      const [{ data: r, error }, { data: stops, error: e2 }] = await Promise.all([
        supabase.from('routes').select('*').eq('id', routeId!).maybeSingle(),
        supabase.from('route_stops').select('*').eq('route_id', routeId!).order('position'),
      ])
      if (error) throw error
      if (e2) throw e2
      return r ? { row: r as RouteRow, stops: (stops ?? []) as RouteStop[] } : null
    },
    staleTime: 0,
  })
  usePageTitle(routeId ? 'მარშრუტის რედაქტირება' : 'ახალი მარშრუტი')
  if (routeId !== null && route.isLoading) return <PageSpinner />
  if (routeId !== null && !route.data) return <Empty title="მარშრუტი ვერ მოიძებნა" action={<Link to="/admin/routes" className="btn-primary">სიაში დაბრუნება</Link>} />
  return <Editor key={routeId ?? 'new'} routeId={routeId} initial={route.data ?? null} />
}

function Editor({ routeId, initial }: { routeId: number | null; initial: { row: RouteRow; stops: RouteStop[] } | null }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const regions = useRegions()
  const [form, setForm] = useState<RouteForm>(() => (initial ? rowToForm(initial.row) : emptyForm()))
  const [stops, setStops] = useState<StopDraft[]>(() => (initial ? initial.stops.map(stopToDraft) : []))
  const [slugTouched, setSlugTouched] = useState(!!initial)
  const [problems, setProblems] = useState<Problems | null>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [lineBusy, setLineBusy] = useState(false)
  const [updateNumbers, setUpdateNumbers] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const snapshot = useRef(JSON.stringify({ form, stops }))
  const gpxRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const pickRef = useRef<string | null>(null)
  pickRef.current = picking

  const dirty = JSON.stringify({ form, stops }) !== snapshot.current
  useEffect(() => {
    if (!dirty) return
    const fn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', fn)
    return () => window.removeEventListener('beforeunload', fn)
  }, [dirty])

  const set = <K extends keyof RouteForm>(k: K, v: RouteForm[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setName = (name: string) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))

  // map click: add a stop or move the selected one
  const onMapReady = (map: MLMap) => {
    mapRef.current = map
    map.on('click', (e: MapMouseEvent) => {
      const target = pickRef.current
      if (!target) return
      const lat = Math.round(e.lngLat.lat * 1e5) / 1e5
      const lng = Math.round(e.lngLat.lng * 1e5) / 1e5
      if (target === 'new') {
        setStops((s) => [...s, { key: newKey(), name: '', kind: s.length ? 'other' : 'start', day: null, altitude_m: null, overnight: false, description: '', lat, lng }])
      } else {
        setStops((s) => s.map((x) => (x.key === target ? { ...x, lat, lng } : x)))
        setPicking(null)
      }
    })
  }
  useEffect(() => {
    const c = mapRef.current?.getCanvas()
    if (c) c.style.cursor = picking ? 'crosshair' : ''
  }, [picking])

  const located_ = useMemo(() => stops.filter(located), [stops])
  const lineStats = useMemo(() => statsOfLine(form.geometry), [form.geometry])
  const check = lineStats ? lineLooksRight(lineStats.distanceKm, { distance_km: form.distance_km, route_type: form.route_type }) : null

  const applyLine = (packed: ReturnType<typeof packLine>, source: 'brouter' | 'gpx') => {
    setForm((f) => {
      const next: RouteForm = { ...f, geometry: packed.geometry, geometry_lite: packed.geometry_lite, elevation_profile: packed.elevation_profile, geometry_source: source }
      if (updateNumbers) {
        const s = packed.stats
        next.distance_km = f.route_type === 'out_and_back' ? Math.round(s.distanceKm * 20) / 10 : s.distanceKm
        next.elevation_gain_m = f.route_type === 'out_and_back' ? s.gain + s.loss : s.gain
        next.elevation_loss_m = f.route_type === 'out_and_back' ? s.gain + s.loss : s.loss
        next.max_altitude_m = s.max
        next.min_altitude_m = s.min
      }
      return next
    })
  }
  const buildLine = async () => {
    if (located_.length < 2) return toast('ხაზის ასაგებად მინიმუმ ორი გაჩერება კოორდინატებით სჭირდება.', 'error')
    setLineBusy(true)
    try {
      const packed = await buildLineFromStops(located_.map((s) => ({ lat: s.lat, lng: s.lng })))
      applyLine(packed, 'brouter')
      toast(`ხაზი აიგო: ${num(packed.stats.distanceKm, 1)} კმ.`)
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setLineBusy(false)
    }
  }
  const importGpx = async (file: File | undefined) => {
    if (!file) return
    try {
      const coords = parseGpx(await file.text())
      applyLine(packLine(coords), 'gpx')
      toast('GPX ჩაიტვირთა.')
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }
  const exportGpx = () => {
    downloadText(`${form.slug || 'route'}.gpx`, toGpx(form.name || 'route', form.geometry ?? [], located_.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }))))
  }

  const save = async () => {
    const p = validate(form, stops)
    setProblems(p)
    if (p) { toast('შეასწორე მონიშნული ველები.', 'error'); return }
    setSaving(true)
    try {
      const row = toRouteRow(form, stops)
      let rid = routeId
      if (rid === null) {
        const { data, error } = await supabase.from('routes').insert(row).select('id').single()
        if (error) throw error
        rid = data.id as number
      } else {
        const { error } = await supabase.from('routes').update(row).eq('id', rid)
        if (error) throw error
      }
      const { error: delErr } = await supabase.from('route_stops').delete().eq('route_id', rid)
      if (delErr) throw delErr
      if (stops.length) {
        const { error: insErr } = await supabase.from('route_stops').insert(toStopRows(rid, stops))
        if (insErr) throw insErr
      }
      snapshot.current = JSON.stringify({ form, stops })
      invalidateRoutes(qc)
      qc.invalidateQueries({ queryKey: ['admin-routes'] })
      qc.invalidateQueries({ queryKey: ['admin-route'] })
      qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
      toast('შენახულია.')
      if (routeId === null) navigate(`/admin/routes/${rid}`, { replace: true })
    } catch (err) {
      const msg = errorText(err)
      toast(/duplicate key.*slug|routes_slug_key/i.test(msg) ? 'ასეთი slug უკვე არსებობს — შეცვალე.' : msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const fe = problems?.fields ?? {}
  const nearForPhotos = located_.length ? { lat: located_[located_.length - 1].lat, lng: located_[located_.length - 1].lng } : null

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/routes" className="text-[13px] font-semibold text-ink-3 hover:text-ink">← მარშრუტები</Link>
          <h1 className="mt-1 text-[26px]">{form.name || 'ახალი მარშრუტი'}</h1>
        </div>
        {routeId !== null && form.slug && <a href={`/routes/${form.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><ExternalLink size={15} /> საიტზე ნახვა</a>}
      </div>
      {problems?.general && <p className="mb-4 flex items-start gap-2 rounded-lg border border-hard/40 bg-hard/5 px-3 py-2.5 text-[14px] text-ink"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-hard" />{problems.general}</p>}

      <div className="grid gap-6">
        <Section title="ძირითადი">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="სახელი *" error={fe.name}><input value={form.name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
            <Field label="სახელი ინგლისურად"><input value={form.name_en} onChange={(e) => set('name_en', e.target.value)} className="input" /></Field>
            <Field label="slug (ბმული) *" error={fe.slug} hint={`/routes/${form.slug || '…'}`}>
              <input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')) }} className="input font-mono text-[13.5px]" />
            </Field>
            <Field label="რეგიონი *" error={fe.region_id}>
              <select value={form.region_id} onChange={(e) => set('region_id', e.target.value)} className="input">
                <option value="">— აირჩიე —</option>
                {(regions.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="სირთულე">
              <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as RouteForm['difficulty'])} className="input">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
              </select>
            </Field>
            <Field label="ტიპი">
              <select value={form.route_type} onChange={(e) => set('route_type', e.target.value as RouteType)} className="input">
                {(Object.keys(ROUTE_TYPE_LABEL) as RouteType[]).map((t) => <option key={t} value={t}>{ROUTE_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumField label="დღე (მინ.)" value={form.days_min} onChange={(v) => set('days_min', v)} error={fe.days_min} />
            <NumField label="დღე (მაქს.)" value={form.days_max} onChange={(v) => set('days_max', v)} error={fe.days_max} />
            <NumField label="საათი (1 დღისთვის)" value={form.duration_hours} onChange={(v) => set('duration_hours', v)} error={fe.duration_hours} />
            <NumField label="მანძილი, კმ" value={form.distance_km} onChange={(v) => set('distance_km', v)} error={fe.distance_km} hint={form.route_type === 'out_and_back' ? 'ორივე მიმართულება' : undefined} />
            <NumField label="აღმართი, მ" value={form.elevation_gain_m} onChange={(v) => set('elevation_gain_m', v)} error={fe.elevation_gain_m} />
            <NumField label="დაღმართი, მ" value={form.elevation_loss_m} onChange={(v) => set('elevation_loss_m', v)} error={fe.elevation_loss_m} />
            <NumField label="მაქს. სიმაღლე, მ" value={form.max_altitude_m} onChange={(v) => set('max_altitude_m', v)} error={fe.max_altitude_m} />
            <NumField label="მინ. სიმაღლე, მ" value={form.min_altitude_m} onChange={(v) => set('min_altitude_m', v)} />
          </div>
          <div className="mt-4">
            <p className="label">სეზონი</p>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const on = form.season_months.includes(m)
                return <button type="button" key={m} onClick={() => set('season_months', on ? form.season_months.filter((x) => x !== m) : [...form.season_months, m])} className={`rounded-md border py-1.5 text-[12.5px] font-semibold ${on ? 'border-forest bg-forest text-on-forest' : 'border-line-2 text-ink-2 hover:bg-surface-2'}`}>{monthShort(m)}</button>
              })}
            </div>
          </div>
          <div className="mt-4">
            <p className="label">თეგები</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 py-0.5 pl-2.5 pr-1 text-[12.5px]">
                  {tagLabel(t)} <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-surface-3" aria-label="მოხსნა"><X size={12} /></button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
                    setTagInput('')
                  }
                }}
                list="known-tags"
                className="input !w-44 !py-1 text-[13px]"
                placeholder="ახალი თეგი + Enter"
              />
              <datalist id="known-tags">{KNOWN_TAGS.map((t) => <option key={t} value={t}>{tagLabel(t)}</option>)}</datalist>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-[rgb(var(--forest))]" /> რჩეული (მთავარ გვერდზე)</label>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={form.status === 'published'} onChange={(e) => set('status', e.target.checked ? 'published' : 'draft')} className="accent-[rgb(var(--forest))]" /> გამოქვეყნებული</label>
          </div>
        </Section>

        <Section title="ტექსტები">
          <div className="grid gap-4">
            {TEXT_FIELDS.map((t) => (
              <Field key={t.key} label={t.label} hint={t.hint} error={fe[t.key]}>
                <textarea value={form[t.key]} onChange={(e) => set(t.key, e.target.value)} rows={t.rows} placeholder={t.placeholder} className="input text-[14px] leading-relaxed" />
              </Field>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="აღჭურვილობა">
            <ListEditor
              items={form.gear.map((g) => ({ key: g.key, text: g.name, flag: g.essential }))}
              onChange={(items) => set('gear', items.map((i) => ({ key: i.key, name: i.text, essential: i.flag ?? true })))}
              flagLabel="სავალდებულო"
              placeholder="მაგ: წვიმის ქურთუკი"
            />
          </Section>
          <Section title="რჩევები">
            <ListEditor items={form.tips.map((t) => ({ key: t.key, text: t.text }))} onChange={(items) => set('tips', items.map((i) => ({ key: i.key, text: i.text })))} placeholder="პრაქტიკული რჩევა" multiline />
          </Section>
        </div>

        <Section title="გაჩერებები და რუკა">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <RouteStopsEditor stops={stops} onChange={setStops} errors={problems?.stops ?? {}} picking={picking} onPick={setPicking} />
            <div className="xl:sticky xl:top-20 xl:self-start">
              {picking && <p className="mb-2 rounded-lg bg-forest px-3 py-2 text-[13px] font-semibold text-on-forest">{picking === 'new' ? 'დააჭირე რუკას ახალი გაჩერების დასამატებლად (რამდენჯერაც გინდა).' : 'დააჭირე რუკას — გაჩერება იქ გადავა.'} <button onClick={() => setPicking(null)} className="underline">დასრულება</button></p>}
              <div className="overflow-hidden rounded-xl border border-line">
                <LazyMap className="h-[520px]" stops={located_} focusLine={form.geometry} focusDifficulty={form.difficulty} onReady={onMapReady} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="ბილიკის ხაზი">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={buildLine} disabled={lineBusy} className="btn-primary btn-sm">
              {lineBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Wand2 size={15} />} ხაზის აგება ბილიკებზე
            </button>
            <button type="button" onClick={() => gpxRef.current?.click()} className="btn-secondary btn-sm"><FileUp size={15} /> GPX ჩატვირთვა</button>
            <input ref={gpxRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="hidden" onChange={(e) => { importGpx(e.target.files?.[0]); e.target.value = '' }} />
            {form.geometry && <button type="button" onClick={exportGpx} className="btn-ghost btn-sm"><Download size={15} /> GPX</button>}
            {form.geometry && <button type="button" onClick={() => setForm((f) => ({ ...f, geometry: null, geometry_lite: null, elevation_profile: null, geometry_source: null }))} className="btn-ghost btn-sm text-hard"><Trash2 size={15} /> ხაზის წაშლა</button>}
            <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={updateNumbers} onChange={(e) => setUpdateNumbers(e.target.checked)} className="accent-[rgb(var(--forest))]" /> მანძილი და სიმაღლეები ხაზიდან განაახლე</label>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">ხაზი გაჩერებების თანმიმდევრობით OpenStreetMap-ის ბილიკებზე იგება (BRouter). თუ გაჩერება ბილიკიდან შორსაა, ხაზი შეიძლება არასწორი გამოვიდეს — მაშინ გამოიყენე GPX.</p>
          {lineStats ? (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13.5px]">
                <span><RouteIcon size={14} className="mr-1 inline text-ink-3" />{num(lineStats.distanceKm, 1)} კმ {form.route_type === 'out_and_back' && <span className="text-ink-3">(ერთი მიმართულება)</span>}</span>
                <span>↑ {num(lineStats.gain)} მ</span><span>↓ {num(lineStats.loss)} მ</span>
                {lineStats.max !== null && <span>{num(lineStats.min)}–{num(lineStats.max)} მ</span>}
                <span className="text-ink-3">წყარო: {form.geometry_source ?? '—'}</span>
              </div>
              {check && !check.ok && <p className="flex items-start gap-2 rounded-lg border border-moderate/40 bg-moderate/10 px-3 py-2 text-[13px] text-ink"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-moderate" />ხაზის სიგრძე მითითებულ მანძილს არ ემთხვევა (შეფარდება {check.ratio}). შეამოწმე გაჩერებები ან ჩატვირთე GPX.</p>}
              {form.elevation_profile && form.elevation_profile.length > 1 && <ElevationProfile profile={form.elevation_profile} height={150} />}
            </div>
          ) : <p className="mt-4 text-[13.5px] text-ink-3">ხაზი ჯერ არ არის.</p>}
        </Section>

        <Section title="ფოტო">
          <RouteCoverPicker value={{ cover_url: form.cover_url, cover_credit: form.cover_credit, cover_source_url: form.cover_source_url }} onChange={(v) => setForm((f) => ({ ...f, ...v }))} near={nearForPhotos} slug={form.slug} />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 backdrop-blur md:bottom-0">
        <div className="page flex items-center justify-end gap-3 py-3">
          <span className="mr-auto text-[13px] text-ink-3">{dirty ? 'შეუნახავი ცვლილებები' : 'ყველაფერი შენახულია'}</span>
          <Link to="/admin/routes" className="btn-ghost">დახურვა</Link>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} შენახვა</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-[19px]">{title}</h2>
      {children}
    </section>
  )
}

function NumField({ label, value, onChange, error, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; hint?: string }) {
  const [text, setText] = useState(value === null ? '' : String(value))
  useEffect(() => { setText((t) => (Number(t.replace(',', '.')) === value || (t === '' && value === null) ? t : value === null ? '' : String(value))) }, [value])
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        value={text}
        inputMode="decimal"
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          const n = Number(t.replace(',', '.'))
          onChange(t.trim() === '' ? null : Number.isFinite(n) ? n : null)
        }}
        className="input"
      />
    </Field>
  )
}

function ListEditor({ items, onChange, flagLabel, placeholder, multiline }: {
  items: { key: string; text: string; flag?: boolean }[]
  onChange: (items: { key: string; text: string; flag?: boolean }[]) => void
  flagLabel?: string
  placeholder?: string
  multiline?: boolean
}) {
  const set = (key: string, patch: Partial<{ text: string; flag: boolean }>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const n = [...items]; [n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }
  return (
    <div className="grid gap-2">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-start gap-1.5">
          {multiline
            ? <textarea value={it.text} onChange={(e) => set(it.key, { text: e.target.value })} rows={2} className="input text-[13.5px]" placeholder={placeholder} />
            : <input value={it.text} onChange={(e) => set(it.key, { text: e.target.value })} className="input !py-1.5 text-[13.5px]" placeholder={placeholder} />}
          {flagLabel && (
            <label className="flex shrink-0 items-center gap-1 pt-2 text-[12px] text-ink-3" title={flagLabel}>
              <input type="checkbox" checked={it.flag ?? true} onChange={(e) => set(it.key, { flag: e.target.checked })} className="accent-[rgb(var(--forest))]" /> {flagLabel}
            </label>
          )}
          <div className="flex shrink-0 pt-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="ზემოთ"><ArrowUp size={14} /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="ქვემოთ"><ArrowDown size={14} /></button>
            <button type="button" onClick={() => onChange(items.filter((x) => x.key !== it.key))} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-hard" aria-label="წაშლა"><X size={14} /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { key: newKey(), text: '', flag: true }])} className="btn-ghost btn-sm justify-self-start"><Plus size={14} /> დამატება</button>
    </div>
  )
}
