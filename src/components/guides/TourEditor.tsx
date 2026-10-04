import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CalendarPlus, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import { useToast } from '../ui/Toast'
import RoutePicker from '../route/RoutePicker'
import TopoCover from '../route/TopoCover'
import { useAuth } from '../../lib/auth'
import { errorText, supabase } from '../../lib/supabase'
import { removeFiles, uploadPhoto } from '../../lib/storage'
import { useQueryClient, useRoutes } from '../../lib/queries'
import { DIFFICULTIES, DIFF_LABEL } from '../../lib/difficulty'
import type { Difficulty, Tour } from '../../lib/types'
import { cleanDates, invalidateTours, len, linesToList, parseDay, photoError, storagePath, todayISO } from './tourUtils'
import { Counter, inputCls } from './FormBits'

interface FormState {
  title: string
  route_id: number | null
  description: string
  days: string
  difficulty: Difficulty
  price_gel: string
  price_note: string
  group_min: string
  group_max: string
  includes: string
  excludes: string
  start_dates: string[]
  meeting_point: string
  is_active: boolean
}
type Errors = Partial<Record<keyof FormState | 'cover', string>>

const DESC_MAX = 6000
const MAX_ITEMS = 30
const ITEM_MAX = 200
const MAX_DATES = 60
const MAX_FILE = 30 * 1024 * 1024

function initial(t: Tour | null): FormState {
  if (!t) {
    return {
      title: '', route_id: null, description: '', days: '1', difficulty: 'moderate', price_gel: '', price_note: '',
      group_min: '', group_max: '', includes: '', excludes: '', start_dates: [''], meeting_point: '', is_active: true,
    }
  }
  return {
    title: t.title,
    route_id: t.route_id,
    description: t.description,
    days: String(t.days),
    difficulty: t.difficulty,
    price_gel: t.price_gel !== null && t.price_gel !== undefined ? String(Number(t.price_gel)) : '',
    price_note: t.price_note ?? '',
    group_min: t.group_min ? String(t.group_min) : '',
    group_max: t.group_max ? String(t.group_max) : '',
    includes: (t.includes ?? []).join('\n'),
    excludes: (t.excludes ?? []).join('\n'),
    start_dates: cleanDates(t.start_dates),
    meeting_point: t.meeting_point ?? '',
    is_active: t.is_active,
  }
}

/** Empty → null; otherwise an integer within [min, max]. */
function intField(s: string, min: number, max: number): { ok: boolean; value: number | null } {
  const v = s.trim()
  if (!v) return { ok: true, value: null }
  const n = Number(v)
  return Number.isInteger(n) && n >= min && n <= max ? { ok: true, value: n } : { ok: false, value: null }
}

function validate(f: FormState) {
  const errs: Errors = {}
  const title = f.title.trim().replace(/\s+/g, ' ')
  if (len(title) < 3 || len(title) > 140) errs.title = 'სათაური უნდა იყოს 3–140 სიმბოლო.'

  const description = f.description.trim()
  if (len(description) < 10) errs.description = 'აღწერა მინიმუმ 10 სიმბოლო უნდა იყოს.'
  else if (len(description) > DESC_MAX) errs.description = `აღწერა მაქსიმუმ ${DESC_MAX} სიმბოლოა.`

  const days = intField(f.days, 1, 30)
  if (!days.ok || days.value === null) errs.days = 'მიუთითე 1-დან 30-მდე.'

  let price: number | null = null
  const ps = f.price_gel.replace(/\s/g, '').replace(',', '.')
  if (ps) {
    const p = Number(ps)
    if (!Number.isFinite(p) || p < 0 || p >= 10_000_000) errs.price_gel = 'ფასი არასწორია. მიუთითე მხოლოდ რიცხვი.'
    else price = Math.round(p * 100) / 100
  }
  if (len(f.price_note.trim()) > 200) errs.price_note = 'მაქსიმუმ 200 სიმბოლო.'

  const gmin = intField(f.group_min, 1, 999)
  const gmax = intField(f.group_max, 1, 999)
  if (!gmin.ok) errs.group_min = 'მიუთითე 1-დან 999-მდე.'
  if (!gmax.ok) errs.group_max = 'მიუთითე 1-დან 999-მდე.'
  else if (gmin.value && gmax.value && gmax.value < gmin.value) errs.group_max = 'მაქსიმუმი მინიმუმზე ნაკლები ვერ იქნება.'

  const includes = linesToList(f.includes)
  const excludes = linesToList(f.excludes)
  const listError = `მაქსიმუმ ${MAX_ITEMS} პუნქტი, თითო — ${ITEM_MAX} სიმბოლომდე.`
  if (includes.length > MAX_ITEMS || includes.some((x) => len(x) > ITEM_MAX)) errs.includes = listError
  if (excludes.length > MAX_ITEMS || excludes.some((x) => len(x) > ITEM_MAX)) errs.excludes = listError

  const filled = f.start_dates.map((s) => s.trim()).filter(Boolean)
  const dates = cleanDates(filled)
  if (filled.some((s) => !parseDay(s))) errs.start_dates = 'ერთ-ერთი თარიღი არასწორია.'
  else if (dates.length > MAX_DATES) errs.start_dates = `მაქსიმუმ ${MAX_DATES} თარიღი.`

  if (len(f.meeting_point.trim()) > 300) errs.meeting_point = 'მაქსიმუმ 300 სიმბოლო.'

  return {
    errs,
    row: {
      title,
      route_id: f.route_id,
      description,
      days: days.value ?? 1,
      difficulty: f.difficulty,
      price_gel: price,
      price_note: f.price_note.trim() || null,
      group_min: gmin.value,
      group_max: gmax.value,
      includes,
      excludes,
      start_dates: dates,
      meeting_point: f.meeting_point.trim() || null,
      is_active: f.is_active,
    },
  }
}

interface Props {
  /** null → new tour */
  tour: Tour | null
  onClose: () => void
  onSaved?: (id: number) => void
}

/** Create / edit a tour (approved guides only — RLS enforces it). Mount it only while open. */
export default function TourEditor({ tour, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const routes = useRoutes()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [f, setF] = useState<FormState>(() => initial(tour))
  const [errors, setErrors] = useState<Errors>({})
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [saving, setSaving] = useState(false)

  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const touched = useRef({ days: false, difficulty: false })
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Modal re-runs its focus effect whenever `onClose` changes identity (stealing focus from inputs), so keep it stable.
  const requestClose = useCallback(() => {
    if (savingRef.current) return
    if (dirtyRef.current && !window.confirm('შეუნახავი ცვლილებები დაიკარგება. დავხურო?')) return
    onCloseRef.current()
  }, [])

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    dirtyRef.current = true
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  const onRoute = (id: number | null) => {
    set('route_id', id)
    if (tour || !id) return
    const r = routes.data?.find((x) => x.id === id)
    if (!r) return
    // new tour: suggest the route's difficulty and length unless the guide already chose them
    setF((p) => ({
      ...p,
      difficulty: touched.current.difficulty ? p.difficulty : r.difficulty,
      days: touched.current.days ? p.days : String(Math.min(30, Math.max(1, r.days_max))),
    }))
  }

  const setDate = (i: number, v: string) => set('start_dates', f.start_dates.map((d, j) => (j === i ? v : d)))
  const addDate = () => set('start_dates', [...f.start_dates, ''])
  const removeDate = (i: number) => set('start_dates', f.start_dates.filter((_, j) => j !== i))

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (!picked.type.startsWith('image/')) return setErrors((x) => ({ ...x, cover: 'აირჩიე სურათის ფაილი (JPG, PNG ან WebP).' }))
    if (picked.size > MAX_FILE) return setErrors((x) => ({ ...x, cover: 'ფაილი ძალიან დიდია (მაქსიმუმ 30 მბ).' }))
    dirtyRef.current = true
    setFile(picked)
    setCoverRemoved(false)
    setErrors((x) => ({ ...x, cover: undefined }))
  }

  const clearCover = () => {
    dirtyRef.current = true
    setFile(null)
    setCoverRemoved(true)
  }

  const ownCoverPath = (url: string | null | undefined) => {
    const p = storagePath(url, 'covers')
    return p && user && p.startsWith(`tours/${user.id}/`) ? p : null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || savingRef.current) return
    const { errs, row } = validate(f)
    setErrors((prev) => ({ cover: prev.cover, ...errs }))
    if (Object.values(errs).some(Boolean)) {
      toast('შეასწორე მონიშნული ველები.', 'error')
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }

    savingRef.current = true
    setSaving(true)
    let uploaded: string | null = null
    let stage: 'upload' | 'save' = 'save'
    try {
      let cover_url = coverRemoved ? null : tour?.cover_url ?? null
      if (file) {
        stage = 'upload'
        const up = await uploadPhoto('covers', `tours/${user.id}`, file)
        uploaded = up.path
        cover_url = up.url
        stage = 'save'
      }
      const data = { ...row, cover_url }
      let id = tour?.id ?? 0
      if (tour) {
        const { data: rows, error } = await supabase.from('tours').update(data).eq('id', tour.id).select('id')
        if (error) throw error
        if (!rows?.length) throw new Error('permission denied')
      } else {
        const { data: created, error } = await supabase.from('tours').insert(data).select('id').single()
        if (error) throw error
        id = (created as { id: number }).id
      }
      uploaded = null
      const oldPath = ownCoverPath(tour?.cover_url)
      if (oldPath && tour?.cover_url !== cover_url) removeFiles('covers', [oldPath])
      invalidateTours(qc)
      dirtyRef.current = false
      savingRef.current = false
      toast(tour ? 'ტური შენახულია.' : row.is_active ? 'ტური გამოქვეყნდა.' : 'ტური შენახულია. ის გამორთულია და სხვებს არ უჩანთ.')
      onSaved?.(id)
      onCloseRef.current()
    } catch (err) {
      if (uploaded) removeFiles('covers', [uploaded])
      toast(stage === 'upload' ? photoError(err) : errorText(err), 'error')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const coverShown = preview ?? (coverRemoved ? null : tour?.cover_url ?? null)
  const today = todayISO()

  return (
    <Modal
      open
      onClose={requestClose}
      title={tour ? 'ტურის რედაქტირება' : 'ახალი ტური'}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={requestClose} disabled={saving}>გაუქმება</button>
          <button type="submit" form={formId} className="btn-primary" disabled={saving}>
            {saving && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
            {!tour && f.is_active ? 'გამოქვეყნება' : 'შენახვა'}
          </button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={submit} noValidate className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <Field label="სათაური" error={errors.title}>
            <input
              value={f.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls(errors.title)}
              maxLength={160}
              placeholder="მოკლე და ზუსტი სათაური"
              aria-label="სათაური"
              aria-invalid={!!errors.title}
            />
          </Field>

          <Field label="მარშრუტი" hint="არასავალდებულო. მონიშნე, თუ ტური საიტზე არსებულ მარშრუტზე გადის.">
            <RoutePicker value={f.route_id} onChange={onRoute} allowEmpty placeholder="აირჩიე მარშრუტი (არასავალდებულო)" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="დღეები" error={errors.days}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={f.days}
                onChange={(e) => { touched.current.days = true; set('days', e.target.value) }}
                className={inputCls(errors.days)}
                aria-label="დღეების რაოდენობა"
                aria-invalid={!!errors.days}
              />
            </Field>
            <Field label="სირთულე">
              <select
                value={f.difficulty}
                onChange={(e) => { touched.current.difficulty = true; set('difficulty', e.target.value as Difficulty) }}
                className="input"
                aria-label="სირთულე"
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
              </select>
            </Field>
          </div>

          <Field
            label={<span className="flex items-baseline justify-between gap-3"><span>აღწერა</span><Counter value={f.description} max={DESC_MAX} /></span>}
            hint="გეგმა დღეების მიხედვით, ღამისთევა, რა ფიზიკური მზადება სჭირდება, რა უნდა წამოიღოს მონაწილემ."
            error={errors.description}
          >
            <textarea
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              rows={9}
              className={inputCls(errors.description, 'resize-y')}
              aria-label="აღწერა"
              aria-invalid={!!errors.description}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ფასი (₾)" hint="ცარიელი დატოვე, თუ ფასი შეთანხმებითაა." error={errors.price_gel}>
              <input
                inputMode="decimal"
                value={f.price_gel}
                onChange={(e) => set('price_gel', e.target.value)}
                className={inputCls(errors.price_gel)}
                placeholder="შეთანხმებით"
                aria-label="ფასი ლარში"
                aria-invalid={!!errors.price_gel}
              />
            </Field>
            <Field label="ფასის შენიშვნა" error={errors.price_note}>
              <input
                value={f.price_note}
                onChange={(e) => set('price_note', e.target.value)}
                className={inputCls(errors.price_note)}
                maxLength={220}
                placeholder="მაგ: ერთ ადამიანზე"
                aria-label="ფასის შენიშვნა"
                aria-invalid={!!errors.price_note}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ჯგუფი — მინიმუმ" error={errors.group_min}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={f.group_min}
                onChange={(e) => set('group_min', e.target.value)}
                className={inputCls(errors.group_min)}
                placeholder="არ არის"
                aria-label="ჯგუფის მინიმალური ზომა"
                aria-invalid={!!errors.group_min}
              />
            </Field>
            <Field label="ჯგუფი — მაქსიმუმ" error={errors.group_max}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={f.group_max}
                onChange={(e) => set('group_max', e.target.value)}
                className={inputCls(errors.group_max)}
                placeholder="არ არის"
                aria-label="ჯგუფის მაქსიმალური ზომა"
                aria-invalid={!!errors.group_max}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ფასში შედის" hint="თითო პუნქტი ახალ ხაზზე." error={errors.includes}>
              <textarea
                value={f.includes}
                onChange={(e) => set('includes', e.target.value)}
                rows={5}
                className={inputCls(errors.includes, 'resize-y')}
                placeholder={'მაგ: ტრანსპორტი\nღამისთევა'}
                aria-label="ფასში შედის"
                aria-invalid={!!errors.includes}
              />
            </Field>
            <Field label="ფასში არ შედის" hint="თითო პუნქტი ახალ ხაზზე." error={errors.excludes}>
              <textarea
                value={f.excludes}
                onChange={(e) => set('excludes', e.target.value)}
                rows={5}
                className={inputCls(errors.excludes, 'resize-y')}
                placeholder={'მაგ: პირადი აღჭურვილობა'}
                aria-label="ფასში არ შედის"
                aria-invalid={!!errors.excludes}
              />
            </Field>
          </div>

          <Field label="შეკრების ადგილი" hint="სად და რომელ საათზე იკრიბება ჯგუფი." error={errors.meeting_point}>
            <input
              value={f.meeting_point}
              onChange={(e) => set('meeting_point', e.target.value)}
              className={inputCls(errors.meeting_point)}
              maxLength={320}
              placeholder="ქალაქი, ადგილი, დრო"
              aria-label="შეკრების ადგილი"
              aria-invalid={!!errors.meeting_point}
            />
          </Field>
        </div>

        <div className="min-w-0 space-y-5">
          <Field label="ფოტო" hint="ფოტოს გარეშე ბარათზე რუკის ნახატი გამოჩნდება. ატვირთვამდე ფოტო შემცირდება და მდებარეობის მონაცემები წაიშლება." error={errors.cover}>
            <div className="overflow-hidden rounded-xl border border-line">
              {coverShown ? (
                <img src={coverShown} alt="ტურის ფოტო" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <TopoCover seed={tour ? `tour-${tour.id}` : 'new-tour'} label="ფოტო არ არის" className="aspect-[4/3] w-full" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={saving}>
                <ImagePlus size={15} aria-hidden /> {coverShown ? 'შეცვლა' : 'ფოტოს არჩევა'}
              </button>
              {coverShown && (
                <button type="button" className="btn-ghost btn-sm" onClick={clearCover} disabled={saving}>
                  <Trash2 size={15} aria-hidden /> წაშლა
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={onPick} />
          </Field>

          <Field label="გასვლის თარიღები" hint="პირველი დღე. გასული თარიღები ტურის გვერდზე ნაცრისფრად ჩანს." error={errors.start_dates}>
            <ul className="space-y-2">
              {f.start_dates.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={d}
                    min={!d || d >= today ? today : undefined}
                    onChange={(e) => setDate(i, e.target.value)}
                    className={inputCls(errors.start_dates, d && d < today ? 'text-ink-3' : '')}
                    aria-label={`გასვლის თარიღი ${i + 1}`}
                    aria-invalid={!!errors.start_dates}
                  />
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-hard"
                    aria-label={`თარიღის წაშლა ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-ghost btn-sm mt-2" onClick={addDate}>
              <CalendarPlus size={15} aria-hidden /> თარიღის დამატება
            </button>
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3.5 hover:bg-surface-2/60">
            <input
              type="checkbox"
              checked={f.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--forest))]"
            />
            <span>
              <span className="block font-semibold text-ink">ტური ჩანს ყველასთვის</span>
              <span className="block text-[13px] text-ink-3">გამორთული ტური მხოლოდ შენ გიჩანს. ჩართვა ნებისმიერ დროს შეგიძლია.</span>
            </span>
          </label>
        </div>
      </form>
    </Modal>
  )
}
