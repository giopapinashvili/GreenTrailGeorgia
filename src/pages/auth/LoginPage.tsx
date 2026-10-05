import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle, LogIn } from 'lucide-react'
import AuthShell, { AuthField, AuthNotice, OrDivider, PasswordInput } from '../../components/account/AuthShell'
import GoogleButton, { useGoogleEnabled } from '../../components/account/GoogleButton'
import { authErrorText, isEmail, PASSWORD_MAX, safeNext, urlAuthError, withNext } from '../../components/account/authUtils'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePageTitle } from '../../lib/title'

type Errors = { email?: string; password?: string }

/** Text for the error Supabase leaves in the address after a failed Google sign-in or an old email link. */
function linkErrorText(code: string): string {
  if (/access_denied|cancel/i.test(code)) return 'Google-ით შესვლა შეწყდა. სცადე თავიდან.'
  if (/expired|otp/i.test(code)) return 'ბმული აღარ მოქმედებს — ან ვადა გაუვიდა, ან უკვე გამოყენებულია. შედი ელ-ფოსტით და პაროლით.'
  return 'შესვლა ვერ მოხერხდა. სცადე თავიდან.'
}

export default function LoginPage() {
  usePageTitle('შესვლა')
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const toast = useToast()
  const google = useGoogleEnabled()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [notActive, setNotActive] = useState(false)
  const [linkError] = useState(urlAuthError)

  // also covers the return from Google: the session is ready by the time loading ends
  if (loading) return <PageSpinner />
  if (user) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const em = email.trim()
    const errs: Errors = {}
    if (!isEmail(em)) errs.email = 'შეიყვანე სწორი ელ-ფოსტა.'
    if (!password) errs.password = 'შეიყვანე პაროლი.'
    setErrors(errs)
    if (errs.email || errs.password) {
      document.getElementById(errs.email ? 'login-email' : 'login-password')?.focus()
      return
    }
    setBusy(true)
    setNotActive(false)
    const { error } = await supabase.auth.signInWithPassword({ email: em, password })
    setBusy(false)
    if (error) {
      // an account from the old sign-up that waited for an email link
      if (/email not confirmed/i.test(error.message)) { setNotActive(true); return }
      toast(authErrorText(error), 'error')
      return
    }
    navigate(next, { replace: true })
  }

  return (
    <AuthShell
      title="შესვლა"
      text="შედი ანგარიშზე, რომ დაწერო პოსტი, შეინახო მარშრუტები და მისწერო სხვა მოლაშქრეებს."
      footer={<>ანგარიში არ გაქვს? <Link to={withNext('/register', next)} className="link">დარეგისტრირდი</Link></>}
    >
      {linkError && (
        <div className="mb-5">
          <AuthNotice tone="warn">{linkErrorText(linkError)}</AuthNotice>
        </div>
      )}

      {google && (
        <div className="mb-5 grid gap-5">
          <GoogleButton next={next} label="Google-ით შესვლა" />
          <OrDivider>ან ელ-ფოსტით</OrDivider>
        </div>
      )}

      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="login-email" label="ელ-ფოსტა" error={errors.email}>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="input"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })) }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-msg' : undefined}
            placeholder="name@example.com"
          />
        </AuthField>
        <AuthField
          id="login-password"
          label="პაროლი"
          error={errors.password}
          aside={<Link to="/forgot" state={{ email: email.trim() }} className="text-[13px] font-semibold text-forest hover:underline">დაგავიწყდა პაროლი?</Link>}
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })) }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-msg' : undefined}
          />
        </AuthField>

        {notActive && (
          <AuthNotice tone="warn">
            <p>ეს ანგარიში ჯერ არ გააქტიურებულა. <Link to={withNext('/register', next)} className="link">დარეგისტრირდი თავიდან</Link> იმავე ელ-ფოსტით — ანგარიში მაშინვე ჩაირთვება, წერილის გარეშე.</p>
          </AuthNotice>
        )}

        <button type="submit" className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
          შესვლა
        </button>
      </form>
    </AuthShell>
  )
}
