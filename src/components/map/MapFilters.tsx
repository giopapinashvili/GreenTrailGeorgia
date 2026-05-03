import { Car, Tent, Building2, Navigation, Footprints } from 'lucide-react'

interface Filters {
  trails: boolean
  camping: boolean
  hotels: boolean
  car: boolean
  fourX4: boolean
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const items = [
  { key: 'trails'  as const, label: 'ბილიკები',          icon: Footprints, color: '#22c55e' },
  { key: 'camping' as const, label: 'კემპინგი',           icon: Tent,       color: '#f59e0b' },
  { key: 'hotels'  as const, label: 'სასტუმრო',           icon: Building2,  color: '#3b82f6' },
  { key: 'fourX4'  as const, label: 'დიდმარჯვენა (4×4)', icon: Car,        color: '#a855f7' },
  { key: 'car'     as const, label: 'მანქანის გზა',       icon: Navigation, color: '#94a3b8' },
]

export default function MapFilters({ filters, onChange }: Props) {
  const toggle = (key: keyof Filters) =>
    onChange({ ...filters, [key]: !filters[key] })

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(8,14,26,0.92)', border: '1px solid #1a2640' }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">ფილტრები</p>

      {items.map(({ key, label, icon: Icon, color }) => (
        <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
          <span
            className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
            style={{
              background: filters[key] ? color : 'transparent',
              border: `2px solid ${filters[key] ? color : '#2d3f5a'}`,
            }}
            onClick={() => toggle(key)}
          >
            {filters[key] && <span className="text-white text-[9px] font-bold">✓</span>}
          </span>
          <Icon size={13} style={{ color: filters[key] ? color : '#475569' }} />
          <span className={`text-xs transition-colors ${filters[key] ? 'text-slate-200' : 'text-slate-500'}`}>
            {label}
          </span>
        </label>
      ))}

      <div className="pt-2 border-t mt-3 space-y-1.5" style={{ borderColor: '#1a2640' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">სირთულე</p>
        {[
          { label: 'მარტივი', color: '#22c55e' },
          { label: 'საშუალო', color: '#eab308' },
          { label: 'რთული',  color: '#ef4444' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-5 border-t-2 border-dashed" style={{ borderColor: color }} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
