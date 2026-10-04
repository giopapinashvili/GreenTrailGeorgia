// Form model of the admin route editor: types, row <-> form conversion and validation.
import { elevationStats } from '../../lib/geo'
import type { PackedLine } from '../../lib/routeLine'
import type { Difficulty, GearItem, Route, RouteStop, RouteType, StopKind } from '../../lib/types'

/** Full routes row as the editor reads it (`select('*')`). */
export type RouteRow = Route & { geometry_lite?: number[][] | null; created_by?: string | null }
export type LineStats = PackedLine['stats']

export interface StopDraft {
  key: string
  name: string
  kind: StopKind
  day: number | null
  altitude_m: number | null
  overnight: boolean
  description: string
  lat: number | null
  lng: number | null
}

export interface GearDraft {
  key: string
  name: string
  essential: boolean
}

export interface TextItem {
  key: string
  text: string
}

export interface RouteForm {
  name: string
  name_en: string
  slug: string
  region_id: string
  difficulty: Difficulty
  days_min: number | null
  days_max: number | null
  duration_hours: number | null
  distance_km: number | null
  elevation_gain_m: number | null
  elevation_loss_m: number | null
  max_altitude_m: number | null
  min_altitude_m: number | null
  route_type: RouteType
  season_months: number[]
  tags: string[]
  featured: boolean
  status: 'draft' | 'published'
  summary: string
  description: string
  difficulty_notes: string
  getting_there: string
  accommodation: string
  water: string
  permits: string
  dangers: string
  mobile_coverage: string
  sources: string
  gear: GearDraft[]
  tips: TextItem[]
  geometry: number[][] | null
  geometry_lite: number[][] | null
  elevation_profile: number[][] | null
  geometry_source: string | null
  cover_url: string
  cover_credit: string
  cover_source_url: string
}

export type TextKey = 'summary' | 'description' | 'difficulty_notes' | 'getting_there' | 'accommodation' | 'water' | 'permits' | 'dangers' | 'mobile_coverage' | 'sources'

export const TEXT_FIELDS: { key: TextKey; label: string; hint?: string; rows: number; placeholder?: string }[] = [
  { key: 'summary', label: 'მოკლე აღწერა *', hint: '1–2 წინადადება. ჩანს მარშრუტის ბარათზე და ძიებაში.', rows: 2 },
  { key: 'description', label: 'სრული აღწერა', hint: 'აბზაცები ცარიელი ხაზით გამოყავი.', rows: 6 },
  { key: 'difficulty_notes', label: 'სირთულე — რატომ', placeholder: 'მაგ: გრძელი აღმართი უღელტეხილზე, მდინარის ფონი ხიდის გარეშე…', rows: 2 },
  { key: 'getting_there', label: 'როგორ მივიდე', placeholder: 'ტრანსპორტი სტარტამდე და ფინიშიდან უკან', rows: 3 },
  { key: 'accommodation', label: 'ღამისთევა', placeholder: 'საოჯახო სასტუმროები, თავშესაფრები, კარვის ადგილები', rows: 2 },
  { key: 'water', label: 'წყალი', placeholder: 'სად შეიძლება წყლის შევსება', rows: 2 },
  { key: 'permits', label: 'ნებართვები', placeholder: 'მაგ: სასაზღვრო ზონის საშვი, ეროვნული პარკის რეგისტრაცია', rows: 2 },
  { key: 'dangers', label: 'საფრთხეები', placeholder: 'ამინდი, ფონები, ქვათაცვენა, ძაღლები…', rows: 2 },
  { key: 'mobile_coverage', label: 'მობილური კავშირი', rows: 2 },
  { key: 'sources', label: 'წყაროები', hint: 'საიდან არის ინფორმაცია: ბმულები, გზამკვლევები, საკუთარი გამოცდილება.', rows: 2 },
]

export const ROUTE_TYPE_LABEL: Record<RouteType, string> = {
  one_way: 'ცალმხრივი',
  loop: 'წრიული',
  out_and_back: 'იქით-აქეთ',
}

/** Tags already used by the seeded routes (suggestions only; any tag can be typed). */
export const KNOWN_TAGS = [
  'views', 'forest', 'family', 'history', 'lakes', 'national_park', 'camping', 'villages', 'pass', 'towers', 'huts',
  'waterfall', 'glacier', 'river_crossing', 'canyon', 'border_zone', 'public_transport', 'peak', 'wildlife', 'remote',
  'guesthouses', 'flowers',
]

export const SLUG_RE = /^[a-z0-9-]{2,80}$/

let seq = 0
export const newKey = () => `k${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const isLine = (v: unknown): v is number[][] => Array.isArray(v) && v.length > 1 && Array.isArray(v[0])

export const located = (s: Pick<StopDraft, 'lat' | 'lng'>): s is StopDraft & { lat: number; lng: number } =>
  s.lat !== null && s.lng !== null && Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180

export function emptyForm(): RouteForm {
  return {
    name: '', name_en: '', slug: '', region_id: '', difficulty: 'moderate',
    days_min: 1, days_max: 1, duration_hours: null, distance_km: null,
    elevation_gain_m: null, elevation_loss_m: null, max_altitude_m: null, min_altitude_m: null,
    route_type: 'one_way', season_months: [6, 7, 8, 9], tags: [], featured: false, status: 'draft',
    summary: '', description: '', difficulty_notes: '', getting_there: '', accommodation: '', water: '',
    permits: '', dangers: '', mobile_coverage: '', sources: '',
    gear: [], tips: [],
    geometry: null, geometry_lite: null, elevation_profile: null, geometry_source: null,
    cover_url: '', cover_credit: '', cover_source_url: '',
  }
}

export function rowToForm(r: RouteRow): RouteForm {
  const gear = Array.isArray(r.gear) ? (r.gear as GearItem[]) : []
  return {
    name: str(r.name), name_en: str(r.name_en), slug: str(r.slug), region_id: str(r.region_id),
    difficulty: r.difficulty ?? 'moderate',
    days_min: numOrNull(r.days_min), days_max: numOrNull(r.days_max), duration_hours: numOrNull(r.duration_hours),
    distance_km: numOrNull(r.distance_km), elevation_gain_m: numOrNull(r.elevation_gain_m), elevation_loss_m: numOrNull(r.elevation_loss_m),
    max_altitude_m: numOrNull(r.max_altitude_m), min_altitude_m: numOrNull(r.min_altitude_m),
    route_type: r.route_type ?? 'one_way',
    season_months: Array.isArray(r.season_months) ? r.season_months.map(Number).filter((m) => m >= 1 && m <= 12) : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    featured: !!r.featured,
    status: r.status === 'draft' ? 'draft' : 'published',
    summary: str(r.summary), description: str(r.description), difficulty_notes: str(r.difficulty_notes),
    getting_there: str(r.getting_there), accommodation: str(r.accommodation), water: str(r.water), permits: str(r.permits),
    dangers: str(r.dangers), mobile_coverage: str(r.mobile_coverage), sources: str(r.sources),
    gear: gear.filter((g) => g && typeof g.name === 'string').map((g) => ({ key: newKey(), name: g.name, essential: g.essential !== false })),
    tips: (Array.isArray(r.tips) ? r.tips : []).map((t) => ({ key: newKey(), text: String(t) })),
    geometry: isLine(r.geometry) ? r.geometry : null,
    geometry_lite: isLine(r.geometry_lite) ? r.geometry_lite : null,
    elevation_profile: isLine(r.elevation_profile) ? r.elevation_profile : null,
    geometry_source: r.geometry_source ?? null,
    cover_url: str(r.cover_url), cover_credit: str(r.cover_credit), cover_source_url: str(r.cover_source_url),
  }
}

export function stopToDraft(s: RouteStop): StopDraft {
  return {
    key: newKey(),
    name: str(s.name),
    kind: s.kind ?? 'other',
    day: numOrNull(s.day),
    altitude_m: numOrNull(s.altitude_m),
    overnight: !!s.overnight,
    description: str(s.description),
    lat: numOrNull(s.lat),
    lng: numOrNull(s.lng),
  }
}

/** Distance and elevations of an already stored line (same rounding as packLine). */
export function statsOfLine(geometry: number[][] | null): LineStats | null {
  if (!geometry || geometry.length < 2) return null
  const st = elevationStats(geometry)
  return { distanceKm: Math.round(st.distanceKm * 10) / 10, gain: st.gain, loss: st.loss, min: st.min, max: st.max }
}

// ───────── validation ─────────
export interface Problems {
  fields: Partial<Record<keyof RouteForm, string>>
  stops: Record<string, string>
  general: string | null
}

const isInt = (n: number | null) => n !== null && Number.isInteger(n)

export function validate(form: RouteForm, stops: StopDraft[]): Problems | null {
  const fields: Problems['fields'] = {}
  const stopErr: Record<string, string> = {}
  let general: string | null = null

  if (!form.name.trim()) fields.name = 'სახელი სავალდებულოა.'
  if (!form.slug) fields.slug = 'slug სავალდებულოა — ის მარშრუტის ბმულის ნაწილია.'
  else if (!SLUG_RE.test(form.slug)) fields.slug = 'მხოლოდ ლათინური პატარა ასოები, ციფრები და ტირე (2–80 სიმბოლო).'
  if (!form.region_id) fields.region_id = 'აირჩიე რეგიონი.'
  if (!isInt(form.days_min) || form.days_min! < 1) fields.days_min = 'მთელი რიცხვი, მინიმუმ 1.'
  if (!isInt(form.days_max) || form.days_max! < 1) fields.days_max = 'მთელი რიცხვი, მინიმუმ 1.'
  else if (isInt(form.days_min) && form.days_max! < form.days_min!) fields.days_max = 'მაქსიმუმი მინიმუმზე ნაკლები ვერ იქნება.'
  if (form.duration_hours !== null && (form.duration_hours <= 0 || form.duration_hours >= 1000)) fields.duration_hours = '0-დან 999 საათამდე.'
  if (form.distance_km !== null && (form.distance_km < 0 || form.distance_km >= 100000)) fields.distance_km = 'მანძილი არასწორია.'
  for (const k of ['elevation_gain_m', 'elevation_loss_m'] as const) {
    if (form[k] !== null && form[k]! < 0) fields[k] = 'უარყოფითი ვერ იქნება.'
  }
  if (form.max_altitude_m !== null && form.min_altitude_m !== null && form.max_altitude_m < form.min_altitude_m) {
    fields.max_altitude_m = 'მაქსიმალური სიმაღლე მინიმალურზე ნაკლებია.'
  }
  if (!form.summary.trim()) fields.summary = 'მოკლე აღწერა სავალდებულოა.'

  for (const s of stops) {
    const msgs: string[] = []
    if (!s.name.trim()) msgs.push('სახელი აკლია')
    if (!located(s)) msgs.push('კოორდინატები აკლია ან არასწორია')
    if (s.day !== null && (!Number.isInteger(s.day) || s.day < 1)) msgs.push('დღე — მთელი რიცხვი, მინიმუმ 1')
    if (msgs.length) stopErr[s.key] = msgs.join(' · ')
  }
  if (form.status === 'published' && stops.length === 0) general = 'გამოქვეყნებულ მარშრუტს მინიმუმ ერთი გაჩერება სჭირდება. დაამატე გაჩერება ან შეინახე დრაფტად.'

  if (!Object.keys(fields).length && !Object.keys(stopErr).length && !general) return null
  return { fields, stops: stopErr, general }
}

// ───────── form -> database rows ─────────
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)
const int = (n: number | null) => (n === null ? null : Math.round(n))
const text = (s: string) => {
  const t = s.trim()
  return t ? t : null
}

export function toRouteRow(form: RouteForm, stops: StopDraft[]) {
  const first = stops[0]
  const last = stops[stops.length - 1]
  return {
    slug: form.slug,
    name: form.name.trim(),
    name_en: text(form.name_en),
    region_id: form.region_id,
    difficulty: form.difficulty,
    days_min: form.days_min ?? 1,
    days_max: form.days_max ?? form.days_min ?? 1,
    duration_hours: round1(form.duration_hours),
    distance_km: round1(form.distance_km),
    elevation_gain_m: int(form.elevation_gain_m),
    elevation_loss_m: int(form.elevation_loss_m),
    max_altitude_m: int(form.max_altitude_m),
    min_altitude_m: int(form.min_altitude_m),
    route_type: form.route_type,
    season_months: [...new Set(form.season_months)].sort((a, b) => a - b),
    tags: form.tags,
    summary: form.summary.trim(),
    description: text(form.description),
    difficulty_notes: text(form.difficulty_notes),
    getting_there: text(form.getting_there),
    accommodation: text(form.accommodation),
    water: text(form.water),
    permits: text(form.permits),
    dangers: text(form.dangers),
    mobile_coverage: text(form.mobile_coverage),
    sources: text(form.sources),
    gear: form.gear.filter((g) => g.name.trim()).map((g) => ({ name: g.name.trim(), essential: g.essential })),
    tips: form.tips.map((t) => t.text.trim()).filter(Boolean),
    start_name: first ? first.name.trim() : null,
    start_lat: first?.lat ?? null,
    start_lng: first?.lng ?? null,
    end_name: last ? last.name.trim() : null,
    end_lat: last?.lat ?? null,
    end_lng: last?.lng ?? null,
    geometry: form.geometry,
    geometry_lite: form.geometry_lite,
    elevation_profile: form.elevation_profile,
    geometry_source: form.geometry ? form.geometry_source : null,
    cover_url: text(form.cover_url),
    cover_credit: text(form.cover_credit),
    cover_source_url: text(form.cover_source_url),
    featured: form.featured,
    status: form.status,
  }
}

export function toStopRows(routeId: number, stops: StopDraft[]) {
  return stops.map((s, i) => ({
    route_id: routeId,
    position: i,
    day: s.day,
    name: s.name.trim(),
    kind: s.kind,
    lat: s.lat as number,
    lng: s.lng as number,
    altitude_m: int(s.altitude_m),
    overnight: s.overnight,
    description: text(s.description),
  }))
}
