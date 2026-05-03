import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import Modal from '../../components/admin/Modal'
import { routes as initial } from '../../data/mockData'
import type { Route, Difficulty, Category } from '../../types'

const DIFF_COLOR: Record<string, string> = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' }
const DIFF_LABEL: Record<string, string> = { easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული' }

const empty: Omit<Route, 'id'> = {
  title: '', titleKa: '', location: '', difficulty: 'easy', duration: '',
  distance: 0, elevation: 0, rating: 4.5, reviews: 0,
  image: '', category: 'hiking', description: '', lat: 0, lng: 0,
}

export default function AdminRoutes() {
  const [data, setData] = useState<Route[]>(initial)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Partial<Route>>({})
  const [editId, setEditId] = useState<number | null>(null)

  const openAdd = () => { setForm(empty); setModal('add') }
  const openEdit = (r: Route) => { setForm(r); setEditId(r.id); setModal('edit') }
  const close = () => { setModal(null); setForm({}); setEditId(null) }

  const save = () => {
    if (modal === 'add') {
      setData(d => [...d, { ...empty, ...form, id: Date.now() } as Route])
    } else {
      setData(d => d.map(r => r.id === editId ? { ...r, ...form } as Route : r))
    }
    close()
  }

  const del = (r: Route) => { if (confirm(`წაშლა: ${r.titleKa}?`)) setData(d => d.filter(x => x.id !== r.id)) }

  const F = (k: keyof Route) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <CrudTable
        data={data}
        title="მარშრუტები"
        addLabel="+ ახალი მარშრუტი"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={del}
        searchKeys={['title', 'titleKa', 'location'] as (keyof Route)[]}
        columns={[
          {
            key: 'image', label: 'ფოტო',
            render: r => (
              <div className="w-10 h-8 rounded-lg overflow-hidden">
                <img src={r.image} alt="" className="w-full h-full object-cover" />
              </div>
            ),
          },
          {
            key: 'titleKa', label: 'სახელი',
            render: r => (
              <div>
                <p className="text-white font-medium">{r.titleKa}</p>
                <p className="text-slate-500 text-[10px]">{r.title}</p>
              </div>
            ),
          },
          { key: 'location', label: 'ლოკაცია' },
          {
            key: 'difficulty', label: 'სირთულე',
            render: r => (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${DIFF_COLOR[r.difficulty]}18`, color: DIFF_COLOR[r.difficulty] }}>
                {DIFF_LABEL[r.difficulty]}
              </span>
            ),
          },
          { key: 'duration', label: 'ხანგრძლივობა' },
          {
            key: 'rating', label: 'რეიტინგი',
            render: r => <span className="text-yellow-400 font-bold">★ {r.rating}</span>,
          },
          {
            key: 'category', label: 'სტატუსი',
            render: () => (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                აქტიური
              </span>
            ),
          },
        ]}
      />

      <Modal title={modal === 'add' ? 'ახალი მარშრუტი' : 'მარშრუტის რედაქტირება'} open={!!modal} onClose={close} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {([
            ['titleKa', 'სახელი (ქართ.)'],
            ['title',   'სახელი (ინგლ.)'],
            ['location','ლოკაცია'],
            ['duration','ხანგრძლივობა'],
            ['distance','მანძილი (კმ)'],
            ['elevation','სიმაღლე (მ)'],
          ] as [keyof Route, string][]).map(([k, label]) => (
            <div key={k}>
              <label className="text-slate-400 text-[11px] block mb-1">{label}</label>
              <input value={String(form[k] ?? '')} onChange={F(k)}
                className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
                style={{ background: '#060c17', border: '1px solid #1a2640' }} />
            </div>
          ))}
          <div>
            <label className="text-slate-400 text-[11px] block mb-1">სირთულე</label>
            <select value={form.difficulty ?? 'easy'} onChange={F('difficulty')}
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }}>
              <option value="easy">მარტივი</option>
              <option value="medium">საშუალო</option>
              <option value="hard">რთული</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-[11px] block mb-1">კატეგორია</label>
            <select value={form.category ?? 'hiking'} onChange={F('category')}
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }}>
              <option value="hiking">ლაშქრობა</option>
              <option value="car">მანქანით</option>
              <option value="camping">კემპინგი</option>
              <option value="family">ოჯახური</option>
              <option value="expert">ექსპერტი</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-slate-400 text-[11px] block mb-1">სურათის URL</label>
            <input value={String(form.image ?? '')} onChange={F('image')}
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
          <div className="col-span-2">
            <label className="text-slate-400 text-[11px] block mb-1">აღწერა</label>
            <textarea value={String(form.description ?? '')} onChange={F('description')} rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all">გაუქმება</button>
          <button onClick={save} className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>
            {modal === 'add' ? 'დამატება' : 'შენახვა'}
          </button>
        </div>
      </Modal>
    </>
  )
}
