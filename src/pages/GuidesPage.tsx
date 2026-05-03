import { Search } from 'lucide-react'
import { useState } from 'react'
import GuideCard from '../components/common/GuideCard'
import { guides } from '../data/mockData'

export default function GuidesPage() {
  const [q, setQ] = useState('')
  const filtered = guides.filter(g => g.name.toLowerCase().includes(q.toLowerCase()) || g.specialty.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">გიდები & ტური</h1>
        <p className="text-slate-400">გამოცდილი ადგილობრივი გიდები შენი მოგზაურობისთვის</p>
      </div>

      <div className="flex items-center gap-2 mb-8 rounded-xl px-3 py-2.5 max-w-md" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
        <Search size={15} className="text-green-400 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="მოძებნე გიდი…"
          className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(g => (
          <div key={g.id} className="rounded-2xl p-4" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
            <GuideCard guide={g} />
            <div className="mt-3 pt-3 border-t text-xs text-slate-500" style={{ borderColor: '#1a2640' }}>
              გიდი ახორციელებს ინდივიდუალურ და ჯგუფურ ტურებს საქართველოს მთელ ტერიტორიაზე.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
