interface Tab<T extends string> { id: T; label: string; count?: number }

export default function Tabs<T extends string>({ tabs, value, onChange, className = '' }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`scrollbar-none flex gap-1 overflow-x-auto border-b border-line ${className}`} role="tablist">
      {tabs.map((t) => {
        const on = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition-colors ${on ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-3">{t.count}</span>}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-forest" />}
          </button>
        )
      })}
    </div>
  )
}
