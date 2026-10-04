import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, Compass, LoaderCircle, Sparkles, Wand2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import RouteCard from '../components/route/RouteCard'
import DifficultyBadge, { DiffShape } from '../components/route/DifficultyBadge'
import Empty from '../components/ui/Empty'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../lib/auth'
import { useRegions, useRoutes, useRouteStats, useTours } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { DIFFICULTIES, DIFF_HINT, DIFF_LABEL } from '../lib/difficulty'
import { monthIn, monthName, num } from '../lib/format'
import { buildItineraries, matchTours, rankRoutes, type PlanInput } from '../lib/planner'
import { FILTER_TAGS, tagLabel } from '../lib/tags'
import { usePageTitle } from '../lib/title'
import type { Difficulty, RouteListItem } from '../lib/types'

interface AiPlan { title: string; summary: string; days: { day: number; route: string | null; text: string }[]; tips: string[] }
interface AiResult { ok: boolean; ai: boolean; reason?: string; detail?: string; plans?: AiPlan[]; tour_ids?: number[]; note?: string; left?: number }

const DAY_QUICK = [1, 2, 3, 4, 5, 7]

function initialDays(v: string | null): number {
  if (!v) return 3
  const map: Record<string, number> = { '1': 1, '2-3': 3, '4-5': 5, '6+': 7 }
  if (map[v]) return map[v]
  const n = Number(v)
  return n >= 1 && n <= 21 ? Math.round(n) : 3
}

export default function PlannerPage() {
  usePageTitle('დაგეგმე ლაშქრობა')
  const [params] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const routes = useRoutes()
  const regions = useRegions()
  const stats = useRouteStats()
  const tours = useTours()

  const [days, setDays] = useState(() => initialDays(params.get('days')))
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>(() => {
    const d = params.get('difficulty')
    return d && (DIFFICULTIES as string[]).includes(d) ? (d as Difficulty) : 'any'
  })
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1)
  const [region, setRegion] = useState<string | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [noTent, setNoTent] = useState(false)
  const [publicTransport, setPublicTransport] = useState(false)
  const [wish, setWish] = useState('')
  const [ai, setAi] = useState<AiResult | null>(null)
  const [aiBusy, setAiBusy] = useState(false)

  const input: PlanInput = { days, difficulty, month, region, interests, noTent, publicTransport }
  const regionName = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data])
  const bySlug = useMemo(() => new Map((routes.data ?? []).map((r) => [r.slug, r])), [routes.data])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranked = useMemo(() => rankRoutes(routes.data ?? [], input), [routes.data, days, difficulty, month, region, interests, noTent, publicTransport])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plans = useMemo(() => buildItineraries(ranked, input), [ranked, days])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tourMatches = useMemo(() => matchTours(tours.data ?? [], input), [tours.data, days, difficulty, region])

  const toggleInterest = (t: string) => setInterests((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))

  const askAi = async () => {
    setAiBusy(true)
    setAi(null)
    const { data, error } = await supabase.functions.invoke('plan-trip', { body: { ...input, wish } })
    setAiBusy(false)
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      setAi({ ok: false, ai: false, reason: status === 401 ? 'login' : 'error' })
      return
    }
    const res = data as AiResult
    setAi(res)
    if (res.ai && res.plans && !res.plans.length && !res.note) toast('AI-მ შესაფერისი გეგმა ვერ შეადგინა — სცადე სხვა პარამეტრები.', 'error')
  }

  const aiTours = (ai?.tour_ids ?? []).map((id) => tours.data?.find((t) => t.id === id)).filter(Boolean)

  return (
    <div className="page pb-16">
      <PageHeader
        kicker="დამგეგმავი"
        title="დაგეგმე ლაშქრობა"
        text="მითხარი, რამდენი დღე გაქვს, რა სირთულეს ერევი და როდის მიდიხარ — შეგირჩევ მარშრუტებს, მზა გეგმებს და გიდების ტურებს."
      />

      <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ───────── form ───────── */}
        <aside>
          <div className="card space-y-6 p-5 lg:sticky lg:top-20">
            <div>
              <p className="label">რამდენი დღე გაქვს?</p>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="flex-1 accent-[rgb(var(--forest))]" aria-label="დღეების რაოდენობა" />
                <span className="w-16 text-right font-serif text-[22px] font-bold">{days} <span className="text-[13px] font-sans font-semibold text-ink-3">დღე</span></span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAY_QUICK.map((d) => <button key={d} onClick={() => setDays(d)} className={`chip !px-2.5 !py-1 text-[12.5px] ${days === d ? 'chip-on' : ''}`}>{d}</button>)}
              </div>
            </div>

            <div>
              <p className="label">რა სირთულე?</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setDifficulty('any')} className={`chip ${difficulty === 'any' ? 'chip-on' : ''}`}>ნებისმიერი</button>
                {DIFFICULTIES.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`chip ${difficulty === d ? 'chip-on' : ''}`}><DiffShape d={d} /> {DIFF_LABEL[d]}</button>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{difficulty === 'any' ? 'ნაჩვენები იქნება ყველა დონე.' : `${DIFF_HINT[difficulty]} ნაჩვენებია ეს და უფრო მარტივი მარშრუტები.`}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="pl-month">როდის?</label>
                <select id="pl-month" value={month ?? ''} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)} className="input">
                  <option value="">ჯერ არ ვიცი</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="pl-region">სად?</label>
                <select id="pl-region" value={region ?? ''} onChange={(e) => setRegion(e.target.value || null)} className="input">
                  <option value="">სულ ერთია</option>
                  {(regions.data ?? []).filter((g) => (routes.data ?? []).some((r) => r.region_id === g.id)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="label">რა გინდა ნახო?</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TAGS.filter((t) => t !== 'public_transport' && t !== 'national_park').map((t) => (
                  <button key={t} onClick={() => toggleInterest(t)} className={`chip !px-2.5 !py-1 text-[12.5px] ${interests.includes(t) ? 'chip-on' : ''}`} aria-pressed={interests.includes(t)}>{tagLabel(t)}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                <input type="checkbox" checked={noTent} onChange={(e) => setNoTent(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--forest))]" />
                კარავი არ მაქვს — მხოლოდ სასტუმრო ან თავშესაფარი
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                <input type="checkbox" checked={publicTransport} onChange={(e) => setPublicTransport(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--forest))]" />
                მანქანა არ მაქვს
              </label>
            </div>

            <div className="border-t border-line pt-5">
              <label className="label flex items-center gap-1.5" htmlFor="pl-wish"><Sparkles size={14} className="text-forest" /> AI დამგეგმავი</label>
              <textarea id="pl-wish" value={wish} onChange={(e) => setWish(e.target.value)} rows={3} maxLength={400} className="input text-[14px]" placeholder="მაგ: ბავშვთან ერთად მივდივართ, გვინდა ტბა და მყინვარი, თბილისიდან ვიწყებთ" />
              {user ? (
                <button onClick={askAi} disabled={aiBusy} className="btn-primary mt-3 w-full">
                  {aiBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {aiBusy ? 'ვგეგმავ…' : 'AI-ით შედგენა'}
                </button>
              ) : (
                <Link to={`/login?next=${encodeURIComponent('/planner')}`} className="btn-secondary mt-3 w-full">შედი, რომ AI-ს გეგმა შეადგენინო</Link>
              )}
              <p className="mt-2 text-[12px] text-ink-3">AI იყენებს მხოლოდ ამ საიტის მარშრუტებს. ქვემოთ შედეგები ისედაც განახლდება.</p>
            </div>
          </div>
        </aside>

        {/* ───────── results ───────── */}
        <div className="min-w-0 space-y-12">
          {(aiBusy || ai) && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-[24px]"><Sparkles size={20} className="text-forest" /> AI-ის გეგმა</h2>
              {aiBusy ? (
                <div className="card flex items-center gap-3 p-5 text-ink-2"><LoaderCircle size={18} className="animate-spin text-forest" /> ვარჩევ მარშრუტებს და ვადგენ დღეების გეგმას… ეს 10–30 წამს გრძელდება.</div>
              ) : ai && !ai.ai ? (
                <div className="rounded-xl border border-line bg-surface-2 p-4 text-[14px] text-ink-2">
                  {ai.reason === 'disabled' && 'AI დამგეგმავი ჯერ არ არის ჩართული. ქვემოთ ნახე მზა გეგმები — ისინი შენი პარამეტრებით შედგა.'}
                  {ai.reason === 'limit' && 'დღევანდელი AI გეგმების ლიმიტი ამოიწურა. ხვალ ისევ შეგიძლია; მანამდე ქვემოთ მზა გეგმები ნახე.'}
                  {ai.reason === 'login' && <>AI-ის გამოსაყენებლად <Link to="/login?next=/planner" className="link">შედი ანგარიშზე</Link>.</>}
                  {(ai.reason === 'error' || ai.reason === 'forbidden' || !ai.reason) && 'AI ახლა ვერ პასუხობს. სცადე ცოტა ხანში — ქვემოთ მზა გეგმები ისედაც ხელმისაწვდომია.'}
                  {ai.detail && <p className="mt-2 break-all font-mono text-[11.5px] text-ink-3">{ai.detail}</p>}
                </div>
              ) : ai ? (
                <div className="grid gap-5">
                  {ai.note && <p className="text-[14.5px] text-ink-2">{ai.note}</p>}
                  {(ai.plans ?? []).map((p, i) => <AiPlanCard key={i} plan={p} bySlug={bySlug} regionName={regionName} />)}
                  {aiTours.length > 0 && (
                    <div className="card p-4">
                      <p className="kicker mb-2">AI-მ ეს ტურებიც შეარჩია</p>
                      <ul className="grid gap-1.5">
                        {aiTours.map((t) => t && <li key={t.id}><Link to={`/tours/${t.id}`} className="link">{t.title}</Link> <span className="text-[13px] text-ink-3">· {t.days} დღე · {t.guide?.display_name}</span></li>)}
                      </ul>
                    </div>
                  )}
                  {typeof ai.left === 'number' && <p className="text-[12px] text-ink-3">დღეს კიდევ {ai.left} AI გეგმის შედგენა შეგიძლია.</p>}
                </div>
              ) : null}
            </section>
          )}

          <section>
            <h2 className="mb-1 text-[24px]">შენზე მორგებული მარშრუტები</h2>
            <p className="mb-4 text-[14px] text-ink-3">{routes.isLoading ? '…' : ranked.length ? `${num(ranked.length)} მარშრუტი ერგება — აქ საუკეთესოებია.` : ''}</p>
            {routes.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
            ) : ranked.length === 0 ? (
              <Empty icon={<Compass size={20} />} title="ამ პირობებით ვერაფერი ვიპოვე" text={month ? `${monthIn(month)} ამ პირობებით შესაფერისი მარშრუტი არ გვაქვს. სცადე სხვა თვე, სხვა რეგიონი ან მეტი დღე.` : 'სცადე სხვა რეგიონი, სირთულე ან მეტი დღე.'} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {ranked.slice(0, 6).map((s) => (
                  <div key={s.route.id} className="flex flex-col gap-2">
                    <RouteCard route={s.route} regionName={regionName.get(s.route.region_id)} stats={stats.data?.get(s.route.id)} />
                    {s.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.reasons.slice(0, 3).map((r) => <span key={r} className="rounded-full bg-forest/10 px-2 py-0.5 text-[11.5px] font-semibold text-forest">{r}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {days >= 2 && plans.length > 0 && (
            <section>
              <h2 className="mb-1 text-[24px]">მზა გეგმები {days} დღეზე</h2>
              <p className="mb-4 text-[14px] text-ink-3">ერთ რეგიონში, რომ გზაში დრო არ დაკარგო. ჩასვლა-წამოსვლის დღეები ცალკე გაითვალისწინე.</p>
              <div className="grid gap-4 xl:grid-cols-2">
                {plans.map((it) => (
                  <div key={it.key} className="card p-5">
                    <p className="kicker">{regionName.get(it.region)}</p>
                    <p className="mt-1 font-serif text-[18px] font-bold">{it.items.length === 1 ? it.items[0].route.name : `${it.items.length} მარშრუტი ${it.days} დღეში`}</p>
                    <ol className="mt-3 grid gap-2">
                      {it.items.map((item) => <PlanRow key={`${item.from}-${item.route.id}`} from={item.from} to={item.to} route={item.route} />)}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-1 text-[24px]">ტურები გიდთან ერთად</h2>
            {tourMatches.length ? (
              <div className="mt-4 grid gap-3">
                {tourMatches.map((t) => (
                  <Link key={t.id} to={`/tours/${t.id}`} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-pop">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                        <DifficultyBadge d={t.difficulty} size="sm" /> {t.days} დღე · {t.guide?.display_name} · {t.price_gel ? `${num(t.price_gel)} ₾` : 'ფასი შეთანხმებით'}
                      </p>
                    </div>
                    <ArrowRight size={18} className="text-ink-3" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink-3">ამ პირობებზე ტური ჯერ არ არის. <Link to="/guides" className="link">ყველა ტური და გიდი</Link></p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function PlanRow({ from, to, route }: { from: number; to: number; route: RouteListItem }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex min-w-[72px] items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-[12px] font-bold text-ink-2">
        <CalendarDays size={12} /> {from === to ? `დღე ${from}` : `დღე ${from}–${to}`}
      </span>
      <Link to={`/routes/${route.slug}`} className="min-w-0 flex-1 hover:text-forest">
        <span className="flex items-center gap-1.5 font-semibold"><DiffShape d={route.difficulty} size={9} /> {route.name}</span>
        <span className="block line-clamp-1 text-[12.5px] text-ink-3">{route.summary}</span>
      </Link>
    </li>
  )
}

function AiPlanCard({ plan, bySlug, regionName }: { plan: AiPlan; bySlug: Map<string, RouteListItem>; regionName: Map<string, string> }) {
  const used = [...new Set(plan.days.map((d) => d.route).filter(Boolean) as string[])].map((s) => bySlug.get(s)).filter(Boolean) as RouteListItem[]
  return (
    <div className="card p-5">
      <p className="kicker">{[...new Set(used.map((r) => regionName.get(r.region_id)))].filter(Boolean).join(' · ')}</p>
      <p className="mt-1 font-serif text-[19px] font-bold leading-snug">{plan.title}</p>
      {plan.summary && <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{plan.summary}</p>}
      <ol className="mt-4 grid gap-3">
        {plan.days.map((d) => {
          const r = d.route ? bySlug.get(d.route) : undefined
          return (
            <li key={d.day} className="flex gap-3">
              <span className="mt-0.5 h-fit min-w-[58px] rounded-md bg-surface-2 px-2 py-1 text-center text-[12px] font-bold text-ink-2">დღე {d.day}</span>
              <div className="min-w-0">
                {r ? <Link to={`/routes/${r.slug}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-forest"><DiffShape d={r.difficulty} size={9} />{r.name}</Link> : <span className="font-semibold text-ink-2">გზა / დასვენება</span>}
                {d.text && <p className="text-[13.5px] leading-relaxed text-ink-2">{d.text}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {plan.tips.length > 0 && (
        <ul className="mt-4 grid gap-1.5 border-t border-line pt-3">
          {plan.tips.map((t, i) => <li key={i} className="flex gap-2 text-[13.5px] text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blaze" />{t}</li>)}
        </ul>
      )}
    </div>
  )
}
