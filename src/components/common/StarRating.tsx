interface Props {
  value: number
  max?: number
  size?: number
}

export default function StarRating({ value, max = 5, size = 12 }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1l1.85 3.75 4.15.6-3 2.93.71 4.13L8 10.25l-3.71 1.96.71-4.13L2 5.35l4.15-.6z"
            fill={i < Math.round(value) ? '#eab308' : '#1e2d3d'}
            stroke={i < Math.round(value) ? '#eab308' : '#2d3f5a'}
            strokeWidth="0.5"
          />
        </svg>
      ))}
    </span>
  )
}
