import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Search, X } from 'lucide-react'
import { commonsNear, type CommonsPhoto } from '../../lib/commons'
import { uploadPhoto } from '../../lib/storage'
import { errorText } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

export interface CoverValue { cover_url: string; cover_credit: string; cover_source_url: string }

/** Cover photo: free photos near the route (Wikimedia Commons), own upload, or a pasted link. */
export default function RouteCoverPicker({ value, onChange, near, slug }: { value: CoverValue; onChange: (v: CoverValue) => void; near: { lat: number; lng: number } | null; slug: string }) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<CommonsPhoto[] | null>(null)
  const [busy, setBusy] = useState<'search' | 'upload' | null>(null)

  const search = async () => {
    if (!near) return toast('ჯერ გაჩერებები დაამატე — ფოტოებს მათ ახლოს ვეძებ.', 'error')
    setBusy('search')
    try {
      const list = await commonsNear(near.lat, near.lng, 9000, 40)
      setPhotos(list)
      if (!list.length) toast('ახლომახლო ფოტო ვერ ვიპოვე.', 'error')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(null)
    }
  }
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy('upload')
    try {
      const { url } = await uploadPhoto('covers', `routes/${slug || 'route'}`, file, 2000)
      onChange({ cover_url: url, cover_credit: '', cover_source_url: '' })
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-4">
      {value.cover_url ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          <img src={value.cover_url} alt="" className="max-h-72 w-full object-cover" />
          <button type="button" onClick={() => onChange({ cover_url: '', cover_credit: '', cover_source_url: '' })} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" aria-label="ფოტოს მოხსნა"><X size={15} /></button>
          {value.cover_credit && <p className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-[11.5px] text-white">{value.cover_credit}</p>}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line-2 p-4 text-center text-[13.5px] text-ink-3">ფოტო არ არის — საიტზე გენერირებული ტოპო-სურათი გამოჩნდება.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={search} disabled={busy !== null} className="btn-secondary btn-sm">
          {busy === 'search' ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />} ფოტოები ახლომახლო (Wikimedia Commons)
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className="btn-ghost btn-sm">
          {busy === 'upload' ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />} საკუთარი ფოტო
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {photos && photos.length > 0 && (
        <div>
          <p className="mb-2 text-[12.5px] text-ink-3">აირჩიე ფოტო, რომელიც მართლა ამ მარშრუტს აჩვენებს. ავტორი და ლიცენზია ავტომატურად მიეთითება.</p>
          <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {photos.map((p) => (
              <button
                type="button"
                key={p.page}
                onClick={() => onChange({ cover_url: p.thumb, cover_credit: `${p.author}${p.license ? ` · ${p.license}` : ''} · Wikimedia Commons`, cover_source_url: p.page })}
                className={`group overflow-hidden rounded-lg border text-left ${value.cover_url === p.thumb ? 'border-forest ring-2 ring-forest' : 'border-line'}`}
                title={p.title}
              >
                <img src={p.thumb} alt={p.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <span className="block truncate px-2 py-1 text-[11px] text-ink-3">{p.author} · {p.license}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold text-ink-2">ბმულით ჩასმა</summary>
        <div className="mt-2 grid gap-2">
          <input value={value.cover_url} onChange={(e) => onChange({ ...value, cover_url: e.target.value })} className="input text-[13px]" placeholder="ფოტოს ბმული (https://…)" />
          <input value={value.cover_credit} onChange={(e) => onChange({ ...value, cover_credit: e.target.value })} className="input text-[13px]" placeholder="ავტორი / ლიცენზია" />
          <input value={value.cover_source_url} onChange={(e) => onChange({ ...value, cover_source_url: e.target.value })} className="input text-[13px]" placeholder="წყაროს გვერდი (https://…)" />
        </div>
      </details>
    </div>
  )
}
