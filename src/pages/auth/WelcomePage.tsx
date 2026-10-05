import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, LoaderCircle } from 'lucide-react'
import AuthShell, { AgreeRules, AuthField } from '../../components/account/AuthShell'
import UsernameField from '../../components/account/UsernameField'
import { safeNext, withNext } from '../../components/account/authUtils'
import { cleanUsername, suggestUsername, USERNAME_TAKEN, usernameProblem, useUsernameAvailability } from '../../components/account/username'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { errorText, supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePageTitle } from '../../lib/title'

type Field = 'name' | 'username' | 'agree'
type Errors = Partial<Record<Field, string>>

/**
 * One-time step after the first Google sign-in: the person picks the name shown on the site and a username.
 * Accounts made with the sign-up form never see it (they typed both there).
 */
export default function WelcomePage() {
  usePageTitle('ერთი ნაბიჯი დარჩა')
  const { user, profile, loading, refreshProfile, signOut } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const prefilled = useRef(false)
  const finished = useRef(false)
  const avail = useUsernameAvailability(username, user?.id)

  // start from what Google told us
  useEffect(() => {
    if (prefilled.current || !profile || !user) return
    prefilled.current = true
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
    const fromGoogle = (meta.full_name || meta.name || '').trim()
    const n = (profile.display_name && profile.display_name !== profile.username ? profile.display_name : fromGoogle).slice(0, 60)
    setName(n)
    setUsername(suggestUsername(n) || cleanUsername((user.email ?? '').split('@')[0]))
  }, [profile, user])

  if (loading || (user && !profile)) return <PageSpinner />
  if (!user) return <Navigate to={withNext('/login', next)} replace />
  if (profile?.onboarded && !finished.current) return <Navigate to={next} replace />

  const clearError = (f: Field) => { if (errors[f]) setErrors((x) => ({ ...x, [f]: undefined })) }

  function fail(errs: Errors) {
    setErrors(errs)
    const order: [Field, string][] = [['name', 'welcome-name'], ['username', 'welcome-username'], ['agree', 'welcome-agree']]
    const first = order.find(([f]) => errs[f])
    if (first) document.getElementById(first[1])?.focus()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const dn = name.trim().replace(/\s+/g, ' ')
    const errs: Errors = {}
    if (dn.length < 2) errs.name = 'სახელი მინიმუმ 2 სიმბოლო უნდა იყოს.'
    else if (dn.length > 60) errs.name = 'სახელი მაქსიმუმ 60 სიმბოლო უნდა იყოს.'
    const uErr = usernameProblem(username)
    if (uErr) errs.username = uErr
    else if (avail === 'taken') errs.username = USERNAME_TAKEN
    if (!agree) errs.agree = 'გასაგრძელებლად საჭიროა წესებზე თანხმობა.'
    if (Object.values(errs).some(Boolean)) return fail(errs)

    setBusy(true)
    const { data, error } = await supabase.rpc('complete_profile', { p_username: username, p_display_name: dn })
    if (error) { setBusy(false); toast(errorText(error), 'error'); return }
    const result = String(data)
    if (result !== 'ok') {
      setBusy(false)
      if (result === 'taken' || result === 'reserved') return fail({ username: USERNAME_TAKEN })
      if (result === 'bad_username') return fail({ username: usernameProblem(username) ?? USERNAME_TAKEN })
      if (result === 'bad_name') return fail({ name: 'სახელი 2–60 სიმბოლო უნდა იყოს.' })
      toast('შენახვა ვერ მოხერხდა. სცადე თავიდან.', 'error')
      return
    }
    finished.current = true
    await refreshProfile()
    setBusy(false)
    toast('მზადაა — კეთილი იყოს შენი მობრძანება!')
    navigate(next, { replace: true })
  }

  const leave = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <AuthShell
      title="ერთი ნაბიჯი დარჩა"
      text="აირჩიე, როგორ გამოჩნდე საიტზე. ამას მხოლოდ ერთხელ გთხოვთ — შემდეგ შესვლისას აღარ დაგჭირდება."
      footer={<>სხვა ანგარიშით გინდა შესვლა? <button type="button" onClick={leave} className="link">გასვლა</button></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="welcome-name" label="სახელი" hint="ასე გამოჩნდები პოსტებსა და კომენტარებში." error={errors.name}>
          <input
            id="welcome-name"
            autoComplete="name"
            className="input"
            maxLength={60}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearError('name')
              if (!usernameEdited) { setUsername(suggestUsername(e.target.value)); clearError('username') }
            }}
            aria-invalid={!!errors.name}
            aria-describedby="welcome-name-msg"
            placeholder="მაგ: ნინო ბერიძე"
          />
        </AuthField>

        <UsernameField
          id="welcome-username"
          value={username}
          avail={avail}
          error={errors.username}
          onChange={(v) => {
            setUsername(v)
            setUsernameEdited(v !== '')
            clearError('username')
          }}
        />

        <AgreeRules id="welcome-agree" checked={agree} error={errors.agree} onChange={(v) => { setAgree(v); clearError('agree') }} />

        <button type="submit" className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
          დასრულება
        </button>
      </form>
    </AuthShell>
  )
}
