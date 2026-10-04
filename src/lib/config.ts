// Public project settings. The publishable key is designed to live in the browser:
// every table is protected by row level security in the database.
export const SUPABASE_URL = 'https://wgshyhcjezszogccodkz.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_8OU-yeb-quYqpgyKhYv_sQ_BkccWA1u'

export const SITE_NAME = 'GreenTrail Georgia'

// Map data sources (all free, no keys)
export const MAP_TILES = 'https://tiles.openfreemap.org/planet'
export const MAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
export const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
export const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const BROUTER_URL = 'https://brouter.de/brouter'

export const GEORGIA_CENTER: [number, number] = [43.6, 42.15] // [lng, lat]
export const GEORGIA_BOUNDS: [[number, number], [number, number]] = [[39.8, 40.9], [46.9, 43.7]]
