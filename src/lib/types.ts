export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert'
export type RouteType = 'one_way' | 'loop' | 'out_and_back'
export type StopKind =
  | 'start' | 'finish' | 'village' | 'guesthouse' | 'hut' | 'camp' | 'pass' | 'lake' | 'peak'
  | 'viewpoint' | 'water' | 'waterfall' | 'glacier' | 'church' | 'fortress' | 'bridge' | 'other'
export type Role = 'user' | 'guide' | 'admin'

export interface Region {
  id: string
  name: string
  description: string | null
  sort: number
  lat: number | null
  lng: number | null
}

export interface GearItem {
  name: string
  essential?: boolean
}

/** Light route row used in lists, cards and the planner. */
export interface RouteListItem {
  id: number
  slug: string
  name: string
  name_en: string | null
  region_id: string
  difficulty: Difficulty
  days_min: number
  days_max: number
  duration_hours: number | null
  distance_km: number | null
  elevation_gain_m: number | null
  max_altitude_m: number | null
  route_type: RouteType
  season_months: number[]
  tags: string[]
  summary: string
  start_name: string | null
  start_lat: number | null
  start_lng: number | null
  cover_url: string | null
  cover_credit: string | null
  featured: boolean
  status: 'draft' | 'published'
}

export interface Route extends RouteListItem {
  description: string | null
  difficulty_notes: string | null
  getting_there: string | null
  accommodation: string | null
  water: string | null
  permits: string | null
  dangers: string | null
  mobile_coverage: string | null
  gear: GearItem[]
  tips: string[]
  elevation_loss_m: number | null
  min_altitude_m: number | null
  end_name: string | null
  end_lat: number | null
  end_lng: number | null
  geometry: number[][] | null
  elevation_profile: number[][] | null
  geometry_source: string | null
  cover_source_url: string | null
  sources: string | null
  created_at: string
  updated_at: string
}

export interface RouteStop {
  id: number
  route_id: number
  position: number
  day: number | null
  name: string
  kind: StopKind
  lat: number
  lng: number
  altitude_m: number | null
  overnight: boolean
  description: string | null
}

export interface RouteStats {
  route_id: number
  posts_count: number
  photos_count: number
  hikers_count: number
  avg_rating: number | null
  ratings_count: number
  saves_count: number
  tips_count: number
  views: number
}

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  home_region: string | null
  role: Role
  is_banned: boolean
  /** false only for Google sign-ups that haven't picked their name and username yet (/welcome) */
  onboarded: boolean
  created_at: string
}

export type ProfileLite = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'role'>

export interface PostPhoto {
  id: number
  post_id: number
  author_id: string
  route_id: number
  storage_path: string
  url: string
  width: number | null
  height: number | null
  caption: string | null
  position: number
  created_at: string
}

export interface Post {
  id: number
  author_id: string
  route_id: number
  title: string
  body: string
  hiked_on: string | null
  rating: number | null
  cover_url: string | null
  is_hidden: boolean
  created_at: string
  updated_at: string
  author?: ProfileLite
  route?: Pick<RouteListItem, 'id' | 'slug' | 'name' | 'region_id' | 'difficulty' | 'days_min' | 'days_max'>
  photos?: PostPhoto[]
  likes?: { count: number }[]
  comments?: { count: number }[]
}

export interface Comment {
  id: number
  post_id: number
  author_id: string
  body: string
  is_hidden: boolean
  created_at: string
  author?: ProfileLite
}

export interface RouteTip {
  id: number
  route_id: number
  author_id: string
  category: 'general' | 'gear' | 'safety' | 'transport' | 'water' | 'stay' | 'season'
  body: string
  is_hidden: boolean
  created_at: string
  author?: ProfileLite
  votes?: { user_id: string }[]
}

export interface GuideProfile {
  user_id: string
  kind: 'individual' | 'company'
  company_name: string | null
  about: string
  regions: string[]
  languages: string[]
  experience_years: number | null
  certifications: string | null
  phone: string | null
  email: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  profile?: ProfileLite
}

export interface Tour {
  id: number
  guide_id: string
  route_id: number | null
  title: string
  description: string
  days: number
  difficulty: Difficulty
  price_gel: number | null
  price_note: string | null
  group_min: number | null
  group_max: number | null
  includes: string[]
  excludes: string[]
  start_dates: string[]
  meeting_point: string | null
  cover_url: string | null
  is_active: boolean
  created_at: string
  guide?: ProfileLite
  route?: Pick<RouteListItem, 'id' | 'slug' | 'name' | 'region_id'> | null
}

export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string
  body: string
  category: 'safety' | 'gear' | 'planning' | 'transport' | 'nature' | 'tips'
  cover_url: string | null
  cover_credit: string | null
  sort: number
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface Conversation {
  conversation_id: string
  other_id: string
  other_username: string
  other_display_name: string
  other_avatar_url: string | null
  last_message_at: string
  last_message_preview: string | null
  unread_count: number
}

export interface Message {
  id: number
  conversation_id: string
  sender_id: string
  body: string | null
  image_path: string | null
  created_at: string
}

export interface Report {
  id: number
  reporter_id: string
  target_type: 'post' | 'comment' | 'message' | 'user' | 'tip' | 'tour'
  target_id: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  reporter?: ProfileLite
}
