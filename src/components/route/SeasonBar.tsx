import { monthShort } from '../../lib/format'

export default function SeasonBar({ months, current = new Date().getMonth() + 1, compact = false }: { months: number[]; current?: number; compact?: boolean }) {
  const set = new Set(months)
  return (
    <div className="grid grid-cols-12 gap-1" aria-label="საუკეთესო სეზონი">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const on = set.has(m)
        return (
          <div key={m} className="flex flex-col items-center gap-1">
            <div
              className={`h-2.5 w-full rounded-sm ${on ? 'bg-forest' : 'bg-surface-3'} ${m === current ? 'ring-2 ring-blaze/70 ring-offset-1 ring-offset-surface' : ''}`}
              title={on ? `${monthShort(m)} — კარგი დროა` : monthShort(m)}
            />
            {!compact && <span className={`text-[10px] ${m === current ? 'font-bold text-ink' : 'text-ink-3'}`}>{monthShort(m)}</span>}
          </div>
        )
      })}
    </div>
  )
}
