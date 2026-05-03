import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, Heart, Plus, Mountain, LogIn, LayoutDashboard, Shield, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
  { label: 'მთავარი',    path: '/' },
  { label: 'მარშრუტები',path: '/routes' },
  { label: 'ადგილები',  path: '/hotels' },
  { label: 'ისტორია',   path: '/community' },
  { label: 'გიდები',    path: '/guides' },
  { label: 'ბლოგი',     path: '/blog' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: '#080e1a', borderColor: '#1a2640' }}>
      <div className="max-w-[1440px] mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
            <Mountain size={16} className="text-white" />
          </div>
          <div className="leading-none">
            <div className="font-extrabold text-sm text-white tracking-wide">GreenTrail</div>
            <div className="font-bold text-[10px] tracking-[0.2em] uppercase" style={{ color: '#22c55e' }}>GEORGIA</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {navLinks.map(link => (
            <Link key={link.path} to={link.path}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                pathname === link.path ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-2 ml-auto">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{ background: '#22c55e', color: '#080e1a' }}
            onMouseOver={e => (e.currentTarget.style.background = '#16a34a')}
            onMouseOut={e => (e.currentTarget.style.background = '#22c55e')}
          >
            <Plus size={14} /> დაამატე ისტორია
          </button>

          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Heart size={16} />
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-green-500/30" />
                <span className="text-white text-xs font-semibold max-w-24 truncate">{user.name}</span>
                <ChevronDown size={12} className="text-slate-500" />
              </button>

              {userMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50 shadow-2xl" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#1a2640' }}>
                      <p className="text-white text-xs font-semibold">{user.name}</p>
                      <p className="text-slate-500 text-[10px]">{user.role === 'admin' ? 'ადმინი' : 'მომხმარებელი'}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button onClick={() => { navigate('/dashboard'); setUserMenu(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        <LayoutDashboard size={13} className="text-green-400" /> ჩემი პანელი
                      </button>
                      {user.role === 'admin' && (
                        <button onClick={() => { navigate('/admin'); setUserMenu(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                          <Shield size={13} className="text-purple-400" /> ადმინ პანელი
                        </button>
                      )}
                      <div className="border-t my-1" style={{ borderColor: '#1a2640' }} />
                      <button onClick={() => { logout(); setUserMenu(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all">
                        <LogOut size={13} /> გასვლა
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={{ background: '#0f1826', color: '#94a3b8', border: '1px solid #1a2640' }}
            >
              <LogIn size={14} /> შესვლა
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden ml-auto text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t px-4 pb-4" style={{ background: '#080e1a', borderColor: '#1a2640' }}>
          {navLinks.map(link => (
            <Link key={link.path} to={link.path} onClick={() => setOpen(false)}
              className={`block py-3 text-sm border-b transition-colors ${pathname === link.path ? 'text-green-400' : 'text-slate-300 hover:text-white'}`}
              style={{ borderColor: '#1a2640' }}>
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2">
            {user ? (
              <button onClick={() => { navigate('/dashboard'); setOpen(false) }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>
                ჩემი პანელი
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center" style={{ background: '#22c55e', color: '#080e1a' }}>
                შესვლა
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
