import { Link } from 'react-router-dom'
import { Bookmark, BookOpen, Star, Map, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { routes, reviews, stories } from '../../data/mockData'
import RouteCard from '../../components/common/RouteCard'

export default function UserDashboard() {
  const { user } = useAuth()

  const stats = [
    { label: 'შენახული',      value: 4,  icon: Bookmark, color: '#22c55e',  path: '/dashboard/saved' },
    { label: 'ისტორიები',     value: 2,  icon: BookOpen, color: '#3b82f6',  path: '/dashboard/stories' },
    { label: 'შეფასებები',    value: 6,  icon: Star,     color: '#eab308',  path: '/dashboard/reviews' },
    { label: 'გავლილი კმ.',   value: 47, icon: Map,      color: '#a855f7',  path: '#' },
  ]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <img src={user?.avatar} className="w-14 h-14 rounded-full object-cover ring-2 ring-green-500/30" />
        <div>
          <p className="text-slate-400 text-sm">გამარჯობა,</p>
          <h1 className="text-2xl font-extrabold text-white">{user?.name} 👋</h1>
          <p className="text-slate-500 text-xs mt-0.5">მომხმარებელი {user?.joinedAt}-დან</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.label} to={s.path}
              className="rounded-2xl p-4 flex flex-col gap-3 card-hover"
              style={{ background: '#0f1826', border: '1px solid #1a2640' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <Icon size={16} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-slate-500 text-xs">{s.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Saved routes preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">შენახული მარშრუტები</h2>
          <Link to="/dashboard/saved" className="text-green-400 text-xs flex items-center gap-1">ყველა <ChevronRight size={13} /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {routes.slice(0, 4).map(r => <RouteCard key={r.id} route={r} />)}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-white font-bold mb-4">ბოლო აქტივობა</h2>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          {[
            { icon: Star,     color: '#eab308', text: `შეაფასე Rooms Kazbegi — ★5`, time: '2 დღის წინ' },
            { icon: Bookmark, color: '#22c55e', text: 'შეინახე: "გერგეტის სამება"',   time: '4 დღის წინ' },
            { icon: BookOpen, color: '#3b82f6', text: 'გამოაქვეყნე ისტორია',           time: '1 კვ. წინ' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0" style={{ borderColor: '#1a2640' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                  <Icon size={14} style={{ color: item.color }} />
                </div>
                <p className="text-slate-300 text-sm flex-1">{item.text}</p>
                <span className="text-slate-600 text-xs shrink-0">{item.time}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
