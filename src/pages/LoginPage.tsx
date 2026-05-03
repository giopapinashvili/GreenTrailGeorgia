import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mountain, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register(form.name, form.email, form.password)
    setLoading(false)
    if (!result.ok) { setError(result.error ?? 'შეცდომა'); return }
    navigate('/dashboard')
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#080e1a' }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#22c55e' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#3b82f6' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
            <Mountain size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">GreenTrail Georgia</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'login' ? 'შედი შენს ანგარიშში' : 'შექმენი ახალი ანგარიში'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={mode === m ? { background: '#22c55e', color: '#080e1a' } : { color: '#64748b' }}
            >
              {m === 'login' ? '🔑 შესვლა' : '✨ რეგისტრაცია'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="rounded-2xl p-6 space-y-4" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          {mode === 'register' && (
            <div>
              <label className="text-slate-400 text-xs block mb-1.5">სახელი</label>
              <input value={form.name} onChange={F('name')} required placeholder="შენი სახელი"
                className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600"
                style={{ background: '#060c17', border: '1px solid #1a2640' }} />
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">ელ-ფოსტა</label>
            <input value={form.email} onChange={F('email')} required type="email" placeholder="email@example.com"
              className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">პაროლი</label>
            <div className="relative">
              <input value={form.password} onChange={F('password')} required type={showPass ? 'text' : 'password'} placeholder="••••••••"
                className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600 pr-10"
                style={{ background: '#060c17', border: '1px solid #1a2640' }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ background: '#22c55e', color: '#080e1a', opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : mode === 'login' ? (
              <><LogIn size={15} /> შესვლა</>
            ) : (
              <><UserPlus size={15} /> რეგისტრაცია</>
            )}
          </button>

          {/* Demo hint */}
          <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-slate-400 font-semibold">Demo ანგარიშები:</p>
            <p className="text-slate-500">👑 Admin: <span className="text-green-400">admin@greentrail.ge</span> / <span className="text-green-400">admin123</span></p>
            <p className="text-slate-500">👤 User: <span className="text-green-400">user@greentrail.ge</span> / <span className="text-green-400">user123</span></p>
          </div>
        </form>

        <p className="text-center text-slate-600 text-xs mt-4">
          <Link to="/" className="text-slate-500 hover:text-green-400 transition-colors">← მთავარ გვერდზე დაბრუნება</Link>
        </p>
      </div>
    </div>
  )
}
