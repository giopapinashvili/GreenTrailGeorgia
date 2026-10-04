import { useMemo, useRef, useState } from 'react'
import { num } from '../../lib/format'

interface Props {
  profile: number[][] // [km, m]
  markers?: { km: number; label: string }[]
  onHover?: (km: number | null) => void
  height?: number
}

/** Elevation profile as an SVG area chart; hovering reports the km position (to move a dot on the map). */
export default function ElevationProfile({ profile, markers = [], onHover, height = 170 }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const W = 800
  const H = height
  const pad = { l: 44, r: 12, t: 12, b: 24 }

  const geo = useMemo(() => {
    const kms = profile.map((p) => p[0])
    const eles = profile.map((p) => p[1])
    const maxKm = Math.max(...kms, 0.1)
    const minE = Math.min(...eles)
    const maxE = Math.max(...eles)
    const span = Math.max(100, maxE - minE)
    const lo = Math.floor((minE - span * 0.08) / 100) * 100
    const hi = Math.ceil((maxE + span * 0.08) / 100) * 100
    const x = (km: number) => pad.l + (km / maxKm) * (W - pad.l - pad.r)
    const y = (m: number) => pad.t + (1 - (m - lo) / (hi - lo)) * (H - pad.t - pad.b)
    const line = profile.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')
    const area = `${line} L${x(maxKm).toFixed(1)},${H - pad.b} L${pad.l},${H - pad.b} Z`
    const step = niceStep((hi - lo) / 4)
    const yTicks: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(v)
    const xStep = niceStep(maxKm / 6)
    const xTicks: number[] = []
    for (let v = 0; v <= maxKm + 1e-6; v += xStep) xTicks.push(v)
    return { x, y, line, area, yTicks, xTicks, maxKm, lo, hi }
  }, [profile, H])

  if (profile.length < 2) return null

  const atKm = (km: number) => {
    let best = profile[0]
    for (const p of profile) if (Math.abs(p[0] - km) < Math.abs(best[0] - km)) best = p
    return best
  }

  const move = (clientX: number) => {
    const svg = ref.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    const km = Math.max(0, Math.min(geo.maxKm, ((px - pad.l) / (W - pad.l - pad.r)) * geo.maxKm))
    setHover(km)
    onHover?.(km)
  }
  const leave = () => { setHover(null); onHover?.(null) }
  const hp = hover !== null ? atKm(hover) : null

  return (
    <div className="relative select-none">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        onMouseMove={(e) => move(e.clientX)}
        onMouseLeave={leave}
        onTouchStart={(e) => move(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={leave}
        role="img"
        aria-label="სიმაღლის პროფილი"
      >
        <defs>
          <linearGradient id="ep-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--forest))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--forest))" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {geo.yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={geo.y(v)} y2={geo.y(v)} stroke="rgb(var(--line))" strokeWidth="1" />
            <text x={pad.l - 6} y={geo.y(v) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--ink-3))">{num(v)}</text>
          </g>
        ))}
        {geo.xTicks.map((v) => (
          <text key={v} x={geo.x(v)} y={H - 6} textAnchor="middle" fontSize="11" fill="rgb(var(--ink-3))">{num(v, v < 10 ? 1 : 0)} კმ</text>
        ))}
        <path d={geo.area} fill="url(#ep-fill)" />
        <path d={geo.line} fill="none" stroke="rgb(var(--forest))" strokeWidth="2" strokeLinejoin="round" />
        {markers.map((m, i) => (
          <g key={i}>
            <line x1={geo.x(m.km)} x2={geo.x(m.km)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--ink-3))" strokeDasharray="3 3" strokeWidth="1" />
            <circle cx={geo.x(m.km)} cy={pad.t + 7} r="8" fill="rgb(var(--surface))" stroke="rgb(var(--ink))" strokeWidth="1.5" />
            <text x={geo.x(m.km)} y={pad.t + 11} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--ink))">{i + 1}</text>
          </g>
        ))}
        {hp && (
          <g>
            <line x1={geo.x(hp[0])} x2={geo.x(hp[0])} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--blaze))" strokeWidth="1.5" />
            <circle cx={geo.x(hp[0])} cy={geo.y(hp[1])} r="5" fill="rgb(var(--blaze))" stroke="rgb(var(--surface))" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute right-2 top-1 rounded-md border border-line bg-surface/95 px-2 py-1 text-xs font-semibold text-ink shadow-card">
          {num(hp[0], 1)} კმ · {num(hp[1])} მ
        </div>
      )}
    </div>
  )
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
