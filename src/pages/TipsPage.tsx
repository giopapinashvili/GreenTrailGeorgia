import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, PhoneCall } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import TopoCover from '../components/route/TopoCover'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useArticles } from '../lib/queries'
import { usePageTitle } from '../lib/title'
import { ARTICLE_CAT } from './HomePage'

export default function TipsPage() {
  usePageTitle('რჩევები')
  const articles = useArticles()
  const [cat, setCat] = useState<string>('')
  const list = (articles.data ?? []).filter((a) => a.status === 'published' && (!cat || a.category === cat))
  const cats = Object.keys(ARTICLE_CAT).filter((c) => (articles.data ?? []).some((a) => a.category === c))

  return (
    <div className="page pb-16">
      <PageHeader
        kicker="რჩევები და ინფორმაცია"
        title="სანამ მთაში წახვალ"
        text="უსაფრთხოება, აღჭურვილობა, ტრანსპორტი, საშვები და სეზონები — ყველაფერი, რაც ლაშქრობის დაგეგმვისას გამოგადგება."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-hard/30 bg-hard/5 p-4">
        <PhoneCall size={20} className="mt-0.5 shrink-0 text-hard" />
        <p className="text-[14.5px] text-ink">
          <b>გადაუდებელი დახმარება საქართველოში — 112.</b> <span className="text-ink-2">წასვლამდე ვინმეს უთხარი შენი მარშრუტი და დაბრუნების დრო.</span>
        </p>
      </div>

      {cats.length > 1 && (
        <div className="scrollbar-none mb-6 flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCat('')} className={`chip shrink-0 ${!cat ? 'chip-on' : ''}`}>ყველა</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`chip shrink-0 ${cat === c ? 'chip-on' : ''}`}>{ARTICLE_CAT[c]}</button>)}
        </div>
      )}

      {articles.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
      ) : list.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="სტატიები ჯერ არ არის" text="მალე დავამატებთ." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Link key={a.id} to={`/tips/${a.slug}`} className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
              <div className="aspect-[16/9] overflow-hidden">
                {a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <TopoCover seed={a.slug} className="h-full w-full" label={ARTICLE_CAT[a.category]} />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="kicker">{ARTICLE_CAT[a.category]}</p>
                <h2 className="mt-1.5 text-[19px] leading-snug group-hover:text-forest">{a.title}</h2>
                <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{a.excerpt}</p>
                <span className="mt-auto pt-4 text-[13px] font-semibold text-forest">წაკითხვა →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
