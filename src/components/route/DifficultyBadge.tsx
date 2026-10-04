import type { Difficulty } from '../../lib/types'
import { DIFF_LABEL } from '../../lib/difficulty'

/** Shape + colour, so difficulty never depends on colour alone. */
export function DiffShape({ d, size = 10 }: { d: Difficulty; size?: number }) {
  const fill = `rgb(var(--${d}))`
  if (d === 'easy') return <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden><circle cx="5" cy="5" r="4.5" fill={fill} /></svg>
  if (d === 'moderate') return <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden><rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1.2" fill={fill} /></svg>
  if (d === 'hard') return <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden><path d="M5 0.4 9.6 9.4H0.4Z" fill={fill} /></svg>
  return <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden><path d="M5 0 10 5 5 10 0 5Z" fill={fill} /></svg>
}

export default function DifficultyBadge({ d, size = 'md', solid = false }: { d: Difficulty; size?: 'sm' | 'md'; solid?: boolean }) {
  const cls = size === 'sm' ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
  if (solid) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cls}`} style={{ background: `rgb(var(--${d}))`, color: 'rgb(var(--on-diff))' }}>
        {DIFF_LABEL[d]}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border bg-surface font-semibold ${cls}`} style={{ borderColor: `rgb(var(--${d}) / 0.45)`, color: `rgb(var(--${d}))` }}>
      <DiffShape d={d} size={size === 'sm' ? 8 : 9} />
      {DIFF_LABEL[d]}
    </span>
  )
}
