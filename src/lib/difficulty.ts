import type { Difficulty, Route, RouteListItem } from './types'

export const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard', 'expert']

export const DIFF_LABEL: Record<Difficulty, string> = {
  easy: 'მარტივი',
  moderate: 'საშუალო',
  hard: 'რთული',
  expert: 'ექსპერტი',
}

export const DIFF_HINT: Record<Difficulty, string> = {
  easy: 'მოკლე ან ნაკლებად ციცაბო ბილიკი. შეეფერება დამწყებს და ოჯახს.',
  moderate: 'მთელი დღის სიარული ან რამდენიმესაათიანი აღმართი. საჭიროა ნორმალური ფიზიკური ფორმა.',
  hard: 'გრძელი დღეები, დიდი აღმართი, მაღალი უღელტეხილები ან მდინარის გადალახვა. საჭიროა გამოცდილება.',
  expert: 'მყინვარი, ალპინისტური ტექნიკა ან დიდი სიმაღლე. მხოლოდ გამოცდილთათვის ან გიდთან ერთად.',
}

export const DIFF_LEVEL: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3, expert: 4 }

/** CSS colour (uses theme tokens) */
export const diffColor = (d: Difficulty) => `rgb(var(--${d}))`

export interface DifficultyFactor {
  label: string
  value: string
  weight: number // 0..1 how much it pushes difficulty up
}

/** Explains *why* a route has its difficulty, from its numbers. */
export function difficultyFactors(r: Partial<Route> & Pick<RouteListItem, 'days_min' | 'days_max'>): DifficultyFactor[] {
  const out: DifficultyFactor[] = []
  const dist = Number(r.distance_km ?? 0)
  const gain = Number(r.elevation_gain_m ?? 0)
  const alt = Number(r.max_altitude_m ?? 0)
  const days = r.days_max ?? 1
  const perDayDist = days > 0 ? dist / days : dist
  const perDayGain = days > 0 ? gain / days : gain
  if (dist) out.push({ label: 'დღიური მანძილი', value: `~${Math.round(perDayDist)} კმ`, weight: clamp(perDayDist / 22) })
  if (gain) out.push({ label: 'დღიური აღმართი', value: `~${Math.round(perDayGain / 10) * 10} მ`, weight: clamp(perDayGain / 1500) })
  if (alt) out.push({ label: 'მაქს. სიმაღლე', value: `${alt.toLocaleString('en-US').replace(',', ' ')} მ`, weight: clamp((alt - 1500) / 2500) })
  if (days > 1) out.push({ label: 'ხანგრძლივობა', value: `${r.days_min === r.days_max ? days : `${r.days_min}–${days}`} დღე`, weight: clamp(days / 6) })
  return out
}

const clamp = (x: number) => Math.max(0, Math.min(1, x))

/** A 0..100 effort score: used for sorting "easiest first" and the planner. */
export function effortScore(r: Pick<RouteListItem, 'distance_km' | 'elevation_gain_m' | 'max_altitude_m' | 'days_max' | 'difficulty'>): number {
  const d = Number(r.distance_km ?? 0)
  const g = Number(r.elevation_gain_m ?? 0)
  const a = Number(r.max_altitude_m ?? 0)
  const base = DIFF_LEVEL[r.difficulty] * 15
  return Math.round(Math.min(100, base + d * 0.25 + g * 0.008 + Math.max(0, a - 2000) * 0.004))
}
