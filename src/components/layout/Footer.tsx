import { Mountain, Facebook, Instagram, Youtube } from 'lucide-react'
import { Link } from 'react-router-dom'

const partners = [
  'Georgia', 'Georgia Travel', 'TKT.GE', 'Booking.com', 'Tripadvisor', 'Liberty', 'Brand Hotel'
]

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1a2640', background: '#080e1a' }}>
      {/* Partners */}
      <div className="border-b py-5 px-4" style={{ borderColor: '#1a2640' }}>
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <span className="text-[11px] text-slate-500 uppercase tracking-widest shrink-0">ჩვენი პარტნიორები</span>
          {partners.map(p => (
            <span key={p} className="text-slate-400 text-sm font-semibold tracking-wide hover:text-white cursor-pointer transition-colors">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-[1440px] mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: '#22c55e' }}>
              <Mountain size={14} className="text-white" />
            </div>
            <div className="font-bold text-white text-sm">GreenTrail Georgia</div>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            ყველა ინფორმაცია ლაშქრობის, კემპინგის, სასტუმროების და გიდების შესახებ ერთ ადგილას.
          </p>
          <div className="flex items-center gap-3 mt-4">
            {[Facebook, Instagram, Youtube].map((Icon, i) => (
              <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ background: '#0f1826' }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-white text-xs font-semibold uppercase tracking-widest mb-3">მარშრუტები</p>
          {['ლაშქრობა', 'მანქანით', 'კემპინგი', 'ოჯახური', 'ექსპერტი'].map(item => (
            <Link key={item} to="/routes" className="block text-slate-500 text-xs py-1 hover:text-green-400 transition-colors">{item}</Link>
          ))}
        </div>
        <div>
          <p className="text-white text-xs font-semibold uppercase tracking-widest mb-3">ინფორმაცია</p>
          {['პოლიტიკა', 'წესები', 'კონტაქტი', 'API', 'პარტნიორობა'].map(item => (
            <a key={item} href="#" className="block text-slate-500 text-xs py-1 hover:text-green-400 transition-colors">{item}</a>
          ))}
        </div>
        <div>
          <p className="text-white text-xs font-semibold uppercase tracking-widest mb-3">გამოიწერე</p>
          <p className="text-slate-500 text-xs mb-3">მიიღე ახალი მარშრუტები და სიახლეები პირდაპირ ელ-ფოსტაზე.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="შენი ელ-ფოსტა"
              className="flex-1 px-3 py-2 text-xs rounded-lg text-white placeholder-slate-500 outline-none border"
              style={{ background: '#0f1826', borderColor: '#1a2640' }}
            />
            <button className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>
              →
            </button>
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: '#1a2640' }}>
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-slate-600 text-xs">GreenTrail Georgia © 2024 ყველა უფლება დაცულია</p>
          <div className="flex gap-4">
            {['პოლიტიკა', 'წესები', 'კონტაქტი'].map(item => (
              <a key={item} href="#" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
