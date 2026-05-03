import RouteCard from '../../components/common/RouteCard'
import { routes } from '../../data/mockData'
import { Bookmark } from 'lucide-react'

export default function UserSaved() {
  const saved = routes.slice(0, 4)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white mb-1">შენახული მარშრუტები</h1>
        <p className="text-slate-500 text-sm">{saved.length} მარშრუტი</p>
      </div>

      {saved.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Bookmark size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">შენახული მარშრუტი არ გაქვს</p>
          <p className="text-slate-600 text-sm mt-1">დაიწყე მარშრუტების შენახვა ♡ ღილაკით</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {saved.map(r => <RouteCard key={r.id} route={r} />)}
        </div>
      )}
    </div>
  )
}
