import { errorText } from '../../lib/supabase'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const isEmail = (v: string) => EMAIL_RE.test(v.trim())

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72 // Supabase Auth rejects longer passwords

/**
 * Where to go after signing in. Only plain same-site paths are allowed:
 * no "//host", no "/\host", no control characters (browsers strip them and
 * "/\t/evil.com" would become "//evil.com"), and never back to an auth page.
 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback
  if (/^\/(login|register|forgot|reset-password|welcome)(?:[/?#]|$)/.test(raw)) return fallback
  return raw
}

/** Adds `?next=…` to an auth link when there is somewhere to come back to. */
export function withNext(path: string, next: string): string {
  return next && next !== '/' ? `${path}?next=${encodeURIComponent(next)}` : path
}

/**
 * Where Google sends people back to. The login page finishes the sign-in and moves on to `next`
 * (first-timers are sent to /welcome once to pick a name and username).
 */
export const oauthRedirect = (next: string) => `${window.location.origin}${withNext('/login', next)}`

/** Error that Supabase puts into the URL after a failed Google sign-in or an expired email link. */
export function urlAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  for (const key of ['error_code', 'error_description', 'error']) {
    const v = search.get(key) ?? hash.get(key)
    if (v) return v
  }
  return null
}

/** True when the request never reached the server (offline, DNS, CORS…). */
export function isNetworkError(err: unknown): boolean {
  const e = err as { name?: string; status?: number; message?: string } | null
  if (!e) return false
  return e.name === 'AuthRetryableFetchError' || e.status === 0 || /failed to fetch|network|load failed/i.test(e.message ?? '')
}

/** Auth-specific messages in Georgian; everything else goes through the shared `errorText`. */
export function authErrorText(err: unknown): string {
  const e = err as { message?: string; code?: string } | null
  const m = (e?.message ?? '').toLowerCase()
  const code = e?.code ?? ''
  if (code === 'same_password' || m.includes('different from the old password')) return 'ახალი პაროლი ძველისგან უნდა განსხვავდებოდეს.'
  if (code === 'weak_password' || m.includes('weak') || m.includes('easy to guess')) return 'ეს პაროლი ძალიან მარტივია. აირჩიე უფრო რთული — ასოები და ციფრები ერთად.'
  if (code === 'email_address_invalid' || (m.includes('email address') && m.includes('invalid'))) return 'ელ-ფოსტის მისამართი არასწორია.'
  if (code === 'signup_disabled' || m.includes('signups not allowed')) return 'რეგისტრაცია დროებით შეჩერებულია. სცადე მოგვიანებით.'
  if (code === 'over_email_send_rate_limit' || m.includes('for security purposes')) return 'წერილი ახლახან გამოგიგზავნეთ. ცოტა ხანში სცადე ხელახლა.'
  if (code === 'otp_expired' || m.includes('expired')) return 'ბმულს ვადა გაუვიდა. მოითხოვე ახალი.'
  if (code === 'session_not_found' || m.includes('auth session missing')) return 'სესია აღარ მოქმედებს. მოითხოვე ახალი ბმული.'
  if (m.includes('password') && m.includes('72')) return `პაროლი მაქსიმუმ ${PASSWORD_MAX} სიმბოლო უნდა იყოს.`
  return errorText(err)
}
