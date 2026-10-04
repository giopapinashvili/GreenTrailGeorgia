import { ArrowDown, ArrowUp, Crosshair, MapPin, Trash2 } from 'lucide-react'
import { STOP_KIND_LABEL } from '../route/StopsTimeline'
import type { StopKind } from '../../lib/types'
import { located, newKey, type StopDraft } from './RouteEditorModel'

const KINDS = Object.keys(STOP_KIND_LABEL) as StopKind[]
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

/** Editable list of route stops; coordinates can be typed or picked on the map. */
export default function RouteStopsEditor({ stops, onChange, errors, picking, onPick }: {
  stops: StopDraft[]
  onChange: (s: StopDraft[]) => void
  errors: Record<string, string>
  picking: string | null
  onPick: (key: string | null) => void
}) {
  const set = (key: string, patch: Partial<StopDraft>) => onChange(stops.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= stops.length) return
    const n = [...stops]; [n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }
  const add = () => onChange([...stops, { key: newKey(), name: '', kind: stops.length ? 'other' : 'start', day: null, altitude_m: null, overnight: false, description: '', lat: null, lng: null }])

  return (
    <div className="grid gap-3">
      {stops.length === 0 && <p className="rounded-lg border border-dashed border-line-2 p-4 text-center text-[13.5px] text-ink-3">გაჩერება ჯერ არ არის. დააჭირე „რუკაზე დამატება“ და მონიშნე წერტილი, ან დაამატე ხელით.</p>}
      {stops.map((s, i) => (
        <div key={s.key} className={`rounded-xl border p-3 ${errors[s.key] ? 'border-hard/60' : picking === s.key ? 'border-forest' : 'border-line'} bg-surface`}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink text-[12px] font-bold">{i + 1}</span>
            <input value={s.name} onChange={(e) => set(s.key, { name: e.target.value })} className="input !py-1.5 text-[14px]" placeholder="სახელი (მაგ: ადიში)" />
            <div className="flex shrink-0">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="ზემოთ"><ArrowUp size={15} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="rounded p-1.5 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="ქვემოთ"><ArrowDown size={15} /></button>
              <button type="button" onClick={() => onChange(stops.filter((x) => x.key !== s.key))} className="rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-hard" aria-label="წაშლა"><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select value={s.kind} onChange={(e) => set(s.key, { kind: e.target.value as StopKind })} className="input !py-1.5 text-[13px]" aria-label="ტიპი">
              {KINDS.map((k) => <option key={k} value={k}>{STOP_KIND_LABEL[k]}</option>)}
            </select>
            <input value={s.day ?? ''} onChange={(e) => set(s.key, { day: num(e.target.value) })} inputMode="numeric" className="input !py-1.5 text-[13px]" placeholder="დღე" aria-label="დღე" />
            <input value={s.altitude_m ?? ''} onChange={(e) => set(s.key, { altitude_m: num(e.target.value) })} inputMode="numeric" className="input !py-1.5 text-[13px]" placeholder="სიმაღლე, მ" aria-label="სიმაღლე" />
            <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={s.overnight} onChange={(e) => set(s.key, { overnight: e.target.checked })} className="accent-[rgb(var(--forest))]" /> ღამისთევა</label>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={s.lat ?? ''} onChange={(e) => set(s.key, { lat: num(e.target.value) })} inputMode="decimal" className="input !py-1.5 text-[13px]" placeholder="lat (42.…)" aria-label="განედი" />
            <input value={s.lng ?? ''} onChange={(e) => set(s.key, { lng: num(e.target.value) })} inputMode="decimal" className="input !py-1.5 text-[13px]" placeholder="lng (44.…)" aria-label="გრძედი" />
            <button type="button" onClick={() => onPick(picking === s.key ? null : s.key)} className={`btn-sm ${picking === s.key ? 'btn-primary' : 'btn-secondary'}`} title="რუკაზე დააჭირე ახალ ადგილს">
              <Crosshair size={14} /> {picking === s.key ? 'დააჭირე რუკას' : 'რუკიდან'}
            </button>
          </div>
          <textarea value={s.description} onChange={(e) => set(s.key, { description: e.target.value })} rows={2} className="input mt-2 text-[13px]" placeholder="აღწერა (არასავალდებულო): რა არის აქ, სად ღამდება…" />
          {errors[s.key] && <p className="mt-1.5 text-[12.5px] text-hard">{errors[s.key]}</p>}
          {!errors[s.key] && !located(s) && <p className="mt-1.5 text-[12.5px] text-ink-3">კოორდინატები აკლია.</p>}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onPick(picking === 'new' ? null : 'new')} className={`btn-sm ${picking === 'new' ? 'btn-primary' : 'btn-secondary'}`}>
          <MapPin size={14} /> {picking === 'new' ? 'დააჭირე რუკას…' : 'რუკაზე დამატება'}
        </button>
        <button type="button" onClick={add} className="btn-ghost btn-sm">ხელით დამატება</button>
      </div>
    </div>
  )
}
