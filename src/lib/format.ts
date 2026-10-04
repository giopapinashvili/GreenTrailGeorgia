const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი']
const MONTHS_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ']

export const monthName = (m: number) => MONTHS[(m - 1 + 12) % 12]
export const monthShort = (m: number) => MONTHS_SHORT[(m - 1 + 12) % 12]
/** "in October" → "ოქტომბერში" (all month names end in -ი, which drops before -ში) */
export const monthIn = (m: number) => monthName(m).replace(/ი$/, '') + 'ში'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const s = Math.max(0, Math.round((Date.now() - d) / 1000))
  if (s < 60) return 'ახლახან'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} წთ-ის წინ`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} სთ-ის წინ`
  const days = Math.round(h / 24)
  if (days < 7) return `${days} დღის წინ`
  if (days < 30) return `${Math.round(days / 7)} კვირის წინ`
  return formatDate(iso)
}

export function clockTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function num(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: digits }).replace(/,/g, ' ')
}

export function km(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${num(n, n < 10 ? 1 : 0)} კმ`
}

export function meters(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${num(n)} მ`
}

export function daysLabel(min: number, max: number): string {
  if (min === max) return `${min} დღე`
  return `${min}–${max} დღე`
}

export function durationLabel(r: { days_min: number; days_max: number; duration_hours: number | null }): string {
  if (r.days_max <= 1 && r.duration_hours) {
    const h = Number(r.duration_hours)
    return h < 1 ? `${Math.round(h * 60)} წთ` : `${num(h, 1)} სთ`
  }
  return daysLabel(r.days_min, r.days_max)
}

/** Season months -> "ივნისი – სექტემბერი" (handles gaps by listing ranges). */
export function seasonLabel(months: number[]): string {
  if (!months?.length) return '—'
  if (months.length === 12) return 'მთელი წელი'
  const sorted = [...new Set(months)].sort((a, b) => a - b)
  const ranges: [number, number][] = []
  for (const m of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && m === last[1] + 1) last[1] = m
    else ranges.push([m, m])
  }
  // merge a range wrapping December -> January
  if (ranges.length > 1 && ranges[0][0] === 1 && ranges[ranges.length - 1][1] === 12) {
    const first = ranges.shift()!
    ranges[ranges.length - 1][1] = first[1]
  }
  return ranges.map(([a, b]) => (a === b ? monthName(a) : `${monthName(a)} – ${monthName(b)}`)).join(', ')
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function plural(n: number, word: string): string {
  // Georgian nouns do not change after numerals
  return `${num(n)} ${word}`
}

export function excerpt(text: string, len = 180): string {
  const clean = text.replace(/[#*_>`\[\]]/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > len ? clean.slice(0, len - 1).trimEnd() + '…' : clean
}
