import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

export function publicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/** Turns a Supabase / Postgres error into a short Georgian sentence. */
export function errorText(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err ?? '')
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'ელ-ფოსტა ან პაროლი არასწორია.'
  if (m.includes('email not confirmed')) return 'ეს ანგარიში ჯერ არ გააქტიურებულა — დარეგისტრირდი თავიდან იმავე ელ-ფოსტით.'
  if (m.includes('user already registered')) return 'ამ ელ-ფოსტით ანგარიში უკვე არსებობს.'
  if (m.includes('password should be at least')) return 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს.'
  if (m.includes('rate limit') || m.includes('too many')) return 'ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე.'
  if (m.includes('blocked')) return 'ამ მომხმარებელთან მიმოწერა შეზღუდულია.'
  if (m.includes('row-level security') || m.includes('permission denied')) return 'ამის გაკეთების უფლება არ გაქვს.'
  if (m.includes('duplicate key') && m.includes('username')) return 'ეს მომხმარებლის სახელი დაკავებულია.'
  if (m.includes('profiles_username_check')) return 'სახელი: 3–24 სიმბოლო, მხოლოდ ლათინური ასოები, ციფრები და _.'
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) return 'ფაილი ძალიან დიდია.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'კავშირი ვერ დამყარდა. შეამოწმე ინტერნეტი.'
  return msg || 'რაღაც შეცდომა მოხდა.'
}
