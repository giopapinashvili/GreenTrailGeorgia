import { useMemo } from 'react'

/** A generated topographic "map" used when a route has no photo yet. Deterministic per seed. */
export default function TopoCover({ seed, label, className = '' }: { seed: string; label?: string; className?: string }) {
  const paths = useMemo(() => contours(seed), [seed])
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="400" height="300" fill="rgb(var(--surface-2))" />
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke="rgb(var(--forest))" strokeOpacity={p.major ? 0.38 : 0.18} strokeWidth={p.major ? 1.6 : 0.9} />
        ))}
        <path d={trail(seed)} fill="none" stroke="rgb(var(--blaze))" strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" opacity="0.85" />
      </svg>
      {label && (
        <div className="absolute bottom-3 left-3 rounded-md bg-surface/85 px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-2 backdrop-blur-sm">{label}</div>
      )}
    </div>
  )
}

function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function contours(seed: string) {
  const r = rng(seed)
  const peaks = Array.from({ length: 2 + Math.floor(r() * 2) }, () => ({ x: 60 + r() * 280, y: 40 + r() * 220, s: 0.8 + r() * 0.6 }))
  const out: { d: string; major: boolean }[] = []
  for (const pk of peaks) {
    const rings = 7 + Math.floor(r() * 5)
    const wob = Array.from({ length: 6 }, () => r() * Math.PI * 2)
    for (let k = 1; k <= rings; k++) {
      const radius = k * 14 * pk.s
      const pts: string[] = []
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2
        const n = 1 + 0.16 * Math.sin(3 * t + wob[0]) + 0.1 * Math.sin(5 * t + wob[1]) + 0.06 * Math.sin(7 * t + wob[2] + k * 0.3)
        pts.push(`${(pk.x + Math.cos(t) * radius * n * 1.25).toFixed(1)},${(pk.y + Math.sin(t) * radius * n).toFixed(1)}`)
      }
      out.push({ d: 'M' + pts.join(' L') + 'Z', major: k % 4 === 0 })
    }
  }
  return out
}

function trail(seed: string) {
  const r = rng(seed + 'trail')
  let x = 20, y = 220 + r() * 50
  const pts = [`M${x},${y}`]
  for (let i = 0; i < 7; i++) {
    x += 45 + r() * 15
    y += (r() - 0.6) * 70
    y = Math.max(30, Math.min(280, y))
    pts.push(`Q${(x - 20).toFixed(0)},${(y + (r() - 0.5) * 60).toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`)
  }
  return pts.join(' ')
}
