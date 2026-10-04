import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CircleCheck, Flag, ImageOff, RefreshCw, RouteOff } from 'lucide-react'
import Empty from '../../components/ui/Empty'
import { Skeleton } from '../../components/ui/Skeleton'
import DashActivityChart from '../../components/admin/DashActivityChart'
import { useAdminOverview, type AdminOverview } from '../../components/admin/DashOverview'
import { errorText } from '../../lib/supabase'
import { num } from '../../lib/format'
import { usePageTitle } from '../../lib/title'

export default function AdminDashboard() {
  usePageTitle('ადმინ პანელი')
  const q = useAdminOverview()

  if (q.isLoading) return <DashboardSkeleton />
  if (q.error || !q.data) {
    return (
      <Empty
        title="მონაცემები ვერ ჩაიტვირთა"
        text={q.error ? errorText(q.error) : 'სცადე თავიდან.'}
        action={<button className="btn-secondary" onClick={() => q.refetch()}>თავიდან ცდა</button>}
      />
    )
  }

  const d = q.data
  return (
    <div className={`pb-6 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker mb-1.5 flex items-center gap-2"><span className="blaze" />ადმინ პანელი</p>
          <h1 className="text-[28px] leading-tight sm:text-[32px]">მიმოხილვა</h1>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={15} className={q.isFetching ? 'animate-spin' : ''} /> განახლება
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="მომხმარებლები" value={d.users} sub={<Delta n={d.users_7d} />} />
        <StatTile
          label="გამოქვეყნებული მარშრუტები"
          value={d.routes}
          sub={d.drafts > 0 ? <Link to="/admin/routes?status=draft" className="link">{num(d.drafts)} დრაფტი</Link> : 'დრაფტი არ არის'}
        />
        <StatTile label="პოსტები" value={d.posts} sub={<Delta n={d.posts_7d} />} />
        <StatTile label="ფოტოები" value={d.photos} sub="პოსტებში" />
        <StatTile label="აქტიური ტურები" value={d.tours} sub="გიდებისგან" />
        <StatTile label="პირადი მესიჯები" value={d.messages} sub="სულ გაგზავნილი" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5">
          <h2 className="text-[18px]">აქტივობა — ბოლო 30 დღე</h2>
          <p className="mb-4 text-[13px] text-ink-3">ახალი პოსტები და ახალი მომხმარებლები დღეების მიხედვით</p>
          <DashActivityChart data={d.activity} />
        </section>
        <TodoCard d={d} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TopList
          title="ყველაზე აქტიური მარშრუტები"
          text="ყველაზე მეტი პოსტი ბოლო 30 დღეში"
          rows={d.top_routes.map((r) => ({ id: r.id, name: r.name, slug: r.slug, value: r.posts }))}
          unit="პოსტი"
          empty="ბოლო 30 დღეში პოსტი არ დაწერილა."
        />
        <TopList
          title="ყველაზე ნანახი მარშრუტები"
          text="მარშრუტის გვერდის ნახვები, სულ"
          rows={d.top_viewed.map((r) => ({ id: r.id, name: r.name, slug: r.slug, value: r.views }))}
          unit="ნახვა"
          empty="ნახვები ჯერ არ დაფიქსირებულა."
        />
      </div>
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-tight text-ink">{num(value)}</p>
      {sub && <div className="mt-1 text-[12.5px] text-ink-3">{sub}</div>}
    </div>
  )
}

function Delta({ n }: { n: number }) {
  return (
    <span>
      <b className="font-semibold text-ink-2">{n > 0 ? `+${num(n)}` : '0'}</b> ბოლო 7 დღეში
    </span>
  )
}

function TodoCard({ d }: { d: AdminOverview }) {
  const items = [
    { to: '/admin/tools', label: 'მარშრუტები ხაზის გარეშე', hint: 'ააგე ხაზი ან ატვირთე GPX', n: d.routes_missing_line, icon: RouteOff },
    { to: '/admin/tools', label: 'მარშრუტები ფოტოს გარეშე', hint: 'დაამატე ყდის ფოტო', n: d.routes_missing_cover, icon: ImageOff },
    { to: '/admin/guides', label: 'გიდის განაცხადები', hint: 'განხილვას ელოდება', n: d.guides_pending, icon: BadgeCheck },
    { to: '/admin/reports', label: 'ღია შეტყობინებები', hint: 'მომხმარებლების საჩივრები', n: d.reports_open, icon: Flag },
  ]
  const open = items.filter((i) => i.n > 0).length
  return (
    <section className="card p-5">
      <h2 className="text-[18px]">გასაკეთებელი</h2>
      <p className="mb-3 text-[13px] text-ink-3">{open ? 'ეს საკითხები შენს ყურადღებას ელოდება' : 'ყველაფერი მოწესრიგებულია'}</p>
      <ul className="-mx-2">
        {items.map((it) => (
          <li key={it.label}>
            <Link to={it.to} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${it.n > 0 ? 'bg-surface-2 text-ink' : 'bg-surface-2 text-ink-3'}`}>
                <it.icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-semibold ${it.n > 0 ? 'text-ink' : 'text-ink-3'}`}>{it.label}</span>
                <span className="block text-[12.5px] text-ink-3">{it.hint}</span>
              </span>
              {it.n > 0 ? (
                <span className="grid min-w-[26px] place-items-center rounded-full bg-blaze px-2 text-[12px] font-bold leading-[24px] text-white">{num(it.n)}</span>
              ) : (
                <CircleCheck size={18} className="shrink-0 text-easy" aria-label="არაფერია" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TopList({ title, text, rows, unit, empty }: {
  title: string
  text: string
  rows: { id: number; name: string; slug: string; value: number }[]
  unit: string
  empty: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className="card p-5">
      <h2 className="text-[18px]">{title}</h2>
      <p className="mb-3 text-[13px] text-ink-3">{text}</p>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-[13.5px] text-ink-3">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-[13px] font-semibold text-ink-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <Link to={`/routes/${r.slug}`} className="truncate text-[14px] font-semibold text-ink hover:text-forest">{r.name}</Link>
                  <span className="shrink-0 text-[13px] text-ink-2"><b className="text-ink">{num(r.value)}</b> {unit}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-forest/70" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="pb-6">
      <Skeleton className="mb-2 h-3 w-28" />
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card space-y-2 p-4">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[330px] rounded-xl" />
        <Skeleton className="h-[330px] rounded-xl" />
      </div>
    </div>
  )
}
