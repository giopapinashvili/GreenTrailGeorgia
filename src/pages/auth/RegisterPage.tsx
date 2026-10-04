import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, CircleCheck, Lightbulb, LoaderCircle, MailCheck, MessageCircle, PenLine, UserPlus } from 'lucide-react'
import AuthShell, { AuthField, PasswordInput } from '../../components/account/AuthShell'
import { authErrorText, isEmail, PASSWORD_MAX, PASSWORD_MIN, safeNext, signupRedirect, withNext } from '../../components/account/authUtils'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usernameFrom } from '../../lib/slug'
import { usePageTitle } from '../../lib/title'

// The database allows 3–24 characters, but the sign-up trigger (handle_new_user) keeps only the first 20
// to leave room for a number suffix — so the form stops at 20 and the chosen name is kept exactly.
const USERNAME_MAX = 20
const USERNAME_RE = new RegExp(`^[a-z0-9_]{3,${USERNAME_MAX}}$`)
const RESERVED = new Set(['admin', 'administrator', 'moderator', 'greentrail', 'support', 'system', 'root', 'help', 'info'])
const GEORGIAN = /[ა-ჿ]/

type Field = 'name' | 'username' | 'email' | 'password' | 'agree'
type Errors = Partial<Record<Field, string>>
type Availability = 'idle' | 'checking' | 'free' | 'taken' | 'error'

/** Suggest a username from the display name ("გიორგი ბერიძე" → "giorgi_beridze"). */
function suggestUsername(name: string): string {
  if (!/[a-z0-9ა-ჿ]/i.test(name)) return ''
  return usernameFrom(name).replace(/^_+|_+$/g, '')
}

/** Keeps what the user types inside the allowed alphabet: Georgian letters are transliterated, spaces become "_". */
function cleanUsername(v: string): string {
  return Array.from(v.toLowerCase())
    .map((ch) => (/[a-z0-9_]/.test(ch) ? ch : /[\s\-.]/.test(ch) ? '_' : GEORGIAN.test(ch) ? usernameFrom(ch) : ''))
    .join('')
    .slice(0, USERNAME_MAX)
}

async function usernameTaken(u: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').eq('username', u).maybeSingle()
  if (error) throw error
  return !!data
}

const PERKS = [
  { icon: PenLine, text: 'პოსტები ფოტოებით' },
  { icon: Bookmark, text: 'შენახული მარშრუტები' },
  { icon: MessageCircle, text: 'მიმოწერა მოლაშქრეებთან' },
  { icon: Lightbulb, text: 'რჩევები მარშრუტებზე' },
]

export default function RegisterPage() {
  usePageTitle('რეგისტრაცია')
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [avail, setAvail] = useState<Availability>('idle')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const signedUp = useRef(false)

  // live availability check (debounced)
  useEffect(() => {
    if (!USERNAME_RE.test(username) || RESERVED.has(username)) { setAvail('idle'); return }
    setAvail('checking')
    let alive = true
    const t = window.setTimeout(() => {
      usernameTaken(username).then(
        (taken) => { if (alive) setAvail(taken ? 'taken' : 'free') },
        () => { if (alive) setAvail('error') },
      )
    }, 450)
    return () => { alive = false; window.clearTimeout(t) }
  }, [username])

  // resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  if (loading) return <PageSpinner />
  if (user && !signedUp.current) return <Navigate to={next} replace />

  const clearError = (f: Field) => { if (errors[f]) setErrors((x) => ({ ...x, [f]: undefined })) }

  const onName = (v: string) => {
    setName(v)
    clearError('name')
    if (!usernameEdited) { setUsername(suggestUsername(v)); clearError('username') }
  }

  const usernameProblem = (u: string): string | undefined => {
    if (!u) return 'აირჩიე მომხმარებლის სახელი.'
    if (u.length < 3) return 'მინიმუმ 3 სიმბოლო.'
    if (!USERNAME_RE.test(u)) return `3–${USERNAME_MAX} სიმბოლო: ლათინური ასოები, ციფრები და _.`
    if (RESERVED.has(u)) return 'ეს სახელი დაკავებულია. აირჩიე სხვა.'
    return undefined
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
    else if (avail === 'taken') errs.username = 'ეს სახელი დაკავებულია. აირჩიე სხვა.'
    if (!isEmail(em)) errs.email = 'შეიყვანე სწორი ელ-ფოსტა.'
    if (password.length < PASSWORD_MIN) errs.password = `პაროლი მინიმუმ ${PASSWORD_MIN} სიმბოლო უნდა იყოს.`
    if (!agree) errs.agree = 'რეგისტრაციისთვის საჭიროა წესებზე თანხმობა.'
    if (Object.values(errs).some(Boolean)) return fail(errs)

    setBusy(true)
    try {
      // final availability check right before creating the account
      if (await usernameTaken(username)) {
        setAvail('taken')
        setBusy(false)
        return fail({ username: 'ეს სახელი დაკავებულია. აირჩიე სხვა.' })
      }
    } catch {
      /* the database still guarantees uniqueness (it adds a number if needed) */
    }

    signedUp.current = true
    const { data, error } = await supabase.auth.signUp({
      email: em,
      password,
      options: { data: { username, display_name: dn }, emailRedirectTo: signupRedirect() },
    })
    setBusy(false)
    if (error) {
      signedUp.current = false
      toast(authErrorText(error), 'error')
      return
    }
    if (data.session) {
      toast('ანგარიში შეიქმნა. კეთილი იყოს შენი მობრძანება.')
      navigate(next, { replace: true })
      return
    }
    setSentTo(em)
    setCooldown(60)
  }

  function fail(errs: Errors) {
    setErrors(errs)
    const order: [Field, string][] = [['name', 'reg-name'], ['username', 'reg-username'], ['email', 'reg-email'], ['password', 'reg-password'], ['agree', 'reg-agree']]
    const first = order.find(([f]) => errs[f])
    if (first) document.getElementById(first[1])?.focus()
  }

  const resend = async () => {
    if (!sentTo || cooldown > 0) return
    const { error } = await supabase.auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: signupRedirect() } })
    if (error) { toast(authErrorText(error), 'error'); return }
    toast('წერილი ხელახლა გაიგზავნა.')
    setCooldown(60)
  }

  // ─── "check your email" ───
  if (sentTo) {
    return (
      <AuthShell title="შეამოწმე ფოსტა">
        <div className="mx-auto -mt-2 mb-4 grid h-12 w-12 place-items-center rounded-full bg-forest/10 text-forest">
          <MailCheck size={24} />
        </div>
        <p className="text-[15px] text-ink-2">
          დადასტურების ბმული გავგზავნეთ მისამართზე <b className="break-all text-ink">{sentTo}</b>. გახსენი წერილი, დააჭირე ბმულს და შემდეგ შედი ანგარიშზე.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-3">
          წერილი არ ჩანს? შეამოწმე „სპამი“ და „აქციები“. თუ ამ მისამართით ანგარიში უკვე გაქვს, უბრალოდ შედი ან აღადგინე პაროლი.
        </p>
        <div className="mt-6 grid gap-2">
          <Link to={withNext('/login', next)} className="btn-primary w-full">შესვლა</Link>
          <button type="button" onClick={resend} disabled={cooldown > 0} className="btn-secondary w-full">
            {cooldown > 0 ? `ხელახლა გაგზავნა — ${cooldown} წმ` : 'წერილის ხელახლა გაგზავნა'}
          </button>
        </div>
      </AuthShell>
    )
  }

  const usernameHint =
    avail === 'checking' ? <span className="inline-flex items-center gap-1.5"><LoaderCircle size={12} className="animate-spin" /> მოწმდება…</span>
      : avail === 'free' ? <span className="inline-flex items-center gap-1.5 font-semibold text-easy"><CircleCheck size={13} /> თავისუფალია — პროფილი იქნება /u/{username}</span>
        : `ლათინური ასოები, ციფრები და _ (3–${USERNAME_MAX} სიმბოლო).`
  const usernameError = errors.username ?? (avail === 'taken' ? 'ეს სახელი დაკავებულია. აირჩიე სხვა.' : undefined)

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

        <AuthField id="reg-username" label="მომხმარებლის სახელი" hint={usernameHint} error={usernameError}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-3">@</span>
            <input
              id="reg-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="input pl-7"
              maxLength={USERNAME_MAX}
              value={username}
              onChange={(e) => {
                const v = cleanUsername(e.target.value)
                setUsername(v)
                setUsernameEdited(v !== '') // clearing the field brings the suggestion back
                clearError('username')
              }}
              aria-invalid={!!usernameError}
              aria-describedby="reg-username-msg"
              placeholder="nino_beridze"
            />
          </div>
        </AuthField>

        <AuthField id="reg-email" label="ელ-ფოსტა" hint="შესასვლელად და პაროლის აღსადგენად. საჯაროდ არ ჩანს." error={errors.email}>
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

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[14px] text-ink-2">
            <input
              id="reg-agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => { setAgree(e.target.checked); clearError('agree') }}
              className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--forest))]"
              aria-invalid={!!errors.agree}
              aria-describedby={errors.agree ? 'reg-agree-msg' : undefined}
            />
            <span>
              ვეთანხმები საიტის <Link to="/about#rules" target="_blank" rel="noopener" className="link">წესებს</Link> — ვწერ პატივისცემით და ვაქვეყნებ მხოლოდ საკუთარ ფოტოებს.
            </span>
          </label>
          {errors.agree && <p id="reg-agree-msg" className="mt-1 text-[13px] text-hard">{errors.agree}</p>}
        </div>

        <button type="submit" className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <UserPlus size={17} />}
          ანგარიშის შექმნა
        </button>
      </form>
    </AuthShell>
  )
}
