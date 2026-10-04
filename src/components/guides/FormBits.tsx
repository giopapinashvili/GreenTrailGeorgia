import { len } from './tourUtils'

/** "123/500" character counter for text areas (turns red past the limit). */
export function Counter({ value, max }: { value: string; max: number }) {
  const n = len(value)
  return (
    <span className={`text-[12px] font-normal tabular-nums ${n > max ? 'text-hard' : 'text-ink-3'}`} aria-live="polite">
      {n}/{max}
    </span>
  )
}

/** `.input` with a red border when the field has an error. */
export const inputCls = (error?: string | null, extra = '') => `input ${error ? 'border-hard' : ''} ${extra}`.trim()
