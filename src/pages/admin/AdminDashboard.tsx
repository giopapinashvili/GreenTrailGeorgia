import { Route, Building2, Users, Star, TrendingUp, Eye, Heart, MessageCircle, ArrowUpRight } from 'lucide-react'
import { routes, hotels, guides, stories, reviews } from '../../data/mockData'

const stats = [
  { label: 'სულ მარშრუტი',     value: routes.length,  icon: Route,     color: '#22c55e', change: '+3 ამ კვირა' },
  { label: 'სასტუმრო',         value: hotels.length,  icon: Building2, color: '#3b82f6', change: '+1 ამ კვირა' },
  { label: 'გიდი',             value: guides.length,  icon: Users,     color: '#a855f7', change: '+2 ამ კვირა' },
  { label: 'შეფასება',         value: reviews.length, icon: Star,      color: '#eab308', change: '+12 ამ კვირა' },
]

const activityFeed = [
  { type: 'route',   text: 'ახალი მარშრუტი დაემატა: "აბუდელაურის ტბები"',    time: '5 წთ წინ',   color: '#22c55e' },
  { type: 'user',    text: 'ახალი მომხმარებელი დარეგისტრირდა: Mariam B.',      time: '12 წთ წინ',  color: '#3b82f6' },
  { type: 'review',  text: 'ახალი შეფასება: Rooms Kazbegi — ★5',               time: '28 წთ წინ',  color: '#eab308' },
  { type: 'story',   text: 'ახალი ისტორია გამოქვეყნდა: "კახეთი შემოდგომაზე"', time: '1 სთ წინ',   color: '#a855f7' },
  { type: 'hotel',   text: 'სასტუმრო განახლდა: Green Canyon Hotel',            time: '2 სთ წინ',   color: '#3b82f6' },
  { type: 'route',   text: 'მარშრუტი დამტკიცდა: "ვაშლოვანი უდაბნო"',          time: '3 სთ წინ',   color: '#22c55e' },
]

const topRoutes = routes.slice(0, 5).map((r, i) => ({
  ...r,
  views: [2340, 1890, 1654, 1230, 980][i],
  likes: [312, 245, 198, 145, 102][i],
}))

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-2xl p-5" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <span className="text-[11px] flex items-center gap-1" style={{ color: s.color }}>
                  <TrendingUp size={10} /> {s.change}
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Routes table */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1a2640' }}>
            <p className="text-white font-bold text-sm">ტოპ მარშრუტები</p>
            <button className="text-green-400 text-xs flex items-center gap-1 hover:text-green-300">ყველა <ArrowUpRight size={12} /></button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2640' }}>
                {['მარშრუტი', 'სირთულე', 'ნახვა', 'მოწონება', 'რეიტინგი'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-slate-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topRoutes.map((r, i) => {
                const diffColor = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' }[r.difficulty]
                return (
                  <tr key={r.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1a2640' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-4">{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg overflow-hidden">
                          <img src={r.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{r.titleKa}</p>
                          <p className="text-slate-600 text-[10px]">{r.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${diffColor}18`, color: diffColor }}>
                        {r.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      <span className="flex items-center gap-1"><Eye size={11} /> {r.views.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      <span className="flex items-center gap-1"><Heart size={11} /> {r.likes}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-yellow-400 font-bold">★ {r.rating}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#1a2640' }}>
            <p className="text-white font-bold text-sm">ბოლო აქტივობა</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#1a2640' }}>
            {activityFeed.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                <div>
                  <p className="text-slate-300 text-xs leading-relaxed">{item.text}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
