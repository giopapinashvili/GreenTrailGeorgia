import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import RouteCard from '../components/common/RouteCard'
import { routes } from '../data/mockData'
import type { Difficulty, Category } from '../types'

const DIFFS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all',    label: 'ყველა' },
  { value: 'easy',   label: 'მარტივი' },
  { value: 'medium', label: 'საშუალო' },
  { value: 'hard',   label: 'რთული' },
]
const CATS: { value: Category | 'all'; label: string }[] = [
  { value: 'all',     label: 'ყველა' },
  { value: 'hiking',  label: 'ლაშქრობა' },
  { value: 'car',     label: 'მანქანით' },
  { value: 'camping', label: 'კემპინგი' },
  { value: 'family',  label: 'ოჯახური' },
  { value: 'expert',  label: 'ექსპერტი' },
]

export default function RoutesPage() {
  const [q, setQ] = useState('')
  const [diff, setDiff] = useState<Difficulty | 'all'>('all')
  const [cat, setCat] = useState<Category | 'all'>('all')

  const filtered = routes.filter(r => {
    const matchQ = r.title.toLowerCase().includes(q.toLowerCase()) || r.titleKa.includes(q) || r.location.toLowerCase().includes(q.toLowerCase())
    const matchD = diff === 'all' || r.difficulty === diff
    const matchC = cat === 'all' || r.category === cat
    return matchQ && matchD && matchC
  })

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">მარშრუტები</h1>
        <p className="text-slate-400">აღმოაჩინე {routes.length}+ მარშრუტი საქართველოში</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Search size={15} className="text-green-400 shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="მოძებნე მარშრუტი…"
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
          />
          {q && <button onClick={() => setQ('')}><X size={14} className="text-slate-500 hover:text-white" /></button>}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {DIFFS.map(d => (
            <button
              key={d.value}
              onClick={() => setDiff(d.value)}
              className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0"
              style={diff === d.value
                ? { background: '#22c55e', color: '#080e1a' }
                : { background: '#0f1826', color: '#94a3b8', border: '1px solid #1a2640' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6" style={{ scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
            style={cat === c.value
              ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
              : { background: '#0f1826', color: '#64748b', border: '1px solid #1a2640' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-slate-500 text-sm mb-4">{filtered.length} მარშრუტი ნაპოვნია</p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(r => <RouteCard key={r.id} route={r} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-slate-500 text-4xl mb-4">🔍</p>
          <p className="text-slate-400 text-lg font-semibold">მარშრუტი ვერ მოიძებნა</p>
          <p className="text-slate-600 text-sm mt-1">სცადე სხვა ფილტრი</p>
        </div>
      )}
    </div>
  )
}
