export type Difficulty = 'easy' | 'medium' | 'hard'
export type Category = 'hiking' | 'car' | 'camping' | 'expert' | 'family'

export interface Route {
  id: number
  title: string
  titleKa: string
  location: string
  difficulty: Difficulty
  duration: string
  distance: number
  elevation: number
  rating: number
  reviews: number
  image: string
  category: Category
  description: string
  lat: number
  lng: number
  featured?: boolean
  badge?: string
}

export interface Hotel {
  id: number
  name: string
  location: string
  price: number
  currency: string
  rating: number
  reviews: number
  image: string
  lat: number
  lng: number
  featured?: boolean
}

export interface Guide {
  id: number
  name: string
  specialty: string
  rating: number
  reviews: number
  avatar: string
  type: 'individual' | 'company'
  verified: boolean
}

export interface Story {
  id: number
  author: string
  avatar: string
  location: string
  timeAgo: string
  content: string
  image: string
  likes: number
  comments: number
}

export interface Review {
  id: number
  author: string
  avatar: string
  target: string
  rating: number
  comment: string
  timeAgo: string
}

export interface MapLocation {
  id: number
  name: string
  nameKa: string
  type: 'hike' | 'camp' | 'hotel' | 'scenic' | 'historic' | 'city' | 'village'
  lat: number
  lng: number
  description?: string
}

export interface MapRoute {
  id: number
  name: string
  difficulty: Difficulty
  coordinates: [number, number][]
}
