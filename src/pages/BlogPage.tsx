const posts = [
  { id: 1, title: 'სვანეთის ზაფხული: სრული სახელმძღვანელო', date: '15 მაისი, 2024', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', category: 'სახელმძღვანელო', readTime: '8 წთ' },
  { id: 2, title: 'კახეთის ღვინის ტური: 5 საუკეთესო მარშრუტი', date: '10 მაისი, 2024', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80', category: 'ტური', readTime: '6 წთ' },
  { id: 3, title: 'ყაზბეგის ზამთარი: ყველაფერი, რაც უნდა იცოდე', date: '5 მაისი, 2024', image: 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600&q=80', category: 'ლაშქრობა', readTime: '10 წთ' },
  { id: 4, title: 'ლაშქრობა კემპინგით: 10 საჭირო ნივთი', date: '1 მაისი, 2024', image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&q=80', category: 'რჩევები', readTime: '5 წთ' },
]

export default function BlogPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">ბლოგი</h1>
        <p className="text-slate-400">სტატიები, სახელმძღვანელოები და მოგზაურობის რჩევები</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {posts.map(post => (
          <article key={post.id} className="rounded-2xl overflow-hidden cursor-pointer group card-hover" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
            <div className="h-44 overflow-hidden">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  {post.category}
                </span>
                <span className="text-slate-600 text-[10px]">{post.readTime} წაკითხვა</span>
              </div>
              <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{post.title}</h3>
              <p className="text-slate-600 text-[11px] mt-2">{post.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
