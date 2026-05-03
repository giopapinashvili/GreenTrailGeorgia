import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import Modal from '../../components/admin/Modal'
import { guides as initial } from '../../data/mockData'
import type { Guide } from '../../types'

export default function AdminGuides() {
  const [data, setData] = useState<Guide[]>(initial)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Partial<Guide>>({})
  const [editId, setEditId] = useState<number | null>(null)

  const openAdd = () => { setForm({ name: '', specialty: '', rating: 4.5, reviews: 0, avatar: '', type: 'individual', verified: false }); setModal('add') }
  const openEdit = (g: Guide) => { setForm(g); setEditId(g.id); setModal('edit') }
  const close = () => { setModal(null); setForm({}); setEditId(null) }

  const save = () => {
    if (modal === 'add') setData(d => [...d, { ...form, id: Date.now() } as Guide])
    else setData(d => d.map(g => g.id === editId ? { ...g, ...form } as Guide : g))
    close()
  }

  const del = (g: Guide) => { if (confirm(`წაშლა: ${g.name}?`)) setData(d => d.filter(x => x.id !== g.id)) }
  const F = (k: keyof Guide) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <CrudTable
        data={data} title="გიდები" addLabel="+ ახალი გიდი"
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        searchKeys={['name', 'specialty'] as (keyof Guide)[]}
        columns={[
          { key: 'name', label: 'გიდი', render: g => (
            <div className="flex items-center gap-2.5">
              <img src={g.avatar} className="w-8 h-8 rounded-full object-cover ring-2 ring-green-500/20" />
              <div>
                <p className="text-white font-medium">{g.name}</p>
                <p className="text-slate-500 text-[10px]">{g.specialty}</p>
              </div>
            </div>
          )},
          { key: 'type', label: 'ტიპი', render: g => (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: g.type === 'individual' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', color: g.type === 'individual' ? '#3b82f6' : '#f59e0b' }}>
              {g.type === 'individual' ? 'ინდივიდი' : 'კომპანია'}
            </span>
          )},
          { key: 'rating', label: 'რეიტინგი', render: g => <span className="text-yellow-400 font-bold">★ {g.rating} <span className="text-slate-500 font-normal">({g.reviews})</span></span> },
          { key: 'verified', label: 'სტატუსი', render: g => (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: g.verified ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: g.verified ? '#22c55e' : '#64748b' }}>
              {g.verified ? '✓ დამოწმებული' : 'მოლოდინში'}
            </span>
          )},
        ]}
      />

      <Modal title={modal === 'add' ? 'ახალი გიდი' : 'გიდის რედაქტირება'} open={!!modal} onClose={close}>
        <div className="space-y-3">
          {([['name','სახელი'],['specialty','სპეციალობა'],['avatar','ავატარის URL']] as [keyof Guide,string][]).map(([k,label]) => (
            <div key={k}>
              <label className="text-slate-400 text-[11px] block mb-1">{label}</label>
              <input value={String(form[k] ?? '')} onChange={F(k)} className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ background: '#060c17', border: '1px solid #1a2640' }} />
            </div>
          ))}
          <div>
            <label className="text-slate-400 text-[11px] block mb-1">ტიპი</label>
            <select value={form.type ?? 'individual'} onChange={F('type')} className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ background: '#060c17', border: '1px solid #1a2640' }}>
              <option value="individual">ინდივიდი</option>
              <option value="company">კომპანია</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all">გაუქმება</button>
          <button onClick={save} className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>{modal === 'add' ? 'დამატება' : 'შენახვა'}</button>
        </div>
      </Modal>
    </>
  )
}
