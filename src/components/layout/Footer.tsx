import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { LogoMark } from './Logo'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-serif text-lg font-bold">GreenTrail Georgia</span>
          </div>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-2">
            საქართველოს სალაშქრო მარშრუტები, მოლაშქრეების ისტორიები და რჩევები — ერთ ადგილას.
          </p>
        </div>
        <div>
          <p className="kicker mb-3">მარშრუტები</p>
          <ul className="space-y-2 text-[14px]">
            <li><Link to="/routes" className="text-ink-2 hover:text-forest">ყველა მარშრუტი</Link></li>
            <li><Link to="/map" className="text-ink-2 hover:text-forest">რუკა</Link></li>
            <li><Link to="/planner" className="text-ink-2 hover:text-forest">მოგზაურობის დაგეგმვა</Link></li>
            <li><Link to="/guides" className="text-ink-2 hover:text-forest">გიდები და ტურები</Link></li>
          </ul>
        </div>
        <div>
          <p className="kicker mb-3">საზოგადოება</p>
          <ul className="space-y-2 text-[14px]">
            <li><Link to="/blog" className="text-ink-2 hover:text-forest">ბლოგი</Link></li>
            <li><Link to="/tips" className="text-ink-2 hover:text-forest">რჩევები და უსაფრთხოება</Link></li>
            <li><Link to="/settings/guide" className="text-ink-2 hover:text-forest">გახდი გიდი</Link></li>
            <li><Link to="/about" className="text-ink-2 hover:text-forest">წესები და კონფიდენციალურობა</Link></li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="flex items-center gap-2 font-semibold text-ink"><Phone size={16} className="text-blaze" /> საგანგებო ნომერი: 112</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            მთაში გასვლამდე ახლობელს უთხარი მარშრუტი და დაბრუნების დრო. გაჭირვებისას დარეკე 112-ზე.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="page flex flex-col gap-2 py-5 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} GreenTrail Georgia</span>
          <span>რუკა: © OpenStreetMap-ის მონაწილეები · OpenFreeMap · რელიეფი: Terrain Tiles (AWS) · თანამგზავრი: Esri</span>
        </div>
      </div>
    </footer>
  )
}
