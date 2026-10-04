import { supabase } from './supabase'
import { compressImage, randomName } from './image'

export type PublicBucket = 'avatars' | 'post-photos' | 'covers'

/**
 * Compresses a photo in the browser and uploads it to a public bucket under `${folder}/<random>.jpg`.
 * The folder must start with the user's id (storage policies only allow writing into your own folder).
 */
export async function uploadPhoto(bucket: PublicBucket, folder: string, file: File, maxSide = 1800) {
  const { blob, width, height } = await compressImage(file, maxSide)
  const path = `${folder}/${randomName('jpg')}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (error) throw error
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  return { path, url, width, height }
}

/** Removes files from a bucket; failures are ignored (the row is what matters). */
export async function removeFiles(bucket: PublicBucket | 'message-images', paths: string[]) {
  if (!paths.length) return
  try { await supabase.storage.from(bucket).remove(paths) } catch { /* ignore */ }
}

/** Private chat images: uploaded to `${conversationId}/<random>.jpg`, read through short-lived signed URLs. */
export async function uploadChatImage(conversationId: string, file: File) {
  const { blob } = await compressImage(file, 1600)
  const path = `${conversationId}/${randomName('jpg')}`
  const { error } = await supabase.storage.from('message-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

const signedCache = new Map<string, { url: string; exp: number }>()
export async function signedChatImage(path: string): Promise<string> {
  const hit = signedCache.get(path)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from('message-images').createSignedUrl(path, 3600)
  if (error || !data) throw error ?? new Error('no url')
  signedCache.set(path, { url: data.signedUrl, exp: Date.now() + 3600_000 })
  return data.signedUrl
}
