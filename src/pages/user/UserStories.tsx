import { useState } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import StoryCard from '../../components/common/StoryCard'
import { stories } from '../../data/mockData'
import Modal from '../../components/admin/Modal'

export default function UserStories() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ content: '', location: '' })
  const myStories = stories.slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white mb-1">ჩემი ისტორიები</h1>
          <p className="text-slate-500 text-sm">{myStories.length} ისტორია</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#22c55e', color: '#080e1a' }}>
          <Plus size={14} /> ახალი ისტორია
        </button>
      </div>

      {myStories.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <BookOpen size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">ჯერ ისტორია არ გაქვს</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myStories.map(s => <StoryCard key={s.id} story={s} />)}
        </div>
      )}

      <Modal title="ახალი ისტორია" open={modal} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">ლოკაცია</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="მაგ: ყაზბეგი"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">შენი ისტორია</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5} placeholder="მოგვიყევი შენი მოგზაურობის შესახებ…"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">ფოტოს URL (სურვილისამებრ)</label>
            <input placeholder="https://…"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#060c17', border: '1px solid #1a2640' }} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10">გაუქმება</button>
            <button onClick={() => setModal(false)} className="px-5 py-2 rounded-xl text-xs font-semibold" style={{ background: '#22c55e', color: '#080e1a' }}>გამოქვეყნება</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
