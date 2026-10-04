import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, Plus, Search, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Tabs from '../components/ui/Tabs'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { DiffShape } from '../components/route/DifficultyBadge'
import TourCard from '../components/guides/TourCard'
import GuideCard from '../components/guides/GuideCard'
import { nextStartDate } from '../components/guides/tourUtils'
import { useGuideProfile, useGuides, useRegions, useTours } from '../lib/queries'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/title'
import { DIFFICULTIES, DIFF_LABEL } from '../lib/difficulty'
import type { Difficulty, Tour } from '../lib/types'

type TabId = 'tours' | 'guides'
type DaysChoice = '1' | '2-3' | '4+'

const DAY_CHOICES: { v: DaysChoice; label: string }[] = [
  { v: '1', label: '1 დღე' },
  { v: '2-3', label: '2–3 დღე' },
  { v: '4+', label: '4+ დღე' },
]

const isDifficulty = (v: string | null): v is Difficulty => !!v && (DIFFICULTIES as string[]).includes(v)
const isDays = (v: string | null): v is DaysChoice => v === '1' || v === '2-3' || v === '4+'

function matchesDays(days: number, choice: DaysChoice) {
  if (choice === '1') return days === 1
  if (choice === '2-3') return days >= 2 && days <= 3
  return days >= 4
}

export default function GuidesPage() {
  usePageTitle('გიდები და ტურები')
  const { user } = useAuth()
  const [sp, setSp] = useSearchParams()
  const tours = useTours()
  const guides = useGuides()
  const regions = useRegions()
  const myGuide = useGuideProfile(user?.id)

  const tab: TabId = sp.get('tab') === 'guides' ? 'guides' : 'tours'
  const q = sp.get('q') ?? ''
  const diff = isDifficulty(sp.get('diff')) ? (sp.get('diff') as Difficulty) : null
  const days = isDays(sp.get('days')) ? (sp.get('days') as DaysChoice) : null
  const region = sp.get('region') ?? ''

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setSp(next, { replace: true })
  }

  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])

  // Only tours of approved guides are public; this keeps the list the same for guides/admins who can see more.
  const visibleTours = useMemo(() => {
    const all = tours.data ?? []
    if (!guides.data) return all
    const approved = new Set(guides.data.map((g) => g.user_id))
    return all.filter((t) => approved.has(t.guide_id))
  }, [tours.data, guides.data])

  // Upcoming departures first (soonest first), then tours without dates (newest first).
  const sortedTours = useMemo(() => {
    const withNext = visibleTours.map((t) => ({ t, next: nextStartDate(t.start_dates) }))
    withNext.sort((a, b) => {
      if (a.next && b.next) return a.next < b.next ? -1 : a.next > b.next ? 1 : 0
      if (a.next) return -1
      if (b.next) return 1
      return 0
    })
    return withNext.map((x) => x.t)
  }, [visibleTours])

  const tourRegions = useMemo(() => {
    const ids = new Set(visibleTours.map((t) => t.route?.region_id).filter(Boolean) as string[])
    return (regions.data ?? []).filter((r) => ids.has(r.id))
  }, [visibleTours, regions.data])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sortedTours.filter((t: Tour) => {
      if (diff && t.difficulty !== diff) return false
      if (days && !matchesDays(t.days, days)) return false
      if (region && t.route?.region_id !== region) return false
      if (s) {
        const hay = [t.title, t.route?.name, t.guide?.display_name, t.guide?.username, t.meeting_point, regionName.get(t.route?.region_id ?? '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [sortedTours, q, diff, days, region, regionName])

  const toursByGuide = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of visibleTours) m.set(t.guide_id, (m.get(t.guide_id) ?? 0) + 1)
    return m
  }, [visibleTours])

  const guideList = (guides.data ?? []).filter((g) => g.profile)
  const filtersOn = !!(q || diff || days || region)
  const toursLoading = tours.isLoading || guides.isLoading
  const myStatus = myGuide.data?.status
  const isApprovedGuide = myStatus === 'approved'

  return (
    <div className="page pb-16">
      <PageHeader
        kicker="ლაშქრობა გიდთან ერთად"
        title="გიდები და ტურები"
        text="ადგილობრივი გიდების ტურები თარიღებით, ფასით და სირთულით. გიდს პირდაპირ საიტიდან მისწერ — ჯავშანსა და გადახდას მასთან შეათანხმებ."
        actions={isApprovedGuide ? <Link to="/settings/guide?new=1" className="btn-secondary"><Plus size={16} aria-hidden /> ტურის დამატება</Link> : undefined}
      />

      <Tabs<TabId>
        tabs={[
          { id: 'tours', label: 'ტურები', count: toursLoading ? undefined : visibleTours.length },
          { id: 'guides', label: 'გიდები', count: guides.isLoading ? undefined : guideList.length },
        ]}
        value={tab}
        onChange={(v) => setParams({ tab: v === 'tours' ? null : v })}
      />

      {tab === 'tours' ? (
        <section className="mt-6" aria-label="ტურები">
          {toursLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : tours.isError ? (
            <Empty
              title="ტურები ვერ ჩაიტვირთა"
              text="შეამოწმე ინტერნეტი და სცადე თავიდან."
              action={<button className="btn-secondary" onClick={() => tours.refetch()}>თავიდან ცდა</button>}
            />
          ) : visibleTours.length === 0 ? (
            <Empty
              icon={<Compass size={20} />}
              title="ტურები ჯერ არ არის"
              text="აქ გამოჩნდება ადგილობრივი გიდების ტურები თარიღებით და ფასით. ხარ გიდი? შექმენი გიდის პროფილი და გამოაქვეყნე პირველი ტური."
              action={<Link to="/settings/guide" className="btn-primary">გიდის პროფილის შექმნა</Link>}
            />
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                    <input
                      type="search"
                      value={q}
                      onChange={(e) => setParams({ q: e.target.value || null })}
                      className="input pl-9"
                      placeholder="ძებნა: ტური, მარშრუტი ან გიდი"
                      aria-label="ტურის ძებნა"
                    />
                  </div>
                  {tourRegions.length > 0 && (
                    <select value={region} onChange={(e) => setParams({ region: e.target.value || null })} className="input sm:w-60" aria-label="რეგიონი">
                      <option value="">ყველა რეგიონი</option>
                      {tourRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="სირთულე და ხანგრძლივობა">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={diff === d}
                      onClick={() => setParams({ diff: diff === d ? null : d })}
                      className={`chip ${diff === d ? 'chip-on' : ''}`}
                    >
                      <DiffShape d={d} size={9} /> {DIFF_LABEL[d]}
                    </button>
                  ))}
                  <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
                  {DAY_CHOICES.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      aria-pressed={days === c.v}
                      onClick={() => setParams({ days: days === c.v ? null : c.v })}
                      className={`chip ${days === c.v ? 'chip-on' : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="flex min-h-[28px] items-center gap-3 text-[13px] text-ink-3">
                  <span aria-live="polite">{filtersOn ? `ნაპოვნია ${filtered.length} ტური` : `${visibleTours.length} ტური`}</span>
                  {filtersOn && (
                    <button type="button" className="font-semibold text-forest hover:underline" onClick={() => setParams({ q: null, diff: null, days: null, region: null })}>
                      ფილტრების გასუფთავება
                    </button>
                  )}
                </div>
              </div>

              {filtered.length > 0 ? (
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((t) => (
                    <TourCard key={t.id} tour={t} regionName={t.route ? regionName.get(t.route.region_id) : undefined} />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <Empty
                    compact
                    title="ამ ფილტრით ტური ვერ მოიძებნა"
                    text="შეცვალე სირთულე, დღეები ან რეგიონი — ან ნახე ყველა ტური."
                    action={<button className="btn-secondary" onClick={() => setParams({ q: null, diff: null, days: null, region: null })}>ყველა ტურის ნახვა</button>}
                  />
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="mt-6" aria-label="გიდები">
          {guides.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : guides.isError ? (
            <Empty
              title="გიდები ვერ ჩაიტვირთა"
              text="შეამოწმე ინტერნეტი და სცადე თავიდან."
              action={<button className="btn-secondary" onClick={() => guides.refetch()}>თავიდან ცდა</button>}
            />
          ) : guideList.length === 0 ? (
            <Empty
              icon={<Users size={20} />}
              title="გიდები ჯერ არ არიან"
              text="დადასტურებული გიდები აქ გამოჩნდებიან. თუ მოლაშქრეებს მთაში დაჰყავხარ, შეავსე გიდის განაცხადი."
              action={<Link to="/settings/guide" className="btn-primary">გიდის განაცხადი</Link>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {guideList.map((g) => (
                <GuideCard
                  key={g.user_id}
                  guide={g}
                  regionName={(id) => regionName.get(id)}
                  toursCount={toursByGuide.get(g.user_id)}
                  isMe={g.user_id === user?.id}
                  signedIn={!!user}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-14">
        <div className="topo-texture card grid gap-6 overflow-hidden p-6 sm:p-8 md:grid-cols-[1.5fr_1fr] md:items-center">
          <div>
            <p className="kicker flex items-center gap-2"><span className="blaze" />გიდებისთვის</p>
            <h2 className="mt-2 text-[26px]">{isApprovedGuide ? 'შენი ტურები' : 'ხარ გიდი?'}</h2>
            <p className="mt-2 text-ink-2">
              {isApprovedGuide
                ? 'დაამატე ახალი ტური ან განაახლე თარიღები და ფასები — ცვლილებები აქ მაშინვე გამოჩნდება.'
                : 'შექმენი გიდის პროფილი და გამოაქვეყნე ტურები თარიღებით და ფასით. მოლაშქრეები პირდაპირ მოგწერენ. განაცხადს ადმინისტრატორი განიხილავს.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/settings/guide" className="btn-primary">
              {isApprovedGuide ? 'ჩემი ტურები' : myStatus === 'pending' ? 'განაცხადის ნახვა' : myStatus === 'rejected' ? 'განაცხადის შესწორება' : 'გიდის პროფილის შექმნა'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
