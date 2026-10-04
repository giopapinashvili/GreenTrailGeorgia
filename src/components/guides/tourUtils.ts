import type { QueryClient } from '@tanstack/react-query'
import { monthName, monthShort, num } from '../../lib/format'
import { errorText } from '../../lib/supabase'

// ───────────── languages guides can speak ─────────────
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'ka', label: 'ქართული' },
  { code: 'en', label: 'ინგლისური' },
  { code: 'ru', label: 'რუსული' },
  { code: 'de', label: 'გერმანული' },
  { code: 'fr', label: 'ფრანგული' },
  { code: 'tr', label: 'თურქული' },
  { code: 'he', label: 'ებრაული' },
  { code: 'uk', label: 'უკრაინული' },
  { code: 'pl', label: 'პოლონური' },
]
const LANG_MAP = new Map(LANGUAGES.map((l) => [l.code, l.label]))
export const langLabel = (code: string) => LANG_MAP.get(code) ?? code.toUpperCase()

/** Character count as Postgres `char_length` sees it. */
export const len = (s: string) => Array.from(s).length

// ───────────── dates (tour start dates are plain 'YYYY-MM-DD' strings) ─────────────
const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი']

export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** Today in the visitor's local time. */
export const todayISO = () => isoDay(new Date())

/** Parses 'YYYY-MM-DD' as a local calendar day (no timezone shift). */
export function parseDay(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').slice(0, 10))
  if (!m) return null
  const y = Number(m[1])
  const d = new Date(y, Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime()) || y < 2000 || y > 2100 || d.getDate() !== Number(m[3])) return null
  return d
}

/** Valid, unique, sorted dates. */
export function cleanDates(dates: readonly string[] | null | undefined): string[] {
  const out = new Set<string>()
  for (const s of dates ?? []) {
    const d = parseDay(s)
    if (d) out.add(isoDay(d))
  }
  return [...out].sort()
}

export function splitDates(dates: readonly string[] | null | undefined) {
  const today = todayISO()
  const all = cleanDates(dates)
  return { upcoming: all.filter((d) => d >= today), past: all.filter((d) => d < today) }
}

export const nextStartDate = (dates: readonly string[] | null | undefined): string | null => splitDates(dates).upcoming[0] ?? null

export function weekday(s: string): string {
  const d = parseDay(s)
  return d ? WEEKDAYS[d.getDay()] : ''
}

const yearSuffix = (d: Date) => (d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '')

/** '12 ოქტ' (with the year when it is not this year). */
export function dayShort(s: string): string {
  const d = parseDay(s)
  return d ? `${d.getDate()} ${monthShort(d.getMonth() + 1)}${yearSuffix(d)}` : ''
}

/** Trip dates from the start day and the tour length: '12–14 ოქტომბერი', '30 სექ – 2 ოქტ'. */
export function tripRange(start: string, days: number): string {
  const s = parseDay(start)
  if (!s) return ''
  const e = new Date(s)
  e.setDate(e.getDate() + Math.max(1, days) - 1)
  if (days <= 1) return `${s.getDate()} ${monthName(s.getMonth() + 1)}${yearSuffix(s)}`
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${monthName(s.getMonth() + 1)}${yearSuffix(s)}`
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${monthShort(s.getMonth() + 1)} – ${e.getDate()} ${monthShort(e.getMonth() + 1)}${yearSuffix(e)}`
  }
  return `${s.getDate()} ${monthShort(s.getMonth() + 1)} ${s.getFullYear()} – ${e.getDate()} ${monthShort(e.getMonth() + 1)} ${e.getFullYear()}`
}

// ───────────── labels ─────────────
export function hasPrice(price: number | string | null | undefined): boolean {
  return price !== null && price !== undefined && price !== '' && Number.isFinite(Number(price))
}

export function priceLabel(price: number | string | null | undefined): string {
  return hasPrice(price) ? `${num(Number(price), 2)} ₾` : 'ფასი შეთანხმებით'
}

export function groupLabel(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min && max) return min === max ? `${min} ადამიანი` : `${min}–${max} ადამიანი`
  if (max) return `მაქს. ${max} ადამიანი`
  if (min) return `მინ. ${min} ადამიანი`
  return null
}

/** Link to a direct conversation; signed-out visitors go through the login page first. */
export function messageHref(userId: string, signedIn: boolean): string {
  const to = `/messages?to=${encodeURIComponent(userId)}`
  return signedIn ? to : `/login?next=${encodeURIComponent(to)}`
}

// ───────────── contacts (guide-entered, so normalise before use as href) ─────────────
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validPhone(s: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(s)) return false
  const digits = s.replace(/\D/g, '').length
  return digits >= 6 && digits <= 15
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

const HAS_PROTOCOL = /^https?:\/\//i

/** A safe https URL from what a guide typed ("example.ge" → "https://example.ge/"), or null. */
export function webUrl(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  if (!s || /\s/.test(s)) return null
  const raw = HAS_PROTOCOL.test(s) ? s : `https://${s.replace(/^\/+/, '')}`
  try {
    const u = new URL(raw)
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null
    return u.href
  } catch {
    return null
  }
}

/** Accepts a full link, "facebook.com/x" or just a handle ("@x"). */
export function socialUrl(kind: 'facebook' | 'instagram', v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  if (!s) return null
  if (HAS_PROTOCOL.test(s) || /^(www\.|m\.)?(facebook|fb|instagram)\.com\//i.test(s)) return webUrl(s)
  const handle = s.replace(/^@/, '')
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(handle)) return null
  return kind === 'facebook' ? `https://www.facebook.com/${handle}` : `https://www.instagram.com/${handle}/`
}

/** "example.ge/tours" for display. */
export function hostLabel(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '')
  } catch {
    return url
  }
}

export function instagramLabel(url: string): string {
  try {
    const first = new URL(url).pathname.split('/').filter(Boolean)[0]
    return first ? `@${first}` : 'Instagram'
  } catch {
    return 'Instagram'
  }
}

// ───────────── misc ─────────────
/** One item per line → text[] (bullets stripped, empty lines dropped). */
export function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*[-–—•*·]\s*/, '').trim())
    .filter(Boolean)
}

/** Storage path inside a public bucket from its public URL (null for foreign URLs). */
export function storagePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i < 0) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  } catch {
    return null
  }
}

/** Error text for photo uploads: browser decode errors come in English, so fall back to a clear Georgian hint. */
export function photoError(err: unknown): string {
  const t = errorText(err)
  return /[ა-ჿ]/.test(t) ? t : 'ფოტოს დამუშავება ვერ მოხერხდა. სცადე JPG ან PNG ფაილი.'
}

export function invalidateTours(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['tours'] })
  qc.invalidateQueries({ queryKey: ['tour'] })
  qc.invalidateQueries({ queryKey: ['site-counts'] })
}
