import { Heart, MessageCircle, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { Story } from '../../types'

export default function StoryCard({ story }: { story: Story }) {
  const [liked, setLiked] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer group card-hover" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
      {/* Author row */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-green-500/20 shrink-0">
          <img src={story.avatar} alt={story.author} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-white text-xs font-semibold">{story.author}</p>
          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <MapPin size={9} className="text-green-400" />
            {story.location} · {story.timeAgo}
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="h-36 overflow-hidden">
        <img src={story.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>

      {/* Text */}
      <div className="p-4">
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{story.content}</p>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: '#1a2640' }}>
          <button
            onClick={() => setLiked(!liked)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: liked ? '#ef4444' : '#64748b' }}
          >
            <Heart size={13} fill={liked ? '#ef4444' : 'none'} stroke="currentColor" />
            {story.likes + (liked ? 1 : 0)}
          </button>
          <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <MessageCircle size={13} />
            {story.comments}
          </button>
        </div>
      </div>
    </div>
  )
}
