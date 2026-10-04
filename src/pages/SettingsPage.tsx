import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Compass, Eye, EyeOff, LoaderCircle, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import RequireAuth from '../components/common/RequireAuth'
import Tabs from '../components/ui/Tabs'
import Field from '../components/ui/Field'
import Avatar from '../components/ui/Avatar'
import Confirm from '../components/ui/Confirm'
import { useToast } from '../components/ui/Toast'
import DifficultyBadge from '../components/route/DifficultyBadge'
import TourEditor from '../components/guides/TourEditor'
import { LANGUAGES, invalidateTours, nextStartDate, priceLabel } from '../components/guides/tourUtils'
import { Counter } from '../components/guides/FormBits'
import { useAuth } from '../lib/auth'
import { useGuideProfile, useRegions, useTours } from '../lib/queries'
import { supabase, errorText } from '../lib/supabase'
import { removeFiles, uploadPhoto } from '../lib/storage'
import { formatDate } from '../lib/format'
import { usePageTitle } from '../lib/title'
import type { GuideProfile, Tour } from '../lib/types'

type Tab = 'profile' | 'guide' | 'account'
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'პროფილი' },
  { id: 'guide', label: 'გიდის ანგარიში' },
  { id: 'account', label: 'ანგარიში და უსაფრთხოება' },
]

export default function SettingsPage() {
  return <RequireAuth><Settings /></RequireAuth>
}

function Settings() {
  usePageTitle('პარამეტრები')
  const { tab: raw } = useParams()
  const navigate = useNavigate()
  const tab: Tab = raw === 'guide' || raw === 'account' ? raw : 'profile'
  return (
    <div className="page max-w-4xl pb-16 pt-8">
      <p className="kicker mb-2 flex items-center gap-2"><span className="blaze" />პარამეტრები</p>
      <h1 className="text-[30px]">ჩემი ანგარიში</h1>
      <Tabs className="mt-5" tabs={TABS} value={tab} onChange={(t) => navigate(t === 'profile' ? '/settings' : `/settings/${t}`, { replace: true })} />
      <div className="mt-8">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'guide' && <GuideTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </div>
  )
}

function Card({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-[20px]">{title}</h2>
      {text && <p className="mt-1 text-[14px] text-ink-2">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

// ───────────────────────── profile ─────────────────────────
function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth()
  const regions = useRegions()
  const toast = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [home, setHome] = useState(profile?.home_region ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  useEffect(() => {
    setName(profile?.display_name ?? ''); setUsername(profile?.username ?? ''); setBio(profile?.bio ?? ''); setHome(profile?.home_region ?? '')
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !profile) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const n = name.trim()
    const u = username.trim().toLowerCase()
    if (n.length < 2 || n.length > 60) errs.name = 'სახელი 2–60 სიმბოლო.'
    if (!/^[a-z0-9_]{3,24}$/.test(u)) errs.username = '3–24 სიმბოლო: ლათინური ასოები, ციფრები და _.'
    if (bio.length > 500) errs.bio = 'მაქსიმუმ 500 სიმბოლო.'
    if (!errs.username && u !== profile.username) {
      const { data } = await supabase.from('profiles').select('id').eq('username', u).maybeSingle()
      if (data) errs.username = 'ეს სახელი დაკავებულია.'
    }
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ display_name: n, username: u, bio: bio.trim() || null, home_region: home || null }).eq('id', user.id)
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    await refreshProfile()
    qc.invalidateQueries({ queryKey: ['profile'] })
    toast('პროფილი შენახულია.')
  }

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return
    setAvatarBusy(true)
    try {
      const old = profile.avatar_url
      const { url } = await uploadPhoto('avatars', user.id, file, 512)
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (error) throw error
      const oldPath = old?.split('/storage/v1/object/public/avatars/')[1]
      if (oldPath) await removeFiles('avatars', [decodeURIComponent(oldPath)])
      await refreshProfile()
      toast('ფოტო განახლდა.')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }
  const removeAvatar = async () => {
    const old = profile.avatar_url
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    if (error) return toast(errorText(error), 'error')
    const oldPath = old?.split('/storage/v1/object/public/avatars/')[1]
    if (oldPath) await removeFiles('avatars', [decodeURIComponent(oldPath)])
    await refreshProfile()
  }

  return (
    <div className="grid gap-6">
      <Card title="ფოტო" text="ჩანს შენს პროფილზე, პოსტებთან და მიმოწერაში.">
        <div className="flex items-center gap-5">
          <Avatar url={profile.avatar_url} name={profile.display_name} size={88} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm" disabled={avatarBusy}>
              {avatarBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />} ფოტოს შეცვლა
            </button>
            {profile.avatar_url && <button onClick={removeAvatar} className="btn-ghost btn-sm">წაშლა</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { changeAvatar(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </Card>

      <Card title="ინფორმაცია" text={<>საჯარო პროფილი: <Link to={`/u/${profile.username}`} className="link">/u/{profile.username}</Link></>}>
        <form onSubmit={save} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="სახელი" error={errors.name}><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="input" /></Field>
            <Field label="მომხმარებლის სახელი" error={errors.username} hint="ბმულში ჩანს. ლათინური ასოები, ციფრები და _.">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} maxLength={24} className="input pl-7" autoCapitalize="none" spellCheck={false} />
              </div>
            </Field>
          </div>
          <Field label={<span className="flex justify-between">შენ შესახებ <Counter value={bio} max={500} /></span>} error={errors.bio}>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="input" placeholder="მაგ: 10 წელია დავდივარ მთაში, ყველაზე მეტად თუშეთი მიყვარს." />
          </Field>
          <Field label="მშობლიური ან საყვარელი რეგიონი">
            <select value={home} onChange={(e) => setHome(e.target.value)} className="input">
              <option value="">— არ მივუთითებ —</option>
              {(regions.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />} შენახვა</button></div>
        </form>
      </Card>
    </div>
  )
}

// ───────────────────────── guide ─────────────────────────
const GUIDE_STATUS: Record<GuideProfile['status'], { label: string; cls: string; text: string }> = {
  pending: { label: 'განხილვაშია', cls: 'bg-moderate/15 text-moderate', text: 'ადმინისტრატორი განიხილავს განაცხადს. დადასტურების შემდეგ შეძლებ ტურების გამოქვეყნებას.' },
  approved: { label: 'დადასტურებულია', cls: 'bg-easy/15 text-easy', text: 'შენ ხარ დადასტურებული გიდი — ტურები ქვემოთ დაამატე.' },
  rejected: { label: 'უარყოფილია', cls: 'bg-hard/15 text-hard', text: 'განაცხადი უარყოფილია. გაასწორე მონაცემები და ხელახლა გაგზავნე.' },
}

function GuideTab() {
  const { user } = useAuth()
  const guide = useGuideProfile(user?.id)
  if (guide.isLoading) return <div className="grid place-items-center py-10"><LoaderCircle className="animate-spin text-forest" /></div>
  return (
    <div className="grid gap-6">
      {!guide.data && (
        <div className="topo-texture card p-5 sm:p-6">
          <p className="flex items-center gap-2 font-serif text-[20px] font-bold"><Compass size={20} className="text-forest" /> გახდი გიდი GreenTrail-ზე</p>
          <ul className="mt-3 grid gap-1.5 text-[14.5px] text-ink-2">
            <li>• გამოაქვეყნე ტურები თარიღებით, ფასით და სირთულით</li>
            <li>• ტურები მარშრუტების გვერდებზე და დამგეგმავში გამოჩნდება</li>
            <li>• მოლაშქრეები პირდაპირ საიტიდან მოგწერენ</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-ink-3">განაცხადს ადმინისტრატორი განიხილავს. შეავსე ფორმა ქვემოთ.</p>
        </div>
      )}
      <GuideForm current={guide.data ?? null} />
      {guide.data?.status === 'approved' && <MyTours />}
    </div>
  )
}

function GuideForm({ current }: { current: GuideProfile | null }) {
  const { user } = useAuth()
  const regions = useRegions()
  const qc = useQueryClient()
  const toast = useToast()
  const [kind, setKind] = useState<GuideProfile['kind']>(current?.kind ?? 'individual')
  const [company, setCompany] = useState(current?.company_name ?? '')
  const [about, setAbout] = useState(current?.about ?? '')
  const [regs, setRegs] = useState<string[]>(current?.regions ?? [])
  const [langs, setLangs] = useState<string[]>(current?.languages ?? ['ka'])
  const [years, setYears] = useState(current?.experience_years?.toString() ?? '')
  const [certs, setCerts] = useState(current?.certifications ?? '')
  const [phone, setPhone] = useState(current?.phone ?? '')
  const [email, setEmail] = useState(current?.email ?? '')
  const [website, setWebsite] = useState(current?.website ?? '')
  const [facebook, setFacebook] = useState(current?.facebook ?? '')
  const [instagram, setInstagram] = useState(current?.instagram ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (about.trim().length < 20) errs.about = 'მოგვიყევი ცოტა მეტი — მინიმუმ 20 სიმბოლო.'
    if (about.length > 3000) errs.about = 'მაქსიმუმ 3000 სიმბოლო.'
    if (kind === 'company' && !company.trim()) errs.company = 'ჩაწერე კომპანიის სახელი.'
    if (!regs.length) errs.regions = 'მონიშნე მინიმუმ ერთი რეგიონი.'
    if (!langs.length) errs.langs = 'მონიშნე მინიმუმ ერთი ენა.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = 'ელ-ფოსტა არასწორია.'
    const y = years.trim() ? Number(years) : null
    if (y !== null && (!Number.isInteger(y) || y < 0 || y > 70)) errs.years = 'ჩაწერე წლების რაოდენობა.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const row = {
      user_id: user!.id, kind, company_name: kind === 'company' ? company.trim() : null, about: about.trim(), regions: regs, languages: langs,
      experience_years: y, certifications: certs.trim() || null, phone: phone.trim() || null, email: email.trim() || null,
      website: website.trim() || null, facebook: facebook.trim() || null, instagram: instagram.trim() || null,
    }
    const { error } = await supabase.from('guide_profiles').upsert(row, { onConflict: 'user_id' })
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    qc.invalidateQueries({ queryKey: ['guide-profile', user!.id] })
    qc.invalidateQueries({ queryKey: ['guides'] })
    toast(current ? 'შენახულია.' : 'განაცხადი გაიგზავნა — ადმინისტრატორი მალე განიხილავს.')
  }

  return (
    <Card title={current ? 'გიდის პროფილი' : 'განაცხადი'} text={current ? undefined : 'ეს ინფორმაცია დადასტურების შემდეგ შენს გიდის ბარათზე გამოჩნდება.'}>
      {current && (
        <div className="mb-5 rounded-lg border border-line bg-surface-2 p-3.5">
          <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-bold ${GUIDE_STATUS[current.status].cls}`}>{GUIDE_STATUS[current.status].label}</span>
          <p className="mt-2 text-[14px] text-ink-2">{GUIDE_STATUS[current.status].text}</p>
          {current.status === 'rejected' && current.admin_note && <p className="mt-1.5 text-[14px] text-ink"><b>შენიშვნა:</b> {current.admin_note}</p>}
        </div>
      )}
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="flex gap-2">
          {(['individual', 'company'] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>{k === 'individual' ? 'კერძო გიდი' : 'კომპანია'}</button>
          ))}
        </div>
        {kind === 'company' && <Field label="კომპანიის სახელი" error={errors.company}><input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} className="input" /></Field>}
        <Field label={<span className="flex justify-between">შენ შესახებ <Counter value={about} max={3000} /></span>} error={errors.about} hint="გამოცდილება, რა მარშრუტებზე დადიხარ, რა შედის შენს მომსახურებაში.">
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={6} className="input" />
        </Field>
        <Field label="რეგიონები" error={errors.regions}>
          <div className="flex flex-wrap gap-1.5">
            {(regions.data ?? []).map((g) => <button type="button" key={g.id} onClick={() => setRegs((x) => toggle(x, g.id))} className={`chip !py-1 text-[12.5px] ${regs.includes(g.id) ? 'chip-on' : ''}`}>{g.name}</button>)}
          </div>
        </Field>
        <Field label="ენები" error={errors.langs}>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => <button type="button" key={l.code} onClick={() => setLangs((x) => toggle(x, l.code))} className={`chip !py-1 text-[12.5px] ${langs.includes(l.code) ? 'chip-on' : ''}`}>{l.label}</button>)}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="გამოცდილება (წელი)" error={errors.years}><input value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} className="input" /></Field>
          <Field label="სერტიფიკატები" hint="მაგ: მთის გიდის სერტიფიკატი, პირველადი დახმარება"><input value={certs} onChange={(e) => setCerts(e.target.value)} maxLength={300} className="input" /></Field>
          <Field label="ტელეფონი"><input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="input" inputMode="tel" placeholder="+995 …" /></Field>
          <Field label="ელ-ფოსტა" error={errors.email}><input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className="input" inputMode="email" /></Field>
          <Field label="ვებგვერდი"><input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} className="input" placeholder="example.ge" /></Field>
          <Field label="Facebook"><input value={facebook} onChange={(e) => setFacebook(e.target.value)} maxLength={200} className="input" placeholder="facebook.com/…" /></Field>
          <Field label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={200} className="input" placeholder="@…" /></Field>
        </div>
        <p className="text-[12.5px] text-ink-3">საკონტაქტო მონაცემები საჯაროდ ჩანს შენს ბარათზე და ტურების გვერდებზე.</p>
        <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />}{current ? 'შენახვა' : 'განაცხადის გაგზავნა'}</button></div>
      </form>
    </Card>
  )
}

function MyTours() {
  const { user } = useAuth()
  const tours = useTours({ guideId: user?.id, includeInactive: true })
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<Tour | null | 'new'>(null)
  const [del, setDel] = useState<Tour | null>(null)

  const toggleActive = async (t: Tour) => {
    const { error } = await supabase.from('tours').update({ is_active: !t.is_active }).eq('id', t.id)
    if (error) return toast(errorText(error), 'error')
    invalidateTours(qc)
  }
  const remove = async () => {
    if (!del) return
    const { error } = await supabase.from('tours').delete().eq('id', del.id)
    if (error) { toast(errorText(error), 'error'); return }
    invalidateTours(qc)
    toast('ტური წაიშალა.')
  }

  return (
    <Card title="ჩემი ტურები" text="ტური შეიძლება მარშრუტს მიაბა — მაშინ მარშრუტის გვერდზეც გამოჩნდება.">
      <div className="mb-4"><button onClick={() => setEditing('new')} className="btn-primary btn-sm"><Plus size={15} /> ახალი ტური</button></div>
      {(tours.data ?? []).length === 0 ? (
        <p className="text-[14px] text-ink-3">ჯერ ტური არ გაქვს.</p>
      ) : (
        <ul className="grid gap-3">
          {(tours.data ?? []).map((t) => {
            const next = nextStartDate(t.start_dates)
            return (
              <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link to={`/tours/${t.id}`} className="font-semibold hover:text-forest">{t.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                    <DifficultyBadge d={t.difficulty} size="sm" /> {t.days} დღე · {priceLabel(t.price_gel)}{next ? ` · შემდეგი: ${formatDate(next)}` : ''}
                    {!t.is_active && <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-ink-2">დამალული</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => setEditing(t)} className="btn-secondary btn-sm"><Pencil size={14} /> რედაქტირება</button>
                  <button onClick={() => toggleActive(t)} className="btn-ghost btn-sm" title={t.is_active ? 'დამალვა' : 'გამოჩენა'}>{t.is_active ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button onClick={() => setDel(t)} className="btn-ghost btn-sm text-hard" aria-label="წაშლა"><Trash2 size={15} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <TourEditor tour={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      <Confirm open={!!del} onClose={() => setDel(null)} title="ტურის წაშლა?" text={del?.title} confirmLabel="წაშლა" danger onConfirm={remove} />
    </Card>
  )
}

// ───────────────────────── account ─────────────────────────
function AccountTab() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'email' | 'pw' | null>(null)

  const blocked = useQuery({
    queryKey: ['blocks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('blocks').select('blocked_id, created_at').eq('blocker_id', user!.id)
      if (error) throw error
      const ids = (data ?? []).map((b) => b.blocked_id as string)
      if (!ids.length) return []
      const { data: profs } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', ids)
      return (profs ?? []) as { id: string; username: string; display_name: string; avatar_url: string | null }[]
    },
  })

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return toast('ჩაწერე სწორი ელ-ფოსტა.', 'error')
    setBusy('email')
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/settings/account` })
    setBusy(null)
    if (error) return toast(errorText(error), 'error')
    setEmail('')
    toast('დასადასტურებელი ბმული გაიგზავნა ახალ მისამართზე.')
  }
  const changePw = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return toast('პაროლი მინიმუმ 8 სიმბოლო.', 'error')
    if (pw !== pw2) return toast('პაროლები არ ემთხვევა.', 'error')
    setBusy('pw')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(null)
    if (error) return toast(errorText(error), 'error')
    setPw(''); setPw2('')
    toast('პაროლი შეიცვალა.')
  }
  const unblock = async (id: string) => {
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', user!.id).eq('blocked_id', id)
    if (error) return toast(errorText(error), 'error')
    qc.invalidateQueries({ queryKey: ['blocks', user?.id] })
  }

  return (
    <div className="grid gap-6">
      <Card title="ელ-ფოსტა" text={<>ახლანდელი: <b className="text-ink">{user?.email}</b></>}>
        <form onSubmit={changeEmail} className="flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input" placeholder="ახალი ელ-ფოსტა" autoComplete="email" />
          <button className="btn-secondary shrink-0" disabled={busy === 'email'}>{busy === 'email' && <LoaderCircle size={15} className="animate-spin" />} შეცვლა</button>
        </form>
      </Card>

      <Card title="პაროლი">
        <form onSubmit={changePw} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <input value={pw} onChange={(e) => setPw(e.target.value)} type={show ? 'text' : 'password'} className="input pr-10" placeholder="ახალი პაროლი" autoComplete="new-password" maxLength={72} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-3" aria-label={show ? 'დამალვა' : 'ჩვენება'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} type={show ? 'text' : 'password'} className="input" placeholder="გაიმეორე" autoComplete="new-password" maxLength={72} />
          <button className="btn-secondary" disabled={busy === 'pw'}>{busy === 'pw' && <LoaderCircle size={15} className="animate-spin" />} შეცვლა</button>
        </form>
      </Card>

      <Card title="დაბლოკილი მომხმარებლები" text="დაბლოკილი ადამიანი ვეღარ მოგწერს.">
        {(blocked.data ?? []).length === 0 ? (
          <p className="text-[14px] text-ink-3">სია ცარიელია.</p>
        ) : (
          <ul className="grid gap-2">
            {(blocked.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar url={p.avatar_url} name={p.display_name} size={32} />
                <Link to={`/u/${p.username}`} className="min-w-0 flex-1 truncate font-semibold hover:text-forest">{p.display_name}</Link>
                <button onClick={() => unblock(p.id)} className="btn-secondary btn-sm">განბლოკვა</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="გასვლა და ანგარიშის წაშლა" text="ანგარიშის სამუდამოდ წასაშლელად მოგვწერე საიტის ადმინისტრატორს — პოსტები და ფოტოები შეგიძლია თვითონაც წაშალო.">
        <button onClick={async () => { await signOut(); navigate('/') }} className="btn-danger"><LogOut size={16} /> გასვლა</button>
      </Card>
    </div>
  )
}
