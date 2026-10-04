import { initials } from '../../lib/format'

interface Props {
  url?: string | null
  name: string
  size?: number
  className?: string
}

const TINTS = ['#2f6b47', '#6b8a3a', '#2e6e9e', '#9a5b2e', '#7b4f8c', '#3d7f7a', '#a0452e']

export default function Avatar({ url, name, size = 36, className = '' }: Props) {
  const tint = TINTS[Math.abs(hash(name)) % TINTS.length]
  if (url) {
    return <img src={url} alt={name} width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`} style={{ width: size, height: size }} />
  }
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}
      style={{ width: size, height: size, background: tint, fontSize: Math.max(11, size * 0.38) }}
      aria-label={name}
    >
      {initials(name).toUpperCase()}
    </span>
  )
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
