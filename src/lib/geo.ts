// Geometry helpers. Coordinates are [lng, lat] or [lng, lat, ele].
export type Coord = number[]

const R = 6371.0088

export function haversineKm(a: Coord, b: Coord): number {
  const toRad = Math.PI / 180
  const dLat = (b[1] - a[1]) * toRad
  const dLng = (b[0] - a[0]) * toRad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

export function lineLengthKm(coords: Coord[]): number {
  let d = 0
  for (let i = 1; i < coords.length; i++) d += haversineKm(coords[i - 1], coords[i])
  return d
}

export function bbox(coords: Coord[]): [number, number, number, number] | null {
  if (!coords.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of coords) {
    if (c[0] < minX) minX = c[0]
    if (c[1] < minY) minY = c[1]
    if (c[0] > maxX) maxX = c[0]
    if (c[1] > maxY) maxY = c[1]
  }
  return [minX, minY, maxX, maxY]
}

/** Douglas–Peucker simplification (tolerance in degrees, ~0.00008 ≈ 7 m). Keeps the 3rd value (elevation). */
export function simplify(coords: Coord[], tolerance = 0.00008): Coord[] {
  if (coords.length < 3) return coords
  const sqTol = tolerance * tolerance
  const keep = new Uint8Array(coords.length)
  keep[0] = keep[coords.length - 1] = 1
  const stack: [number, number][] = [[0, coords.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let maxSq = 0
    let index = 0
    for (let i = first + 1; i < last; i++) {
      const sq = segSqDist(coords[i], coords[first], coords[last])
      if (sq > maxSq) { index = i; maxSq = sq }
    }
    if (maxSq > sqTol) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return coords.filter((_, i) => keep[i])
}

function segSqDist(p: Coord, a: Coord, b: Coord) {
  let x = a[0], y = a[1]
  let dx = b[0] - x, dy = b[1] - y
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) { x = b[0]; y = b[1] } else if (t > 0) { x += dx * t; y += dy * t }
  }
  dx = p[0] - x
  dy = p[1] - y
  return dx * dx + dy * dy
}

export interface ElevationStats {
  distanceKm: number
  gain: number
  loss: number
  min: number | null
  max: number | null
  profile: number[][] // [km, m]
}

/** Distance, ascent/descent and a light profile from a 3D line. Noise below 4 m is ignored. */
export function elevationStats(coords: Coord[], maxPoints = 220): ElevationStats {
  const pts: { km: number; ele: number | null }[] = []
  let km = 0
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) km += haversineKm(coords[i - 1], coords[i])
    const e = coords[i][2]
    pts.push({ km, ele: typeof e === 'number' && Number.isFinite(e) ? e : null })
  }
  const withEle = pts.filter((p) => p.ele !== null) as { km: number; ele: number }[]
  let gain = 0, loss = 0
  let min: number | null = null, max: number | null = null
  if (withEle.length) {
    // light smoothing (moving average of 3)
    const sm = withEle.map((p, i) => {
      const a = withEle[Math.max(0, i - 1)].ele, b = p.ele, c = withEle[Math.min(withEle.length - 1, i + 1)].ele
      return { km: p.km, ele: (a + b + c) / 3 }
    })
    let ref = sm[0].ele
    for (const p of sm) {
      const diff = p.ele - ref
      if (diff >= 4) { gain += diff; ref = p.ele } else if (diff <= -4) { loss -= diff; ref = p.ele }
    }
    min = Math.min(...withEle.map((p) => p.ele))
    max = Math.max(...withEle.map((p) => p.ele))
  }
  // downsample the profile evenly by distance
  const profile: number[][] = []
  if (withEle.length) {
    const step = km / maxPoints
    let next = 0
    for (const p of withEle) {
      if (p.km >= next || p === withEle[withEle.length - 1]) {
        profile.push([Math.round(p.km * 100) / 100, Math.round(p.ele)])
        next = p.km + step
      }
    }
  }
  return { distanceKm: km, gain: Math.round(gain), loss: Math.round(loss), min: min === null ? null : Math.round(min), max: max === null ? null : Math.round(max), profile }
}

/** Index of the line vertex closest to a point (used to place stops on the profile). */
export function nearestIndex(coords: Coord[], p: Coord): number {
  let best = 0, bestD = Infinity
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i][0] - p[0], dy = coords[i][1] - p[1]
    const d = dx * dx + dy * dy
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

/** Kilometre mark along the line of each given point. */
export function kmAlong(coords: Coord[], points: Coord[]): number[] {
  const cum: number[] = [0]
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversineKm(coords[i - 1], coords[i]))
  return points.map((p) => cum[nearestIndex(coords, p)] ?? 0)
}

// ───────────── GPX ─────────────
export function parseGpx(xml: string): Coord[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('GPX ფაილი ვერ წავიკითხე')
  let nodes = Array.from(doc.getElementsByTagName('trkpt'))
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('rtept'))
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('wpt'))
  const coords: Coord[] = []
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute('lat') || '')
    const lon = parseFloat(n.getAttribute('lon') || '')
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const eleNode = n.getElementsByTagName('ele')[0]
    const ele = eleNode ? parseFloat(eleNode.textContent || '') : NaN
    coords.push(Number.isFinite(ele) ? [lon, lat, ele] : [lon, lat])
  }
  if (coords.length < 2) throw new Error('GPX-ში ბილიკის წერტილები ვერ ვიპოვე')
  return coords
}

export function toGpx(name: string, coords: Coord[], waypoints: { name: string; lat: number; lng: number }[] = []): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
  const wpts = waypoints.map((w) => `  <wpt lat="${w.lat}" lon="${w.lng}"><name>${esc(w.name)}</name></wpt>`).join('\n')
  const trkpts = coords
    .map((c) => `      <trkpt lat="${c[1]}" lon="${c[0]}">${c[2] !== undefined ? `<ele>${Math.round(c[2])}</ele>` : ''}</trkpt>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GreenTrail Georgia" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(name)}</name></metadata>
${wpts}
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

export function downloadText(filename: string, text: string, type = 'application/gpx+xml') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
