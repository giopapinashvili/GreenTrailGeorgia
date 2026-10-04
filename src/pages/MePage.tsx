import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bookmark, Footprints, PenLine, X } from 'lucide-react'
import RequireAuth from '../components/common/RequireAuth'
import RouteCard from '../components/route/RouteCard'
import Tabs from '../components/ui/Tabs'
import Empty from '../components/ui/Empty'
import Confirm from '../components/ui/Confirm'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../lib/auth'
import { useCompletions, useProfileStats, useRegions, useSaved } from '../lib/queries'
import { supabase, errorText } from '../lib/supabase'
import { formatDate, num } from '../lib/format'
import { usePageTitle } from '../lib/title'

export default function MePage() {
  return <RequireAuth><Me /></RequireAuth>
}

function Me() {
  usePageTitle('შენახული და გავლილი')
  const { user, profile } = useAuth()
  const uid = user!.id
  const saved = useSaved(uid)
  const done = useCompletions(uid)
  const stats = useProfileStats(uid)
  const regions = useRegions()
  const qc = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<'saved' | 'done'>('saved')
  const [unmark, setUnmark] = useState<number | null>(null)
  const regionName = (id: string) => regions.data?.find((g) => g.id === id)?.name

  const unsave = async (rid: number) => {
    const { error } = await supabase.from('saved_routes').delete().eq('user_id', uid).eq('route_id', rid)
    if (error) return toast(errorText(error), 'error')
    qc.invalidateQueries({ queryKey: ['saved'] })
    qc.invalidateQueries({ queryKey: ['saved-one'] })
    qc.invalidateQueries({ queryKey: ['route-stats'] })
  }
  const removeDone = async () => {
    if (unmark === null) return
    const { error } = await supabase.from('route_completions').delete().eq('user_id', uid).eq('route_id', unmark)
    if (error) { toast(errorText(error), 'error'); return }
    for (const k of ['completions', 'done-one', 'route-stats', 'profile-stats', 'route-monthly']) qc.invalidateQueries({ queryKey: [k] })
  }

  const s = stats.data
  const savedList = (saved.data ?? []).filter((x) => x.route)
  const doneList = (done.data ?? []).filter((x) => x.route)

  return (
    <div className="page pb-16 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker mb-2 flex items-center gap-2"><span className="blaze" />{profile?.display_name}</p>
          <h1 className="text-[30px]">შენახული და გავლილი</h1>
          <p className="mt-1 text-[14.5px] text-ink-2">
            {s ? <>გავლილი გაქვს <b className="text-ink">{num(s.completed)}</b> მარშრუტი, ჯამში <b className="text-ink">{num(Math.round(Number(s.km)))} კმ</b>.</> : ' '}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/blog/new" className="btn-primary"><PenLine size={16} /> დაწერე ისტორია</Link>
          <Link to="/routes" className="btn-secondary">მარშრუტები</Link>
        </div>
      </div>

      <Tabs
        className="mt-6"
        tabs={[{ id: 'saved', label: 'შენახული', count: savedList.length }, { id: 'done', label: 'გავლილი', count: doneList.length }]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === 'saved' && (
          saved.isLoading ? <Skeletons /> : savedList.length === 0 ? (
            <Empty icon={<Bookmark size={20} />} title="შენახული მარშრუტი ჯერ არ გაქვს" text="მარშრუტის გვერდზე დააჭირე „შენახვა“ — აქ გამოჩნდება, რომ მოგვიანებით ადვილად იპოვო." action={<Link to="/routes" className="btn-primary">მარშრუტების ნახვა</Link>} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {savedList.map((x) => (
                <div key={x.route_id} className="relative">
                  <RouteCard route={x.route} regionName={regionName(x.route.region_id)} />
                  <button onClick={() => unsave(x.route_id)} className="absolute right-2.5 top-2.5 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75" aria-label="შენახულიდან ამოშლა" title="ამოშლა"><X size={15} /></button>
                </div>
              ))}
            </div>
          )
        )}
        {tab === 'done' && (
          done.isLoading ? <Skeletons /> : doneList.length === 0 ? (
            <Empty icon={<Footprints size={20} />} title="გავლილი მარშრუტი ჯერ არ გაქვს" text="მარშრუტის გვერდზე დააჭირე „გავიარე“, ან დაწერე ისტორია და მიუთითე თარიღი — მარშრუტი აქ დაემატება." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doneList.map((x) => (
                <div key={x.route_id} className="flex flex-col gap-1.5">
                  <div className="relative">
                    <RouteCard route={x.route} regionName={regionName(x.route.region_id)} compact />
                    <button onClick={() => setUnmark(x.route_id)} className="absolute right-2.5 top-2.5 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75" aria-label="მონიშვნის მოხსნა" title="მონიშვნის მოხსნა"><X size={15} /></button>
                  </div>
                  {x.completed_on && <p className="px-1 text-[12.5px] text-ink-3">გაიარე {formatDate(x.completed_on)}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <Confirm open={unmark !== null} onClose={() => setUnmark(null)} title="მოვხსნა მონიშვნა?" text="მარშრუტი გავლილების სიიდან ამოიშლება. შენი ისტორიები არ წაიშლება." confirmLabel="მოხსნა" danger onConfirm={removeDone} />
    </div>
  )
}

function Skeletons() {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
}
