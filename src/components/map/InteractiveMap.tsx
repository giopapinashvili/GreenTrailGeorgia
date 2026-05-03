import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapLocation, MapRoute } from '../../types'

interface Props {
  locations: MapLocation[]
  routes: MapRoute[]
  filters: {
    trails: boolean
    camping: boolean
    hotels: boolean
    car: boolean
    fourX4: boolean
  }
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '© <a href="https://carto.com/">CARTO</a>'
const GEO_CENTER: [number, number] = [42.1, 43.4]
const GEO_ZOOM = 7

const TYPE_CONFIG: Record<string, { color: string; icon: string; size: number }> = {
  hike:    { color: '#22c55e', icon: '🥾', size: 36 },
  camp:    { color: '#f59e0b', icon: '⛺', size: 34 },
  hotel:   { color: '#3b82f6', icon: '🏨', size: 34 },
  scenic:  { color: '#a855f7', icon: '📸', size: 32 },
  historic:{ color: '#f97316', icon: '🏛️', size: 32 },
  city:    { color: '#94a3b8', icon: '🏙️', size: 30 },
  village: { color: '#64748b', icon: '🏘️', size: 28 },
}

const DIFF_COLOR: Record<string, string> = {
  easy:   '#22c55e',
  medium: '#eab308',
  hard:   '#ef4444',
}

function createMarker(loc: MapLocation): L.DivIcon {
  const cfg = TYPE_CONFIG[loc.type] ?? TYPE_CONFIG.village
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${cfg.size}px;height:${cfg.size}px;
        background:rgba(8,14,26,0.92);
        border:2px solid ${cfg.color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${cfg.size * 0.45}px;
        box-shadow:0 0 12px ${cfg.color}55;
        cursor:pointer;
        transition:transform .2s;
      ">${cfg.icon}</div>
    `,
    iconSize: [cfg.size, cfg.size],
    iconAnchor: [cfg.size / 2, cfg.size / 2],
  })
}

export default function InteractiveMap({ locations, routes, filters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylinesRef = useRef<L.Polyline[]>([])
  const [activeLocation, setActiveLocation] = useState<MapLocation | null>(null)

  /* init map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: GEO_CENTER,
      zoom: GEO_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  /* update markers when filters change */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const filterMap: Record<string, boolean> = {
      hike:    filters.trails,
      camp:    filters.camping,
      hotel:   filters.hotels,
      scenic:  filters.trails,
      historic:filters.trails,
      city:    true,
      village: true,
    }

    locations.forEach(loc => {
      if (!filterMap[loc.type]) return

      const marker = L.marker([loc.lat, loc.lng], { icon: createMarker(loc) })
      marker.on('click', () => setActiveLocation(loc))

      const cfg = TYPE_CONFIG[loc.type] ?? TYPE_CONFIG.village
      marker.bindPopup(`
        <div style="min-width:160px;padding:4px">
          <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:4px">${loc.nameKa}</div>
          <div style="font-size:12px;color:#94a3b8">${loc.name}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
            <span style="padding:2px 8px;border-radius:20px;font-size:11px;background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44">${loc.type}</span>
          </div>
        </div>
      `, { maxWidth: 220 })

      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [locations, filters])

  /* update polylines */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    polylinesRef.current.forEach(p => p.remove())
    polylinesRef.current = []

    routes.forEach(route => {
      const color = DIFF_COLOR[route.difficulty] ?? '#94a3b8'
      const line = L.polyline(route.coordinates, {
        color,
        weight: 3,
        opacity: 0.85,
        dashArray: '10 6',
      })
      line.bindTooltip(route.name, {
        permanent: false,
        className: 'leaflet-tooltip-dark',
        direction: 'top',
      })
      line.addTo(map)
      polylinesRef.current.push(line)
    })
  }, [routes, filters])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Map legend */}
      <div
        className="absolute bottom-4 left-4 rounded-xl p-3 text-xs space-y-1.5"
        style={{ background: 'rgba(8,14,26,0.9)', border: '1px solid #1a2640', zIndex: 999 }}
      >
        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2">სირთულე</p>
        {[
          { label: 'მარტივი', color: '#22c55e' },
          { label: 'საშუალო', color: '#eab308' },
          { label: 'რთული',  color: '#ef4444' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ background: color, borderBottom: `2px dashed ${color}` }} />
            <span className="text-slate-300">{label}</span>
          </div>
        ))}
      </div>

      {/* Active location pill */}
      {activeLocation && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e55', color: '#22c55e', zIndex: 999 }}
        >
          {activeLocation.nameKa}
          <button onClick={() => setActiveLocation(null)} className="text-green-400/60 hover:text-green-400 ml-1 text-xs">✕</button>
        </div>
      )}
    </div>
  )
}
