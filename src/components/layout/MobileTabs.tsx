import { NavLink } from 'react-router-dom'
import { Home, Route, Map, Newspaper, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'

export default function MobileTabs() {
  const { profile } = useAuth()
  const items = [
    { to: '/', label: 'მთავარი', icon: Home, end: true },
    { to: '/routes', label: 'მარშრუტები', icon: Route },
    { to: '/map', label: 'რუკა', icon: Map },
    { to: '/blog', label: 'ბლოგი', icon: Newspaper },
    { to: profile ? `/u/${profile.username}` : '/login', label: profile ? 'პროფილი' : 'შესვლა', icon: User },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="სწრაფი ნავიგაცია">
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${isActive ? 'text-forest' : 'text-ink-3'}`}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
