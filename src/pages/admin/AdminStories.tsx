import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import { stories as initial } from '../../data/mockData'
import type { Story } from '../../types'
import { Heart, MessageCircle, CheckCircle, XCircle } from 'lucide-react'

interface StoryRow extends Story { status: 'approved' | 'pending' | 'rejected' }

const enriched: StoryRow[] = initial.map((s, i) => ({
  ...s,
  status: (['approved', 'pending', 'approved', 'rejected'] as const)[i % 4],
}))

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'დამტკიცებული' },
  pending:  { bg: 'rgba(234,179,8,0.12)',   color: '#eab308', label: 'მოლოდინში' },
  rejected: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'უარყოფილი' },
}

export default function AdminStories() {
  const [data, setData] = useState<StoryRow[]>(enriched)

  const approve = (s: StoryRow) => setData(d => d.map(x => x.id === s.id ? { ...x, status: 'approved' } : x))
  const reject  = (s: StoryRow) => setData(d => d.map(x => x.id === s.id ? { ...x, status: 'rejected' } : x))
  const del     = (s: StoryRow) => { if (confirm(`წაშლა?`)) setData(d => d.filter(x => x.id !== s.id)) }

  return (
    <div className="space-y-4">
      <CrudTable
        data={data} title="მოგზაურების ისტორიები"
        onDelete={del}
        searchKeys={['author', 'location', 'content'] as (keyof StoryRow)[]}
        columns={[
          { key: 'image', label: 'ფოტო', render: s => <div className="w-12 h-9 rounded-lg overflow-hidden"><img src={s.image} className="w-full h-full object-cover" /></div> },
          { key: 'author', label: 'ავტორი', render: s => (
            <div className="flex items-center gap-2">
              <img src={s.avatar} className="w-7 h-7 rounded-full object-cover" />
              <div><p className="text-white">{s.author}</p><p className="text-slate-500 text-[10px]">{s.location} · {s.timeAgo}</p></div>
            </div>
          )},
          { key: 'content', label: 'ტექსტი', render: s => <p className="text-slate-400 max-w-xs truncate">{s.content}</p> },
          { key: 'likes', label: 'სტატ.', render: s => (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1"><Heart size={11} />{s.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle size={11} />{s.comments}</span>
            </div>
          )},
          { key: 'status', label: 'სტატუსი', render: s => {
            const st = STATUS_STYLE[s.status]
            return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          }},
          { key: 'id', label: 'მოდ.', render: s => (
            <div className="flex gap-1">
              {s.status !== 'approved' && (
                <button onClick={() => approve(s)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-500/10 transition-all text-green-400" title="დამტკიცება"><CheckCircle size={14} /></button>
              )}
              {s.status !== 'rejected' && (
                <button onClick={() => reject(s)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-red-400" title="უარყოფა"><XCircle size={14} /></button>
              )}
            </div>
          )},
        ]}
      />
    </div>
  )
}
