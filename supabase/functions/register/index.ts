// GreenTrail Georgia — sign-up without a confirmation email.
// Creates a ready-to-use email + password account with the name and username typed into the form,
// so the browser can sign in straight away. Nothing is emailed.
// An account the old email flow left unconfirmed (never signed in) is taken over by a new sign-up
// with the same email instead of failing with "already registered".
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const RESERVED = new Set(['admin', 'administrator', 'moderator', 'greentrail', 'support', 'system', 'root', 'help', 'info'])
const PER_IP_PER_HOUR = 6
const ALL_PER_HOUR = 100

type Json = Record<string, unknown>

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    if (keys?.default) return keys.default
  } catch { /* fall back to the legacy key */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

function clientIp(req: Request): string {
  const fwd = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return (fwd || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown').slice(0, 64)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405)

  // ── input ──
  let body: Json
  try { body = await req.json() } catch { return json({ ok: false, reason: 'bad_input' }, 400) }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const name = typeof body.display_name === 'string' ? body.display_name.replace(/\s+/g, ' ').trim() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ ok: false, reason: 'email' }, 400)
  if (password.length < 8 || password.length > 72) return json({ ok: false, reason: 'password' }, 400)
  if (!USERNAME_RE.test(username) || RESERVED.has(username)) return json({ ok: false, reason: 'username' }, 400)
  if (name.length < 2 || name.length > 60) return json({ ok: false, reason: 'name' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serverKey(), { auth: { persistSession: false, autoRefreshToken: false } })

  // ── simple rate limit (per address and overall) ──
  const ip = clientIp(req)
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const [mine, all] = await Promise.all([
    admin.from('signup_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', hourAgo),
    admin.from('signup_attempts').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo),
  ])
  if ((mine.count ?? 0) >= PER_IP_PER_HOUR || (all.count ?? 0) >= ALL_PER_HOUR) return json({ ok: false, reason: 'rate' }, 429)

  // ── an old unconfirmed sign-up with this email? ──
  const { data: pendingId } = await admin.rpc('pending_signup_user', { p_email: email })

  // ── username free? ──
  const { data: owner } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (owner && owner.id !== pendingId) return json({ ok: false, reason: 'username_taken' }, 409)

  const meta = { username, display_name: name }

  // only real account creations count towards the limit
  await admin.from('signup_attempts').insert({ ip })
  if (Math.random() < 0.05) {
    await admin.from('signup_attempts').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString())
  }

  if (pendingId) {
    const { error } = await admin.auth.admin.updateUserById(pendingId as string, { password, email_confirm: true, user_metadata: meta })
    if (error) return json({ ok: false, reason: error.code === 'weak_password' ? 'weak_password' : 'server' }, error.code === 'weak_password' ? 400 : 500)
    const { error: pErr } = await admin.from('profiles').update({ username, display_name: name, onboarded: true }).eq('id', pendingId)
    if (pErr) {
      const taken = /duplicate|unique/i.test(pErr.message)
      return json({ ok: false, reason: taken ? 'username_taken' : 'server' }, taken ? 409 : 500)
    }
    return json({ ok: true, username })
  }

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta })
  if (error || !created?.user) {
    const code = error?.code ?? ''
    const msg = (error?.message ?? '').toLowerCase()
    if (code === 'email_exists' || msg.includes('already been registered') || msg.includes('already registered')) {
      return json({ ok: false, reason: 'email_taken' }, 409)
    }
    if (code === 'weak_password' || msg.includes('weak')) return json({ ok: false, reason: 'weak_password' }, 400)
    if (code === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid'))) return json({ ok: false, reason: 'email' }, 400)
    return json({ ok: false, reason: 'server' }, 500)
  }

  // the sign-up trigger adds a number when two people grab the same name at the same moment;
  // tell the browser which username the account really got
  const { data: prof } = await admin.from('profiles').select('username').eq('id', created.user.id).maybeSingle()
  return json({ ok: true, username: prof?.username ?? username })
})
