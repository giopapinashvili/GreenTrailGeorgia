import { useState } from 'react'
import { Save, Lock } from 'lucide-react'

export default function UserSettings() {
  const [notifs, setNotifs] = useState({ email: true, newRoute: true, replies: false, newsletter: true })
  const [saved, setSaved] = useState(false)

  const toggle = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }))
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-extrabold text-white">პარამეტრები</h1>

      {/* Notifications */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
        <p className="text-white font-bold text-sm mb-2">შეტყობინებები</p>
        {[
          { k: 'email'      as const, label: 'ელ-ფოსტის შეტყობინებები' },
          { k: 'newRoute'   as const, label: 'ახალი მარშრუტების შეტყობინება' },
          { k: 'replies'    as const, label: 'პასუხები ჩემს კომენტარებზე' },
          { k: 'newsletter' as const, label: 'სიახლეების გამოწერა' },
        ].map(({ k, label }) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-slate-300 text-sm">{label}</span>
            <button onClick={() => toggle(k)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{ background: notifs[k] ? '#22c55e' : '#1a2640' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: notifs[k] ? '22px' : '2px' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Password */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
        <p className="text-white font-bold text-sm flex items-center gap-2"><Lock size={14} className="text-green-400" />პაროლის შეცვლა</p>
        {['მიმდინარე პაროლი', 'ახალი პაროლი', 'ახ. პაროლის დადასტურება'].map(label => (
          <div key={label}>
            <label className="text-slate-400 text-xs block mb-1.5">{label}</label>
            <input type="password" className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
        ))}
      </div>

      <button onClick={save}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: saved ? '#16a34a' : '#22c55e', color: '#080e1a' }}>
        <Save size={15} />
        {saved ? '✓ შენახულია!' : 'შენახვა'}
      </button>
    </div>
  )
}
