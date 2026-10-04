import { BedDouble, Flag, Mountain, MapPin, Droplets, Tent, Home, Church, Castle, Waves, Snowflake, Eye, TreePine } from 'lucide-react'
import type { RouteStop, StopKind } from '../../lib/types'
import { num } from '../../lib/format'

const ICON: Partial<Record<StopKind, typeof MapPin>> = {
  start: Flag, finish: Flag, village: Home, guesthouse: BedDouble, hut: Home, camp: Tent, pass: Mountain, peak: Mountain,
  lake: Waves, water: Droplets, waterfall: Droplets, glacier: Snowflake, church: Church, fortress: Castle, viewpoint: Eye, bridge: TreePine,
}

export const STOP_KIND_LABEL: Record<StopKind, string> = {
  start: 'სტარტი', finish: 'ფინიში', village: 'სოფელი', guesthouse: 'საოჯახო სასტუმრო', hut: 'თავშესაფარი', camp: 'კარვის ადგილი',
  pass: 'უღელტეხილი', lake: 'ტბა', peak: 'მწვერვალი', viewpoint: 'სანახავი', water: 'წყალი/ფონი', waterfall: 'ჩანჩქერი',
  glacier: 'მყინვარი', church: 'ეკლესია', fortress: 'ციხე', bridge: 'ხიდი', other: 'წერტილი',
}

export default function StopsTimeline({ stops, kms, onFocus }: { stops: RouteStop[]; kms?: number[]; onFocus?: (s: RouteStop) => void }) {
  const multiDay = stops.some((s) => (s.day ?? 1) > 1)
  let lastDay: number | null = null
  return (
    <ol className="relative">
      {stops.map((s, i) => {
        const Icon = ICON[s.kind] ?? MapPin
        const dayHeader = multiDay && s.day && s.day !== lastDay
        lastDay = s.day ?? lastDay
        return (
          <li key={s.id ?? i}>
            {dayHeader && (
              <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0">
                <span className="blaze" />
                <span className="font-serif text-[15px] font-bold">დღე {s.day}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onFocus?.(s)}
              className="group flex w-full gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-2"
            >
              <div className="flex flex-col items-center">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold ${s.overnight ? 'border-forest bg-forest text-on-forest' : 'border-ink bg-surface text-ink'}`}>{i + 1}</span>
                {i < stops.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-line-2" />}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Icon size={12} /> {STOP_KIND_LABEL[s.kind]}</span>
                  {s.overnight && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">ღამისთევა</span>}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">
                  {[s.altitude_m ? `${num(s.altitude_m)} მ` : null, kms?.[i] !== undefined ? `${num(kms[i], 1)} კმ` : null].filter(Boolean).join(' · ')}
                </div>
                {s.description && <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{s.description}</p>}
              </div>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
