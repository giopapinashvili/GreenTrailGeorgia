import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LoaderCircle, MailCheck } from 'lucide-react'
import AuthShell, { AuthField, AuthNotice } from '../../components/account/AuthShell'
import { authErrorText, isEmail } from '../../components/account/authUtils'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { usePageTitle } from '../../lib/title'

export default function ForgotPage() {
  usePageTitle('პაროლის აღდგენა')
  const toast = useToast()
  const loc = useLocation()
  const [email, setEmail] = useState(((loc.state as { email?: string } | null)?.email ?? '').trim())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const em = email.trim()
    if (!isEmail(em)) { setError('შეიყვანე სწორი ელ-ფოსტა.'); return }
    setError(null)
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    // the same answer whether the address exists or not
    if (err && !/user not found|not registered/i.test(err.message)) { toast(authErrorText(err), 'error'); return }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell title="შეამოწმე ფოსტა" footer={<Link to="/login" className="link">შესვლაზე დაბრუნება</Link>}>
        <div className="flex gap-3">
          <MailCheck size={22} className="mt-0.5 shrink-0 text-forest" />
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            თუ <b className="text-ink">{email.trim()}</b> ჩვენთან დარეგისტრირებულია, რამდენიმე წუთში მიიღებ წერილს პაროლის შესაცვლელი ბმულით. წერილი თუ არ ჩანს, „სპამის“ საქაღალდეც ნახე.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="დაგავიწყდა პაროლი?"
      text="ჩაწერე ელ-ფოსტა, რომლითაც დარეგისტრირდი — გამოგიგზავნით ბმულს ახალი პაროლის დასაყენებლად."
      footer={<>გაგახსენდა? <Link to="/login" className="link">შესვლა</Link></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="forgot-email" label="ელ-ფოსტა" error={error}>
          <input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="input"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null) }}
            aria-invalid={!!error}
            aria-describedby={error ? 'forgot-email-msg' : undefined}
            placeholder="name@example.com"
          />
        </AuthField>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <LoaderCircle size={17} className="animate-spin" />}
          ბმულის გაგზავნა
        </button>
        <AuthNotice>ბმული ერთჯერადია და მალე უვადდება — გამოიყენე წერილის მიღებისთანავე.</AuthNotice>
      </form>
    </AuthShell>
  )
}
