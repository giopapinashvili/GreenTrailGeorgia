import { useState } from 'react'
import CrudTable from '../../components/admin/CrudTable'
import { reviews as initial } from '../../data/mockData'
import type { Review } from '../../types'
import StarRating from '../../components/common/StarRating'
import { CheckCircle, XCircle } from 'lucide-react'

interface ReviewRow extends Review { status: 'approved' | 'pending' | 'flagged' }

const enriched: ReviewRow[] = initial.map((r, i) => ({
  ...r,
  status: (['approved', 'pending', 'flagged'] as const)[i % 3],
}))

const S: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'დამტკ.' },
  pending:  { bg: 'rgba(234,179,8,0.12)',   color: '#eab308', label: 'მოლოდ.' },
  flagged:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'ფლაგი' },
}

export default function AdminReviews() {
  const [data, setData] = useState<ReviewRow[]>([...enriched, ...enriched.map(r => ({ ...r, id: r.id + 100 })), ...enriched.map(r => ({ ...r, id: r.id + 200 }))])

  const approve = (r: ReviewRow) => setData(d => d.map(x => x.id === r.id ? { ...x, status: 'approved' } : x))
  const del = (r: ReviewRow) => { if (confirm('წაშლა?')) setData(d => d.filter(x => x.id !== r.id)) }

  return (
    <CrudTable
      data={data} title="შეფასებები"
      onDelete={del}
      searchKeys={['author', 'target', 'comment'] as (keyof ReviewRow)[]}
      columns={[
        { key: 'author', label: 'ავტორი', render: r => (
          <div className="flex items-center gap-2">
            <img src={r.avatar} className="w-7 h-7 rounded-full object-cover" />
            <p className="text-white">{r.author}</p>
          </div>
        )},
        { key: 'target', label: 'ობიექტი', render: r => <span className="text-slate-300">{r.target}</span> },
        { key: 'rating', label: 'ვარ.', render: r => <StarRating value={r.rating} size={12} /> },
        { key: 'comment', label: 'კომენტარი', render: r => <p className="text-slate-400 max-w-xs truncate">{r.comment}</p> },
        { key: 'timeAgo', label: 'თარიღი' },
        { key: 'status', label: 'სტ.', render: r => {
          const s = S[r.status]
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
        }},
        { key: 'id', label: 'მოდ.', render: r => r.status !== 'approved' ? (
          <button onClick={() => approve(r)} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-[10px]">
            <CheckCircle size={12} /> დამტ.
          </button>
        ) : <span className="text-slate-600 text-[10px]">✓</span> },
      ]}
    />
  )
}
