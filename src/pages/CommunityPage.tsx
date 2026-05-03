import { Plus } from 'lucide-react'
import StoryCard from '../components/common/StoryCard'
import { stories } from '../data/mockData'

export default function CommunityPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">მოგზაურების ისტორიები</h1>
          <p className="text-slate-400">გაუზიარე შენი გამოცდილება და შთააგონე სხვები</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#22c55e', color: '#080e1a' }}
        >
          <Plus size={15} />
          ისტორიის დამატება
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...stories, ...stories].map((s, i) => (
          <StoryCard key={`${s.id}-${i}`} story={s} />
        ))}
      </div>
    </div>
  )
}
