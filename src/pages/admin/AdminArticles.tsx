import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Confirm from '../../components/ui/Confirm'
import Field from '../../components/ui/Field'
import Tabs from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/Toast'
import { Markdown } from '../../lib/md'
import { supabase, errorText } from '../../lib/supabase'
import { slugify } from '../../lib/slug'
import { formatDate } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { ARTICLE_CAT } from '../HomePage'
import type { Article } from '../../lib/types'

type Draft = Pick<Article, 'title' | 'slug' | 'excerpt' | 'body' | 'category' | 'cover_url' | 'cover_credit' | 'sort' | 'status'> & { id?: number }
const EMPTY: Draft = { title: '', slug: '', excerpt: '', body: '', category: 'tips', cover_url: null, cover_credit: null, sort: 0, status: 'published' }

export default function AdminArticles() {
  usePageTitle('სტატიები — ადმინი')
  const qc = useQueryClient()
  const toast = useToast()
  const [edit, setEdit] = useState<Draft | null>(null)
  const [del, setDel] = useState<Article | null>(null)
  const list = useQuery({
    queryKey: ['admin-articles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('articles').select('*').order('sort').order('created_at')
      if (error) throw error
      return (data ?? []) as Article[]
    },
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-articles'] })
    qc.invalidateQueries({ queryKey: ['articles'] })
    qc.invalidateQueries({ queryKey: ['article'] })
  }
  const remove = async () => {
    if (!del) return
    const { error } = await supabase.from('articles').delete().eq('id', del.id)
    if (error) { toast(errorText(error), 'error'); return }
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px]">რჩევები და სტატიები</h1>
          <p className="text-[14px] text-ink-3">ჩანს გვერდზე „რჩევები“ და მთავარ გვერდზე.</p>
        </div>
        <button onClick={() => setEdit({ ...EMPTY })} className="btn-primary btn-sm"><Plus size={15} /> ახალი</button>
      </div>
      <div className="card divide-y divide-line">
        {(list.data ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-8 text-center text-[12px] text-ink-3">{a.sort}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.title}</p>
              <p className="text-[12.5px] text-ink-3">{ARTICLE_CAT[a.category]} · /tips/{a.slug} · {formatDate(a.updated_at)}</p>
            </div>
            {a.status === 'draft' && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">დრაფტი</span>}
            <button onClick={() => setEdit({ ...a })} className="btn-ghost btn-sm" aria-label="რედაქტირება"><Pencil size={15} /></button>
            <button onClick={() => setDel(a)} className="btn-ghost btn-sm text-hard" aria-label="წაშლა"><Trash2 size={15} /></button>
          </div>
        ))}
        {list.data?.length === 0 && <p className="px-4 py-8 text-center text-ink-3">სტატია ჯერ არ არის.</p>}
      </div>
      {edit && <ArticleEditor draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />}
      <Confirm open={!!del} onClose={() => setDel(null)} title="სტატიის წაშლა?" text={del?.title} confirmLabel="წაშლა" danger onConfirm={remove} />
    </div>
  )
}

function ArticleEditor({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(draft)
  const [slugTouched, setSlugTouched] = useState(!!draft.id)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = async () => {
    const e: Record<string, string> = {}
    if (!d.title.trim()) e.title = 'სათაური სავალდებულოა.'
    if (!/^[a-z0-9-]{2,80}$/.test(d.slug)) e.slug = 'ლათინური პატარა ასოები, ციფრები და ტირე.'
    if (!d.excerpt.trim()) e.excerpt = 'მოკლე აღწერა სავალდებულოა.'
    if (!d.body.trim()) e.body = 'ტექსტი სავალდებულოა.'
    setErr(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const row = { title: d.title.trim(), slug: d.slug, excerpt: d.excerpt.trim(), body: d.body.trim(), category: d.category, cover_url: d.cover_url || null, cover_credit: d.cover_credit || null, sort: Number(d.sort) || 0, status: d.status }
    const { error } = d.id ? await supabase.from('articles').update(row).eq('id', d.id) : await supabase.from('articles').insert(row)
    setBusy(false)
    if (error) return toast(/duplicate/i.test(error.message) ? 'ასეთი slug უკვე არსებობს.' : errorText(error), 'error')
    toast('შენახულია.')
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={d.id ? 'სტატიის რედაქტირება' : 'ახალი სტატია'}
      footer={<><button className="btn-ghost" onClick={onClose}>გაუქმება</button><button className="btn-primary" onClick={save} disabled={busy}>{busy && <LoaderCircle size={15} className="animate-spin" />} შენახვა</button></>}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="სათაური *" error={err.title}><input value={d.title} onChange={(e) => { const v = e.target.value; setD((x) => ({ ...x, title: v, slug: slugTouched ? x.slug : slugify(v) })) }} className="input" /></Field>
          <Field label="slug *" error={err.slug} hint={`/tips/${d.slug || '…'}`}><input value={d.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')) }} className="input font-mono text-[13.5px]" /></Field>
          <Field label="კატეგორია">
            <select value={d.category} onChange={(e) => set('category', e.target.value as Article['category'])} className="input">
              {Object.entries(ARTICLE_CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="რიგი"><input value={d.sort} onChange={(e) => set('sort', Number(e.target.value.replace(/\D/g, '')) || 0)} inputMode="numeric" className="input" /></Field>
            <Field label="სტატუსი">
              <select value={d.status} onChange={(e) => set('status', e.target.value as Article['status'])} className="input">
                <option value="published">გამოქვეყნებული</option>
                <option value="draft">დრაფტი</option>
              </select>
            </Field>
          </div>
        </div>
        <Field label="მოკლე აღწერა *" error={err.excerpt}><textarea value={d.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} className="input" /></Field>
        <div>
          <Tabs tabs={[{ id: 'edit', label: 'ტექსტი' }, { id: 'preview', label: 'გადახედვა' }]} value={view} onChange={setView} />
          {view === 'edit' ? (
            <Field error={err.body} hint="## სათაური · ### ქვესათაური · - სია · 1. სია · **მუქი** · *დახრილი* · [ბმული](https://…) · > ციტატა" className="mt-3">
              <textarea value={d.body} onChange={(e) => set('body', e.target.value)} rows={16} className="input font-mono text-[13px] leading-relaxed" />
            </Field>
          ) : <div className="mt-3 rounded-lg border border-line p-4"><Markdown text={d.body} /></div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ფოტოს ბმული"><input value={d.cover_url ?? ''} onChange={(e) => set('cover_url', e.target.value)} className="input" placeholder="https://…" /></Field>
          <Field label="ფოტოს ავტორი / ლიცენზია"><input value={d.cover_credit ?? ''} onChange={(e) => set('cover_credit', e.target.value)} className="input" /></Field>
        </div>
      </div>
    </Modal>
  )
}
