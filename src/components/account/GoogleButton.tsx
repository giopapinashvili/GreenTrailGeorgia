import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { SUPABASE_KEY, SUPABASE_URL } from '../../lib/config'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { authErrorText, oauthRedirect } from './authUtils'

let enabled: Promise<boolean> | null = null

/** Whether Google sign-in is switched on in Supabase. The button stays hidden until it is. */
function googleEnabled(): Promise<boolean> {
  enabled ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { external?: { google?: boolean } } | null) => !!s?.external?.google)
    .catch(() => false)
  return enabled
}

export function useGoogleEnabled(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let alive = true
    googleEnabled().then((v) => { if (alive) setOn(v) })
    return () => { alive = false }
  }, [])
  return on
}

/** "Continue with Google" — new and returning hikers alike; first-timers then pick a name once on /welcome. */
export default function GoogleButton({ next, label }: { next: string; label: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: oauthRedirect(next) } })
    // on success the browser is already on its way to Google
    if (error) {
      setBusy(false)
      toast(authErrorText(error), 'error')
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="btn-secondary w-full">
      {busy ? <LoaderCircle size={17} className="animate-spin" /> : <GoogleMark />}
      {label}
    </button>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}
