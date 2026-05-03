import { Bell, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminHeader({ title }: { title: string }) {
  const { user } = useAuth()
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ borderColor: '#1a2640', background: '#060c17' }}>
      <h1 className="text-white font-bold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Search size={13} />
          <span>ძებნა…</span>
        </div>
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ background: '#0f1826' }}>
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer">
          <img src={user?.avatar} alt={user?.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-green-500/30" />
          <div className="hidden md:block">
            <p className="text-white text-xs font-semibold leading-none">{user?.name}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
