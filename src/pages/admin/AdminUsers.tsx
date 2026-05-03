import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import Modal from '../../components/admin/Modal'
import { Shield, UserCheck } from 'lucide-react'

interface UserRow {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  avatar: string
  joinedAt: string
  status: 'active' | 'banned'
  stories: number
  reviews: number
}

const MOCK: UserRow[] = [
  { id: 1, name: 'Admin Giorgi', email: 'admin@greentrail.ge', role: 'admin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&q=80', joinedAt: '2024-01-01', status: 'active', stories: 12, reviews: 34 },
  { id: 2, name: 'Nino Beridze', email: 'user@greentrail.ge', role: 'user', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&q=80', joinedAt: '2024-03-15', status: 'active', stories: 5, reviews: 18 },
  { id: 3, name: 'Levan Kvariani', email: 'levan@gmail.com', role: 'user', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&q=80', joinedAt: '2024-04-02', status: 'active', stories: 3, reviews: 7 },
  { id: 4, name: 'Tamara Gelashvili', email: 'tamara@gmail.com', role: 'user', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&q=80', joinedAt: '2024-04-10', status: 'banned', stories: 1, reviews: 2 },
  { id: 5, name: 'Sandro Mgebrishvili', email: 'sandro@gmail.com', role: 'user', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=60&q=80', joinedAt: '2024-04-18', status: 'active', stories: 8, reviews: 22 },
]

export default function AdminUsers() {
  const [data, setData] = useState<UserRow[]>(MOCK)
  const [selected, setSelected] = useState<UserRow | null>(null)

  const toggleStatus = (u: UserRow) =>
    setData(d => d.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'banned' : 'active' } : x))

  const toggleRole = (u: UserRow) =>
    setData(d => d.map(x => x.id === u.id ? { ...x, role: x.role === 'admin' ? 'user' : 'admin' } : x))

  const del = (u: UserRow) => { if (confirm(`წაშლა: ${u.name}?`)) setData(d => d.filter(x => x.id !== u.id)) }

  return (
    <>
      <CrudTable
        data={data} title="მომხმარებლები"
        onEdit={setSelected} onDelete={del}
        searchKeys={['name', 'email'] as (keyof UserRow)[]}
        columns={[
          { key: 'name', label: 'მომხმარებელი', render: u => (
            <div className="flex items-center gap-2.5">
              <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
              <div><p className="text-white font-medium">{u.name}</p><p className="text-slate-500 text-[10px]">{u.email}</p></div>
            </div>
          )},
          { key: 'role', label: 'როლი', render: u => (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit" style={{ background: u.role === 'admin' ? 'rgba(168,85,247,0.12)' : 'rgba(59,130,246,0.12)', color: u.role === 'admin' ? '#a855f7' : '#3b82f6' }}>
              {u.role === 'admin' ? <Shield size={9} /> : <UserCheck size={9} />}
              {u.role === 'admin' ? 'ადმინი' : 'მომხმარებელი'}
            </span>
          )},
          { key: 'status', label: 'სტატუსი', render: u => (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: u.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: u.status === 'active' ? '#22c55e' : '#ef4444' }}>
              {u.status === 'active' ? 'აქტიური' : 'დაბლოკილი'}
            </span>
          )},
          { key: 'stories', label: 'ისტ.', render: u => <span className="text-slate-400">{u.stories}</span> },
          { key: 'reviews', label: 'შეფ.', render: u => <span className="text-slate-400">{u.reviews}</span> },
          { key: 'joinedAt', label: 'თარიღი' },
        ]}
      />

      <Modal title="მომხმარებლის მართვა" open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#060c17' }}>
              <img src={selected.avatar} className="w-14 h-14 rounded-full object-cover" />
              <div>
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-slate-400 text-xs">{selected.email}</p>
                <p className="text-slate-500 text-[10px] mt-0.5">დარეგ.: {selected.joinedAt}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { toggleStatus(selected); setSelected(null) }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: selected.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: selected.status === 'active' ? '#ef4444' : '#22c55e', border: `1px solid ${selected.status === 'active' ? '#ef444433' : '#22c55e33'}` }}>
                {selected.status === 'active' ? 'დაბლოკვა' : 'განბლოკვა'}
              </button>
              <button onClick={() => { toggleRole(selected); setSelected(null) }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                {selected.role === 'admin' ? 'ადმინის მოხსნა' : 'ადმინად დანიშვნა'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
