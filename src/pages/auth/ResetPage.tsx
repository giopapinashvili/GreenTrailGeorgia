import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LoaderCircle } from 'lucide-react'
import AuthShell, { AuthField, AuthNotice, PasswordInput } from '../../components/account/AuthShell'
import { authErrorText, PASSWORD_MAX, PASSWORD_MIN, urlAuthError } from '../../components/account/authUtils'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { usePageTitle } from '../../lib/title'

type Phase = 'checking' | 'ready' | 'expired'

export default function ResetPage() {
  usePageTitle('ახალი პაროლი')
  const navigate = useNavigate()
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>(urlAuthError() ? 'expired' : 'checking')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({})
  const [busy, setBusy] = useState(false)

  // The email link signs the person in (PKCE code in the URL); wait for that session.
  useEffect(() => {
    if (urlAuthError()) return
    let alive = true
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) setPhase('ready')
    })
    supabase.auth.getSession().then(({ data }) => { if (alive && data.session) setPhase('ready') })
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => { if (alive) setPhase((p) => (p === 'checking' ? (data.session ? 'ready' : 'expired') : p)) })
    }, 4000)
    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe() }
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (password.length < PASSWORD_MIN) errs.password = `მინიმუმ ${PASSWORD_MIN} სიმბოლო.`
    else if (password.length > PASSWORD_MAX) errs.password = `მაქსიმუმ ${PASSWORD_MAX} სიმბოლო.`
    if (repeat !== password) errs.repeat = 'პაროლები არ ემთხვევა.'
    setErrors(errs)
    if (errs.password || errs.repeat) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { toast(authErrorText(error), 'error'); return }
    toast('პაროლი შეიცვალა.')
    navigate('/', { replace: true })
  }

  if (phase === 'checking') return <PageSpinner />

  if (phase === 'expired') {
    return (
      <AuthShell title="ბმული აღარ მოქმედებს" footer={<Link to="/login" className="link">შესვლაზე დაბრუნება</Link>}>
        <p className="text-[14.5px] leading-relaxed text-ink-2">პაროლის აღდგენის ბმულს ან ვადა გაუვიდა, ან უკვე გამოყენებულია. მოითხოვე ახალი — წერილი რამდენიმე წუთში მოვა.</p>
        <Link to="/forgot" className="btn-primary mt-5 w-full">ახალი ბმულის მოთხოვნა</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="ახალი პაროლი" text="აირჩიე ახალი პაროლი. შემდეგ ამ პაროლით შეხვალ ყველა მოწყობილობიდან.">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="reset-password" label="ახალი პაროლი" error={errors.password} hint={`მინიმუმ ${PASSWORD_MIN} სიმბოლო`}>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby="reset-password-msg"
          />
        </AuthField>
        <AuthField id="reset-repeat" label="გაიმეორე პაროლი" error={errors.repeat}>
          <PasswordInput
            id="reset-repeat"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-invalid={!!errors.repeat}
            aria-describedby={errors.repeat ? 'reset-repeat-msg' : undefined}
          />
        </AuthField>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
          პაროლის შენახვა
        </button>
        <AuthNotice>პაროლის შეცვლის შემდეგ სხვა მოწყობილობებზე შეიძლება თავიდან შესვლა მოგიწიოს.</AuthNotice>
      </form>
    </AuthShell>
  )
}
