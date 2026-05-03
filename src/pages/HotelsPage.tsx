import { useState } from 'react'
import { Search, X } from 'lucide-react'
import HotelCard from '../components/common/HotelCard'
import { hotels } from '../data/mockData'

const LOCATIONS = ['ყველა', 'Kazbegi', 'Mestia', 'Batumi', 'Sighnaghi', 'Martvili', 'Mtskheta']

export default function HotelsPage() {
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState('ყველა')

  const filtered = hotels.filter(h => {
    const matchQ = h.name.toLowerCase().includes(q.toLowerCase()) || h.location.toLowerCase().includes(q.toLowerCase())
    const matchL = loc === 'ყველა' || h.location === loc
    return matchQ && matchL
  })

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">სასტუმროები</h1>
        <p className="text-slate-400">იპოვე სრულყოფილი ადგილი შენი მოგზაურობისთვის</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Search size={15} className="text-green-400 shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="მოძებნე სასტუმრო…"
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
          />
          {q && <button onClick={() => setQ('')}><X size={14} className="text-slate-500" /></button>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6" style={{ scrollbarWidth: 'none' }}>
        {LOCATIONS.map(l => (
          <button
            key={l}
            onClick={() => setLoc(l)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
            style={loc === l
              ? { background: '#22c55e', color: '#080e1a' }
              : { background: '#0f1826', color: '#94a3b8', border: '1px solid #1a2640' }
            }
          >
            {l}
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-sm mb-4">{filtered.length} სასტუმრო</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(h => <HotelCard key={h.id} hotel={h} />)}
      </div>
    </div>
  )
}
