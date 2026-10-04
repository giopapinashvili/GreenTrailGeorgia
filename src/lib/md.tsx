import { Fragment, type ReactNode } from 'react'

/**
 * Tiny, safe Markdown renderer (no HTML injection): headings (##, ###), paragraphs,
 * bullet/numbered lists, > quotes, **bold**, *italic*, [links](https://...).
 */
export function Markdown({ text, className = 'prose-gt' }: { text: string; className?: string }) {
  const blocks = parseBlocks(text || '')
  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{renderBlock(b)}</Fragment>)}</div>
}

type Block = { t: 'h2' | 'h3' | 'p' | 'quote'; text: string } | { t: 'ul' | 'ol'; items: string[] }

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = [] } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { flush(); continue }
    if (trimmed.startsWith('### ')) { flush(); out.push({ t: 'h3', text: trimmed.slice(4) }); continue }
    if (trimmed.startsWith('## ')) { flush(); out.push({ t: 'h2', text: trimmed.slice(3) }); continue }
    if (trimmed.startsWith('> ')) { flush(); out.push({ t: 'quote', text: trimmed.slice(2) }); continue }
    if (/^[-*•] /.test(trimmed)) {
      flush()
      const items = [trimmed.replace(/^[-*•] /, '')]
      while (i + 1 < lines.length && /^[-*•] /.test(lines[i + 1].trim())) items.push(lines[++i].trim().replace(/^[-*•] /, ''))
      out.push({ t: 'ul', items })
      continue
    }
    if (/^\d+[.)] /.test(trimmed)) {
      flush()
      const items = [trimmed.replace(/^\d+[.)] /, '')]
      while (i + 1 < lines.length && /^\d+[.)] /.test(lines[i + 1].trim())) items.push(lines[++i].trim().replace(/^\d+[.)] /, ''))
      out.push({ t: 'ol', items })
      continue
    }
    para.push(trimmed)
  }
  flush()
  return out
}

function renderBlock(b: Block): ReactNode {
  switch (b.t) {
    case 'h2': return <h2>{inline(b.text)}</h2>
    case 'h3': return <h3>{inline(b.text)}</h3>
    case 'quote': return <blockquote>{inline(b.text)}</blockquote>
    case 'ul': return <ul>{b.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>
    case 'ol': return <ol>{b.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</ol>
    default: return <p>{inline(b.text)}</p>
  }
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*')) out.push(<em key={k++}>{tok.slice(1, -1)}</em>)
    else {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!
      const href = mm[2]
      const ext = /^https?:/.test(href)
      out.push(<a key={k++} href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}>{mm[1]}</a>)
    }
    last = m.index + tok.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

/** Plain text with line breaks preserved and links made clickable (for user posts/comments). */
export function PlainText({ text, className = '' }: { text: string; className?: string }) {
  const parts = (text || '').split(/\n{2,}/)
  return (
    <div className={className}>
      {parts.map((p, i) => (
        <p key={i} className="my-3 whitespace-pre-line first:mt-0 last:mb-0">{linkify(p)}</p>
      ))}
    </div>
  )
}

function linkify(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    out.push(<a key={k++} href={m[0]} target="_blank" rel="noopener noreferrer nofollow ugc" className="link break-all">{m[0]}</a>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}
