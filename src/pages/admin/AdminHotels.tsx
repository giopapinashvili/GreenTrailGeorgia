import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import Modal from '../../components/admin/Modal'
import { hotels as initial } from '../../data/mockData'
import type { Hotel } from '../../types'

const empty: Omit<Hotel, 'id'> = { name: '', location: '', price: 0, currency: '₾', rating: 4.0, reviews: 0, image: '', lat: 0, lng: 0 }

export default function AdminHotels() {
  const [data, setData] = useState<Hotel[]>(initial)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Partial<Hotel>>({})
  const [editId, setEditId] = useState<number | null>(null)

  const openAdd = () => { setForm(empty); setModal('add') }
  const openEdit = (h: Hotel) => { setForm(h); setEditId(h.id); setModal('edit') }
  const close = () => { setModal(null); setForm({}); setEditId(null) }

  const save = () => {
    if (modal === 'add') setData(d => [...d, { ...empty, ...form, id: Date.now() } as Hotel])
    else setData(d => d.map(h => h.id === editId ? { ...h, ...form } as Hotel : h))
    close()
  }

  const del = (h: Hotel) => { if (confirm(`წაშლა: ${h.name}?`)) setData(d => d.filter(x => x.id !== h.id)) }
  const F = (k: keyof Hotel) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <CrudTable
        data={data} title="სასტუმროები" addLabel="+ ახალი სასტუმრო"
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        searchKeys={['name', 'location'] as (keyof Hotel)[]}
        columns={[
          { key: 'image', label: 'ფოტო', render: h => <div className="w-12 h-9 rounded-lg overflow-hidden"><img src={h.image} className="w-full h-full object-cover" /></div> },
          { key: 'name', label: 'სახელი', render: h => <div><p className="text-white font-medium">{h.name}</p><p className="text-slate-500 text-[10px]">{h.location}</p></div> },
          { key: 'price', label: 'ფასი', render: h => <span className="text-green-400 font-bold">{h.price} {h.currency}/დღე</span> },
          { key: 'rating', label: 'რეიტინგი', render: h => <span className="text-yellow-400 font-bold">★ {h.rating} <span className="text-slate-500 font-normal">({h.reviews})</span></span> },
          { key: 'featured', label: 'სტატუსი', render: h => <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: h.featured ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: h.featured ? '#22c55e' : '#64748b' }}>{h.featured ? 'გამორჩეული' : 'სტანდარტი'}</span> },
        ]}
      />

      <Modal title={modal === 'add' ? 'ახალი სასტუმრო' : 'სასტუმროს რედაქტირება'} open={!!modal} onClose={close}>
        <div className="space-y-3">
          {([['name','სახელი'],['location','ლოკაცია'],['price','ფასი/დღე'],['image','სურათის URL']] as [keyof Hotel, string][]).map(([k, label]) => (
            <div key={k}>
              <label className="text-slate-400 text-[11px] block mb-1">{label}</label>
              <input value={String(form[k] ?? '')} onChange={F(k)} className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ background: '#060c17', border: '1px solid #1a2640' }} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all">გაუქმება</button>
          <button onClick={save} className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>{modal === 'add' ? 'დამატება' : 'შენახვა'}</button>
        </div>
      </Modal>
    </>
  )
}
