import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, User, Bookmark, BookOpen, Star, Settings, LogOut, Mountain, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard',          label: 'დეშბორდი',       icon: LayoutDashboard, exact: true },
  { to: '/dashboard/profile',  label: 'პროფილი',         icon: User },
  { to: '/dashboard/saved',    label: 'შენახული',         icon: Bookmark },
  { to: '/dashboard/stories',  label: 'ჩემი ისტორიები',  icon: BookOpen },
  { to: '/dashboard/reviews',  label: 'ჩემი შეფასებები', icon: Star },
  { to: '/dashboard/settings', label: 'პარამეტრები',     icon: Settings },
]

export default function UserLayout() {
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex" style={{ background: '#080e1a' }}>
      {/* Sidebar */}
      <aside className="w-56 hidden md:flex flex-col shrink-0 sticky top-0 h-screen" style={{ background: '#060c17', borderRight: '1px solid #1a2640' }}>
        {/* User card */}
        <div className="p-5 border-b" style={{ borderColor: '#1a2640' }}>
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-green-500/30" />
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate">{user.name}</p>
              <p className="text-slate-500 text-[10px] truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {links.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive ? 'text-white bg-green-500/15 border border-green-500/20' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => <><Icon size={15} style={{ color: isActive ? '#22c55e' : undefined }} />{label}</>}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t pt-3 space-y-0.5" style={{ borderColor: '#1a2640' }}>
          <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all">
            <ChevronLeft size={15} />მთავარი
          </NavLink>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut size={15} />გასვლა
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b" style={{ borderColor: '#1a2640', background: '#060c17' }}>
          <div className="flex items-center gap-2">
            <img src={user.avatar} className="w-7 h-7 rounded-full object-cover" />
            <span className="text-white text-xs font-semibold">{user.name}</span>
          </div>
          <NavLink to="/" className="text-slate-400 hover:text-white text-xs">← მთავარი</NavLink>
        </div>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
