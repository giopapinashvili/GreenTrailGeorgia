import { Star } from 'lucide-react'

interface Props {
  value: number | null
  onChange?: (v: number) => void
  size?: number
}

export default function Stars({ value, onChange, size = 16 }: Props) {
  const v = value ?? 0
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={`შეფასება ${v} 5-დან`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(v)
        const star = <Star size={size} className={on ? 'fill-moderate text-moderate' : 'text-line-2'} />
        return onChange ? (
          <button key={i} type="button" onClick={() => onChange(i)} className="rounded p-0.5 hover:scale-110" aria-label={`${i} ვარსკვლავი`} role="radio" aria-checked={i === v}>
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        )
      })}
    </span>
  )
}
