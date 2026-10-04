import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import Tabs from '../../components/ui/Tabs'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { ADMIN_OVERVIEW_KEY } from '../../components/admin/DashOverview'
import { langLabel } from '../../components/guides/tourUtils'
import { useRegions } from '../../lib/queries'
import { supabase, errorText } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import type { GuideProfile } from '../../lib/types'

type Status = GuideProfile['status']

export default function AdminGuides() {
  usePageTitle('გიდები — ადმინი')
  const qc = useQueryClient()
  const toast = useToast()
  const regions = useRegions()
  const [tab, setTab] = useState<Status>('pending')
  const [reject, setReject] = useState<GuideProfile | null>(null)
  const [note, setNote] = useState('')
  const list = useQuery({
    queryKey: ['admin-guides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guide_profiles').select('*, profile:profiles!guide_profiles_user_id_fkey(id,username,display_name,avatar_url,role)').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as GuideProfile[]
    },
  })
  const rows = (list.data ?? []).filter((g) => g.status === tab)
  const count = (s: Status) => (list.data ?? []).filter((g) => g.status === s).length
  const regionName = (id: string) => regions.data?.find((r) => r.id === id)?.name ?? id

  const setStatus = async (g: GuideProfile, status: Status, admin_note: string | null = null) => {
    const { error } = await supabase.from('guide_profiles').update({ status, admin_note }).eq('user_id', g.user_id)
    if (error) return toast(errorText(error), 'error')
    qc.invalidateQueries({ queryKey: ['admin-guides'] })
    qc.invalidateQueries({ queryKey: ['guides'] })
    qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
    toast(status === 'approved' ? 'დადასტურდა — მომხმარებელს გიდის როლი მიენიჭა.' : 'სტატუსი შეიცვალა.')
  }

  return (
    <div>
      <h1 className="text-[26px]">გიდების განაცხადები</h1>
      <Tabs className="mt-4" tabs={[{ id: 'pending', label: 'განსახილველი', count: count('pending') }, { id: 'approved', label: 'დადასტურებული', count: count('approved') }, { id: 'rejected', label: 'უარყოფილი', count: count('rejected') }]} value={tab} onChange={setTab} />
      <div className="mt-5 grid gap-4">
        {rows.length === 0 && <p className="py-8 text-center text-ink-3">აქ ცარიელია.</p>}
        {rows.map((g) => (
          <article key={g.user_id} className="card p-5">
            <div className="flex flex-wrap items-start gap-4">
              {g.profile && <Avatar url={g.profile.avatar_url} name={g.profile.display_name} size={48} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{g.kind === 'company' && g.company_name ? `${g.company_name} · ` : ''}{g.profile?.display_name} {g.profile && <Link to={`/u/${g.profile.username}`} className="text-[13px] font-normal text-forest hover:underline">@{g.profile.username}</Link>}</p>
                <p className="text-[12.5px] text-ink-3">{g.kind === 'company' ? 'კომპანია' : 'კერძო გიდი'} · განაცხადი: {formatDate(g.created_at)}{g.experience_years ? ` · ${g.experience_years} წლის გამოცდილება` : ''}</p>
              </div>
              <div className="flex gap-2">
                {g.status !== 'approved' && <button onClick={() => setStatus(g, 'approved')} className="btn-primary btn-sm"><Check size={15} /> დადასტურება</button>}
                {g.status !== 'rejected' && <button onClick={() => { setReject(g); setNote('') }} className="btn-danger btn-sm"><X size={15} /> {g.status === 'approved' ? 'გაუქმება' : 'უარყოფა'}</button>}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{g.about}</p>
            <div className="mt-3 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
              <p><b className="text-ink">რეგიონები:</b> {g.regions.map(regionName).join(', ') || '—'}</p>
              <p><b className="text-ink">ენები:</b> {g.languages.map(langLabel).join(', ') || '—'}</p>
              {g.certifications && <p><b className="text-ink">სერტიფიკატები:</b> {g.certifications}</p>}
              <p><b className="text-ink">კონტაქტი:</b> {[g.phone, g.email, g.website, g.facebook, g.instagram].filter(Boolean).join(' · ') || '—'}</p>
            </div>
            {g.admin_note && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px]"><b>შენიშვნა:</b> {g.admin_note}</p>}
          </article>
        ))}
      </div>
      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title={reject?.status === 'approved' ? 'გიდის სტატუსის გაუქმება' : 'განაცხადის უარყოფა'}
        size="sm"
        footer={<><button className="btn-ghost" onClick={() => setReject(null)}>გაუქმება</button><button className="btn-danger" disabled={note.trim().length < 3} onClick={async () => { if (reject) await setStatus(reject, 'rejected', note.trim()); setReject(null) }}>დადასტურება</button></>}
      >
        <p className="text-[14px] text-ink-2">დაწერე მიზეზი — მომხმარებელი ნახავს და შეძლებს გასწორებას.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input mt-3" autoFocus />
      </Modal>
    </div>
  )
}
