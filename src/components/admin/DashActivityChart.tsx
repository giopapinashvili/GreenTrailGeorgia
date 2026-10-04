import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { monthShort, num } from '../../lib/format'

export interface ActivityDay {
  day: string // YYYY-MM-DD
  posts: number
  users: number
}

// Two series on one shared count axis. moss + sky is the token pair that keeps the two
// series apart for colour-blind readers in both themes; text always stays in ink tokens.
const SERIES = [
  { key: 'posts', label: 'პოსტები', unit: 'პოსტი', color: 'rgb(var(--moss))' },
  { key: 'users', label: 'ახალი მომხმარებლები', unit: 'ახალი მომხმარებელი', color: 'rgb(var(--sky))' },
] as const

const H = 210
const PAD = { l: 36, r: 6, t: 12, b: 26 }

/** Parses YYYY-MM-DD without time-zone shifts. */
function dayLabel(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return m && d ? `${d} ${monthShort(m)}` : iso
}

function useWidth(ref: RefObject<HTMLElement>) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(Math.round(el.getBoundingClientRect().width))
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => setW(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

function niceStep(raw: number) {
  if (raw <= 1) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const x = raw / p
  return Math.max(1, (x <= 1 ? 1 : x <= 2 ? 2 : x <= 5 ? 5 : 10) * p)
}

/** Column with a 4px rounded data-end and a square base. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0 || w <= 0) return ''
  const r = Math.min(4, w / 2, h)
  const b = y + h
  return `M${x},${b}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${b}Z`
}

/** Daily posts and new users for the last 30 days, as grouped columns with a hover read-out and a table twin. */
export default function DashActivityChart({ data }: { data: ActivityDay[] }) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)
  const [hover, setHover] = useState<number | null>(null)

  const totals = useMemo(() => ({
    posts: data.reduce((s, d) => s + d.posts, 0),
    users: data.reduce((s, d) => s + d.users, 0),
  }), [data])

  const geo = useMemo(() => {
    const n = Math.max(1, data.length)
    const plotW = Math.max(10, width - PAD.l - PAD.r)
    const plotH = H - PAD.t - PAD.b
    const maxVal = Math.max(0, ...data.map((d) => Math.max(d.posts, d.users)))
    const step = maxVal <= 4 ? 1 : niceStep(maxVal / 4)
    const yMax = Math.max(4, Math.ceil(maxVal / step) * step)
    const ticks: number[] = []
    for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v)
    const band = plotW / n
    const inner = Math.max(2, band * 0.78)
    const barW = Math.max(1, Math.min(12, (inner - 2) / 2)) // 2px surface gap between the pair
    const y = (v: number) => PAD.t + plotH - (v / yMax) * plotH
    const x0 = (i: number) => PAD.l + i * band + (band - (barW * 2 + 2)) / 2
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 62))))
    return { n, plotW, plotH, band, barW, y, x0, ticks, every }
  }, [data, width])

  const pick = (clientX: number) => {
    const el = box.current
    if (!el || !data.length) return
    const x = clientX - el.getBoundingClientRect().left - PAD.l
    const i = Math.floor(x / geo.band)
    setHover(i >= 0 && i < data.length ? i : null)
  }

  const hd = hover !== null ? data[hover] : null
  // the read-out sits beside the hovered column (never on top of it)
  const colLeft = hover !== null ? PAD.l + hover * geo.band : 0
  const tipStyle = colLeft + geo.band / 2 > width / 2
    ? { right: Math.max(0, width - colLeft + 6), top: PAD.t }
    : { left: colLeft + geo.band + 6, top: PAD.t }
  const empty = totals.posts === 0 && totals.users === 0

  return (
    <div>
      {/* legend: identity never depends on colour alone */}
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="font-semibold text-ink">{num(totals[s.key])}</span>
          </span>
        ))}
      </div>

      <div ref={box} className="relative" style={{ height: H }}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            className="block touch-pan-y select-none"
            role="img"
            aria-label={`ბოლო 30 დღე: ${num(totals.posts)} პოსტი და ${num(totals.users)} ახალი მომხმარებელი`}
            onPointerMove={(e) => pick(e.clientX)}
            onPointerDown={(e) => pick(e.clientX)}
            onPointerLeave={() => setHover(null)}
          >
            {geo.ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={width - PAD.r} y1={geo.y(v)} y2={geo.y(v)} stroke="rgb(var(--line))" strokeWidth="1" shapeRendering="crispEdges" />
                <text x={PAD.l - 8} y={geo.y(v) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--ink-3))" style={{ fontVariantNumeric: 'tabular-nums' }}>{num(v)}</text>
              </g>
            ))}
            {hover !== null && (
              <rect x={PAD.l + hover * geo.band} y={PAD.t} width={geo.band} height={geo.plotH} fill="rgb(var(--surface-3))" opacity="0.55" />
            )}
            {data.map((d, i) => {
              const x = geo.x0(i)
              return (
                <g key={d.day}>
                  <path d={barPath(x, geo.y(d.posts), geo.barW, geo.y(0) - geo.y(d.posts))} fill={SERIES[0].color} />
                  <path d={barPath(x + geo.barW + 2, geo.y(d.users), geo.barW, geo.y(0) - geo.y(d.users))} fill={SERIES[1].color} />
                </g>
              )
            })}
            {data.map((d, i) => {
              if ((data.length - 1 - i) % geo.every !== 0) return null
              const last = i === data.length - 1
              const x = last ? width - PAD.r : PAD.l + i * geo.band + geo.band / 2
              return (
                <text key={d.day} x={x} y={H - 7} textAnchor={last ? 'end' : 'middle'} fontSize="11" fill="rgb(var(--ink-3))">{dayLabel(d.day)}</text>
              )
            })}
          </svg>
        )}

        {empty && width > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] text-ink-3">ბოლო 30 დღეში ახალი პოსტი ან მომხმარებელი არ ყოფილა.</p>
        )}

        {hd && (
          <div className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-pop" style={tipStyle}>
            <p className="mb-1 font-semibold text-ink-2">{dayLabel(hd.day)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2 leading-6">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
                <b className="text-[14px] text-ink">{num(hd[s.key])}</b>
                <span className="text-ink-3">{s.unit}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink-3 hover:text-ink-2">ცხრილად ნახვა</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
              <tr>
                <th className="px-3 py-1.5 font-semibold">დღე</th>
                <th className="px-3 py-1.5 text-right font-semibold">პოსტები</th>
                <th className="px-3 py-1.5 text-right font-semibold">ახალი მომხმარებლები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {[...data].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="px-3 py-1.5 text-ink-2">{dayLabel(d.day)}</td>
                  <td className="px-3 py-1.5 text-right text-ink">{num(d.posts)}</td>
                  <td className="px-3 py-1.5 text-right text-ink">{num(d.users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
