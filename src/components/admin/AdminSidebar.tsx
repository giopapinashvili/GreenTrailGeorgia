import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, Building2, Users, MessageSquare,
  Star, Settings, LogOut, Mountain, ChevronLeft, Route,
  BookOpen, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin',          label: 'დეშბორდი',     icon: LayoutDashboard, exact: true },
  { to: '/admin/routes',   label: 'მარშრუტები',   icon: Route },
  { to: '/admin/hotels',   label: 'სასტუმროები',  icon: Building2 },
  { to: '/admin/guides',   label: 'გიდები',        icon: Users },
  { to: '/admin/users',    label: 'მომხმარებლები', icon: Users },
  { to: '/admin/stories',  label: 'ისტორიები',     icon: BookOpen },
  { to: '/admin/reviews',  label: 'შეფასებები',    icon: Star },
  { to: '/admin/settings', label: 'პარამეტრები',   icon: Settings },
]

export default function AdminSidebar() {
  const { logout } = useAuth()

  return (
    <aside className="w-56 flex flex-col shrink-0 h-screen sticky top-0" style={{ background: '#060c17', borderRight: '1px solid #1a2640' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b" style={{ borderColor: '#1a2640' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
          <Mountain size={14} className="text-white" />
        </div>
        <div>
          <p className="text-white text-xs font-extrabold leading-none">GreenTrail</p>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#22c55e' }}>Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'text-white bg-green-500/15 border border-green-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? '#22c55e' : undefined }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: '#1a2640' }}>
        <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all mb-1">
          <ChevronLeft size={15} />
          მთავარ გვერდზე
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={15} />
          გასვლა
        </button>
      </div>
    </aside>
  )
}
