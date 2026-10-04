import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck, CheckCircle2, Download, PenLine, Share2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../lib/auth'
import { supabase, errorText } from '../../lib/supabase'
import { downloadText, toGpx } from '../../lib/geo'
import { formatDate } from '../../lib/format'
import type { Route, RouteStop } from '../../lib/types'

/** Save, "I walked it", share, GPX and "write a story" buttons for a route. */
export default function RouteActions({ route, stops }: { route: Route; stops: RouteStop[] }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [doneOpen, setDoneOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const login = `/login?next=${encodeURIComponent(`/routes/${route.slug}`)}`

  const saved = useQuery({
    queryKey: ['saved-one', user?.id, route.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.from('saved_routes').select('route_id').eq('user_id', user!.id).eq('route_id', route.id).maybeSingle()).data,
  })
  const done = useQuery({
    queryKey: ['done-one', user?.id, route.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from('route_completions').select('completed_on').eq('user_id', user!.id).eq('route_id', route.id).maybeSingle()).data as { completed_on: string | null } | null,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['saved-one', user?.id, route.id] })
    qc.invalidateQueries({ queryKey: ['done-one', user?.id, route.id] })
    qc.invalidateQueries({ queryKey: ['saved'] })
    qc.invalidateQueries({ queryKey: ['completions'] })
    qc.invalidateQueries({ queryKey: ['route-stats'] })
    qc.invalidateQueries({ queryKey: ['route-monthly', route.id] })
    qc.invalidateQueries({ queryKey: ['profile-stats'] })
  }

  const toggleSave = async () => {
    if (!user) return navigate(login)
    const { error } = saved.data
      ? await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', route.id)
      : await supabase.from('saved_routes').insert({ route_id: route.id })
    if (error) return toast(errorText(error), 'error')
    toast(saved.data ? 'შენახულიდან ამოიშალა.' : 'შენახულია — იპოვი გვერდზე „შენახული და გავლილი“.')
    refresh()
  }

  const markDone = async () => {
    if (!user) return
    const { error } = await supabase.from('route_completions').upsert({ user_id: user.id, route_id: route.id, completed_on: date || null }, { onConflict: 'user_id,route_id' })
    if (error) return toast(errorText(error), 'error')
    setDoneOpen(false)
    toast('მონიშნულია, როგორც გავლილი.')
    refresh()
  }
  const unmarkDone = async () => {
    if (!user) return
    const { error } = await supabase.from('route_completions').delete().eq('user_id', user.id).eq('route_id', route.id)
    if (error) return toast(errorText(error), 'error')
    setDoneOpen(false)
    refresh()
  }

  const share = async () => {
    const url = `${window.location.origin}/routes/${route.slug}`
    try {
      if (navigator.share) { await navigator.share({ title: route.name, text: route.summary, url }); return }
      await navigator.clipboard.writeText(url)
      toast('ბმული დაკოპირდა.')
    } catch { /* cancelled */ }
  }

  const gpx = () => {
    const line = route.geometry ?? []
    downloadText(`${route.slug}.gpx`, toGpx(route.name, line, stops.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }))))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={toggleSave} className={saved.data ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} aria-pressed={!!saved.data}>
        {saved.data ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved.data ? 'შენახულია' : 'შენახვა'}
      </button>
      <button onClick={() => (user ? setDoneOpen(true) : navigate(login))} className={done.data ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
        <CheckCircle2 size={16} /> {done.data ? 'გავლილი მაქვს' : 'გავიარე'}
      </button>
      <Link to={user ? `/blog/new?route=${route.id}` : `/login?next=${encodeURIComponent(`/blog/new?route=${route.id}`)}`} className="btn-secondary btn-sm">
        <PenLine size={16} /> დაწერე ისტორია
      </Link>
      <button onClick={gpx} className="btn-ghost btn-sm" title={route.geometry ? 'ბილიკი და გაჩერებები GPX ფაილად (ნავიგაციის აპებისთვის)' : 'გაჩერებები GPX ფაილად'}>
        <Download size={16} /> GPX
      </button>
      <button onClick={share} className="btn-ghost btn-sm"><Share2 size={16} /> გაზიარება</button>

      <Modal
        open={doneOpen}
        onClose={() => setDoneOpen(false)}
        title="გაიარე ეს მარშრუტი?"
        size="sm"
        footer={
          <>
            {done.data && <button className="btn-danger mr-auto" onClick={unmarkDone}>მონიშვნის მოხსნა</button>}
            <button className="btn-ghost" onClick={() => setDoneOpen(false)}>გაუქმება</button>
            <button className="btn-primary" onClick={markDone}>შენახვა</button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">
          {done.data ? `გავლილად გაქვს მონიშნული${done.data.completed_on ? ` (${formatDate(done.data.completed_on)})` : ''}. თარიღის შეცვლა შეგიძლია.` : 'მონიშნე, როდის გაიარე — შენს პროფილზე გამოჩნდება და მარშრუტის სტატისტიკას დაემატება.'}
        </p>
        <label className="label mt-4" htmlFor="done-date">თარიღი</label>
        <input id="done-date" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="input" />
      </Modal>
    </div>
  )
}
