import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map as MLMap, type MapLayerMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mlcontour from 'maplibre-contour'
import { Layers, Mountain, Maximize2, Minimize2 } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { GEORGIA_BOUNDS, TERRAIN_TILES } from '../../lib/config'
import { buildStyle, routeCasingColor, type BaseLayer, type Theme } from './style'
import type { Difficulty, RouteStop } from '../../lib/types'
import { DIFF_LABEL } from '../../lib/difficulty'

// one shared elevation source for hillshade, 3D terrain and generated contour lines
let demSource: InstanceType<typeof mlcontour.DemSource> | null = null
function getDem() {
  if (!demSource) {
    demSource = new mlcontour.DemSource({ url: TERRAIN_TILES, encoding: 'terrarium', maxzoom: 13, worker: true })
    demSource.setupMaplibre(maplibregl)
  }
  return demSource
}

export const DIFF_HEX: Record<Theme, Record<Difficulty, string>> = {
  light: { easy: '#2f855a', moderate: '#c4840a', hard: '#c8432b', expert: '#242424' },
  dark: { easy: '#5cba85', moderate: '#e3ae3a', hard: '#f0745c', expert: '#d6dad5' },
}

export interface MapRouteLine {
  id: number
  slug: string
  name: string
  difficulty: Difficulty
  days_min: number
  days_max: number
  coords: number[][] | null
  start: [number, number] | null
}

export interface MapViewProps {
  className?: string
  /** overview: many routes */
  routes?: MapRouteLine[]
  /** detail: one route line with stops */
  focusLine?: number[][] | null
  focusDifficulty?: Difficulty
  stops?: Pick<RouteStop, 'name' | 'kind' | 'lat' | 'lng' | 'day' | 'overnight' | 'altitude_m' | 'description'>[]
  hoverPoint?: [number, number] | null
  highlightId?: number | null
  onRouteClick?: (slug: string) => void
  initialBounds?: LngLatBoundsLike
  initial3D?: boolean
  showControls?: boolean
  cooperativeGestures?: boolean
  onReady?: (map: MLMap) => void
  children?: React.ReactNode
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export default function MapView({
  className = 'h-[420px]', routes, focusLine, focusDifficulty = 'moderate', stops, hoverPoint, highlightId, onRouteClick,
  initialBounds, initial3D = false, showControls = true, cooperativeGestures = false, onReady, children,
}: MapViewProps) {
  const { resolved: theme } = useTheme()
  const wrap = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const hoverMarker = useRef<maplibregl.Marker | null>(null)
  const [base, setBase] = useState<BaseLayer>('topo')
  const [is3D, setIs3D] = useState(initial3D)
  const [ready, setReady] = useState(false)
  const [full, setFull] = useState(false)
  const latest = useRef({ routes, focusLine, focusDifficulty, stops, theme, base, is3D, highlightId, onRouteClick })
  latest.current = { routes, focusLine, focusDifficulty, stops, theme, base, is3D, highlightId, onRouteClick }

  const routesFC = useMemo(() => toRoutesFC(routes ?? []), [routes])
  const startsFC = useMemo(() => toStartsFC(routes ?? []), [routes])

  // create map once
  useEffect(() => {
    if (!box.current) return
    const dem = getDem()
    const map = new maplibregl.Map({
      container: box.current,
      style: buildStyle(theme, base, styleSources(dem)),
      bounds: initialBounds ?? GEORGIA_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      maxPitch: 75,
      attributionControl: { compact: true },
      cooperativeGestures,
      locale: {
        'NavigationControl.ZoomIn': 'მიახლოება',
        'NavigationControl.ZoomOut': 'დაშორება',
        'NavigationControl.ResetBearing': 'ჩრდილოეთისკენ',
        'GeolocateControl.FindMyLocation': 'ჩემი მდებარეობა',
        'GeolocateControl.LocationNotAvailable': 'მდებარეობა მიუწვდომელია',
        'FullscreenControl.Enter': 'სრულ ეკრანზე',
        'CooperativeGesturesHandler.WindowsHelpText': 'რუკის გასადიდებლად გამოიყენე Ctrl + სქროლი',
        'CooperativeGesturesHandler.MacHelpText': 'რუკის გასადიდებლად გამოიყენე ⌘ + სქროლი',
        'CooperativeGesturesHandler.MobileHelpText': 'რუკის გადასაადგილებლად ორი თითი გამოიყენე',
      },
    })
    mapRef.current = map
    if (showControls) {
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
      map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    }
    map.on('style.load', () => {
      addOverlays(map)
      syncOverlays(map)
      applyTerrain(map, latest.current.is3D, false)
      setReady(true)
    })
    bindInteractions(map)
    onReady?.(map)
    return () => {
      markersRef.current.forEach((m) => m.remove())
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // theme / base switches rebuild the style (overlays re-added on style.load)
  const firstStyle = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (firstStyle.current) { firstStyle.current = false; return }
    map.setStyle(buildStyle(theme, base, styleSources(getDem())), { diff: false })
  }, [theme, base])

  // data updates
  useEffect(() => {
    const map = mapRef.current
    if (map && ready) syncOverlays(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesFC, startsFC, focusLine, stops, ready, highlightId])

  useEffect(() => {
    const map = mapRef.current
    if (map && ready) applyTerrain(map, is3D, true)
  }, [is3D, ready])

  // stop markers are plain DOM elements: they do not depend on the map style (or tile servers) being loaded
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    ;(stops ?? []).forEach((s, i) => {
      const el = document.createElement('div')
      const pass = s.kind === 'pass'
      el.className = `gt-stop${s.overnight ? ' is-night' : ''}${pass ? ' is-pass' : ''}`
      el.innerHTML = `<span>${i + 1}</span>`
      el.title = s.name
      const popup = new maplibregl.Popup({ offset: 16, closeButton: true, maxWidth: '260px' }).setHTML(
        `<div style="padding:12px 14px"><div style="font-weight:700;font-size:14px">${i + 1}. ${esc(s.name)}</div>` +
          `<div style="font-size:12px;opacity:.75;margin-top:2px">${[s.day ? `დღე ${s.day}` : '', s.altitude_m ? `${s.altitude_m} მ` : '', s.overnight ? 'ღამისთევა' : ''].filter(Boolean).join(' · ')}</div>` +
          (s.description ? `<div style="font-size:12.5px;margin-top:6px;line-height:1.45">${esc(s.description)}</div>` : '') +
          `</div>`,
      )
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).setPopup(popup).addTo(map))
    })
  }, [stops])

  // marker that follows the elevation-profile cursor
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!hoverPoint) { hoverMarker.current?.remove(); hoverMarker.current = null; return }
    if (!hoverMarker.current) {
      const el = document.createElement('div')
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#fff;border:4px solid rgb(var(--blaze));box-shadow:0 1px 6px rgba(0,0,0,.4)'
      hoverMarker.current = new maplibregl.Marker({ element: el }).setLngLat(hoverPoint as [number, number]).addTo(map)
    } else hoverMarker.current.setLngLat(hoverPoint as [number, number])
  }, [hoverPoint])

  // fit to focus line / stops when they arrive
  const fitted = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || fitted.current) return
    const pts: number[][] = focusLine?.length ? focusLine : (stops ?? []).map((s) => [s.lng, s.lat])
    if (pts.length < 1) return
    fitted.current = true
    const b = new maplibregl.LngLatBounds()
    pts.forEach((p) => b.extend([p[0], p[1]]))
    if (pts.length === 1) map.jumpTo({ center: [pts[0][0], pts[0][1]], zoom: 13 })
    else map.fitBounds(b, { padding: 50, maxZoom: 14, duration: 0 })
  }, [focusLine, stops])

  function styleSources(dem: ReturnType<typeof getDem>) {
    return {
      demUrl: dem.sharedDemProtocolUrl,
      contourUrl: dem.contourProtocolUrl({
        multiplier: 1,
        thresholds: { 10: [200, 1000], 11: [100, 500], 12: [100, 500], 13: [50, 250], 14: [20, 100] },
        elevationKey: 'ele',
        levelKey: 'level',
        contourLayer: 'contours',
      }),
    }
  }

  function addOverlays(map: MLMap) {
    const { theme: th, base: bs } = latest.current
    const casing = routeCasingColor(th, bs)
    const colorExpr = ['match', ['get', 'difficulty'], 'easy', DIFF_HEX[th].easy, 'moderate', DIFF_HEX[th].moderate, 'hard', DIFF_HEX[th].hard, DIFF_HEX[th].expert] as unknown as string
    if (!map.getSource('gt-routes')) map.addSource('gt-routes', { type: 'geojson', data: emptyFC(), promoteId: 'id' })
    if (!map.getSource('gt-starts')) map.addSource('gt-starts', { type: 'geojson', data: emptyFC(), promoteId: 'id' })
    if (!map.getSource('gt-focus')) map.addSource('gt-focus', { type: 'geojson', data: emptyFC() })
    map.addLayer({ id: 'gt-routes-casing', type: 'line', source: 'gt-routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': casing, 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 7, 15, 10] } })
    map.addLayer({
      id: 'gt-routes-line', type: 'line', source: 'gt-routes', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': colorExpr,
        // zoom must be the top-level input (MapLibre rule), so the hover case sits inside each stop
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['boolean', ['feature-state', 'hover'], false], 4, 2.2], 12, ['case', ['boolean', ['feature-state', 'hover'], false], 6, 4], 15, ['case', ['boolean', ['feature-state', 'hover'], false], 8, 6]],
      },
    })
    map.addLayer({ id: 'gt-routes-hit', type: 'line', source: 'gt-routes', paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 } })
    map.addLayer({
      id: 'gt-starts', type: 'circle', source: 'gt-starts',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['boolean', ['feature-state', 'hover'], false], 7, 4.5], 12, ['case', ['boolean', ['feature-state', 'hover'], false], 9, 7]],
        'circle-color': colorExpr, 'circle-stroke-color': casing, 'circle-stroke-width': 2,
      },
    })
    map.addLayer({
      id: 'gt-route-labels', type: 'symbol', source: 'gt-starts', minzoom: 8.5,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': th === 'dark' || bs === 'satellite' ? '#ffffff' : '#1d2a22', 'text-halo-color': th === 'dark' || bs === 'satellite' ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.95)', 'text-halo-width': 1.5 },
    })
    map.addLayer({ id: 'gt-focus-casing', type: 'line', source: 'gt-focus', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': casing, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 14, 10] } })
    map.addLayer({ id: 'gt-focus-line', type: 'line', source: 'gt-focus', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': DIFF_HEX[th][latest.current.focusDifficulty], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 14, 6] } })
  }

  function syncOverlays(map: MLMap) {
    const { focusLine: fl, highlightId: hid } = latest.current
    ;(map.getSource('gt-routes') as GeoJSONSource | undefined)?.setData(routesFC)
    ;(map.getSource('gt-starts') as GeoJSONSource | undefined)?.setData(startsFC)
    ;(map.getSource('gt-focus') as GeoJSONSource | undefined)?.setData(
      fl && fl.length > 1 ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: fl.map((c) => [c[0], c[1]]) } }] } : emptyFC(),
    )
    if (hid !== undefined) {
      for (const f of routesFC.features) map.setFeatureState({ source: 'gt-routes', id: f.properties!.id as number }, { hover: f.properties!.id === hid })
      for (const f of startsFC.features) map.setFeatureState({ source: 'gt-starts', id: f.properties!.id as number }, { hover: f.properties!.id === hid })
    }
  }

  function bindInteractions(map: MLMap) {
    let hovered: number | null = null
    const setHover = (src: string, id: number | null) => {
      if (hovered !== null) {
        map.setFeatureState({ source: 'gt-routes', id: hovered }, { hover: false })
        map.setFeatureState({ source: 'gt-starts', id: hovered }, { hover: false })
      }
      hovered = id
      if (id !== null) map.setFeatureState({ source: src, id }, { hover: true })
    }
    for (const layer of ['gt-routes-hit', 'gt-starts']) {
      map.on('mousemove', layer, (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = e.features?.[0]
        if (f) setHover(layer === 'gt-starts' ? 'gt-starts' : 'gt-routes', Number(f.properties?.id))
      })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; setHover('gt-routes', null) })
      map.on('click', layer, (e: MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { slug: string; name: string; difficulty: Difficulty; days: string }
        if (latest.current.onRouteClick) { latest.current.onRouteClick(p.slug); return }
        new maplibregl.Popup({ offset: 10, maxWidth: '260px' })
          .setLngLat(e.lngLat)
          .setHTML(
            `<a href="/routes/${encodeURIComponent(p.slug)}" data-spa="1" style="display:block;padding:12px 14px;color:inherit;text-decoration:none">` +
              `<div style="font-weight:700;font-size:14px;line-height:1.3">${esc(p.name)}</div>` +
              `<div style="font-size:12px;opacity:.75;margin-top:3px">${DIFF_LABEL[p.difficulty]} · ${esc(p.days)}</div>` +
              `<div style="font-size:12.5px;font-weight:600;margin-top:8px;color:rgb(var(--forest))">მარშრუტის ნახვა →</div></a>`,
          )
          .addTo(map)
      })
    }
  }

  function applyTerrain(map: MLMap, on: boolean, animate: boolean) {
    try {
      if (on) {
        map.setTerrain({ source: 'dem', exaggeration: 1.35 })
        if (animate) map.easeTo({ pitch: 62, duration: 900 })
        else map.setPitch(62)
      } else {
        map.setTerrain(null)
        if (animate) map.easeTo({ pitch: 0, duration: 700 })
      }
    } catch { /* style not ready */ }
  }

  // links inside map popups navigate inside the app (no full page reload)
  const navigate = useNavigate()
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fn = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[data-spa]') as HTMLAnchorElement | null
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      if (document.fullscreenElement) document.exitFullscreen?.()
      navigate(a.getAttribute('href') || '/')
    }
    el.addEventListener('click', fn)
    return () => el.removeEventListener('click', fn)
  }, [navigate])

  // fullscreen on the wrapper (keeps our own buttons visible)
  useEffect(() => {
    const fn = () => { setFull(!!document.fullscreenElement); setTimeout(() => mapRef.current?.resize(), 50) }
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])
  const toggleFull = () => {
    if (!wrap.current) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else wrap.current.requestFullscreen?.()
  }

  return (
    <div ref={wrap} className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {/* inline position: maplibre-gl.css (loaded later) sets .maplibregl-map { position: relative }, which would beat a class and collapse the map to 0px height */}
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      {showControls && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line-2 bg-surface shadow-card">
            <button onClick={() => setBase('topo')} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold ${base === 'topo' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`} title="ტოპოგრაფიული რუკა">
              <Layers size={14} /> რუკა
            </button>
            <button onClick={() => setBase('satellite')} className={`px-2.5 py-1.5 text-xs font-semibold ${base === 'satellite' ? 'bg-forest text-on-forest' : 'text-ink-2 hover:bg-surface-2'}`} title="თანამგზავრული ხედი">
              თანამგზავრი
            </button>
          </div>
          <button onClick={() => setIs3D((v) => !v)} className={`flex items-center justify-center gap-1.5 rounded-lg border border-line-2 px-2.5 py-1.5 text-xs font-semibold shadow-card ${is3D ? 'bg-forest text-on-forest' : 'bg-surface text-ink-2 hover:bg-surface-2'}`} title="მთების 3D ხედი">
            <Mountain size={14} /> 3D
          </button>
          <button onClick={toggleFull} className="flex items-center justify-center rounded-lg border border-line-2 bg-surface px-2.5 py-1.5 text-ink-2 shadow-card hover:bg-surface-2" title={full ? 'დაპატარავება' : 'სრულ ეკრანზე'}>
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}
      {children}
    </div>
  )
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function daysText(r: MapRouteLine) {
  return r.days_min === r.days_max ? `${r.days_min} დღე` : `${r.days_min}–${r.days_max} დღე`
}

function toRoutesFC(routes: MapRouteLine[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.filter((r) => r.coords && r.coords.length > 1).map((r) => ({
      type: 'Feature',
      properties: { id: r.id, slug: r.slug, name: r.name, difficulty: r.difficulty, days: daysText(r) },
      geometry: { type: 'LineString', coordinates: r.coords!.map((c) => [c[0], c[1]]) },
    })),
  }
}

function toStartsFC(routes: MapRouteLine[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.filter((r) => r.start || r.coords?.length).map((r) => ({
      type: 'Feature',
      properties: { id: r.id, slug: r.slug, name: r.name, difficulty: r.difficulty, days: daysText(r) },
      geometry: { type: 'Point', coordinates: r.coords?.length ? [r.coords[0][0], r.coords[0][1]] : [r.start![0], r.start![1]] },
    })),
  }
}
