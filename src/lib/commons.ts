// Real photos near a point from Wikimedia Commons (free licences; credit is shown with each photo).
export interface CommonsPhoto {
  title: string
  thumb: string
  full: string
  page: string
  author: string
  license: string
}

const API = 'https://commons.wikimedia.org/w/api.php'

export async function commonsNear(lat: number, lng: number, radius = 8000, limit = 24): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'geosearch', ggscoord: `${lat}|${lng}`, ggsradius: String(Math.min(10000, radius)), ggslimit: String(limit), ggsnamespace: '6',
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '900',
  })
  const res = await fetch(`${API}?${params}`)
  if (!res.ok) return []
  const j = await res.json()
  const pages = Object.values(j?.query?.pages ?? {}) as {
    title: string
    imageinfo?: { thumburl: string; url: string; descriptionurl: string; mime: string; extmetadata?: Record<string, { value: string }> }[]
  }[]
  return pages
    .filter((p) => p.imageinfo?.[0] && /jpeg|png|webp/.test(p.imageinfo[0].mime))
    .map((p) => {
      const ii = p.imageinfo![0]
      const md = ii.extmetadata ?? {}
      return {
        title: p.title.replace(/^File:/, ''),
        thumb: ii.thumburl,
        full: ii.url,
        page: ii.descriptionurl,
        author: stripHtml(md.Artist?.value ?? 'Wikimedia Commons'),
        license: stripHtml(md.LicenseShortName?.value ?? ''),
      }
    })
}

function stripHtml(s: string) {
  // DOMParser builds an inert document: no scripts run and no images load
  const doc = new DOMParser().parseFromString(s, 'text/html')
  return (doc.body.textContent || '').trim().slice(0, 120)
}
