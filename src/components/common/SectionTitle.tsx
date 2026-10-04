import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

export default function SectionTitle({ kicker, title, to, linkLabel = 'ყველა', children }: { kicker?: string; title: ReactNode; to?: string; linkLabel?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="kicker mb-1.5 flex items-center gap-2"><span className="blaze" />{kicker}</p>}
        <h2 className="text-[26px] sm:text-[30px]">{title}</h2>
        {children}
      </div>
      {to && (
        <Link to={to} className="hidden shrink-0 items-center gap-1.5 text-[14px] font-semibold text-forest hover:underline sm:inline-flex">
          {linkLabel} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  )
}
