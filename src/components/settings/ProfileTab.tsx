import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Field from '../ui/Field'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../lib/auth'
import { errorText, supabase } from '../../lib/supabase'
import { removeFiles, uploadPhoto } from '../../lib/storage'
import { useQueryClient, useRegions } from '../../lib/queries'
import { len, photoError, storagePath } from '../guides/tourUtils'
import { Counter } from '../guides/FormBits'

const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const BIO_MAX = 500

interface FormState {
  display_name: string
  username: string
  bio: string
  home_region: string
}
type Errors = Partial<Record<keyof FormState, string>>

export default function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const regions = useRegions()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(() => ({
    display_name: profile?.display_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    home_region: profile?.home_region ?? '',
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  if (!user || !profile) return null

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const dirty =
    form.display_name !== profile.display_name ||
    form.username !== profile.username ||
    form.bio !== (profile.bio ?? '') ||
    form.home_region !== (profile.home_region ?? '')

  const refreshEverywhere = () => {
    qc.invalidateQueries({ queryKey: ['profile'] })
    qc.invalidateQueries({ queryKey: ['posts'] })
    qc.invalidateQueries({ queryKey: ['tours'] })
    qc.invalidateQueries({ queryKey: ['guides'] })
  }

  /** Only files inside the user's own folder are ours to delete. */
  const ownAvatarPath = (url: string | null) => {
    const p = storagePath(url, 'avatars')
    return p && p.startsWith(`${user.id}/`) ? p : null
  }

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('აირჩიე სურათის ფაილი (JPG, PNG ან WebP).', 'error')
    setAvatarBusy(true)
    const oldPath = ownAvatarPath(profile.avatar_url)
    let uploaded: string | null = null
    let stage: 'upload' | 'save' = 'upload'
    try {
      const up = await uploadPhoto('avatars', user.id, file, 512)
      uploaded = up.path
      stage = 'save'
      const { error } = await supabase.from('profiles').update({ avatar_url: up.url }).eq('id', user.id)
      if (error) throw error
      uploaded = null
      if (oldPath && oldPath !== up.path) removeFiles('avatars', [oldPath])
      await refreshProfile()
      refreshEverywhere()
      toast('ფოტო განახლდა.')
    } catch (err) {
      if (uploaded) removeFiles('avatars', [uploaded])
      toast(stage === 'upload' ? photoError(err) : errorText(err), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = async () => {
    setAvatarBusy(true)
    const oldPath = ownAvatarPath(profile.avatar_url)
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
      if (error) throw error
      if (oldPath) removeFiles('avatars', [oldPath])
      await refreshProfile()
      refreshEverywhere()
      toast('ფოტო წაიშალა.')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const v = {
      display_name: form.display_name.trim().replace(/\s+/g, ' '),
      username: form.username.trim().toLowerCase(),
      bio: form.bio.trim(),
      home_region: form.home_region || null,
    }
    const errs: Errors = {}
    if (len(v.display_name) < 2 || len(v.display_name) > 60) errs.display_name = 'სახელი უნდა იყოს 2–60 სიმბოლო.'
    if (!USERNAME_RE.test(v.username)) errs.username = 'გამოიყენე 3–24 სიმბოლო: ლათინური პატარა ასოები, ციფრები ან _.'
    if (len(v.bio) > BIO_MAX) errs.bio = `მაქსიმუმ ${BIO_MAX} სიმბოლო.`
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      if (v.username !== profile.username) {
        const { data, error } = await supabase.from('profiles').select('id').eq('username', v.username).neq('id', user.id).limit(1)
        if (error) throw error
        if (data && data.length > 0) {
          setErrors({ username: 'ეს მომხმარებლის სახელი დაკავებულია.' })
          return
        }
      }
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: v.display_name, username: v.username, bio: v.bio || null, home_region: v.home_region })
        .eq('id', user.id)
      if (error) throw error
      setForm({ display_name: v.display_name, username: v.username, bio: v.bio, home_region: v.home_region ?? '' })
      await refreshProfile()
      refreshEverywhere()
      toast('პროფილი შენახულია.')
    } catch (err) {
      const msg = errorText(err)
      if (msg.includes('მომხმარებლის სახელი')) setErrors({ username: msg })
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6" aria-labelledby="avatar-title">
        <h2 id="avatar-title" className="text-[20px]">პროფილის ფოტო</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar url={profile.avatar_url} name={profile.display_name} size={84} />
            {avatarBusy && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-surface/70">
                <LoaderCircle size={22} className="animate-spin text-forest" aria-label="იტვირთება" />
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
                <ImagePlus size={15} aria-hidden /> {profile.avatar_url ? 'ფოტოს შეცვლა' : 'ფოტოს ატვირთვა'}
              </button>
              {profile.avatar_url && (
                <button type="button" className="btn-ghost btn-sm" onClick={removeAvatar} disabled={avatarBusy}>
                  <Trash2 size={15} aria-hidden /> წაშლა
                </button>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-ink-3">კვადრატული ფოტო საუკეთესოა. ატვირთვამდე ბრაუზერში შემცირდება და მდებარეობის მონაცემები წაიშლება.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={onPickAvatar} />
          </div>
        </div>
      </section>

      <form onSubmit={save} noValidate className="card space-y-5 p-5 sm:p-6" aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-[20px]">ძირითადი ინფორმაცია</h2>

        <Field label="სახელი" hint="ასე გამოჩნდება შენს პოსტებთან, კომენტარებთან და მიმოწერაში." error={errors.display_name}>
          <input
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            className={`input ${errors.display_name ? 'border-hard' : ''}`}
            maxLength={80}
            autoComplete="name"
            aria-label="სახელი"
            aria-invalid={!!errors.display_name}
          />
        </Field>

        <Field
          label="მომხმარებლის სახელი"
          hint={<>ლათინური პატარა ასოები, ციფრები და _ (3–24). შენი პროფილის მისამართი: <span className="font-semibold text-ink-2">/u/{form.username.trim().toLowerCase() || '…'}</span></>}
          error={errors.username}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>@</span>
            <input
              value={form.username}
              onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
              className={`input pl-7 ${errors.username ? 'border-hard' : ''}`}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              aria-label="მომხმარებლის სახელი"
              aria-invalid={!!errors.username}
            />
          </div>
        </Field>

        <Field
          label={<span className="flex items-baseline justify-between gap-3"><span>შენ შესახებ</span><Counter value={form.bio} max={BIO_MAX} /></span>}
          hint="მოკლედ: რა გიყვარს მთაში, სად დადიხარ ხოლმე."
          error={errors.bio}
        >
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={4}
            className={`input resize-y ${errors.bio ? 'border-hard' : ''}`}
            aria-label="შენ შესახებ"
            aria-invalid={!!errors.bio}
          />
        </Field>

        <Field label="მთავარი რეგიონი" hint="სად დადიხარ ყველაზე ხშირად. ჩანს შენს პროფილზე.">
          <select value={form.home_region} onChange={(e) => set('home_region', e.target.value)} className="input" aria-label="მთავარი რეგიონი">
            <option value="">არ არის მითითებული</option>
            {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link to={`/u/${profile.username}`} className="link inline-flex items-center gap-1 text-[14px]">
            საჯარო პროფილის ნახვა <ArrowRight size={15} aria-hidden />
          </Link>
          <button type="submit" className="btn-primary" disabled={saving || !dirty}>
            {saving && <LoaderCircle size={16} className="animate-spin" aria-hidden />} შენახვა
          </button>
        </div>
      </form>
    </div>
  )
}
