import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useRegions, useRoutes } from '../../lib/queries'
import { DiffShape } from './DifficultyBadge'
import { daysLabel } from '../../lib/format'

/** Searchable route selector (posts must be tagged with a route; tours may be). */
export default function RoutePicker({ value, onChange, allowEmpty = false, placeholder = 'აირჩიე მარშრუტი…', invalid = false }: {
  value: number | null
  onChange: (id: number | null) => void
  allowEmpty?: boolean
  placeholder?: string
  invalid?: boolean
}) {
  const routes = useRoutes()
  const regions = useRegions()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])
  const selected = routes.data?.find((r) => r.id === value) ?? null

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = routes.data ?? []
    if (!s) return all
    return all.filter((r) => r.name.toLowerCase().includes(s) || (r.name_en ?? '').toLowerCase().includes(s) || (regionName.get(r.region_id) ?? '').toLowerCase().includes(s))
  }, [q, routes.data, regionName])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`input flex items-center justify-between gap-2 text-left ${invalid ? 'border-hard' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <DiffShape d={selected.difficulty} />
            <span className="truncate font-semibold">{selected.name}</span>
            <span className="hidden shrink-0 text-[12.5px] text-ink-3 sm:inline">· {regionName.get(selected.region_id)}</span>
          </span>
        ) : (
          <span className="text-ink-3">{placeholder}</span>
        )}
        <span className="flex items-center gap-1 text-ink-3">
          {selected && allowEmpty && (
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onChange(null) }} className="rounded p-0.5 hover:bg-surface-2" aria-label="გასუფთავება"><X size={15} /></span>
          )}
          <ChevronDown size={16} />
        </span>
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full animate-slide-up overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="relative border-b border-line p-2">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input pl-8" placeholder="ძებნა სახელით ან რეგიონით" />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={r.id === value}
                  onClick={() => { onChange(r.id); setOpen(false); setQ('') }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] hover:bg-surface-2"
                >
                  <DiffShape d={r.difficulty} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{r.name}</span>
                    <span className="block text-[12px] text-ink-3">{regionName.get(r.region_id)} · {daysLabel(r.days_min, r.days_max)}</span>
                  </span>
                  {r.id === value && <Check size={16} className="text-forest" />}
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-4 text-center text-[13.5px] text-ink-3">ვერაფერი მოიძებნა</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
