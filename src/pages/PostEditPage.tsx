import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star as StarIcon, Trash2, X } from 'lucide-react'
import RequireAuth from '../components/common/RequireAuth'
import RoutePicker from '../components/route/RoutePicker'
import Stars from '../components/ui/Stars'
import Field from '../components/ui/Field'
import Empty from '../components/ui/Empty'
import { PageSpinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../lib/auth'
import { usePost } from '../lib/queries'
import { supabase, errorText } from '../lib/supabase'
import { removeFiles, uploadPhoto } from '../lib/storage'
import { usePageTitle } from '../lib/title'
import type { Post } from '../lib/types'

const MAX_PHOTOS = 12
const DRAFT_KEY = 'gt-post-draft'

interface PhotoItem {
  key: string
  id?: number
  storage_path: string
  url: string
  width: number | null
  height: number | null
  caption: string
  preview?: string
  uploading?: boolean
  failed?: boolean
}

export default function PostEditPage() {
  return <RequireAuth><Editor /></RequireAuth>
}

function Editor() {
  const { id } = useParams()
  const postId = Number(id) || undefined
  const existing = usePost(postId)
  const { user } = useAuth()
  usePageTitle(postId ? 'ისტორიის რედაქტირება' : 'ახალი ისტორია')

  if (postId && existing.isLoading) return <PageSpinner />
  if (postId && (!existing.data || existing.data.author_id !== user?.id)) {
    return <div className="page py-16"><Empty title="ამ ისტორიის რედაქტირება არ შეგიძლია" text="რედაქტირება მხოლოდ ავტორს შეუძლია." action={<Link to="/blog" className="btn-primary">ბლოგი</Link>} /></div>
  }
  return <PostForm post={existing.data ?? null} />
}

function PostForm({ post }: { post: Post | null }) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft] = useState(() => (!post ? readDraft() : null))

  const [routeId, setRouteId] = useState<number | null>(post?.route_id ?? (Number(params.get('route')) || draft?.routeId || null))
  const [title, setTitle] = useState(post?.title ?? draft?.title ?? '')
  const [body, setBody] = useState(post?.body ?? draft?.body ?? '')
  const [hikedOn, setHikedOn] = useState(post?.hiked_on ?? draft?.hikedOn ?? '')
  const [rating, setRating] = useState<number | null>(post?.rating ?? draft?.rating ?? null)
  const [photos, setPhotos] = useState<PhotoItem[]>(
    () => (post?.photos ?? []).map((ph) => ({ key: `db-${ph.id}`, id: ph.id, storage_path: ph.storage_path, url: ph.url, width: ph.width, height: ph.height, caption: ph.caption ?? '' })),
  )
  const [removed, setRemoved] = useState<PhotoItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  // keep an unsent new post in this browser
  useEffect(() => {
    if (post) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ routeId, title, body, hikedOn, rating })) } catch { /* ignore */ }
    }, 600)
    return () => clearTimeout(t)
  }, [post, routeId, title, body, hikedOn, rating])

  const addFiles = (files: FileList | null) => {
    if (!files || !user) return
    const room = MAX_PHOTOS - photos.length
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room))
    if (files.length > room) toast(`მაქსიმუმ ${MAX_PHOTOS} ფოტო.`, 'error')
    for (const file of list) {
      const key = `new-${Math.random().toString(36).slice(2)}`
      const preview = URL.createObjectURL(file)
      setPhotos((x) => [...x, { key, storage_path: '', url: '', width: null, height: null, caption: '', preview, uploading: true }])
      uploadPhoto('post-photos', user.id, file)
        .then((r) => setPhotos((x) => x.map((p) => (p.key === key ? { ...p, ...r, uploading: false } : p))))
        .catch((err) => {
          toast(errorText(err), 'error')
          setPhotos((x) => x.map((p) => (p.key === key ? { ...p, uploading: false, failed: true } : p)))
        })
    }
  }

  const removePhoto = (p: PhotoItem) => {
    setPhotos((x) => x.filter((y) => y.key !== p.key))
    if (p.id) setRemoved((x) => [...x, p])
    else if (p.storage_path) removeFiles('post-photos', [p.storage_path])
  }
  const move = (i: number, d: -1 | 1) => setPhotos((x) => {
    const j = i + d
    if (j < 0 || j >= x.length) return x
    const n = [...x]; [n[i], n[j]] = [n[j], n[i]]; return n
  })
  const makeCover = (i: number) => setPhotos((x) => [x[i], ...x.filter((_, k) => k !== i)])
  const setCaption = (key: string, caption: string) => setPhotos((x) => x.map((p) => (p.key === key ? { ...p, caption } : p)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!routeId) errs.route = 'მონიშნე, რომელ მარშრუტზეა ისტორია — ასე ითვლება მარშრუტის სტატისტიკა.'
    if (title.trim().length < 3) errs.title = 'სათაური მინიმუმ 3 სიმბოლო.'
    if (title.trim().length > 140) errs.title = 'სათაური მაქსიმუმ 140 სიმბოლო.'
    if (body.trim().length < 10) errs.body = 'დაწერე ცოტა მეტი — რამდენიმე წინადადება მაინც.'
    if (hikedOn && hikedOn > today) errs.hikedOn = 'თარიღი მომავალში ვერ იქნება.'
    setErrors(errs)
    if (Object.keys(errs).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (photos.some((p) => p.uploading)) return toast('დაელოდე, ფოტოები ჯერ იტვირთება.', 'error')

    const ready = photos.filter((p) => !p.failed && p.url)
    const row = { route_id: routeId!, title: title.trim(), body: body.trim(), hiked_on: hikedOn || null, rating, cover_url: ready[0]?.url ?? null }
    setBusy(true)
    try {
      let pid = post?.id
      if (pid) {
        const { error } = await supabase.from('posts').update(row).eq('id', pid)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('posts').insert(row).select('id').single()
        if (error) throw error
        pid = data.id as number
      }
      if (removed.length) {
        const { error } = await supabase.from('post_photos').delete().in('id', removed.map((p) => p.id!))
        if (error) throw error
        await removeFiles('post-photos', removed.map((p) => p.storage_path))
      }
      const fresh = ready.map((p, i) => ({ p, i })).filter(({ p }) => !p.id)
      if (fresh.length) {
        const { error } = await supabase.from('post_photos').insert(fresh.map(({ p, i }) => ({
          post_id: pid, storage_path: p.storage_path, url: p.url, width: p.width, height: p.height, caption: p.caption.trim() || null, position: i,
        })))
        if (error) throw error
      }
      for (const [i, p] of ready.entries()) {
        if (!p.id) continue
        const { error } = await supabase.from('post_photos').update({ caption: p.caption.trim() || null, position: i }).eq('id', p.id)
        if (error) throw error
      }
      if (!post) { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }
      for (const k of ['posts', 'post', 'route-photos', 'route-stats', 'profile-stats', 'completions', 'route-monthly', 'done-one']) qc.invalidateQueries({ queryKey: [k] })
      toast(post ? 'ცვლილებები შენახულია.' : 'ისტორია გამოქვეყნდა. მადლობა!')
      navigate(`/blog/${pid}`, { replace: true })
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page max-w-3xl pb-16 pt-8">
      <p className="kicker mb-2 flex items-center gap-2"><span className="blaze" />{post ? 'რედაქტირება' : 'ახალი ისტორია'}</p>
      <h1 className="text-[30px] leading-tight">{post ? 'ისტორიის რედაქტირება' : 'მოყევი შენი ლაშქრობა'}</h1>
      <p className="mt-2 text-[15px] text-ink-2">ისტორია კონკრეტულ მარშრუტზე უნდა იყოს — ფოტოები და შეფასება ამ მარშრუტის გვერდზეც გამოჩნდება.</p>

      <form onSubmit={submit} className="mt-8 grid gap-6" noValidate>
        <Field label="მარშრუტი *" error={errors.route}>
          <RoutePicker value={routeId} onChange={setRouteId} invalid={!!errors.route} />
        </Field>

        <Field label="სათაური *" error={errors.title}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className="input text-[16px]" placeholder="მაგ: სამი დღე სვანეთში — ჩხუნდერის გადასვლა ნისლში" />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="როდის გაიარე" error={errors.hikedOn} hint="თუ მიუთითებ, მარშრუტი შენს პროფილზე გავლილად მოინიშნება.">
            <input type="date" value={hikedOn} max={today} onChange={(e) => setHikedOn(e.target.value)} className="input" />
          </Field>
          <Field label="შენი შეფასება">
            <div className="flex h-[42px] items-center gap-3">
              <Stars value={rating} onChange={setRating} size={22} />
              {rating && <button type="button" onClick={() => setRating(null)} className="text-[12.5px] text-ink-3 hover:text-ink">მოხსნა</button>}
            </div>
          </Field>
        </div>

        <Field label="ტექსტი *" error={errors.body} hint="რა უნდა იცოდეს შემდეგმა მოლაშქრემ: ამინდი, ბილიკის მდგომარეობა, წყალი, ტრანსპორტი, სად გაათიე ღამე, რა ღირდა.">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} maxLength={20000} className="input leading-relaxed" placeholder="მოყევი თავიდან ბოლომდე…" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">ფოტოები ({photos.length}/{MAX_PHOTOS})</span>
            <span className="text-[12px] text-ink-3">პირველი ფოტო მთავარია · მდებარეობის მონაცემები იშლება</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <div key={p.key} className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="relative aspect-[4/3] bg-surface-2">
                  <img src={p.preview ?? p.url} alt="" className={`h-full w-full object-cover ${p.uploading || p.failed ? 'opacity-50' : ''}`} />
                  {p.uploading && <span className="absolute inset-0 grid place-items-center"><LoaderCircle size={24} className="animate-spin text-white drop-shadow" /></span>}
                  {p.failed && <span className="absolute inset-x-2 bottom-2 rounded bg-hard px-2 py-1 text-center text-[11.5px] font-semibold text-white">ვერ აიტვირთა</span>}
                  {i === 0 && !p.failed && <span className="absolute left-2 top-2 rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold text-on-forest">მთავარი</span>}
                  <button type="button" onClick={() => removePhoto(p)} className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white hover:bg-black/75" aria-label="ფოტოს წაშლა"><X size={14} /></button>
                </div>
                <div className="p-2">
                  <input value={p.caption} onChange={(e) => setCaption(p.key, e.target.value)} maxLength={300} className="input !py-1.5 text-[13px]" placeholder="წარწერა" />
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="მარცხნივ"><ArrowLeft size={14} /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="rounded p-1 text-ink-3 hover:bg-surface-2 disabled:opacity-30" aria-label="მარჯვნივ"><ArrowRight size={14} /></button>
                    </div>
                    {i !== 0 && <button type="button" onClick={() => makeCover(i)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline"><StarIcon size={12} /> მთავრად</button>}
                  </div>
                </div>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-[4/3] place-items-center rounded-xl border-2 border-dashed border-line-2 text-ink-3 hover:border-forest hover:text-forest">
                <span className="flex flex-col items-center gap-1.5 text-[13px] font-semibold"><ImagePlus size={24} /> ფოტოს დამატება</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </div>

        <div className="sticky bottom-16 z-10 -mx-4 flex items-center justify-end gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 sm:mx-0 sm:rounded-xl sm:border">
          {post && <Link to={`/blog/${post.id}`} className="btn-ghost">გაუქმება</Link>}
          {!post && (title || body) && (
            <button type="button" onClick={() => { if (confirm('გასუფთავდეს მონახაზი?')) { setTitle(''); setBody(''); setHikedOn(''); setRating(null); try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } } }} className="btn-ghost mr-auto text-ink-3">
              <Trash2 size={15} /> გასუფთავება
            </button>
          )}
          <button className="btn-primary" disabled={busy || photos.some((p) => p.uploading)}>
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            {post ? 'შენახვა' : 'გამოქვეყნება'}
          </button>
        </div>
      </form>
    </div>
  )
}

function readDraft(): { routeId: number | null; title: string; body: string; hikedOn: string; rating: number | null } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
