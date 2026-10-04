/** Resize & compress an image in the browser before upload (keeps photos small and strips EXIF/GPS metadata). */
export async function compressImage(file: File, maxSide = 1800, quality = 0.82): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('ეს ფაილი სურათი არ არის')
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height)
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('სურათის დამუშავება ვერ მოხერხდა'))), 'image/jpeg', quality))
  return { blob, width, height }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions) } catch { /* fall back */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function randomName(ext = 'jpg') {
  const a = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('') + '.' + ext
}
