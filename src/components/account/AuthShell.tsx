import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff, Info, TriangleAlert } from 'lucide-react'
import { LogoMark } from '../layout/Logo'

/** Centered narrow card on a contour background, used by every sign-in related page. */
export default function AuthShell({ title, text, children, footer }: { title: ReactNode; text?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="page sm:py-8">
      <div className="topo-texture -mx-4 flex justify-center overflow-hidden px-3 py-8 sm:mx-0 sm:rounded-2xl sm:border sm:border-line sm:px-6 sm:py-16">
        <div className="w-full max-w-[420px]">
          <div className="card p-5 shadow-card sm:p-7">
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="kicker">GreenTrail Georgia</span>
            </div>
            <h1 className="mt-5 text-[26px] leading-tight sm:text-[28px]">{title}</h1>
            {text && <div className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{text}</div>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-[14px] text-ink-2">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

/** Label + control + hint/error, wired up for screen readers (`<id>-msg` is the description id). */
export function AuthField({ id, label, hint, error, aside, children }: { id: string; label: string; hint?: ReactNode; error?: string | null; aside?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">{label}</label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-[13px] text-hard">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1 text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

/** Password input with a show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function PasswordInput({ className = '', ...props }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input ref={ref} {...props} type={show ? 'text' : 'password'} className={`input pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-3 hover:text-ink"
        aria-label={show ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
        aria-pressed={show}
        title={show ? 'დამალვა' : 'ჩვენება'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
})

/** Small inline message box inside auth forms. */
export function AuthNotice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const warn = tone === 'warn'
  return (
    <div
      role={warn ? 'alert' : 'status'}
      className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13.5px] leading-relaxed text-ink ${warn ? 'border-moderate/40 bg-moderate/10' : 'border-line bg-surface-2'}`}
    >
      {warn ? <TriangleAlert size={17} className="mt-0.5 shrink-0 text-moderate" /> : <Info size={17} className="mt-0.5 shrink-0 text-forest" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
