import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usernameFrom } from '../../lib/slug'

// The database allows 3–24 characters, but the sign-up trigger (handle_new_user) keeps only the first 20
// to leave room for a number suffix — so the forms stop at 20 and the chosen name is kept exactly.
export const USERNAME_MAX = 20
export const USERNAME_RE = new RegExp(`^[a-z0-9_]{3,${USERNAME_MAX}}$`)
export const RESERVED = new Set(['admin', 'administrator', 'moderator', 'greentrail', 'support', 'system', 'root', 'help', 'info'])
export const USERNAME_TAKEN = 'ეს სახელი დაკავებულია. აირჩიე სხვა.'
const GEORGIAN = /[ა-ჿ]/

export type Availability = 'idle' | 'checking' | 'free' | 'taken' | 'error'

/** Suggest a username from the display name ("გიორგი ბერიძე" → "giorgi_beridze"). */
export function suggestUsername(name: string): string {
  if (!/[a-z0-9ა-ჿ]/i.test(name)) return ''
  return usernameFrom(name).replace(/^_+|_+$/g, '')
}

/** Keeps what the user types inside the allowed alphabet: Georgian letters are transliterated, spaces become "_". */
export function cleanUsername(v: string): string {
  return Array.from(v.toLowerCase())
    .map((ch) => (/[a-z0-9_]/.test(ch) ? ch : /[\s\-.]/.test(ch) ? '_' : GEORGIAN.test(ch) ? usernameFrom(ch) : ''))
    .join('')
    .slice(0, USERNAME_MAX)
}

/** Why this username can't be used (format only), or undefined when it is fine. */
export function usernameProblem(u: string): string | undefined {
  if (!u) return 'აირჩიე მომხმარებლის სახელი.'
  if (u.length < 3) return 'მინიმუმ 3 სიმბოლო.'
  if (!USERNAME_RE.test(u)) return `3–${USERNAME_MAX} სიმბოლო: ლათინური ასოები, ციფრები და _.`
  if (RESERVED.has(u)) return USERNAME_TAKEN
  return undefined
}

/** True when someone else already uses this username (`self` = the signed-in person's own profile id). */
export async function usernameTaken(u: string, self?: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').eq('username', u).maybeSingle()
  if (error) throw error
  return !!data && data.id !== self
}

/** Live, debounced availability check for the username field. */
export function useUsernameAvailability(username: string, self?: string): Availability {
  const [avail, setAvail] = useState<Availability>('idle')
  useEffect(() => {
    if (!USERNAME_RE.test(username) || RESERVED.has(username)) { setAvail('idle'); return }
    setAvail('checking')
    let alive = true
    const t = window.setTimeout(() => {
      usernameTaken(username, self).then(
        (taken) => { if (alive) setAvail(taken ? 'taken' : 'free') },
        () => { if (alive) setAvail('error') },
      )
    }, 450)
    return () => { alive = false; window.clearTimeout(t) }
  }, [username, self])
  return avail
}
