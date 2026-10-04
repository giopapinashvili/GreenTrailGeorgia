import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/title'

export default function NotFound() {
  usePageTitle('გვერდი ვერ მოიძებნა')
  return (
    <div className="page py-16">
      <div className="topo-texture mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-surface px-6 py-14 text-center">
        <p className="font-serif text-[64px] font-bold leading-none text-forest">404</p>
        <h1 className="mt-4 text-[26px]">ეს ბილიკი აქ მთავრდება</h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">გვერდი, რომელსაც ეძებ, არ არსებობს ან სხვაგან გადავიდა.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn-primary">მთავარი</Link>
          <Link to="/routes" className="btn-secondary">მარშრუტები</Link>
          <Link to="/map" className="btn-ghost">რუკა</Link>
        </div>
      </div>
    </div>
  )
}
