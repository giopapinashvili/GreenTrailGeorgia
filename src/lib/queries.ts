import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  Article, Comment, GuideProfile, Post, Profile, Region, Route, RouteListItem, RouteStats, RouteStop, RouteTip, Tour,
} from './types'

export const LIST_COLS =
  'id,slug,name,name_en,region_id,difficulty,days_min,days_max,duration_hours,distance_km,elevation_gain_m,max_altitude_m,route_type,season_months,tags,summary,start_name,start_lat,start_lng,cover_url,cover_credit,featured,status'

const PROFILE_LITE = 'id,username,display_name,avatar_url,role'

function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

// ───────────── regions & routes ─────────────
export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => must(await supabase.from('regions').select('*').order('sort')) as Region[],
    staleTime: 1000 * 60 * 30,
  })
}

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () =>
      must(await supabase.from('routes').select(LIST_COLS).eq('status', 'published').order('featured', { ascending: false }).order('name')) as unknown as RouteListItem[],
    staleTime: 1000 * 60 * 5,
  })
}

export function useRouteLines() {
  return useQuery({
    queryKey: ['route-lines'],
    queryFn: async () =>
      must(await supabase.from('routes').select('id,slug,name,difficulty,region_id,days_min,days_max,start_lat,start_lng,geometry_lite').eq('status', 'published')) as unknown as {
        id: number; slug: string; name: string; difficulty: RouteListItem['difficulty']; region_id: string; days_min: number; days_max: number
        start_lat: number | null; start_lng: number | null; geometry_lite: number[][] | null
      }[],
    staleTime: 1000 * 60 * 10,
  })
}

export function useRouteStats() {
  return useQuery({
    queryKey: ['route-stats'],
    queryFn: async () => {
      const rows = must(await supabase.rpc('route_stats')) as RouteStats[]
      const map = new Map<number, RouteStats>()
      for (const r of rows ?? []) map.set(Number(r.route_id), r)
      return map
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useRoute(slug: string | undefined) {
  return useQuery({
    queryKey: ['route', slug],
    enabled: !!slug,
    queryFn: async () => must(await supabase.from('routes').select('*').eq('slug', slug!).maybeSingle()) as Route | null,
  })
}

export function useRouteStops(routeId: number | undefined) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    enabled: !!routeId,
    queryFn: async () => must(await supabase.from('route_stops').select('*').eq('route_id', routeId!).order('position')) as RouteStop[],
  })
}

export function useRouteMonthly(routeId: number | undefined) {
  return useQuery({
    queryKey: ['route-monthly', routeId],
    enabled: !!routeId,
    queryFn: async () => must(await supabase.rpc('route_monthly', { rid: routeId! })) as { month: number; hikes: number }[],
  })
}

export function useRouteTips(routeId: number | undefined) {
  return useQuery({
    queryKey: ['route-tips', routeId],
    enabled: !!routeId,
    queryFn: async () =>
      must(await supabase.from('route_tips').select(`*, author:profiles!route_tips_author_id_fkey(${PROFILE_LITE}), votes:route_tip_votes(user_id)`).eq('route_id', routeId!).order('created_at', { ascending: false })) as unknown as RouteTip[],
  })
}

// ───────────── posts ─────────────
export const POST_SELECT = `*, author:profiles!posts_author_id_fkey(${PROFILE_LITE}), route:routes(id,slug,name,region_id,difficulty,days_min,days_max), photos:post_photos(*), likes:post_likes(count), comments:comments(count)`

export interface PostFilters {
  routeId?: number
  authorId?: string
  regionRouteIds?: number[]
  sort?: 'new' | 'popular'
  limit?: number
}

export function usePosts(f: PostFilters = {}) {
  return useQuery({
    queryKey: ['posts', f],
    queryFn: async () => {
      let q = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(f.limit ?? 30)
      if (f.routeId) q = q.eq('route_id', f.routeId)
      if (f.authorId) q = q.eq('author_id', f.authorId)
      if (f.regionRouteIds) q = q.in('route_id', f.regionRouteIds.length ? f.regionRouteIds : [-1])
      const rows = must(await q) as unknown as Post[]
      for (const p of rows) p.photos?.sort((a, b) => a.position - b.position)
      if (f.sort === 'popular') rows.sort((a, b) => (b.likes?.[0]?.count ?? 0) - (a.likes?.[0]?.count ?? 0))
      return rows
    },
  })
}

export function usePost(id: number | undefined) {
  return useQuery({
    queryKey: ['post', id],
    enabled: !!id,
    queryFn: async () => {
      const p = must(await supabase.from('posts').select(POST_SELECT).eq('id', id!).maybeSingle()) as unknown as Post | null
      p?.photos?.sort((a, b) => a.position - b.position)
      return p
    },
  })
}

export function useComments(postId: number | undefined) {
  return useQuery({
    queryKey: ['comments', postId],
    enabled: !!postId,
    queryFn: async () =>
      must(await supabase.from('comments').select(`*, author:profiles!comments_author_id_fkey(${PROFILE_LITE})`).eq('post_id', postId!).order('created_at')) as unknown as Comment[],
  })
}

export function useRoutePhotos(routeId: number | undefined, limit = 24) {
  return useQuery({
    queryKey: ['route-photos', routeId, limit],
    enabled: !!routeId,
    queryFn: async () =>
      must(await supabase.from('post_photos').select('id,url,caption,post_id,width,height,author:profiles!post_photos_author_id_fkey(username,display_name)').eq('route_id', routeId!).order('created_at', { ascending: false }).limit(limit)) as unknown as {
        id: number; url: string; caption: string | null; post_id: number; width: number | null; height: number | null; author: { username: string; display_name: string } | null
      }[],
  })
}

// ───────────── profiles ─────────────
export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', username],
    enabled: !!username,
    queryFn: async () => must(await supabase.from('profiles').select('*').eq('username', username!).maybeSingle()) as Profile | null,
  })
}

export function useProfileStats(uid: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats', uid],
    enabled: !!uid,
    queryFn: async () => must(await supabase.rpc('profile_stats', { uid: uid! })) as { posts: number; photos: number; completed: number; km: number; likes: number; tips: number },
  })
}

export function useCompletions(uid: string | undefined) {
  return useQuery({
    queryKey: ['completions', uid],
    enabled: !!uid,
    queryFn: async () =>
      must(await supabase.from('route_completions').select(`route_id, completed_on, route:routes(${LIST_COLS})`).eq('user_id', uid!).order('completed_on', { ascending: false, nullsFirst: false })) as unknown as {
        route_id: number; completed_on: string | null; route: RouteListItem
      }[],
  })
}

export function useSaved(uid: string | undefined) {
  return useQuery({
    queryKey: ['saved', uid],
    enabled: !!uid,
    queryFn: async () =>
      must(await supabase.from('saved_routes').select(`route_id, created_at, route:routes(${LIST_COLS})`).eq('user_id', uid!).order('created_at', { ascending: false })) as unknown as {
        route_id: number; created_at: string; route: RouteListItem
      }[],
  })
}

// ───────────── guides & tours ─────────────
export const TOUR_SELECT = `*, guide:profiles!tours_guide_id_fkey(${PROFILE_LITE}), route:routes(id,slug,name,region_id)`

export function useTours(f: { routeId?: number; guideId?: string; includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['tours', f],
    queryFn: async () => {
      let q = supabase.from('tours').select(TOUR_SELECT).order('created_at', { ascending: false })
      if (!f.includeInactive) q = q.eq('is_active', true)
      if (f.routeId) q = q.eq('route_id', f.routeId)
      if (f.guideId) q = q.eq('guide_id', f.guideId)
      return must(await q) as unknown as Tour[]
    },
  })
}

export function useTour(id: number | undefined) {
  return useQuery({
    queryKey: ['tour', id],
    enabled: !!id,
    queryFn: async () => must(await supabase.from('tours').select(TOUR_SELECT).eq('id', id!).maybeSingle()) as unknown as Tour | null,
  })
}

export function useGuides() {
  return useQuery({
    queryKey: ['guides'],
    queryFn: async () =>
      must(await supabase.from('guide_profiles').select(`*, profile:profiles!guide_profiles_user_id_fkey(${PROFILE_LITE})`).eq('status', 'approved').order('created_at')) as unknown as GuideProfile[],
  })
}

export function useGuideProfile(uid: string | undefined) {
  return useQuery({
    queryKey: ['guide-profile', uid],
    enabled: !!uid,
    queryFn: async () => must(await supabase.from('guide_profiles').select('*').eq('user_id', uid!).maybeSingle()) as GuideProfile | null,
  })
}

// ───────────── articles ─────────────
export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: async () => must(await supabase.from('articles').select('id,slug,title,excerpt,category,cover_url,cover_credit,sort,status,created_at,updated_at,body').order('sort').order('created_at')) as Article[],
    staleTime: 1000 * 60 * 10,
  })
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ['article', slug],
    enabled: !!slug,
    queryFn: async () => must(await supabase.from('articles').select('*').eq('slug', slug!).maybeSingle()) as Article | null,
  })
}

export function useSiteCounts() {
  return useQuery({
    queryKey: ['site-counts'],
    queryFn: async () => must(await supabase.rpc('site_counts')) as { routes: number; regions: number; hikers: number; posts: number; photos: number; tours: number },
    staleTime: 1000 * 60 * 5,
  })
}

export function invalidateRoutes(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['routes'] })
  qc.invalidateQueries({ queryKey: ['route'] })
  qc.invalidateQueries({ queryKey: ['route-lines'] })
  qc.invalidateQueries({ queryKey: ['route-stops'] })
}

export { useQueryClient }
