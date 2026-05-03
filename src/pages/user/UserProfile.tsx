import { useState } from 'react'
import { Camera, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function UserProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', bio: 'მოგზაური, ლაშქრობის მოყვარული', phone: '', city: 'თბილისი' })
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-extrabold text-white">პროფილის რედაქტირება</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={user?.avatar} className="w-16 h-16 rounded-full object-cover ring-2 ring-green-500/30" />
          <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
            <Camera size={11} className="text-white" />
          </button>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{user?.name}</p>
          <p className="text-slate-500 text-xs">{user?.role === 'admin' ? 'ადმინისტრატორი' : 'მომხმარებელი'}</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
        {([
          ['name',  'სახელი'],
          ['email', 'ელ-ფოსტა'],
          ['phone', 'ტელეფონი'],
          ['city',  'ქალაქი'],
        ] as [keyof typeof form, string][]).map(([k, label]) => (
          <div key={k}>
            <label className="text-slate-400 text-xs block mb-1.5">{label}</label>
            <input value={form[k]} onChange={F(k)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
        ))}
        <div>
          <label className="text-slate-400 text-xs block mb-1.5">ბიოგრაფია</label>
          <textarea value={form.bio} onChange={F('bio')} rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: '#060c17', border: '1px solid #1a2640' }} />
        </div>
      </div>

      <button onClick={save}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: saved ? '#16a34a' : '#22c55e', color: '#080e1a' }}>
        <Save size={15} />
        {saved ? '✓ შენახულია!' : 'შენახვა'}
      </button>
    </div>
  )
}
