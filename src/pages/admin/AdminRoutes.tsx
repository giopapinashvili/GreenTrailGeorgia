import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Eye, EyeOff, ImageOff, Pencil, Plus, RouteOff, Search, Star, Trash2, X, type LucideIcon } from 'lucide-react'
import Empty from '../../components/ui/Empty'
import Confirm from '../../components/ui/Confirm'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import DifficultyBadge from '../../components/route/DifficultyBadge'
import TopoCover from '../../components/route/TopoCover'
import { ADMIN_OVERVIEW_KEY } from '../../components/admin/DashOverview'
import { supabase, errorText } from '../../lib/supabase'
import { invalidateRoutes, useQueryClient, useRegions } from '../../lib/queries'
import { DIFFICULTIES, DIFF_LABEL } from '../../lib/difficulty'
import { daysLabel, formatDateShort, km, num } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import type { Difficulty } from '../../lib/types'

interface AdminRouteRow {
  id: number
  slug: string
  name: string
  name_en: string | null
  region_id: string
  difficulty: Difficulty
  days_min: number
  days_max: number
  distance_km: number | null
  status: 'draft' | 'published'
  featured: boolean
  cover_url: string | null
  geometry_source: string | null
  updated_at: string
  /** first point of `geometry` (null when the route has no line) — keeps the list light */
  line_start: unknown
}

const COLS = 'id,slug,name,name_en,region_id,difficulty,days_min,days_max,distance_km,status,featured,cover_url,geometry_source,updated_at,line_start:geometry->0'
const KEY = ['admin-routes'] as const

const hasLine = (r: AdminRouteRow) => r.line_start !== null && r.line_start !== undefined

export default function AdminRoutes() {
  usePageTitle('მარშრუტები — ადმინი')
  const qc = useQueryClient()
  const toast = useToast()
  const regions = useRegions()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<Set<number>>(() => new Set())
  const [toDelete, setToDelete] = useState<AdminRouteRow | null>(null)

  const list = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('routes').select(COLS).order('name')
      if (error) throw error
      return (data ?? []) as unknown as AdminRouteRow[]
    },
  })

  const f = {
    q: params.get('q') ?? '',
    region: params.get('region') ?? '',
    difficulty: params.get('difficulty') ?? '',
    status: params.get('status') ?? '',
    noLine: params.get('line') === '0',
    noCover: params.get('cover') === '0',
    sort: params.get('sort') === 'updated' ? 'updated' : 'name',
  }
  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }
  const filtersOn = !!(f.q || f.region || f.difficulty || f.status || f.noLine || f.noCover)

  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])
  const all = useMemo(() => list.data ?? [], [list.data])
  const counts = useMemo(() => ({
    published: all.filter((r) => r.status === 'published').length,
    drafts: all.filter((r) => r.status === 'draft').length,
    noLine: all.filter((r) => !hasLine(r)).length,
    noCover: all.filter((r) => !r.cover_url).length,
  }), [all])

  const rows = useMemo(() => {
    const s = f.q.trim().toLowerCase()
    const out = all.filter((r) =>
      (!s || r.name.toLowerCase().includes(s) || (r.name_en ?? '').toLowerCase().includes(s) || r.slug.includes(s)) &&
      (!f.region || r.region_id === f.region) &&
      (!f.difficulty || r.difficulty === f.difficulty) &&
      (!f.status || r.status === f.status) &&
      (!f.noLine || !hasLine(r)) &&
      (!f.noCover || !r.cover_url))
    if (f.sort === 'updated') out.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    else out.sort((a, b) => a.name.localeCompare(b.name, 'ka'))
    return out
  }, [all, f.q, f.region, f.difficulty, f.status, f.noLine, f.noCover, f.sort])

  // ───────── mutations ─────────
  const afterChange = () => {
    invalidateRoutes(qc)
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
  }
  const patchRow = (id: number, p: Partial<AdminRouteRow>) =>
    qc.setQueryData<AdminRouteRow[]>(KEY, (old) => old?.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const run = async (id: number, fn: () => Promise<void>) => {
    setBusy((s) => new Set(s).add(id))
    try {
      await fn()
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }

  const toggleFeatured = (r: AdminRouteRow) => run(r.id, async () => {
    const { error } = await supabase.from('routes').update({ featured: !r.featured }).eq('id', r.id)
    if (error) throw error
    patchRow(r.id, { featured: !r.featured })
    toast(r.featured ? 'რჩეულიდან მოიხსნა.' : 'მონიშნულია რჩეულად — ჩანს მთავარ გვერდზე.')
    afterChange()
  })

  const togglePublish = (r: AdminRouteRow) => run(r.id, async () => {
    const next = r.status === 'published' ? 'draft' : 'published'
    if (next === 'published') {
      const { count, error } = await supabase.from('route_stops').select('id', { count: 'exact', head: true }).eq('route_id', r.id)
      if (error) throw error
      if (!count) {
        toast('გამოქვეყნებამდე მარშრუტს მინიმუმ ერთი გაჩერება დაუმატე.', 'error')
        return
      }
    }
    const { error } = await supabase.from('routes').update({ status: next }).eq('id', r.id)
    if (error) throw error
    patchRow(r.id, { status: next })
    toast(next === 'published' ? 'მარშრუტი გამოქვეყნდა.' : 'მარშრუტი დრაფტში გადავიდა — საიტზე აღარ ჩანს.')
    afterChange()
  })

  const remove = async (r: AdminRouteRow) => {
    const { error } = await supabase.from('routes').delete().eq('id', r.id)
    if (error) {
      const fk = error.code === '23503' || /foreign key/i.test(error.message)
      toast(fk ? 'ამ მარშრუტს პოსტები აქვს — წაშლის ნაცვლად გადაიყვანე დრაფტში' : errorText(error), 'error')
      return
    }
    qc.setQueryData<AdminRouteRow[]>(KEY, (old) => old?.filter((x) => x.id !== r.id))
    toast('მარშრუტი წაიშალა.')
    afterChange()
  }

  // ───────── render ─────────
  return (
    <div className="pb-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker mb-1.5 flex items-center gap-2"><span className="blaze" />ადმინ პანელი</p>
          <h1 className="text-[28px] leading-tight sm:text-[32px]">მარშრუტები</h1>
          {list.data && (
            <p className="mt-1 text-[13.5px] text-ink-2">
              {num(all.length)} მარშრუტი · {num(counts.published)} გამოქვეყნებული · {num(counts.drafts)} დრაფტი
            </p>
          )}
        </div>
        <Link to="/admin/routes/new" className="btn-primary"><Plus size={17} /> ახალი მარშრუტი</Link>
      </div>

      {/* filters */}
      <div className="card mb-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={f.q}
            onChange={(e) => setParam('q', e.target.value)}
            className="input pl-9"
            placeholder="ძებნა: სახელი ან slug"
            aria-label="მარშრუტის ძებნა"
          />
        </div>
        <select value={f.region} onChange={(e) => setParam('region', e.target.value)} className="input" aria-label="რეგიონი">
          <option value="">ყველა რეგიონი</option>
          {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={f.difficulty} onChange={(e) => setParam('difficulty', e.target.value)} className="input" aria-label="სირთულე">
          <option value="">ნებისმიერი სირთულე</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
        </select>
        <select value={f.status} onChange={(e) => setParam('status', e.target.value)} className="input" aria-label="სტატუსი">
          <option value="">ყველა სტატუსი</option>
          <option value="published">გამოქვეყნებული</option>
          <option value="draft">დრაფტი</option>
        </select>
        <select value={f.sort} onChange={(e) => setParam('sort', e.target.value === 'updated' ? 'updated' : null)} className="input" aria-label="დალაგება">
          <option value="name">სახელით (ა–ჰ)</option>
          <option value="updated">ბოლოს შეცვლილი</option>
        </select>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setParam('line', f.noLine ? null : '0')} className={`chip ${f.noLine ? 'chip-on' : ''}`} aria-pressed={f.noLine}>
          <RouteOff size={14} /> ხაზის გარეშე {list.data && <span className="opacity-75">{num(counts.noLine)}</span>}
        </button>
        <button type="button" onClick={() => setParam('cover', f.noCover ? null : '0')} className={`chip ${f.noCover ? 'chip-on' : ''}`} aria-pressed={f.noCover}>
          <ImageOff size={14} /> ფოტოს გარეშე {list.data && <span className="opacity-75">{num(counts.noCover)}</span>}
        </button>
        {filtersOn && (
          <>
            <button type="button" onClick={() => setParams(f.sort === 'updated' ? { sort: 'updated' } : {}, { replace: true })} className="btn-ghost btn-sm">
              <X size={15} /> ფილტრების გასუფთავება
            </button>
            {list.data && <span className="text-[13px] text-ink-3">ნაჩვენებია {num(rows.length)} / {num(all.length)}</span>}
          </>
        )}
      </div>

      {list.isLoading ? (
        <div className="card divide-y divide-line overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-12 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : list.error ? (
        <Empty
          title="სია ვერ ჩაიტვირთა"
          text={errorText(list.error)}
          action={<button className="btn-secondary" onClick={() => list.refetch()}>თავიდან ცდა</button>}
        />
      ) : all.length === 0 ? (
        <Empty
          title="მარშრუტები ჯერ არ არის"
          text="დაამატე პირველი მარშრუტი: სახელი, რეგიონი, გაჩერებები რუკაზე და მოკლე აღწერა. შეგიძლია ჯერ დრაფტად შეინახო."
          action={<Link to="/admin/routes/new" className="btn-primary"><Plus size={17} /> ახალი მარშრუტი</Link>}
        />
      ) : rows.length === 0 ? (
        <Empty
          compact
          title="ვერაფერი მოიძებნა"
          text="ამ ფილტრებით მარშრუტი არ არის. შეცვალე ძებნა ან გაასუფთავე ფილტრები."
          action={<button className="btn-secondary" onClick={() => setParams({}, { replace: true })}>ფილტრების გასუფთავება</button>}
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {rows.map((r) => {
            const isBusy = busy.has(r.id)
            const published = r.status === 'published'
            return (
              <li key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 transition-opacity sm:px-4 ${isBusy ? 'opacity-60' : ''}`}>
                <Link to={`/admin/routes/${r.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2" tabIndex={-1} aria-hidden>
                  {r.cover_url
                    ? <img src={r.cover_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    : <TopoCover seed={r.slug} className="h-full w-full" />}
                </Link>
                <div className="min-w-0 flex-1 basis-52">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link to={`/admin/routes/${r.id}`} className="min-w-0 truncate font-semibold text-ink hover:text-forest">{r.name}</Link>
                    {!published && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-ink-2">დრაფტი</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                    {[regionName.get(r.region_id) ?? r.region_id, daysLabel(r.days_min, r.days_max), r.distance_km !== null ? km(Number(r.distance_km)) : null, `შეიცვალა ${formatDateShort(r.updated_at)}`].filter(Boolean).join(' · ')}
                  </p>
                  {(!hasLine(r) || !r.cover_url) && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {!hasLine(r) && <Missing icon={RouteOff}>ხაზი არ აქვს</Missing>}
                      {!r.cover_url && <Missing icon={ImageOff}>ფოტო არ აქვს</Missing>}
                    </div>
                  )}
                </div>
                <DifficultyBadge d={r.difficulty} size="sm" />
                <div className="ml-auto flex items-center gap-0.5">
                  <IconButton
                    label={r.featured ? 'რჩეულიდან მოხსნა' : 'რჩეულად მონიშვნა (მთავარ გვერდზე)'}
                    pressed={r.featured}
                    disabled={isBusy}
                    onClick={() => toggleFeatured(r)}
                  >
                    <Star size={17} className={r.featured ? 'fill-moderate text-moderate' : ''} />
                  </IconButton>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={isBusy}
                    onClick={() => togglePublish(r)}
                    title={published ? 'საიტიდან დამალვა (დრაფტში გადაყვანა)' : 'საიტზე გამოქვეყნება'}
                  >
                    {published ? <><EyeOff size={15} /> დრაფტში</> : <><Eye size={15} /> გამოქვეყნება</>}
                  </button>
                  <Link to={`/routes/${r.slug}`} className="btn-ghost btn-sm px-2" title="საიტზე ნახვა" aria-label="საიტზე ნახვა"><ExternalLink size={17} /></Link>
                  <Link to={`/admin/routes/${r.id}`} className="btn-ghost btn-sm px-2" title="რედაქტირება" aria-label="რედაქტირება"><Pencil size={17} /></Link>
                  <IconButton label="წაშლა" danger disabled={isBusy} onClick={() => setToDelete(r)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Confirm
        open={!!toDelete}
        title="მარშრუტის წაშლა"
        text={toDelete ? `„${toDelete.name}“ სამუდამოდ წაიშლება გაჩერებებთან, რჩევებთან და სტატისტიკასთან ერთად. თუ მარშრუტზე პოსტები წერია, წაშლა ვერ მოხერხდება — მაშინ დრაფტში გადაიყვანე.` : undefined}
        confirmLabel="წაშლა"
        danger
        onConfirm={async () => { if (toDelete) await run(toDelete.id, () => remove(toDelete)) }}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function Missing({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
      <Icon size={12} className="text-ink-3" /> {children}
    </span>
  )
}

function IconButton({ label, onClick, disabled, danger, pressed, children }: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  pressed?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`btn-ghost btn-sm px-2 ${danger ? 'hover:bg-hard/10 hover:text-hard' : ''}`}
    >
      {children}
    </button>
  )
}
