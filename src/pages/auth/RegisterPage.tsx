import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, Lightbulb, LoaderCircle, MessageCircle, PenLine, UserPlus } from 'lucide-react'
import AuthShell, { AgreeRules, AuthField, OrDivider, PasswordInput } from '../../components/account/AuthShell'
import GoogleButton, { useGoogleEnabled } from '../../components/account/GoogleButton'
import UsernameField from '../../components/account/UsernameField'
import { isEmail, isNetworkError, PASSWORD_MAX, PASSWORD_MIN, safeNext, withNext } from '../../components/account/authUtils'
import { suggestUsername, USERNAME_TAKEN, usernameProblem, usernameTaken, useUsernameAvailability } from '../../components/account/username'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePageTitle } from '../../lib/title'

type Field = 'name' | 'username' | 'email' | 'password' | 'agree'
type Errors = Partial<Record<Field, string>>

const PERKS = [
  { icon: PenLine, text: 'პოსტები ფოტოებით' },
  { icon: Bookmark, text: 'შენახული მარშრუტები' },
  { icon: MessageCircle, text: 'მიმოწერა მოლაშქრეებთან' },
  { icon: Lightbulb, text: 'რჩევები მარშრუტებზე' },
]

/** Reason code the `register` Edge Function sent back (or 'network' / 'server'). */
async function failReason(err: unknown): Promise<string> {
  const res = (err as { context?: Response } | null)?.context
  if (res && typeof res.json === 'function') {
    try {
      const body = (await res.json()) as { reason?: string }
      if (body?.reason) return body.reason
    } catch { /* not JSON */ }
  }
  return isNetworkError(err) || isNetworkError(res) ? 'network' : 'server'
}

export default function RegisterPage() {
  usePageTitle('რეგისტრაცია')
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const toast = useToast()
  const google = useGoogleEnabled()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const signingUp = useRef(false)
  const avail = useUsernameAvailability(username)

  if (loading) return <PageSpinner />
  if (user && !signingUp.current) return <Navigate to={next} replace />

  const clearError = (f: Field) => { if (errors[f]) setErrors((x) => ({ ...x, [f]: undefined })) }

  const onName = (v: string) => {
    setName(v)
    clearError('name')
    if (!usernameEdited) { setUsername(suggestUsername(v)); clearError('username') }
  }

  function fail(errs: Errors) {
    setErrors(errs)
    const order: [Field, string][] = [['name', 'reg-name'], ['username', 'reg-username'], ['email', 'reg-email'], ['password', 'reg-password'], ['agree', 'reg-agree']]
    const first = order.find(([f]) => errs[f])
    if (first) document.getElementById(first[1])?.focus()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const dn = name.trim().replace(/\s+/g, ' ')
    const em = email.trim()
    const errs: Errors = {}
    if (dn.length < 2) errs.name = 'სახელი მინიმუმ 2 სიმბოლო უნდა იყოს.'
    else if (dn.length > 60) errs.name = 'სახელი მაქსიმუმ 60 სიმბოლო უნდა იყოს.'
    const uErr = usernameProblem(username)
    if (uErr) errs.username = uErr
    else if (avail === 'taken') errs.username = USERNAME_TAKEN
    if (!isEmail(em)) errs.email = 'შეიყვანე სწორი ელ-ფოსტა.'
    if (password.length < PASSWORD_MIN) errs.password = `პაროლი მინიმუმ ${PASSWORD_MIN} სიმბოლო უნდა იყოს.`
    if (!agree) errs.agree = 'რეგისტრაციისთვის საჭიროა წესებზე თანხმობა.'
    if (Object.values(errs).some(Boolean)) return fail(errs)

    setBusy(true)
    try {
      // final availability check right before creating the account
      if (await usernameTaken(username)) {
        setBusy(false)
        return fail({ username: USERNAME_TAKEN })
      }
    } catch {
      /* the server checks again */
    }

    // the account is created ready to use — no confirmation email
    signingUp.current = true
    const { error } = await supabase.functions.invoke('register', { body: { email: em, password, username, display_name: dn } })
    if (error) {
      signingUp.current = false
      setBusy(false)
      const reason = await failReason(error)
      if (reason === 'username_taken') return fail({ username: USERNAME_TAKEN })
      if (reason === 'username') return fail({ username: usernameProblem(username) ?? USERNAME_TAKEN })
      if (reason === 'email_taken') return fail({ email: 'ამ ელ-ფოსტით ანგარიში უკვე არსებობს — შედი ანგარიშზე.' })
      if (reason === 'email') return fail({ email: 'შეიყვანე სწორი ელ-ფოსტა.' })
      if (reason === 'weak_password') return fail({ password: 'ეს პაროლი ძალიან მარტივია. აირჩიე უფრო რთული — ასოები და ციფრები ერთად.' })
      if (reason === 'password') return fail({ password: `პაროლი ${PASSWORD_MIN}–${PASSWORD_MAX} სიმბოლო უნდა იყოს.` })
      if (reason === 'name') return fail({ name: 'სახელი 2–60 სიმბოლო უნდა იყოს.' })
      if (reason === 'rate') { toast('ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე.', 'error'); return }
      toast(reason === 'network' ? 'კავშირი ვერ დამყარდა. შეამოწმე ინტერნეტი.' : 'ანგარიში ვერ შეიქმნა. სცადე თავიდან.', 'error')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: em, password })
    setBusy(false)
    if (signInError) {
      signingUp.current = false
      toast('ანგარიში შეიქმნა — ახლა შედი ელ-ფოსტით და პაროლით.')
      navigate(withNext('/login', next), { replace: true })
      return
    }
    toast('ანგარიში შეიქმნა. კეთილი იყოს შენი მობრძანება.')
    navigate(next, { replace: true })
  }

  return (
    <AuthShell
      title="რეგისტრაცია"
      text="ანგარიში უფასოა და ერთ წუთში იქმნება."
      footer={<>უკვე გაქვს ანგარიში? <Link to={withNext('/login', next)} className="link">შედი</Link></>}
    >
      <div className="mb-6 rounded-lg bg-surface-2 px-3.5 py-3">
        <p className="kicker mb-2">რას მოგცემს ანგარიში</p>
        <ul className="grid grid-cols-1 gap-x-3 gap-y-2 text-[13px] text-ink-2 min-[400px]:grid-cols-2">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2"><Icon size={15} className="shrink-0 text-forest" />{text}</li>
          ))}
        </ul>
      </div>

      {google && (
        <div className="mb-5 grid gap-5">
          <GoogleButton next={next} label="Google-ით რეგისტრაცია" />
          <OrDivider>ან ელ-ფოსტით</OrDivider>
        </div>
      )}

      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="reg-name" label="სახელი" hint="ასე გამოჩნდები პოსტებსა და კომენტარებში." error={errors.name}>
          <input
            id="reg-name"
            autoComplete="name"
            className="input"
            maxLength={60}
            value={name}
            onChange={(e) => onName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby="reg-name-msg"
            placeholder="მაგ: ნინო ბერიძე"
          />
        </AuthField>

        <UsernameField
          id="reg-username"
          value={username}
          avail={avail}
          error={errors.username}
          onChange={(v) => {
            setUsername(v)
            setUsernameEdited(v !== '') // clearing the field brings the suggestion back
            clearError('username')
          }}
        />

        <AuthField id="reg-email" label="ელ-ფოსტა" hint="ამით შეხვალ ანგარიშზე. საჯაროდ არ ჩანს." error={errors.email}>
          <input
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="input"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError('email') }}
            aria-invalid={!!errors.email}
            aria-describedby="reg-email-msg"
            placeholder="name@example.com"
          />
        </AuthField>

        <AuthField id="reg-password" label="პაროლი" hint={`მინიმუმ ${PASSWORD_MIN} სიმბოლო. უმჯობესია ასოები და ციფრები ერთად.`} error={errors.password}>
          <PasswordInput
            id="reg-password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError('password') }}
            aria-invalid={!!errors.password}
            aria-describedby="reg-password-msg"
          />
        </AuthField>

        <AgreeRules id="reg-agree" checked={agree} error={errors.agree} onChange={(v) => { setAgree(v); clearError('agree') }} />

        <button type="submit" className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <UserPlus size={17} />}
          ანგარიშის შექმნა
        </button>
      </form>
    </AuthShell>
  )
}
