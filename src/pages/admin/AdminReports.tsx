import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, EyeOff, X } from 'lucide-react'
import Tabs from '../../components/ui/Tabs'
import Confirm from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { ADMIN_OVERVIEW_KEY } from '../../components/admin/DashOverview'
import { supabase, errorText } from '../../lib/supabase'
import { excerpt, timeAgo } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import type { Report } from '../../lib/types'

type Status = Report['status']
interface Target { label: string; href: string | null; text: string | null; authorId: string | null; hidden: boolean | null }

const TYPE_LABEL: Record<Report['target_type'], string> = { post: 'პოსტი', comment: 'კომენტარი', message: 'შეტყობინება', user: 'მომხმარებელი', tip: 'რჩევა', tour: 'ტური' }
const HIDE_TABLE: Partial<Record<Report['target_type'], string>> = { post: 'posts', comment: 'comments', tip: 'route_tips' }

async function loadTarget(r: Report): Promise<Target> {
  const id = r.target_id
  switch (r.target_type) {
    case 'post': {
      const { data } = await supabase.from('posts').select('id,title,body,author_id,is_hidden').eq('id', Number(id)).maybeSingle()
      return data ? { label: data.title, href: `/blog/${data.id}`, text: excerpt(data.body, 220), authorId: data.author_id, hidden: data.is_hidden } : { label: 'წაშლილია', href: null, text: null, authorId: null, hidden: null }
    }
    case 'comment': {
      const { data } = await supabase.from('comments').select('id,body,post_id,author_id,is_hidden').eq('id', Number(id)).maybeSingle()
      return data ? { label: 'კომენტარი', href: `/blog/${data.post_id}#comments`, text: excerpt(data.body, 220), authorId: data.author_id, hidden: data.is_hidden } : { label: 'წაშლილია', href: null, text: null, authorId: null, hidden: null }
    }
    case 'tip': {
      const { data } = await supabase.from('route_tips').select('id,body,author_id,is_hidden,route:routes(slug,name)').eq('id', Number(id)).maybeSingle()
      const route = (data as unknown as { route: { slug: string; name: string } | null } | null)?.route
      return data ? { label: route ? `რჩევა: ${route.name}` : 'რჩევა', href: route ? `/routes/${route.slug}#tips` : null, text: excerpt(data.body, 220), authorId: data.author_id, hidden: data.is_hidden } : { label: 'წაშლილია', href: null, text: null, authorId: null, hidden: null }
    }
    case 'tour': {
      const { data } = await supabase.from('tours').select('id,title,guide_id,is_active').eq('id', Number(id)).maybeSingle()
      return data ? { label: data.title, href: `/tours/${data.id}`, text: null, authorId: data.guide_id, hidden: !data.is_active } : { label: 'წაშლილია', href: null, text: null, authorId: null, hidden: null }
    }
    case 'user': {
      const { data } = await supabase.from('profiles').select('id,username,display_name,is_banned').eq('id', id).maybeSingle()
      return data ? { label: `${data.display_name} (@${data.username})${data.is_banned ? ' · დაბლოკილია' : ''}`, href: `/u/${data.username}`, text: null, authorId: data.id, hidden: null } : { label: 'ვერ მოიძებნა', href: null, text: null, authorId: null, hidden: null }
    }
    default:
      return { label: `პირადი შეტყობინება #${id}`, href: null, text: 'პირადი მიმოწერის შინაარსი ადმინისტრატორსაც არ უჩანს.', authorId: null, hidden: null }
  }
}

export default function AdminReports() {
  usePageTitle('შეტყობინებები — ადმინი')
  const [tab, setTab] = useState<Status>('open')
  const list = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username,display_name)').order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      return (data ?? []) as unknown as (Report & { reporter: { username: string; display_name: string } | null })[]
    },
  })
  const rows = (list.data ?? []).filter((r) => r.status === tab)
  const count = (s: Status) => (list.data ?? []).filter((r) => r.status === s).length
  return (
    <div>
      <h1 className="text-[26px]">შეტყობინებები</h1>
      <p className="text-[14px] text-ink-3">მომხმარებლების მიერ მონიშნული კონტენტი.</p>
      <Tabs className="mt-4" tabs={[{ id: 'open', label: 'ღია', count: count('open') }, { id: 'resolved', label: 'გადაწყვეტილი', count: count('resolved') }, { id: 'dismissed', label: 'უარყოფილი', count: count('dismissed') }]} value={tab} onChange={setTab} />
      <div className="mt-5 grid gap-3">
        {rows.length === 0 && <p className="py-8 text-center text-ink-3">აქ ცარიელია.</p>}
        {rows.map((r) => <ReportRow key={r.id} r={r} />)}
      </div>
    </div>
  )
}

function ReportRow({ r }: { r: Report & { reporter: { username: string; display_name: string } | null } }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [ban, setBan] = useState(false)
  const target = useQuery({ queryKey: ['report-target', r.target_type, r.target_id], queryFn: () => loadTarget(r) })
  const t = target.data
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-reports'] })
    qc.invalidateQueries({ queryKey: ['report-target', r.target_type, r.target_id] })
    qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
  }
  const setStatus = async (status: Status) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', r.id)
    if (error) return toast(errorText(error), 'error')
    refresh()
  }
  const hide = async (hidden: boolean) => {
    const table = HIDE_TABLE[r.target_type]
    const { error } = r.target_type === 'tour'
      ? await supabase.from('tours').update({ is_active: !hidden }).eq('id', Number(r.target_id))
      : table ? await supabase.from(table).update({ is_hidden: hidden }).eq('id', Number(r.target_id)) : { error: null }
    if (error) return toast(errorText(error), 'error')
    toast(hidden ? 'დამალულია.' : 'გამოჩნდა.')
    for (const k of ['posts', 'post', 'comments', 'route-tips', 'tours']) qc.invalidateQueries({ queryKey: [k] })
    refresh()
  }
  const banAuthor = async () => {
    if (!t?.authorId) return
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', t.authorId)
    if (error) { toast(errorText(error), 'error'); return }
    toast('ანგარიში შეიზღუდა.')
    refresh()
  }
  const canHide = r.target_type in HIDE_TABLE || r.target_type === 'tour'

  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-ink-2">{TYPE_LABEL[r.target_type]}</span>
        <span>{timeAgo(r.created_at)}</span>
        {r.reporter && <span>· გამომგზავნი: <Link to={`/u/${r.reporter.username}`} className="text-forest hover:underline">{r.reporter.display_name}</Link></span>}
      </div>
      <p className="mt-2 text-[14.5px] font-semibold text-ink">„{r.reason}“</p>
      <div className="mt-2 rounded-lg border border-line bg-surface-2 p-3 text-[13.5px]">
        {target.isLoading ? '…' : t ? (
          <>
            {t.href ? <Link to={t.href} target="_blank" className="font-semibold text-forest hover:underline">{t.label}</Link> : <span className="font-semibold">{t.label}</span>}
            {t.hidden && <span className="ml-2 rounded-full bg-moderate/15 px-2 py-0.5 text-[11.5px] font-semibold text-moderate">დამალულია</span>}
            {t.text && <p className="mt-1 text-ink-2">{t.text}</p>}
          </>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canHide && t && t.hidden !== null && (t.hidden
          ? <button onClick={() => hide(false)} className="btn-secondary btn-sm">გამოჩენა</button>
          : <button onClick={() => hide(true)} className="btn-secondary btn-sm"><EyeOff size={14} /> დამალვა</button>)}
        {t?.authorId && <button onClick={() => setBan(true)} className="btn-danger btn-sm"><Ban size={14} /> ავტორის დაბლოკვა</button>}
        {r.status === 'open' ? (
          <>
            <button onClick={() => setStatus('resolved')} className="btn-primary btn-sm ml-auto"><Check size={14} /> გადაწყვეტილია</button>
            <button onClick={() => setStatus('dismissed')} className="btn-ghost btn-sm"><X size={14} /> უარყოფა</button>
          </>
        ) : <button onClick={() => setStatus('open')} className="btn-ghost btn-sm ml-auto">ხელახლა გახსნა</button>}
      </div>
      <Confirm open={ban} onClose={() => setBan(false)} title="ავტორის დაბლოკვა?" text="დაბლოკილი მომხმარებელი ვეღარ დაწერს პოსტებს, კომენტარებს და შეტყობინებებს. შეგიძლია მოგვიანებით „მომხმარებლების“ გვერდზე მოხსნა." confirmLabel="დაბლოკვა" danger onConfirm={banAuthor} />
    </article>
  )
}
