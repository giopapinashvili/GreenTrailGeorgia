import { useState } from 'react'
import { Save, Globe, Bell, Shield, Palette } from 'lucide-react'

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    siteName: 'GreenTrail Georgia',
    siteEmail: 'contact@greentrail.ge',
    allowRegistration: true,
    requireApproval: false,
    emailNotifications: true,
    maintenanceMode: false,
    primaryColor: '#22c55e',
    maxUploadSize: '5',
  })

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const sections = [
    {
      icon: Globe, title: 'ზოგადი პარამეტრები',
      fields: [
        { key: 'siteName', label: 'საიტის სახელი', type: 'text' },
        { key: 'siteEmail', label: 'ადმინ ელ-ფოსტა', type: 'email' },
        { key: 'maxUploadSize', label: 'მაქს. ატვირთვა (MB)', type: 'number' },
      ],
    },
    {
      icon: Shield, title: 'უსაფრთხოება',
      toggles: [
        { key: 'allowRegistration', label: 'რეგისტრაციის დაშვება' },
        { key: 'requireApproval', label: 'ისტორიების დამტკიცება' },
        { key: 'maintenanceMode', label: 'ტექნიკური განახლების რეჟიმი' },
      ],
    },
    {
      icon: Bell, title: 'შეტყობინებები',
      toggles: [
        { key: 'emailNotifications', label: 'ელ-ფოსტის შეტყობინებები' },
      ],
    },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      {sections.map(sec => {
        const Icon = sec.icon
        return (
          <div key={sec.title} className="rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
            <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: '#1a2640' }}>
              <Icon size={15} className="text-green-400" />
              <p className="text-white font-bold text-sm">{sec.title}</p>
            </div>
            <div className="p-5 space-y-4">
              {sec.fields?.map(f => (
                <div key={f.key}>
                  <label className="text-slate-400 text-xs block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={String(form[f.key as keyof typeof form])}
                    onChange={F(f.key as keyof typeof form)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#060c17', border: '1px solid #1a2640' }}
                  />
                </div>
              ))}
              {sec.toggles?.map(t => (
                <div key={t.key} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{t.label}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key as keyof typeof f] }))}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: form[t.key as keyof typeof form] ? '#22c55e' : '#1a2640' }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: form[t.key as keyof typeof form] ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button
        onClick={save}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: saved ? '#16a34a' : '#22c55e', color: '#080e1a' }}
      >
        <Save size={15} />
        {saved ? '✓ შენახულია!' : 'შენახვა'}
      </button>
    </div>
  )
}
