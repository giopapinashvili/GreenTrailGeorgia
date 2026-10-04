import { DIFF_LEVEL } from './difficulty'
import { tagLabel } from './tags'
import type { Difficulty, RouteListItem, Tour } from './types'

export interface PlanInput {
  days: number
  difficulty: Difficulty | 'any'
  month: number | null
  region: string | null
  interests: string[]
  noTent: boolean
  publicTransport: boolean
}

export interface Scored {
  route: RouteListItem
  score: number
  reasons: string[]
}

export interface PlanItem { from: number; to: number; route: RouteListItem }
export interface Itinerary { key: string; region: string; days: number; items: PlanItem[]; score: number }

const campingOnly = (r: RouteListItem) => r.days_min > 1 && r.tags.includes('camping') && !r.tags.some((t) => t === 'guesthouses' || t === 'huts')

/** How well one route fits the person's wishes (null = does not fit at all). */
export function scoreRoute(r: RouteListItem, p: PlanInput): Scored | null {
  const reasons: string[] = []
  let score = 0
  if (r.days_min > p.days) return null
  if (p.region && r.region_id !== p.region) return null
  if (p.month && !r.season_months.includes(p.month)) return null
  if (p.noTent && campingOnly(r)) return null

  if (p.difficulty !== 'any') {
    const want = DIFF_LEVEL[p.difficulty]
    const have = DIFF_LEVEL[r.difficulty]
    if (have > want) return null
    const gap = want - have
    score += gap === 0 ? 3 : gap === 1 ? 1.5 : 0.4
    if (gap === 0) reasons.push('სირთულე ზუსტად ერგება')
  } else {
    score += 1
  }

  // how well it fills the available days
  if (r.days_max >= p.days && r.days_min <= p.days) {
    score += 3
    reasons.push(p.days === 1 ? 'ერთ დღეში ეტევა' : `${p.days} დღეში ზუსტად ეტევა`)
  } else {
    score += (r.days_max / p.days) * 2
  }

  if (p.month) reasons.push('სეზონშია')
  if (p.interests.length) {
    const hit = p.interests.filter((t) => r.tags.includes(t))
    score += hit.length * 1.6
    if (!hit.length) score -= 1
    hit.slice(0, 2).forEach((t) => reasons.push(tagLabel(t)))
  }
  if (p.publicTransport) {
    if (r.tags.includes('public_transport') || r.tags.includes('easy_access')) { score += 1.2; reasons.push('ტრანსპორტით მისადგომი') }
  }
  if (r.featured) score += 0.5
  return { route: r, score, reasons }
}

export function rankRoutes(routes: RouteListItem[], p: PlanInput): Scored[] {
  return routes.map((r) => scoreRoute(r, p)).filter((x): x is Scored => !!x).sort((a, b) => b.score - a.score)
}

/**
 * Multi-day itineraries inside one region: a long route (+ day hikes for spare days),
 * or a chain of day hikes. Travel between regions is not planned on purpose — it eats days.
 */
export function buildItineraries(ranked: Scored[], p: PlanInput, max = 3): Itinerary[] {
  if (p.days < 2) return []
  const byRegion = new Map<string, Scored[]>()
  for (const s of ranked) {
    const list = byRegion.get(s.route.region_id) ?? []
    list.push(s)
    byRegion.set(s.route.region_id, list)
  }
  const out: Itinerary[] = []
  for (const [region, list] of byRegion) {
    const multi = list.filter((s) => s.route.days_max > 1)
    const dayHikes = list.filter((s) => s.route.days_max <= 1)

    // A: the best multi-day route, extra days filled with day hikes
    for (const m of multi.slice(0, 2)) {
      const len = Math.min(m.route.days_max, p.days)
      if (len < m.route.days_min) continue
      const items: PlanItem[] = [{ from: 1, to: len, route: m.route }]
      let day = len + 1
      let score = m.score * len
      for (const d of dayHikes) {
        if (day > p.days) break
        items.push({ from: day, to: day, route: d.route })
        score += d.score
        day++
      }
      if (day - 1 === p.days) out.push({ key: `${region}-m-${m.route.id}`, region, days: p.days, items, score: score / p.days + 1 })
    }
    // B: day hikes only
    if (dayHikes.length >= Math.min(p.days, 2)) {
      const pick = dayHikes.slice(0, p.days)
      if (pick.length === p.days) {
        out.push({
          key: `${region}-d`,
          region,
          days: p.days,
          items: pick.map((d, i) => ({ from: i + 1, to: i + 1, route: d.route })),
          score: pick.reduce((a, d) => a + d.score, 0) / p.days,
        })
      }
    }
  }
  // best first, one per region where possible
  out.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const result: Itinerary[] = []
  for (const it of out) {
    if (seen.has(it.region)) continue
    seen.add(it.region)
    result.push(it)
    if (result.length >= max) break
  }
  return result
}

export function matchTours(tours: Tour[], p: PlanInput): Tour[] {
  return tours
    .filter((t) => t.days <= p.days + 1 && t.days >= Math.max(1, p.days - 2))
    .filter((t) => p.difficulty === 'any' || DIFF_LEVEL[t.difficulty] <= DIFF_LEVEL[p.difficulty])
    .filter((t) => !p.region || t.route?.region_id === p.region)
    .sort((a, b) => Math.abs(a.days - p.days) - Math.abs(b.days - p.days))
    .slice(0, 4)
}
