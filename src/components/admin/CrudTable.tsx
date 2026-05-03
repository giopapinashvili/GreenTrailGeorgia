import { useState, type ReactNode } from 'react'
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
}

interface Props<T extends { id: number }> {
  data: T[]
  columns: Column<T>[]
  title: string
  addLabel?: string
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  searchKeys?: (keyof T)[]
}

const PAGE_SIZE = 8

export default function CrudTable<T extends { id: number }>({
  data, columns, title, addLabel, onAdd, onEdit, onDelete, searchKeys = [],
}: Props<T>) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = data.filter(row =>
    searchKeys.some(k => String(row[k]).toLowerCase().includes(q.toLowerCase()))
  )
  const total = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1a2640' }}>
        <div className="flex items-center gap-3">
          <p className="text-white font-bold text-sm">{title}</p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400" style={{ background: '#060c17', border: '1px solid #1a2640' }}>
            <Search size={12} className="text-green-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="ძებნა…"
              className="bg-transparent outline-none w-32 placeholder-slate-600 text-white"
            />
            {q && <button onClick={() => setQ('')}><X size={11} className="text-slate-500 hover:text-white" /></button>}
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#22c55e', color: '#080e1a' }}
              onMouseOver={e => (e.currentTarget.style.background = '#16a34a')}
              onMouseOut={e => (e.currentTarget.style.background = '#22c55e')}
            >
              <Plus size={12} /> {addLabel ?? 'დამატება'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid #1a2640' }}>
              {columns.map(c => (
                <th key={c.key} className="text-left px-5 py-3 text-slate-500 font-semibold whitespace-nowrap">{c.label}</th>
              ))}
              {(onEdit || onDelete) && <th className="text-right px-5 py-3 text-slate-500 font-semibold">მოქმედება</th>}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="text-center py-12 text-slate-600">ჩანაწერი ვერ მოიძებნა</td></tr>
            ) : paged.map(row => (
              <tr key={row.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1a2640' }}>
                {columns.map(c => (
                  <td key={c.key} className="px-5 py-3 text-slate-300 whitespace-nowrap">
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                          <Pencil size={12} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: '#1a2640' }}>
          <span className="text-slate-500 text-[11px]">{filtered.length} ჩანაწერი · გვ. {page}/{total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-all">
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page === total}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-all">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
