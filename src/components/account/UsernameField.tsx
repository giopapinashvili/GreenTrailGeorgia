import { CircleCheck, LoaderCircle } from 'lucide-react'
import { AuthField } from './AuthShell'
import { cleanUsername, USERNAME_MAX, USERNAME_TAKEN, type Availability } from './username'

/** "@username" input with the live availability hint, shared by sign-up and the one-time profile step. */
export default function UsernameField({ id, value, avail, error, onChange }: {
  id: string
  value: string
  avail: Availability
  error?: string
  onChange: (v: string) => void
}) {
  const hint =
    avail === 'checking' ? <span className="inline-flex items-center gap-1.5"><LoaderCircle size={12} className="animate-spin" /> მოწმდება…</span>
      : avail === 'free' ? <span className="inline-flex items-center gap-1.5 font-semibold text-easy"><CircleCheck size={13} /> თავისუფალია — პროფილი იქნება /u/{value}</span>
        : `ლათინური ასოები, ციფრები და _ (3–${USERNAME_MAX} სიმბოლო).`
  const err = error ?? (avail === 'taken' ? USERNAME_TAKEN : undefined)
  return (
    <AuthField id={id} label="მომხმარებლის სახელი" hint={hint} error={err}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-3">@</span>
        <input
          id={id}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="input pl-7"
          maxLength={USERNAME_MAX}
          value={value}
          onChange={(e) => onChange(cleanUsername(e.target.value))}
          aria-invalid={!!err}
          aria-describedby={`${id}-msg`}
          placeholder="nino_beridze"
        />
      </div>
    </AuthField>
  )
}
