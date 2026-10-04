import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Moon, Sun, MessageCircle, PenLine, LogOut, User, Settings, Shield, Bookmark } from 'lucide-react'
import Logo from './Logo'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { useUnread } from '../../lib/unread'

export const NAV = [
  { to: '/routes', label: 'მარშრუტები' },
  { to: '/map', label: 'რუკა' },
  { to: '/planner', label: 'დაგეგმვა' },
  { to: '/blog', label: 'ბლოგი' },
  { to: '/tips', label: 'რჩევები' },
  { to: '/guides', label: 'გიდები და ტურები' },
]

export default function Header() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const { resolved, toggle } = useTheme()
  const unread = useUnread()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setOpen(false); setMenu(false) }, [pathname])
  useEffect(() => {
    if (!menu) return
    const fn = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menu])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="page flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label="მთავარი მენიუ">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-3 py-2 text-[14px] font-semibold transition-colors ${isActive ? 'text-forest' : 'text-ink-2 hover:text-ink'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={resolved === 'dark' ? 'ღია რეჟიმი' : 'მუქი რეჟიმი'} title={resolved === 'dark' ? 'ღია რეჟიმი' : 'მუქი რეჟიმი'}>
            {resolved === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {user ? (
            <>
              <Link to="/messages" className="relative grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="მიმოწერა" title="მიმოწერა">
                <MessageCircle size={19} />
                {unread > 0 && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-blaze px-1 text-[10.5px] font-bold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>}
              </Link>
              <Link to="/blog/new" className="btn-primary btn-sm hidden sm:inline-flex"><PenLine size={15} /> დაწერე</Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu((v) => !v)} className="ml-1 rounded-full" aria-label="ჩემი ანგარიში" aria-expanded={menu}>
                  <Avatar url={profile?.avatar_url} name={profile?.display_name ?? user.email ?? '?'} size={34} />
                </button>
                {menu && (
                  <div className="absolute right-0 top-12 w-60 animate-slide-up overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-pop">
                    <div className="border-b border-line px-4 pb-2.5 pt-1.5">
                      <p className="truncate font-semibold text-ink">{profile?.display_name}</p>
                      <p className="truncate text-[12.5px] text-ink-3">@{profile?.username}</p>
                    </div>
                    <MenuItem to={`/u/${profile?.username ?? ''}`} icon={<User size={16} />}>ჩემი პროფილი</MenuItem>
                    <MenuItem to="/me" icon={<Bookmark size={16} />}>შენახული და გავლილი</MenuItem>
                    <MenuItem to="/settings" icon={<Settings size={16} />}>პარამეტრები</MenuItem>
                    {isAdmin && <MenuItem to="/admin" icon={<Shield size={16} />}>ადმინ პანელი</MenuItem>}
                    <button onClick={async () => { await signOut(); navigate('/') }} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] text-hard hover:bg-surface-2">
                      <LogOut size={16} /> გასვლა
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">შესვლა</Link>
              <Link to="/register" className="btn-primary btn-sm">რეგისტრაცია</Link>
            </>
          )}
          <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 lg:hidden" aria-label="მენიუ" aria-expanded={open}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="animate-fade-in border-t border-line bg-bg lg:hidden" aria-label="მობილური მენიუ">
          <div className="page grid gap-0.5 py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-3 text-[15px] font-semibold ${isActive ? 'bg-surface-2 text-forest' : 'text-ink'}`}>{n.label}</NavLink>
            ))}
            {user && <NavLink to="/blog/new" className="mt-2 btn-primary">დაწერე პოსტი</NavLink>}
            {!user && <NavLink to="/login" className="mt-2 btn-secondary">შესვლა</NavLink>}
          </div>
        </nav>
      )}
    </header>
  )
}

function MenuItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-ink hover:bg-surface-2">
      <span className="text-ink-3">{icon}</span>{children}
    </Link>
  )
}
