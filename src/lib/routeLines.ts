import type { MapRouteLine } from '../components/map/MapView'

type LineRow = {
  id: number; slug: string; name: string; difficulty: MapRouteLine['difficulty']; days_min: number; days_max: number
  start_lat: number | null; start_lng: number | null; geometry_lite: number[][] | null
}

export function toMapLines(rows: LineRow[] | undefined): MapRouteLine[] {
  return (rows ?? []).map((r) => ({
    id: r.id, slug: r.slug, name: r.name, difficulty: r.difficulty, days_min: r.days_min, days_max: r.days_max,
    coords: r.geometry_lite, start: r.start_lat !== null && r.start_lng !== null ? [r.start_lng, r.start_lat] : null,
  }))
}
