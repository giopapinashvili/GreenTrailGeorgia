import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Shape of the `admin_overview()` RPC (see supabase/migrations/003_functions.sql). */
export interface AdminOverview {
  users: number
  users_7d: number
  routes: number
  drafts: number
  posts: number
  posts_7d: number
  photos: number
  messages: number
  tours: number
  guides_pending: number
  reports_open: number
  routes_missing_line: number
  routes_missing_cover: number
  top_routes: { id: number; name: string; slug: string; posts: number }[]
  top_viewed: { id: number; name: string; slug: string; views: number }[]
  activity: { day: string; posts: number; users: number }[]
}

/** Query key shared by the admin layout (badges) and the dashboard. Invalidate it after moderating guides or reports. */
export const ADMIN_OVERVIEW_KEY = ['admin-overview'] as const

const n = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function normalize(raw: unknown): AdminOverview {
  const d = (raw ?? {}) as Record<string, unknown>
  const list = <T,>(v: unknown, map: (r: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.map((r) => map((r ?? {}) as Record<string, unknown>)) : [])
  return {
    users: n(d.users),
    users_7d: n(d.users_7d),
    routes: n(d.routes),
    drafts: n(d.drafts),
    posts: n(d.posts),
    posts_7d: n(d.posts_7d),
    photos: n(d.photos),
    messages: n(d.messages),
    tours: n(d.tours),
    guides_pending: n(d.guides_pending),
    reports_open: n(d.reports_open),
    routes_missing_line: n(d.routes_missing_line),
    routes_missing_cover: n(d.routes_missing_cover),
    top_routes: list(d.top_routes, (r) => ({ id: n(r.id), name: String(r.name ?? ''), slug: String(r.slug ?? ''), posts: n(r.posts) })),
    top_viewed: list(d.top_viewed, (r) => ({ id: n(r.id), name: String(r.name ?? ''), slug: String(r.slug ?? ''), views: n(r.views) })),
    activity: list(d.activity, (r) => ({ day: String(r.day ?? '').slice(0, 10), posts: n(r.posts), users: n(r.users) })),
  }
}

/** Site-wide counters for admins (one RPC call; cheap enough for the sidebar badges too). */
export function useAdminOverview() {
  return useQuery({
    queryKey: ADMIN_OVERVIEW_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview')
      if (error) throw error
      return normalize(data)
    },
    staleTime: 60_000,
  })
}
