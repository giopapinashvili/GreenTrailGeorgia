import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { GearItem } from '../../lib/types'

/** Gear list with personal tick-boxes remembered in this browser. */
export default function GearChecklist({ routeId, gear }: { routeId: number; gear: GearItem[] }) {
  const key = `gt-gear-${routeId}`
  const [done, setDone] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(key) || '{}')) } catch { /* ignore */ }
  }, [key])
  const toggle = (name: string) => {
    setDone((d) => {
      const n = { ...d, [name]: !d[name] }
      try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* ignore */ }
      return n
    })
  }
  const essentials = gear.filter((g) => g.essential !== false)
  const optional = gear.filter((g) => g.essential === false)
  const count = gear.filter((g) => done[g.name]).length
  const Item = ({ g }: { g: GearItem }) => (
    <li>
      <button type="button" onClick={() => toggle(g.name)} className="flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left hover:bg-surface-2">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${done[g.name] ? 'border-forest bg-forest text-on-forest' : 'border-line-2 bg-surface'}`}>
          {done[g.name] && <Check size={13} strokeWidth={3} />}
        </span>
        <span className={`text-[14.5px] ${done[g.name] ? 'text-ink-3 line-through' : 'text-ink'}`}>{g.name}</span>
      </button>
    </li>
  )
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] text-ink-3">მონიშნე, რაც უკვე ჩაალაგე</span>
        <span className="text-[13px] font-semibold text-ink-2">{count}/{gear.length}</span>
      </div>
      <ul className="grid gap-x-6 sm:grid-cols-2">{essentials.map((g) => <Item key={g.name} g={g} />)}</ul>
      {optional.length > 0 && (
        <>
          <p className="kicker mb-1 mt-4">სასურველი</p>
          <ul className="grid gap-x-6 sm:grid-cols-2">{optional.map((g) => <Item key={g.name} g={g} />)}</ul>
        </>
      )}
    </div>
  )
}
