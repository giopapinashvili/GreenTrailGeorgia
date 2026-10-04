import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Empty from '../components/ui/Empty'
import { PageSpinner } from '../components/ui/Spinner'
import { Markdown } from '../lib/md'
import { useArticle, useArticles } from '../lib/queries'
import { formatDate } from '../lib/format'
import { usePageTitle } from '../lib/title'
import { ARTICLE_CAT } from './HomePage'

export default function ArticlePage() {
  const { slug } = useParams()
  const article = useArticle(slug)
  const all = useArticles()
  const a = article.data
  usePageTitle(a?.title ?? (article.isLoading ? null : 'სტატია ვერ მოიძებნა'))

  if (article.isLoading) return <PageSpinner />
  if (!a) {
    return <div className="page py-16"><Empty title="სტატია ვერ მოიძებნა" action={<Link to="/tips" className="btn-primary">ყველა რჩევა</Link>} /></div>
  }
  const more = (all.data ?? []).filter((x) => x.id !== a.id && x.status === 'published').slice(0, 4)

  return (
    <div className="page pb-16 pt-6">
      <Link to="/tips" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3 hover:text-ink"><ChevronLeft size={15} /> რჩევები</Link>
      <div className="mt-4 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 max-w-3xl">
          <p className="kicker flex items-center gap-2"><span className="blaze" />{ARTICLE_CAT[a.category]}</p>
          <h1 className="mt-2 text-[30px] leading-tight sm:text-[38px]">{a.title}</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{a.excerpt}</p>
          {a.cover_url && (
            <figure className="mt-6 overflow-hidden rounded-xl">
              <img src={a.cover_url} alt="" className="w-full object-cover" />
              {a.cover_credit && <figcaption className="mt-1.5 text-[12px] text-ink-3">ფოტო: {a.cover_credit}</figcaption>}
            </figure>
          )}
          <Markdown text={a.body} className="prose-gt mt-6" />
          <p className="mt-10 border-t border-line pt-4 text-[13px] text-ink-3">განახლდა: {formatDate(a.updated_at)}. ინფორმაცია ზოგადია — კონკრეტული მარშრუტის დეტალები მის გვერდზე ნახე.</p>
        </article>
        <aside className="space-y-4">
          <p className="kicker">სხვა რჩევები</p>
          {more.map((x) => (
            <Link key={x.id} to={`/tips/${x.slug}`} className="card block p-4 transition-shadow hover:shadow-pop">
              <p className="text-[12px] font-semibold text-ink-3">{ARTICLE_CAT[x.category]}</p>
              <p className="mt-1 font-serif text-[16px] font-bold leading-snug hover:text-forest">{x.title}</p>
            </Link>
          ))}
          <Link to="/routes" className="btn-secondary w-full">მარშრუტების ნახვა</Link>
        </aside>
      </div>
    </div>
  )
}
