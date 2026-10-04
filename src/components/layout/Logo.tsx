import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="rgb(var(--forest))" />
      <path d="M8 48 L24 22 L32 34 L40 20 L56 48 Z" fill="rgb(var(--bg))" />
      <rect x="26" y="50" width="12" height="3" rx="1" fill="rgb(var(--blaze))" />
      <rect x="26" y="53" width="12" height="3" fill="#fff" />
      <rect x="26" y="56" width="12" height="3" rx="1" fill="rgb(var(--blaze))" />
    </svg>
  )
}

export default function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="GreenTrail Georgia — მთავარი">
      <LogoMark />
      <span className="leading-none">
        <span className="block font-serif text-[17px] font-bold tracking-tight text-ink">GreenTrail</span>
        <span className="block text-[10.5px] font-semibold tracking-[0.18em] text-ink-3" style={{ textTransform: 'uppercase' }}>საქართველო</span>
      </span>
    </Link>
  )
}
