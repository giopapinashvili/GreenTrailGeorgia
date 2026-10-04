import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Lightbulb, ThumbsUp, Trash2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import ReportButton from '../common/ReportButton'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../lib/auth'
import { useRouteTips } from '../../lib/queries'
import { supabase, errorText } from '../../lib/supabase'
import { timeAgo } from '../../lib/format'
import type { RouteTip } from '../../lib/types'

export const TIP_CATEGORY: Record<RouteTip['category'], string> = {
  general: 'ზოგადი',
  gear: 'აღჭურვილობა',
  safety: 'უსაფრთხოება',
  transport: 'ტრანსპორტი',
  water: 'წყალი',
  stay: 'ღამის გათევა',
  season: 'სეზონი',
}

/** Key tips (editorial) + tips from people who walked the route, with votes. */
export default function RouteTips({ routeId, editorial }: { routeId: number; editorial: string[] }) {
  const { user, profile } = useAuth()
  const tips = useRouteTips(routeId)
  const qc = useQueryClient()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [cat, setCat] = useState<RouteTip['category']>('general')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const sorted = useMemo(
    () => [...(tips.data ?? [])].filter((t) => !t.is_hidden).sort((a, b) => (b.votes?.length ?? 0) - (a.votes?.length ?? 0) || b.created_at.localeCompare(a.created_at)),
    [tips.data],
  )
  const refresh = () => { qc.invalidateQueries({ queryKey: ['route-tips', routeId] }); qc.invalidateQueries({ queryKey: ['route-stats'] }) }

  const vote = async (t: RouteTip) => {
    if (!user) return
    const mine = t.votes?.some((v) => v.user_id === user.id)
    const { error } = mine
      ? await supabase.from('route_tip_votes').delete().eq('tip_id', t.id).eq('user_id', user.id)
      : await supabase.from('route_tip_votes').insert({ tip_id: t.id })
    if (error) toast(errorText(error), 'error')
    refresh()
  }

  const remove = async (t: RouteTip) => {
    const { error } = await supabase.from('route_tips').delete().eq('id', t.id)
    if (error) return toast(errorText(error), 'error')
    refresh()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (text.length < 5) return toast('რჩევა ძალიან მოკლეა.', 'error')
    setBusy(true)
    const { error } = await supabase.from('route_tips').insert({ route_id: routeId, category: cat, body: text })
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    setBody('')
    setOpen(false)
    toast('მადლობა — რჩევა დაემატა.')
    refresh()
  }

  return (
    <div className="grid gap-6">
      {editorial.length > 0 && (
        <ul className="grid gap-2.5">
          {editorial.map((t, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-3.5">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-moderate" />
              <p className="text-[14.5px] leading-relaxed text-ink">{t}</p>
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[18px]">მოლაშქრეების რჩევები {sorted.length > 0 && <span className="text-ink-3">({sorted.length})</span>}</h3>
          {user ? (
            !open && <button onClick={() => setOpen(true)} className="btn-secondary btn-sm">რჩევის დამატება</button>
          ) : (
            <Link to={`/login?next=${encodeURIComponent(location.pathname + '#tips')}`} className="link text-[14px]">შედი, რომ რჩევა დაამატო</Link>
          )}
        </div>

        {open && user && (
          <form onSubmit={submit} className="card mb-4 grid gap-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TIP_CATEGORY) as RouteTip['category'][]).map((c) => (
                <button type="button" key={c} onClick={() => setCat(c)} className={`chip !py-1 text-[12.5px] ${cat === c ? 'chip-on' : ''}`}>{TIP_CATEGORY[c]}</button>
              ))}
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} className="input" placeholder="მაგ: ხიდი ჩამორეცხილია, მდინარეზე დილით გადადი. ან: ბოლო მარშრუტკა 17:00-ზე გადის." autoFocus />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-ink-3">{body.length}/1000 · დაწერე ის, რაც შენ თვითონ ნახე</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">გაუქმება</button>
                <button className="btn-primary btn-sm" disabled={busy}>დამატება</button>
              </div>
            </div>
          </form>
        )}

        {tips.isLoading ? null : sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-2 px-4 py-5 text-center text-[14px] text-ink-3">
            ჯერ არავის დაუმატებია რჩევა. გაიარე ეს მარშრუტი? შენი გამოცდილება სხვებს დაეხმარება.
          </p>
        ) : (
          <ul className="grid gap-3">
            {sorted.map((t) => {
              const votes = t.votes?.length ?? 0
              const mine = !!user && t.votes?.some((v) => v.user_id === user.id)
              const own = t.author_id === profile?.id
              return (
                <li key={t.id} className="flex gap-3 rounded-xl border border-line bg-surface p-3.5">
                  <button
                    onClick={() => vote(t)}
                    disabled={!user || own}
                    className={`flex h-fit shrink-0 flex-col items-center rounded-lg border px-2 py-1 text-[12px] font-bold ${mine ? 'border-forest bg-forest/10 text-forest' : 'border-line-2 text-ink-3 enabled:hover:border-ink-3'}`}
                    aria-label={mine ? 'ხმის მოხსნა' : 'სასარგებლოა'}
                    title={!user ? 'ხმის მისაცემად შედი' : own ? 'საკუთარ რჩევას ხმას ვერ მისცემ' : 'სასარგებლოა'}
                  >
                    <ThumbsUp size={14} />{votes}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-ink-2">{TIP_CATEGORY[t.category]}</span>
                      {t.author && (
                        <Link to={`/u/${t.author.username}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-forest">
                          <Avatar url={t.author.avatar_url} name={t.author.display_name} size={18} />{t.author.display_name}
                        </Link>
                      )}
                      <span className="text-ink-3">{timeAgo(t.created_at)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{t.body}</p>
                    <div className="mt-1.5 flex gap-3">
                      {own && <button onClick={() => remove(t)} className="inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-hard"><Trash2 size={13} /> წაშლა</button>}
                      {!own && <ReportButton type="tip" id={t.id} />}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
