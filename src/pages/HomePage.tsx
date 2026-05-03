import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Map, Footprints, Car, Tent, Users, Star, Brain, Shield, History, ChevronRight } from 'lucide-react'
import InteractiveMap from '../components/map/InteractiveMap'
import MapFilters from '../components/map/MapFilters'
import RouteCard from '../components/common/RouteCard'
import HotelCard from '../components/common/HotelCard'
import GuideCard from '../components/common/GuideCard'
import StoryCard from '../components/common/StoryCard'
import ReviewCard from '../components/common/ReviewCard'
import { routes, hotels, guides, stories, reviews, mapLocations, mapRoutes } from '../data/mockData'

const CATS = [
  { id: 'all',     label: 'ყველა',          icon: Map },
  { id: 'hiking',  label: 'ლაშქრობა',       icon: Footprints },
  { id: 'car',     label: 'მანქანით',        icon: Car },
  { id: 'camping', label: 'კემპინგი',        icon: Tent },
  { id: 'family',  label: 'ოჯახური',         icon: Users },
  { id: 'expert',  label: 'ექსპერტისთვის',  icon: Star },
]

const STATS = [
  { value: '1250+', label: 'მარშრუტი' },
  { value: '890+',  label: 'ადგილი' },
  { value: '530+',  label: 'სასტუმრო' },
  { value: '420+',  label: 'გიდი' },
]

const FEATURES = [
  {
    icon: Brain,
    color: '#22c55e',
    title: 'AI მარშრუტის დაგეგმვა',
    desc: 'მოგვიყევი სად გინდა წასვლა და ჩვენ შევქმნით სრულ მარშრუტს შენთვის',
    cta: 'დაგეგმე მარშრუტი',
    bg: 'linear-gradient(135deg,rgba(22,163,74,0.15),rgba(34,197,94,0.05))',
  },
  {
    icon: History,
    color: '#f59e0b',
    title: 'ისტორიული ადგილები',
    desc: 'აღმოაჩინე საქართველოს ისტორიული მნიშვნელობის ძეგლები',
    cta: 'ნახე მეტი',
    bg: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,179,8,0.05))',
  },
  {
    icon: Shield,
    color: '#3b82f6',
    title: 'უსაფრთხოების რჩევები',
    desc: 'მნიშვნელოვანი რჩევები, საფრთხის ზონები, სასარგებლო ნომრები',
    cta: 'ნახე სახელმძღვანელო',
    bg: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(99,102,241,0.05))',
  },
  {
    icon: Map,
    color: '#a855f7',
    title: 'სასარგებლო ინდორსები',
    desc: 'ამინდი, ქვეყანა, ბომბი, ნველა და სხვა',
    cta: 'ნახე ყველა',
    bg: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(139,92,246,0.05))',
  },
]

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [activecat, setActiveCat] = useState('all')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [filters, setFilters] = useState({
    trails: true,
    camping: true,
    hotels: true,
    car: true,
    fourX4: true,
  })

  const filteredRoutes = routes.filter(r =>
    activecat === 'all' || r.category === activecat
  )

  const handleAI = () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResult('')
    setTimeout(() => {
      setAiLoading(false)
      setAiResult(`📍 **${aiQuery}**-ისთვის შემოთავაზებული მარშრუტი:\n\n🥾 დღე 1: ბათუმი → გოდერძი გადადება (3სთ)\n🏕️ კემპინგი: გოდერძის მწვერვალთან\n🥾 დღე 2: გოდერძი → ახალციხე (4სთ)\n🏨 სასტუმრო: Green Canyon Hotel — 120₾\n\n✅ საუკეთესო სეზონი: ივნისი–სექტემბერი\n⚠️ საჭირო: 4×4 მანქანა, ზამთრის ქური`)
    }, 1500)
  }

  return (
    <div>
      {/* ===== HERO — Map + Sidebar ===== */}
      <section className="max-w-[1440px] mx-auto px-4 pt-4 pb-2">
        {/* Hero text (mobile only, hidden on large) */}
        <div className="lg:hidden mb-4">
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
            ადმოაჰინე<br />საქართველო
          </h1>
          <p className="text-slate-400 text-sm">ისტორია, ბუნება, მარშრუტები და შენიშვნები ერთ სივრცეში</p>
        </div>

        <div className="flex gap-4" style={{ height: 460 }}>
          {/* Map area */}
          <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ background: '#0f1826', border: '1px solid #1a2640', minWidth: 0 }}>
            {/* Hero overlay text (desktop) */}
            <div className="hidden lg:block absolute top-6 left-6 z-10 pointer-events-none">
              <h1 className="text-4xl font-extrabold text-white leading-tight drop-shadow-lg">
                ადმოაჰინე<br />საქართველო
              </h1>
              <p className="text-slate-300 text-sm mt-2 max-w-xs drop-shadow">
                ისტორია, ბუნება, მარშრუტები და შენიშვნები ერთ სივრცეში
              </p>

              {/* Search bar */}
              <div className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 max-w-sm" style={{ background: 'rgba(8,14,26,0.9)', border: '1px solid #1a2640' }}>
                <Search size={15} className="text-green-400 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="სად გინდა წასვლა?"
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                />
                <button className="w-7 h-7 rounded-lg flex items-center justify-center pointer-events-auto" style={{ background: '#22c55e' }}>
                  <Search size={12} className="text-white" />
                </button>
              </div>

              {/* Stats row */}
              <div className="mt-4 flex gap-4">
                {STATS.map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-white font-extrabold text-lg leading-none">{s.value}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters overlay (top-right of map) */}
            <div className="absolute top-4 right-4 z-10 w-44">
              <MapFilters filters={filters} onChange={setFilters} />
            </div>

            {/* Map */}
            <InteractiveMap locations={mapLocations} routes={mapRoutes} filters={filters} />
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:flex w-72 flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {/* Where to stay */}
            <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-white text-sm font-bold">სად დარჩე?</p>
                <Link to="/hotels" className="text-green-400 text-[11px] flex items-center gap-0.5 hover:text-green-300">
                  ყველა ნახვა <ChevronRight size={12} />
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: '#1a2640' }}>
                {hotels.filter(h => h.featured).map(h => (
                  <HotelCard key={h.id} hotel={h} compact />
                ))}
              </div>
            </div>

            {/* Guides */}
            <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-white text-sm font-bold">გიდები და ტური</p>
                <Link to="/guides" className="text-green-400 text-[11px] flex items-center gap-0.5 hover:text-green-300">
                  ყველა ნახვა <ChevronRight size={12} />
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: '#1a2640' }}>
                {guides.slice(0, 3).map(g => (
                  <GuideCard key={g.id} guide={g} />
                ))}
              </div>
            </div>

            {/* Recent reviews */}
            <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
              <div className="px-4 pt-4 pb-2">
                <p className="text-white text-sm font-bold">ბოლოს დამატებული შეკვება</p>
              </div>
              <div className="divide-y" style={{ borderColor: '#1a2640' }}>
                {reviews.map(r => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="lg:hidden mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
          <Search size={15} className="text-green-400 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="სად გინდა წასვლა?"
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
          />
        </div>
      </section>

      {/* ===== STATS (mobile) ===== */}
      <section className="lg:hidden max-w-[1440px] mx-auto px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#0f1826', border: '1px solid #1a2640' }}>
              <p className="text-white font-extrabold text-base">{s.value}</p>
              <p className="text-slate-500 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CATEGORY TABS ===== */}
      <section className="max-w-[1440px] mx-auto px-4 py-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATS.map(cat => {
            const Icon = cat.icon
            const active = activecat === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all"
                style={active
                  ? { background: '#22c55e', color: '#080e1a' }
                  : { background: '#0f1826', color: '#94a3b8', border: '1px solid #1a2640' }
                }
              >
                <Icon size={14} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== POPULAR ROUTES ===== */}
      <section className="max-w-[1440px] mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">პოპულარული მარშრუტები</h2>
          <Link to="/routes" className="text-green-400 text-sm flex items-center gap-1 hover:text-green-300 transition-colors">
            ყველა ნახვა <ChevronRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(filteredRoutes.length > 0 ? filteredRoutes : routes).slice(0, 4).map(r => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      </section>

      {/* ===== TRAVEL STORIES ===== */}
      <section className="max-w-[1440px] mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">მოგზაურების ისტორიები</h2>
          <Link to="/community" className="text-green-400 text-sm flex items-center gap-1 hover:text-green-300 transition-colors">
            ყველა ნახვა <ChevronRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stories.map(s => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </section>

      {/* ===== AI ASSISTANT + FEATURE CARDS ===== */}
      <section className="max-w-[1440px] mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* AI Card (spans 1 on desktop) */}
          <div
            className="rounded-2xl p-5 flex flex-col"
            style={{
              background: 'linear-gradient(135deg,rgba(22,163,74,0.15),rgba(34,197,94,0.05))',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                <Brain size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">AI მარშრუტის დაგეგმვა</p>
                <p className="text-slate-500 text-[11px]">ჩვენი ასისტენტი</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs mb-4 flex-1">
              მოგვიყევი სად გინდა წასვლა და ჩვენ შევქმნით სრულ მარშრუტს შენთვის.
            </p>
            <textarea
              rows={2}
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder="მაგ: 2-დღიანი კემპინგი კახეთში მანქანით…"
              className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none mb-3"
              style={{ background: 'rgba(8,14,26,0.6)', border: '1px solid rgba(34,197,94,0.2)' }}
            />
            {aiResult && (
              <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mb-3 p-3 rounded-lg overflow-auto max-h-36" style={{ background: 'rgba(8,14,26,0.5)' }}>
                {aiResult}
              </pre>
            )}
            <button
              onClick={handleAI}
              disabled={aiLoading}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: '#22c55e', color: '#080e1a', opacity: aiLoading ? 0.7 : 1 }}
            >
              {aiLoading ? (
                <><span className="animate-spin">⟳</span> ვამუშავებ…</>
              ) : (
                <><Brain size={13} /> დაგეგმე მარშრუტი</>
              )}
            </button>
          </div>

          {/* Other feature cards */}
          {FEATURES.slice(1).map(feat => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className="rounded-2xl p-5 flex flex-col cursor-pointer card-hover"
                style={{ background: feat.bg, border: `1px solid ${feat.color}33` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${feat.color}22` }}>
                  <Icon size={20} style={{ color: feat.color }} />
                </div>
                <p className="text-white font-bold text-sm mb-2">{feat.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed flex-1">{feat.desc}</p>
                <button
                  className="mt-4 text-xs font-semibold flex items-center gap-1 transition-colors"
                  style={{ color: feat.color }}
                >
                  {feat.cta} <ChevronRight size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
