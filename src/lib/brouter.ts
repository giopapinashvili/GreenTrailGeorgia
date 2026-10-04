import { BROUTER_URL } from './config'
import type { Coord } from './geo'

/**
 * Builds a real trail line through the given waypoints using BRouter (OpenStreetMap paths,
 * SRTM elevations). Returns [lng, lat, ele] coordinates.
 */
export async function routeThrough(waypoints: { lat: number; lng: number }[], profile = 'hiking-mountain'): Promise<Coord[]> {
  if (waypoints.length < 2) throw new Error('საჭიროა მინიმუმ ორი წერტილი')
  const lonlats = waypoints.map((w) => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join('|')
  const url = `${BROUTER_URL}?lonlats=${encodeURIComponent(lonlats)}&profile=${profile}&alternativeidx=0&format=geojson`
  const res = await fetch(url)
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t.slice(0, 200) || `BRouter: ${res.status}`)
  }
  const gj = await res.json()
  const coords: Coord[] = gj?.features?.[0]?.geometry?.coordinates ?? []
  if (coords.length < 2) throw new Error('ბილიკი ვერ მოიძებნა ამ წერტილებს შორის')
  return coords
}
