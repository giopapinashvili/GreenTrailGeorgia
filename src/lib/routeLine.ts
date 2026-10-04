import { routeThrough } from './brouter'
import { elevationStats, simplify, type Coord } from './geo'

/** What gets stored on a route row once it has a real line. */
export interface PackedLine {
  /** [lng, lat, ele] simplified to ~5 m — detail map, GPX download, profile */
  geometry: number[][]
  /** [lng, lat] simplified to ~50 m — the overview map of all routes */
  geometry_lite: number[][]
  /** [km, m] — elevation chart */
  elevation_profile: number[][]
  stats: { distanceKm: number; gain: number; loss: number; min: number | null; max: number | null }
}

const r5 = (x: number) => Math.round(x * 1e5) / 1e5
const r4 = (x: number) => Math.round(x * 1e4) / 1e4

/** Turns a raw 2D/3D line (from BRouter or a GPX file) into the stored shape. */
export function packLine(coords: Coord[]): PackedLine {
  if (coords.length < 2) throw new Error('ხაზს მინიმუმ ორი წერტილი სჭირდება')
  const st = elevationStats(coords)
  const geometry = simplify(coords, 0.00004).map((c) => (c.length > 2 && Number.isFinite(c[2]) ? [r5(c[0]), r5(c[1]), Math.round(c[2])] : [r5(c[0]), r5(c[1])]))
  const geometry_lite = simplify(coords, 0.0006).map((c) => [r4(c[0]), r4(c[1])])
  return {
    geometry,
    geometry_lite,
    elevation_profile: st.profile,
    stats: { distanceKm: Math.round(st.distanceKm * 10) / 10, gain: st.gain, loss: st.loss, min: st.min, max: st.max },
  }
}

/** Builds a real trail line through the stops (in order) along OpenStreetMap paths. */
export async function buildLineFromStops(stops: { lat: number; lng: number }[]): Promise<PackedLine> {
  const pts = stops.filter((s, i) => i === 0 || s.lat !== stops[i - 1].lat || s.lng !== stops[i - 1].lng)
  if (pts.length < 2) throw new Error('ხაზის ასაგებად მინიმუმ ორი სხვადასხვა გაჩერებაა საჭირო')
  const coords = await routeThrough(pts)
  return packLine(coords)
}

/**
 * Plausibility check for an automatic line: compares its length with the route's
 * editorial distance (out-and-back routes are drawn one way, so half the distance).
 */
export function lineLooksRight(lineKm: number, route: { distance_km: number | null; route_type: string }): { ok: boolean; ratio: number | null } {
  if (!route.distance_km) return { ok: true, ratio: null }
  const expected = route.route_type === 'out_and_back' ? Number(route.distance_km) / 2 : Number(route.distance_km)
  const ratio = lineKm / expected
  return { ok: ratio > 0.6 && ratio < 1.6, ratio: Math.round(ratio * 100) / 100 }
}
