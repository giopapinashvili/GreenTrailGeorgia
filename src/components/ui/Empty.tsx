import type { ReactNode } from 'react'

interface Props {
  title: string
  text?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  compact?: boolean
}

export default function Empty({ title, text, action, icon, compact }: Props) {
  return (
    <div className={`topo-texture overflow-hidden rounded-xl border border-dashed border-line-2 bg-surface text-center ${compact ? 'px-5 py-8' : 'px-6 py-14'}`}>
      {icon && <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-forest">{icon}</div>}
      <p className="font-serif text-lg font-bold text-ink">{title}</p>
      {text && <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
