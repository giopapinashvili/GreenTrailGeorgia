import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BadgeCheck, Bot, Flag, LayoutDashboard, Newspaper, Route as RouteIcon, Shield, Users, Wrench, type LucideIcon } from 'lucide-react'
import RequireAuth from '../../components/common/RequireAuth'
import { useAdminOverview, type AdminOverview } from '../../components/admin/DashOverview'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: keyof Pick<AdminOverview, 'guides_pending' | 'reports_open'>
  badgeTitle?: string
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'მიმოხილვა', icon: LayoutDashboard, end: true },
  { to: '/admin/routes', label: 'მარშრუტები', icon: RouteIcon },
  { to: '/admin/articles', label: 'სტატიები', icon: Newspaper },
  { to: '/admin/guides', label: 'გიდები', icon: BadgeCheck, badge: 'guides_pending', badgeTitle: 'განხილვას ელოდება' },
  { to: '/admin/reports', label: 'შეტყობინებები', icon: Flag, badge: 'reports_open', badgeTitle: 'ღია შეტყობინება' },
  { to: '/admin/users', label: 'მომხმარებლები', icon: Users },
  { to: '/admin/settings', label: 'AI პარამეტრები', icon: Bot },
  { to: '/admin/tools', label: 'ხელსაწყოები', icon: Wrench },
]

export default function AdminLayout() {
  return (
    <RequireAuth admin>
      <AdminShell />
    </RequireAuth>
  )
}

function AdminShell() {
  const overview = useAdminOverview()
  const { pathname } = useLocation()
  const strip = useRef<HTMLDivElement>(null)

  // keep the active tab visible in the scrollable mobile strip
  useEffect(() => {
    const box = strip.current
    const active = box?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!box || !active) return
    box.scrollTo({ left: active.offsetLeft - box.clientWidth / 2 + active.clientWidth / 2 })
  }, [pathname])

  const badge = (item: NavItem) => (item.badge ? overview.data?.[item.badge] ?? 0 : 0)

  return (
    <div className="page pb-16">
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        {/* desktop: sticky sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 pt-8" aria-label="ადმინ პანელის მენიუ">
            <p className="kicker mb-3 flex items-center gap-2 px-3"><Shield size={13} /> ადმინ პანელი</p>
            <ul className="space-y-0.5">
              {NAV.map((item) => {
                const count = badge(item)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors ${isActive ? 'bg-forest/10 text-forest' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
                    >
                      <item.icon size={17} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && <CountBadge n={count} title={item.badgeTitle} />}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* phones & tablets: horizontally scrollable tabs */}
        <div ref={strip} className="scrollbar-none -mx-4 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6 lg:hidden">
          <nav className="flex gap-1 pt-3" aria-label="ადმინ პანელის მენიუ">
            {NAV.map((item) => {
              const count = badge(item)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-forest' : 'text-ink-3 hover:text-ink-2'}`}
                >
                  <item.icon size={15} className="shrink-0" />
                  {item.label}
                  {count > 0 && <CountBadge n={count} title={item.badgeTitle} />}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="min-w-0 pt-5 lg:pt-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function CountBadge({ n, title }: { n: number; title?: string }) {
  return (
    <span className="grid min-w-[20px] place-items-center rounded-full bg-blaze px-1.5 text-[11px] font-bold leading-[20px] text-white" title={title ? `${n} ${title}` : undefined}>
      {n > 99 ? '99+' : n}
    </span>
  )
}
