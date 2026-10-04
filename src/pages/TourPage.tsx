import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, AtSign, Award, CalendarDays, Check, Clock, Compass, EyeOff, Globe, Languages, Link2, Mail,
  MapPin, MessageCircle, Pencil, Phone, Users, X,
} from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Empty from '../components/ui/Empty'
import { PageSpinner } from '../components/ui/Spinner'
import ReportButton from '../components/common/ReportButton'
import DifficultyBadge, { DiffShape } from '../components/route/DifficultyBadge'
import TopoCover from '../components/route/TopoCover'
import {
  EMAIL_RE, groupLabel, hasPrice, hostLabel, instagramLabel, langLabel, messageHref, priceLabel, socialUrl, splitDates,
  telHref, tripRange, webUrl, weekday,
} from '../components/guides/tourUtils'
import { useGuideProfile, useRegions, useRoutes, useTour } from '../lib/queries'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/title'
import { PlainText } from '../lib/md'
import { DIFF_LABEL } from '../lib/difficulty'
import { daysLabel, km, meters } from '../lib/format'
import type { GuideProfile, ProfileLite } from '../lib/types'

export default function TourPage() {
  const { id } = useParams()
  const tourId = Number(id)
  const valid = Number.isInteger(tourId) && tourId > 0
  const { user, isAdmin } = useAuth()
  const tour = useTour(valid ? tourId : undefined)
  const t = tour.data ?? null
  const guideProfile = useGuideProfile(t?.guide_id)
  const regions = useRegions()
  const routes = useRoutes()

  usePageTitle(t ? t.title : valid && tour.isLoading ? 'ტური' : 'ტური ვერ მოიძებნა')

  const dates = useMemo(() => splitDates(t?.start_dates), [t?.start_dates])

  if (valid && tour.isLoading) return <PageSpinner />
  if (valid && tour.isError) {
    return (
      <div className="page py-16">
        <Empty
          title="ტური ვერ ჩაიტვირთა"
          text="შეამოწმე ინტერნეტი და სცადე თავიდან."
          action={<button className="btn-secondary" onClick={() => tour.refetch()}>თავიდან ცდა</button>}
        />
      </div>
    )
  }
  if (!t) {
    return (
      <div className="page py-16">
        <Empty
          icon={<Compass size={20} />}
          title="ტური ვერ მოიძებნა"
          text="შეიძლება გიდმა ტური წაშალა ან დროებით გამორთო. ნახე სხვა ტურები."
          action={<Link to="/guides" className="btn-primary">ყველა ტური</Link>}
        />
      </div>
    )
  }

  const isOwner = user?.id === t.guide_id
  const gp = guideProfile.data ?? null
  const regionName = t.route ? regions.data?.find((r) => r.id === t.route!.region_id)?.name : undefined
  const route = t.route ? routes.data?.find((r) => r.id === t.route!.id) ?? null : null
  const group = groupLabel(t.group_min, t.group_max)
  const next = dates.upcoming[0] ?? null
  const includes = (t.includes ?? []).filter(Boolean)
  const excludes = (t.excludes ?? []).filter(Boolean)
  const msgHref = messageHref(t.guide_id, !!user)
  const notPublicGuide = (isOwner || isAdmin) && !!gp && gp.status !== 'approved'

  return (
    <div className="page pb-16">
      <div className="pt-6">
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 hover:text-forest">
          <ArrowLeft size={15} aria-hidden /> გიდები და ტურები
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line">
        {t.cover_url ? (
          <img src={t.cover_url} alt={t.title} className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]" />
        ) : (
          <TopoCover seed={`tour-${t.id}`} className="aspect-[16/10] w-full sm:aspect-[21/9]" />
        )}
      </div>

      <header className="mt-6 max-w-3xl">
        <p className="kicker flex items-center gap-2"><span className="blaze" />{regionName ? `ტური · ${regionName}` : 'ტური გიდთან ერთად'}</p>
        <h1 className="mt-2 text-[28px] leading-tight sm:text-[38px]">{t.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-2">
          <DifficultyBadge d={t.difficulty} />
          <Pill icon={<Clock size={14} />}>{daysLabel(t.days, t.days)}</Pill>
          {group && <Pill icon={<Users size={14} />}>{group}</Pill>}
          {t.route && <Pill icon={<MapPin size={14} />}>{t.route.name}</Pill>}
        </div>
      </header>

      {(!t.is_active || notPublicGuide) && (
        <div className="mt-5 flex max-w-3xl gap-3 rounded-xl border border-moderate/40 bg-moderate/10 p-4 text-[14px] text-ink">
          <EyeOff size={18} className="mt-0.5 shrink-0 text-moderate" aria-hidden />
          <div>
            {!t.is_active
              ? 'ეს ტური გამორთულია და სხვებს არ უჩანთ.'
              : 'გიდის პროფილი ჯერ დადასტურებული არ არის, ამიტომ ტური სხვებს არ უჩანთ.'}
            {isOwner && <> <Link to={`/settings/guide?edit=${t.id}`} className="link">პარამეტრებში გადასვლა</Link></>}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        {/* booking box + guide: first on mobile, right column on desktop */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <div className="card p-5">
            <p className="kicker">ფასი</p>
            <p className={`mt-1 font-serif font-bold leading-tight text-ink ${hasPrice(t.price_gel) ? 'text-[30px]' : 'text-[22px]'}`}>{priceLabel(t.price_gel)}</p>
            {t.price_note && <p className="mt-1 text-[13.5px] text-ink-2">{t.price_note}</p>}
            <dl className="mt-4 divide-y divide-line border-y border-line text-[14px]">
              <Fact label="ხანგრძლივობა" value={daysLabel(t.days, t.days)} />
              <Fact label="სირთულე" value={<span className="inline-flex items-center gap-1.5"><DiffShape d={t.difficulty} />{DIFF_LABEL[t.difficulty]}</span>} />
              {group && <Fact label="ჯგუფი" value={group} />}
              <Fact label="უახლოესი გასვლა" value={next ? tripRange(next, t.days) : 'შეთანხმებით'} />
            </dl>
            {isOwner ? (
              <Link to={`/settings/guide?edit=${t.id}`} className="btn-secondary mt-4 w-full"><Pencil size={16} aria-hidden /> რედაქტირება</Link>
            ) : (
              <Link to={msgHref} className="btn-primary mt-4 w-full"><MessageCircle size={16} aria-hidden /> მიწერე გიდს</Link>
            )}
            <p className="mt-2.5 text-center text-[12.5px] text-ink-3">ადგილის დაჯავშნა და გადახდა — პირდაპირ გიდთან.</p>
          </div>

          {t.guide && <GuideBox guide={t.guide} gp={gp} />}
        </aside>

        <div className="min-w-0 space-y-10 lg:order-1">
          <section aria-labelledby="tour-dates">
            <h2 id="tour-dates" className="text-[22px]">გასვლის თარიღები</h2>
            {dates.upcoming.length === 0 && (
              <p className="mt-2 text-[14.5px] text-ink-2">
                {dates.past.length ? 'ახალი თარიღები ჯერ არ არის.' : 'თარიღები ჯერ არ არის მითითებული.'}{' '}
                {!isOwner && <>მიწერე გიდს და შეუთანხმდი.</>}
              </p>
            )}
            {(dates.upcoming.length > 0 || dates.past.length > 0) && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {dates.upcoming.map((d) => (
                  <li key={d} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5">
                    <CalendarDays size={18} className="shrink-0 text-forest" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{tripRange(d, t.days)}</span>
                      <span className="block text-[12.5px] text-ink-3">{weekday(d)}</span>
                    </span>
                  </li>
                ))}
                {dates.past.map((d) => (
                  <li key={d} className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-surface-2/50 px-3.5 py-2.5 text-ink-3">
                    <CalendarDays size={18} className="shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block line-through">{tripRange(d, t.days)}</span>
                      <span className="block text-[12.5px]">გასული</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="tour-about">
            <h2 id="tour-about" className="text-[22px]">ტურის შესახებ</h2>
            <PlainText text={t.description} className="mt-3 text-[15.5px] leading-[1.75] text-ink" />
          </section>

          {(includes.length > 0 || excludes.length > 0) && (
            <section className="grid gap-4 sm:grid-cols-2" aria-label="რა შედის ფასში">
              {includes.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-[17px]">ფასში შედის</h3>
                  <ul className="mt-3 space-y-2">
                    {includes.map((x, i) => (
                      <li key={i} className="flex gap-2.5 text-[14.5px] text-ink">
                        <Check size={17} className="mt-0.5 shrink-0 text-easy" aria-hidden />{x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excludes.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-[17px]">ფასში არ შედის</h3>
                  <ul className="mt-3 space-y-2">
                    {excludes.map((x, i) => (
                      <li key={i} className="flex gap-2.5 text-[14.5px] text-ink">
                        <X size={17} className="mt-0.5 shrink-0 text-hard" aria-hidden />{x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {t.meeting_point && (
            <section aria-labelledby="tour-meet">
              <h2 id="tour-meet" className="text-[22px]">შეკრების ადგილი</h2>
              <p className="mt-2 flex gap-2.5 text-[15px] text-ink">
                <MapPin size={18} className="mt-0.5 shrink-0 text-blaze" aria-hidden />
                <span className="whitespace-pre-line">{t.meeting_point}</span>
              </p>
            </section>
          )}

          {t.route && (
            <section aria-labelledby="tour-route">
              <h2 id="tour-route" className="text-[22px]">მარშრუტი</h2>
              <Link to={`/routes/${t.route.slug}`} className="group card mt-3 flex items-center gap-4 p-3 transition-shadow hover:shadow-pop">
                <span className="h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                  {route?.cover_url ? (
                    <img src={route.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <TopoCover seed={t.route.slug} className="h-full w-full" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {regionName && <span className="kicker block">{regionName}</span>}
                  <span className="block truncate font-serif text-[17px] font-bold text-ink group-hover:text-forest">{t.route.name}</span>
                  {route && (
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-2">
                      <span className="inline-flex items-center gap-1"><DiffShape d={route.difficulty} size={8} />{DIFF_LABEL[route.difficulty]}</span>
                      {route.distance_km !== null && <span>{km(route.distance_km)}</span>}
                      {route.elevation_gain_m !== null && <span>↑ {meters(route.elevation_gain_m)}</span>}
                    </span>
                  )}
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-3 group-hover:text-forest" aria-hidden />
              </Link>
              <p className="mt-2 text-[13px] text-ink-3">მარშრუტის გვერდზე ნახავ რუკას, გაჩერებებს, აღჭურვილობას და მოლაშქრეების რჩევებს.</p>
            </section>
          )}

          <div className="flex justify-end border-t border-line pt-4">
            <ReportButton type="tour" id={t.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2.5 py-1 text-[12.5px]">
      <span className="shrink-0 text-ink-3" aria-hidden>{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}

function GuideBox({ guide, gp }: { guide: ProfileLite; gp: GuideProfile | null }) {
  const company = gp?.kind === 'company' && gp.company_name ? gp.company_name : null
  const contacts: { icon: ReactNode; label: string; href: string; external?: boolean; kind: string }[] = []
  if (gp?.phone) contacts.push({ icon: <Phone size={15} />, label: gp.phone, href: telHref(gp.phone), kind: 'ტელეფონი' })
  if (gp?.email && EMAIL_RE.test(gp.email)) contacts.push({ icon: <Mail size={15} />, label: gp.email, href: `mailto:${gp.email}`, kind: 'ელ-ფოსტა' })
  const web = webUrl(gp?.website)
  if (web) contacts.push({ icon: <Globe size={15} />, label: hostLabel(web), href: web, external: true, kind: 'ვებგვერდი' })
  const fb = socialUrl('facebook', gp?.facebook)
  if (fb) contacts.push({ icon: <Link2 size={15} />, label: 'Facebook', href: fb, external: true, kind: 'Facebook' })
  const ig = socialUrl('instagram', gp?.instagram)
  if (ig) contacts.push({ icon: <AtSign size={15} />, label: instagramLabel(ig), href: ig, external: true, kind: 'Instagram' })

  return (
    <div className="card p-5">
      <p className="kicker">გიდი</p>
      <Link to={`/u/${guide.username}`} className="group mt-3 flex items-center gap-3">
        <Avatar url={guide.avatar_url} name={guide.display_name} size={48} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink group-hover:text-forest">{company ?? guide.display_name}</span>
          <span className="block truncate text-[12.5px] text-ink-3">{company ? guide.display_name : `@${guide.username}`}</span>
        </span>
      </Link>

      {gp && (gp.languages.length > 0 || (gp.experience_years ?? 0) > 0) && (
        <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-2">
          {(gp.experience_years ?? 0) > 0 && (
            <li className="flex gap-2"><Award size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />{gp.experience_years} წლის გამოცდილება</li>
          )}
          {gp.languages.length > 0 && (
            <li className="flex gap-2"><Languages size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden /><span><span className="sr-only">ენები: </span>{gp.languages.map(langLabel).join(', ')}</span></li>
          )}
        </ul>
      )}

      {contacts.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3">
          {contacts.map((c) => (
            <li key={c.href}>
              <a
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center gap-2.5 rounded-md py-1.5 text-[14px] text-ink hover:text-forest"
              >
                <span className="shrink-0 text-ink-3" aria-hidden>{c.icon}</span>
                <span className="sr-only">{c.kind}: </span>
                <span className="min-w-0 truncate">{c.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/u/${guide.username}`} className="link mt-3 inline-flex items-center gap-1 text-[14px]">
        გიდის პროფილი <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  )
}
