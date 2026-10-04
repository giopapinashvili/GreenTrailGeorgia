import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, LoaderCircle, MessageCircle, MoreVertical, Search, Send, ShieldOff, Trash2, UserRound } from 'lucide-react'
import RequireAuth from '../components/common/RequireAuth'
import ReportButton from '../components/common/ReportButton'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../lib/auth'
import { supabase, errorText } from '../lib/supabase'
import { signedChatImage, uploadChatImage } from '../lib/storage'
import { PlainText } from '../lib/md'
import { clockTime, formatDate, timeAgo } from '../lib/format'
import { usePageTitle } from '../lib/title'
import type { Conversation, Message, ProfileLite } from '../lib/types'

const PAGE = 40

export default function MessagesPage() {
  return <RequireAuth><Messenger /></RequireAuth>
}

function useConversations() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['conversations'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_conversations')
      if (error) throw error
      return (data ?? []) as Conversation[]
    },
    refetchInterval: 60_000,
  })
}

function Messenger() {
  usePageTitle('მიმოწერა')
  const { id } = useParams()
  const [params] = useSearchParams()
  const to = params.get('to')
  const navigate = useNavigate()
  const toast = useToast()
  const convs = useConversations()
  const [q, setQ] = useState('')
  const [opening, setOpening] = useState(false)

  // /messages?to=<userId> → find or create the conversation
  useEffect(() => {
    if (!to) return
    let alive = true
    setOpening(true)
    supabase.rpc('get_or_create_dm', { other: to }).then(({ data, error }) => {
      if (!alive) return
      setOpening(false)
      if (error) {
        toast(/blocked/i.test(error.message) ? 'ამ მომხმარებელთან მიმოწერა შეზღუდულია.' : errorText(error), 'error')
        navigate('/messages', { replace: true })
        return
      }
      navigate(`/messages/${data}`, { replace: true })
    })
    return () => { alive = false }
  }, [to, navigate, toast])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (convs.data ?? []).filter((c) => !s || c.other_display_name.toLowerCase().includes(s) || c.other_username.includes(s))
  }, [convs.data, q])
  const current = convs.data?.find((c) => c.conversation_id === id)

  return (
    <div className="h-[calc(100dvh-128px)] border-line md:h-[calc(100dvh-64px)] md:border-b">
      <div className="page flex h-full !px-0 md:!px-6">
        <div className="grid h-full w-full overflow-hidden md:grid-cols-[320px_minmax(0,1fr)] md:border-x md:border-line lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* conversations */}
          <aside className={`${id ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-line bg-surface md:border-r`}>
            <div className="border-b border-line p-3">
              <h1 className="mb-2.5 px-1 text-[20px]">მიმოწერა</h1>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="input !py-2 pl-8 text-[14px]" placeholder="ძებნა" aria-label="საუბრის ძებნა" />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {convs.isLoading && <li className="grid place-items-center py-10"><LoaderCircle className="animate-spin text-forest" /></li>}
              {!convs.isLoading && list.length === 0 && (
                <li className="px-5 py-10 text-center text-[14px] text-ink-3">
                  {q ? 'ვერაფერი მოიძებნა.' : <>ჯერ არავისთან გისაუბრია. მიწერა შეგიძლია ნებისმიერ მოლაშქრეს — მის <b className="text-ink-2">პროფილზე</b> ან <b className="text-ink-2">პოსტთან</b> ღილაკით „მიწერა“.</>}
                </li>
              )}
              {list.map((c) => (
                <li key={c.conversation_id}>
                  <Link
                    to={`/messages/${c.conversation_id}`}
                    className={`flex items-center gap-3 border-b border-line px-3.5 py-3 hover:bg-surface-2 ${c.conversation_id === id ? 'bg-surface-2' : ''}`}
                  >
                    <Avatar url={c.other_avatar_url} name={c.other_display_name} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[14.5px] ${Number(c.unread_count) > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{c.other_display_name}</span>
                        <span className="shrink-0 text-[11.5px] text-ink-3">{timeAgo(c.last_message_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] ${Number(c.unread_count) > 0 ? 'font-semibold text-ink-2' : 'text-ink-3'}`}>{c.last_message_preview}</span>
                        {Number(c.unread_count) > 0 && <span className="grid min-w-[20px] shrink-0 place-items-center rounded-full bg-blaze px-1.5 text-[11px] font-bold leading-5 text-white">{c.unread_count}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          {/* thread */}
          <section className={`${id ? 'flex' : 'hidden md:flex'} min-h-0 flex-col bg-bg`}>
            {opening ? (
              <div className="grid flex-1 place-items-center"><LoaderCircle className="animate-spin text-forest" /></div>
            ) : id ? (
              <Thread key={id} convId={id} row={current} />
            ) : (
              <div className="topo-texture grid flex-1 place-items-center p-8 text-center">
                <div>
                  <MessageCircle size={36} className="mx-auto text-ink-3" />
                  <p className="mt-3 font-serif text-[19px] font-bold">აირჩიე საუბარი</p>
                  <p className="mt-1 max-w-xs text-[14px] text-ink-3">ან დაიწყე ახალი — ნებისმიერი მოლაშქრის პროფილიდან.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Thread({ convId, row }: { convId: string; row?: Conversation }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [older, setOlder] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [menu, setMenu] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const keepOffset = useRef<number | null>(null)

  // the other person (works even before the first message)
  const other = useQuery({
    queryKey: ['conv-other', convId],
    queryFn: async () => {
      const { data, error } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', convId).neq('user_id', user!.id).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return null
      const { data: p } = await supabase.from('profiles').select('id,username,display_name,avatar_url,role').eq('id', data.user_id).maybeSingle()
      return p as ProfileLite | null
    },
  })
  const blockedByMe = useQuery({
    queryKey: ['block-one', user?.id, other.data?.id],
    enabled: !!other.data,
    queryFn: async () => !!(await supabase.from('blocks').select('blocked_id').eq('blocker_id', user!.id).eq('blocked_id', other.data!.id).maybeSingle()).data,
  })
  const blockedAny = useQuery({
    queryKey: ['blocked-in', convId, blockedByMe.data],
    queryFn: async () => Boolean((await supabase.rpc('is_blocked_in', { conv: convId })).data),
  })

  const markRead = useCallback(async () => {
    await supabase.rpc('mark_conversation_read', { conv: convId })
    qc.invalidateQueries({ queryKey: ['unread'] })
    qc.invalidateQueries({ queryKey: ['conversations'] })
  }, [convId, qc])

  // first page + realtime
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: false }).limit(PAGE)
      if (!alive) return
      if (error) { toast(errorText(error), 'error'); setLoading(false); return }
      setMsgs([...(data as Message[])].reverse())
      setHasMore((data ?? []).length === PAGE)
      setLoading(false)
      markRead()
    })()
    const ch = supabase
      .channel(`conv-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (payload) => {
        const m = payload.new as Message
        setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m]))
        if (m.sender_id !== user?.id) markRead()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (payload) => {
        const oldId = (payload.old as { id?: number }).id
        if (oldId) setMsgs((x) => x.filter((y) => y.id !== oldId))
      })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [convId, markRead, toast, user?.id])

  // keep the view pinned to the newest message (unless reading older ones)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current
      keepOffset.current = null
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [msgs])

  const loadOlder = async () => {
    if (!msgs.length || older) return
    setOlder(true)
    const el = scroller.current
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).lt('created_at', msgs[0].created_at).order('created_at', { ascending: false }).limit(PAGE)
    if (el) keepOffset.current = el.scrollHeight - el.scrollTop
    setMsgs((x) => [...[...((data ?? []) as Message[])].reverse(), ...x])
    setHasMore((data ?? []).length === PAGE)
    setOlder(false)
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (el.scrollTop < 60 && hasMore && !older) loadOlder()
  }

  const insert = async (row: { body?: string | null; image_path?: string | null }) => {
    const { data, error } = await supabase.from('messages').insert({ conversation_id: convId, ...row }).select('*').single()
    if (error) {
      toast(/row-level security/i.test(error.message) ? 'შეტყობინება ვერ გაიგზავნა — მიმოწერა შეზღუდულია.' : errorText(error), 'error')
      return false
    }
    stick.current = true
    setMsgs((x) => (x.some((y) => y.id === (data as Message).id) ? x : [...x, data as Message]))
    qc.invalidateQueries({ queryKey: ['conversations'] })
    return true
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    const ok = await insert({ body: body.slice(0, 4000) })
    setSending(false)
    if (ok) { setText(''); taRef.current?.focus() }
  }
  const sendImage = async (file: File | undefined) => {
    if (!file) return
    setSending(true)
    try {
      const path = await uploadChatImage(convId, file)
      const caption = text.trim()
      const ok = await insert({ image_path: path, body: caption ? caption.slice(0, 4000) : null })
      if (ok && caption) setText('')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setSending(false)
    }
  }
  const remove = async (m: Message) => {
    const { error } = await supabase.from('messages').delete().eq('id', m.id)
    if (error) return toast(errorText(error), 'error')
    setMsgs((x) => x.filter((y) => y.id !== m.id))
    qc.invalidateQueries({ queryKey: ['conversations'] })
  }
  const toggleBlock = async () => {
    const o = other.data
    if (!o) return
    const { error } = blockedByMe.data
      ? await supabase.from('blocks').delete().eq('blocker_id', user!.id).eq('blocked_id', o.id)
      : await supabase.from('blocks').insert({ blocked_id: o.id })
    if (error) return toast(errorText(error), 'error')
    setMenu(false)
    qc.invalidateQueries({ queryKey: ['block-one'] })
    qc.invalidateQueries({ queryKey: ['blocked-in', convId] })
    qc.invalidateQueries({ queryKey: ['blocks'] })
    toast(blockedByMe.data ? 'განბლოკილია.' : 'დაბლოკილია — ვეღარ მოგწერს.')
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      send()
    }
  }

  const o = other.data
  const name = o?.display_name ?? row?.other_display_name ?? '…'
  const blocked = !!blockedAny.data

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5">
        <button onClick={() => navigate('/messages')} className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2 md:hidden" aria-label="უკან"><ArrowLeft size={20} /></button>
        {o ? (
          <Link to={`/u/${o.username}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-forest">
            <Avatar url={o.avatar_url} name={o.display_name} size={36} />
            <span className="min-w-0">
              <span className="block truncate font-semibold leading-tight">{name}</span>
              <span className="block truncate text-[12px] text-ink-3">@{o.username}</span>
            </span>
          </Link>
        ) : <span className="flex-1 font-semibold">{name}</span>}
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2" aria-label="მეტი" aria-expanded={menu}><MoreVertical size={19} /></button>
          {menu && o && (
            <div className="absolute right-0 top-10 z-20 w-56 animate-slide-up overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
              <Link to={`/u/${o.username}`} className="flex items-center gap-2.5 px-4 py-2 text-[14px] hover:bg-surface-2"><UserRound size={16} className="text-ink-3" /> პროფილი</Link>
              <button onClick={toggleBlock} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] text-hard hover:bg-surface-2"><ShieldOff size={16} /> {blockedByMe.data ? 'განბლოკვა' : 'დაბლოკვა'}</button>
              <div className="px-4 py-2"><ReportButton type="user" id={o.id} label="მომხმარებლის შეტყობინება" /></div>
            </div>
          )}
        </div>
      </header>

      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4 sm:px-5" onClick={() => setMenu(false)}>
        {loading ? (
          <div className="grid h-full place-items-center"><LoaderCircle className="animate-spin text-forest" /></div>
        ) : (
          <>
            {older && <div className="mb-3 grid place-items-center"><LoaderCircle size={18} className="animate-spin text-ink-3" /></div>}
            {!hasMore && msgs.length > 0 && <p className="mb-4 text-center text-[12px] text-ink-3">საუბრის დასაწყისი</p>}
            {msgs.length === 0 && <p className="mt-10 text-center text-[14px] text-ink-3">მიწერე პირველმა — მაგალითად, ჰკითხე მარშრუტის შესახებ.</p>}
            <MessageList msgs={msgs} me={user!.id} onDelete={remove} />
          </>
        )}
      </div>

      {blocked ? (
        <div className="border-t border-line bg-surface px-4 py-4 text-center text-[14px] text-ink-2">
          მიმოწერა შეზღუდულია.{blockedByMe.data && <> <button onClick={toggleBlock} className="link">განბლოკვა</button></>}
        </div>
      ) : (
        <div className="border-t border-line bg-surface p-2.5 sm:p-3">
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-forest" aria-label="ფოტოს გაგზავნა" title="ფოტო">
              <ImagePlus size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { sendImage(e.target.files?.[0]); e.target.value = '' }} />
            <AutoTextarea ref={taRef} value={text} onChange={setText} onKeyDown={onKey} />
            <button onClick={send} disabled={sending || !text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-forest text-on-forest hover:bg-forest-2 disabled:opacity-40" aria-label="გაგზავნა">
              {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, { value: string; onChange: (v: string) => void; onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void }>(
  function AutoTextarea({ value, onChange, onKeyDown }, ref) {
    const inner = useRef<HTMLTextAreaElement | null>(null)
    useLayoutEffect(() => {
      const el = inner.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(160, el.scrollHeight)}px`
    }, [value])
    return (
      <textarea
        ref={(el) => { inner.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={4000}
        placeholder="დაწერე შეტყობინება…"
        className="input min-h-[44px] flex-1 resize-none py-2.5 leading-snug"
        aria-label="შეტყობინება"
      />
    )
  },
)

function MessageList({ msgs, me, onDelete }: { msgs: Message[]; me: string; onDelete: (m: Message) => void }) {
  const [view, setView] = useState<string | null>(null)
  let lastDay = ''
  return (
    <div className="grid gap-1.5">
      {msgs.map((m, i) => {
        const day = m.created_at.slice(0, 10)
        const showDay = day !== lastDay
        lastDay = day
        const mine = m.sender_id === me
        const prev = msgs[i - 1]
        const grouped = prev && prev.sender_id === m.sender_id && !showDay && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000
        return (
          <div key={m.id}>
            {showDay && <p className="my-3 text-center text-[12px] font-semibold text-ink-3">{formatDate(m.created_at)}</p>}
            <div className={`group flex items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'mt-1.5'}`}>
              {mine && (
                <button onClick={() => onDelete(m)} className="mb-1 rounded p-1 text-ink-3 opacity-0 hover:text-hard focus:opacity-100 group-hover:opacity-100" aria-label="შეტყობინების წაშლა" title="წაშლა">
                  <Trash2 size={14} />
                </button>
              )}
              <div className={`max-w-[80%] overflow-hidden rounded-2xl sm:max-w-[70%] ${mine ? 'rounded-br-md bg-forest text-on-forest' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>
                {m.image_path && <ChatImage path={m.image_path} onOpen={setView} />}
                {m.body && <PlainText text={m.body} className={`px-3.5 py-2 text-[14.5px] leading-snug ${mine ? '[&_a]:!text-on-forest' : ''}`} />}
                <p className={`px-3.5 pb-1.5 text-right text-[10.5px] ${mine ? 'text-on-forest/70' : 'text-ink-3'} ${m.body ? '-mt-1' : 'pt-1'}`}>{clockTime(m.created_at)}</p>
              </div>
            </div>
          </div>
        )
      })}
      <Modal open={!!view} onClose={() => setView(null)} size="xl" title="ფოტო">
        {view && <img src={view} alt="" className="mx-auto max-h-[75vh] w-auto rounded-lg" />}
      </Modal>
    </div>
  )
}

function ChatImage({ path, onOpen }: { path: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    signedChatImage(path).then((u) => { if (alive) setUrl(u) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [path])
  if (failed) return <p className="px-3.5 pt-2 text-[12.5px] italic opacity-80">ფოტო ვერ ჩაიტვირთა</p>
  if (!url) return <div className="h-48 w-60 animate-pulse bg-surface-3/60" />
  return (
    <button onClick={() => onOpen(url)} className="block">
      <img src={url} alt="" className="max-h-72 w-full max-w-[280px] object-cover" />
    </button>
  )
}
