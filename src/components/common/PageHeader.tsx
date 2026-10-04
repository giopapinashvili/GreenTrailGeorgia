import type { ReactNode } from 'react'

/** Title block used at the top of listing pages. */
export default function PageHeader({ kicker, title, text, actions, className = '' }: { kicker?: string; title: ReactNode; text?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10 ${className}`}>
      <div className="max-w-2xl">
        {kicker && <p className="kicker mb-2 flex items-center gap-2"><span className="blaze" />{kicker}</p>}
        <h1 className="text-[30px] leading-tight sm:text-[36px]">{title}</h1>
        {text && <p className="mt-2 text-[15.5px] text-ink-2">{text}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
