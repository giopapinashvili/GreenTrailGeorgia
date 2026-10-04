import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import Confirm from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/auth'
import { useProfileStats } from '../../lib/queries'
import { supabase, errorText } from '../../lib/supabase'
import { formatDate, num } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import type { Profile, Role } from '../../lib/types'

const PAGE = 30
const ROLE_LABEL: Record<Role, string> = { user: 'მომხმარებელი', guide: 'გიდი', admin: 'ადმინი' }

export default function AdminUsers() {
  usePageTitle('მომხმარებლები — ადმინი')
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(0)
  const list = useQuery({
    queryKey: ['admin-users', term, page],
    queryFn: async () => {
      let req = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
      const s = term.trim().replace(/[%,()*\\]/g, ' ').trim()
      if (s) req = req.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`)
      const { data, error, count } = await req
      if (error) throw error
      return { rows: (data ?? []) as Profile[], count: count ?? 0 }
    },
  })
  const total = list.data?.count ?? 0

  return (
    <div>
      <h1 className="text-[26px]">მომხმარებლები</h1>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); setPage(0) }} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="სახელი ან @username" />
        </div>
        <button className="btn-secondary">ძებნა</button>
      </form>
      <p className="mt-3 text-[13px] text-ink-3">სულ: {num(total)}</p>
      <div className="card mt-3 divide-y divide-line">
        {(list.data?.rows ?? []).map((p) => <UserRow key={p.id} p={p} />)}
        {list.data?.rows.length === 0 && <p className="px-4 py-8 text-center text-ink-3">ვერავინ მოიძებნა.</p>}
      </div>
      {total > PAGE && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((x) => x - 1)}>წინა</button>
          <span className="text-[13px] text-ink-3">{page + 1} / {Math.ceil(total / PAGE)}</span>
          <button className="btn-ghost btn-sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((x) => x + 1)}>შემდეგი</button>
        </div>
      )}
    </div>
  )
}

function UserRow({ p }: { p: Profile }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null)
  const self = user?.id === p.id
  const stats = useProfileStats(open ? p.id : undefined)

  const update = async (patch: Partial<Pick<Profile, 'role' | 'is_banned'>>) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id)
    if (error) { toast(errorText(error), 'error'); return }
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
    toast('შენახულია.')
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar url={p.avatar_url} name={p.display_name} size={36} />
        <div className="min-w-0 flex-1">
          <Link to={`/u/${p.username}`} className="font-semibold hover:text-forest">{p.display_name}</Link>
          <p className="text-[12.5px] text-ink-3">@{p.username} · {formatDate(p.created_at)}{p.is_banned && <span className="ml-1.5 font-semibold text-hard">· დაბლოკილი</span>}</p>
        </div>
        <select
          value={p.role}
          disabled={self}
          onChange={(e) => {
            const role = e.target.value as Role
            setConfirm({ title: `როლის შეცვლა: ${ROLE_LABEL[role]}?`, text: role === 'admin' ? 'ადმინისტრატორს ყველაფრის შეცვლა და წაშლა შეუძლია.' : `${p.display_name} მიიღებს როლს „${ROLE_LABEL[role]}“.`, run: () => update({ role }) })
          }}
          className="input !w-auto !py-1.5 text-[13px]"
          aria-label="როლი"
        >
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button
          disabled={self}
          onClick={() => setConfirm(p.is_banned
            ? { title: 'შეზღუდვის მოხსნა?', text: `${p.display_name} ისევ შეძლებს წერას.`, run: () => update({ is_banned: false }) }
            : { title: 'ანგარიშის შეზღუდვა?', text: `${p.display_name} ვეღარ დაწერს პოსტებს, კომენტარებს და შეტყობინებებს.`, run: () => update({ is_banned: true }) })}
          className={`btn-sm ${p.is_banned ? 'btn-secondary' : 'btn-danger'}`}
        >
          {p.is_banned ? 'განბლოკვა' : 'დაბლოკვა'}
        </button>
        <button onClick={() => setOpen((v) => !v)} className="rounded p-1.5 text-ink-3 hover:bg-surface-2" aria-label="დეტალები">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-[13px] text-ink-2">
          {stats.data ? (
            <>
              <span>პოსტი: <b>{num(stats.data.posts)}</b></span>
              <span>ფოტო: <b>{num(stats.data.photos)}</b></span>
              <span>გავლილი: <b>{num(stats.data.completed)}</b></span>
              <span>მოწონება: <b>{num(stats.data.likes)}</b></span>
              <span>რჩევა: <b>{num(stats.data.tips)}</b></span>
            </>
          ) : '…'}
        </div>
      )}
      <Confirm open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ''} text={confirm?.text} danger onConfirm={async () => { await confirm?.run() }} />
    </div>
  )
}
