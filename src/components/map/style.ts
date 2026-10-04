import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl'
import { MAP_GLYPHS, MAP_TILES, SATELLITE_TILES } from '../../lib/config'

export type BaseLayer = 'topo' | 'satellite'
export type Theme = 'light' | 'dark'

interface Palette {
  bg: string; wood: string; grass: string; farm: string; rock: string; ice: string; iceLine: string; sand: string; wetland: string
  residential: string; water: string; waterLine: string; park: string; parkLabel: string
  shadow: string; highlight: string; accent: string; hillshadeOpacity: number
  contour: string; contourMajor: string; contourLabel: string
  roadMajor: string; roadMajorCase: string; roadMinor: string; roadCase: string; track: string; path: string
  boundary: string; building: string
  label: string; labelSoft: string; halo: string; waterLabel: string; peak: string
  routeCasing: string
}

const LIGHT: Palette = {
  bg: '#eef0e5', wood: '#cfe0bd', grass: '#e1e9cf', farm: '#ecefdc', rock: '#e3ddd2', ice: '#fbfdff', iceLine: '#9cc3dc', sand: '#efe6cc', wetland: '#d9e6d7',
  residential: '#e7e1d6', water: '#a6cbe0', waterLine: '#7fb0cf', park: '#5b7f2f', parkLabel: '#4d6b27',
  shadow: '#3d4a42', highlight: '#ffffff', accent: '#7a8a6e', hillshadeOpacity: 0.55,
  contour: 'rgba(150, 118, 78, 0.38)', contourMajor: 'rgba(140, 105, 62, 0.62)', contourLabel: '#8c6a40',
  roadMajor: '#f6d7a2', roadMajorCase: '#d8ae6a', roadMinor: '#ffffff', roadCase: '#cfc6b4', track: '#9b7b55', path: '#a0522d',
  boundary: '#8f6f9a', building: '#d9cfc1',
  label: '#2b2f2a', labelSoft: '#5b6158', halo: 'rgba(255,255,255,0.92)', waterLabel: '#3f7aa3', peak: '#5c4a35',
  routeCasing: '#ffffff',
}

const DARK: Palette = {
  bg: '#151b18', wood: '#1d2a20', grass: '#1f2822', farm: '#1c231f', rock: '#262823', ice: '#2b3438', iceLine: '#4d6b7d', sand: '#2a2822', wetland: '#1c2724',
  residential: '#22261f', water: '#1e3646', waterLine: '#2b4f66', park: '#7fa35a', parkLabel: '#93b56d',
  shadow: '#000000', highlight: '#56665a', accent: '#2a3530', hillshadeOpacity: 0.7,
  contour: 'rgba(170, 160, 130, 0.18)', contourMajor: 'rgba(190, 175, 140, 0.32)', contourLabel: '#a89a7a',
  roadMajor: '#5a4c33', roadMajorCase: '#2d261b', roadMinor: '#3a403b', roadCase: '#1b1f1c', track: '#8a7458', path: '#c47a52',
  boundary: '#a58ab0', building: '#2b2f2b',
  label: '#e3e7e1', labelSoft: '#a8b0a9', halo: 'rgba(12,16,14,0.9)', waterLabel: '#7fb2d4', peak: '#d2c4a8',
  routeCasing: '#0d120f',
}

const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:ka'], ['get', 'name'], ['get', 'name:latin']]
const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']
const FONT_ITALIC = ['Noto Sans Italic']

export interface StyleSources {
  demUrl: string
  contourUrl: string
}

export function buildStyle(theme: Theme, base: BaseLayer, src: StyleSources): StyleSpecification {
  const p = theme === 'dark' ? DARK : LIGHT
  const sat = base === 'satellite'
  const style: StyleSpecification = {
    version: 8,
    glyphs: MAP_GLYPHS,
    sources: {
      omt: { type: 'vector', url: MAP_TILES, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a>' },
      dem: { type: 'raster-dem', tiles: [src.demUrl], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'რელიეფი: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Terrain Tiles</a>' },
      contours: { type: 'vector', tiles: [src.contourUrl], maxzoom: 15 },
      ...(sat ? { sat: { type: 'raster' as const, tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 18, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' } } : {}),
    },
    layers: [],
  }

  const L = style.layers
  L.push({ id: 'bg', type: 'background', paint: { 'background-color': p.bg } })

  if (sat) {
    L.push({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.1, 'raster-contrast': 0.05, 'raster-brightness-max': theme === 'dark' ? 0.75 : 1 } })
  } else {
    L.push(
      { id: 'landcover-wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': p.wood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 12, 1] } },
      { id: 'landcover-grass', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': p.grass } },
      { id: 'landcover-farm', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'farmland'], paint: { 'fill-color': p.farm } },
      { id: 'landcover-wetland', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wetland'], paint: { 'fill-color': p.wetland } },
      { id: 'landcover-rock', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'rock'], paint: { 'fill-color': p.rock } },
      { id: 'landcover-sand', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'sand'], paint: { 'fill-color': p.sand } },
      { id: 'landcover-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': p.ice, 'fill-outline-color': p.iceLine } },
      { id: 'landuse-residential', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], minzoom: 10, paint: { 'fill-color': p.residential, 'fill-opacity': 0.8 } },
    )
  }

  L.push({
    id: 'hillshade', type: 'hillshade', source: 'dem',
    paint: {
      'hillshade-shadow-color': p.shadow,
      'hillshade-highlight-color': p.highlight,
      'hillshade-accent-color': p.accent,
      'hillshade-exaggeration': sat ? 0.15 : ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 0.35] as unknown as number,
      'hillshade-illumination-direction': 315,
    },
    ...(sat ? { layout: { visibility: 'none' as const } } : {}),
  })

  if (!sat) {
    L.push(
      { id: 'contour-minor', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 11, filter: ['==', ['get', 'level'], 0], paint: { 'line-color': p.contour, 'line-width': 0.6 } },
      { id: 'contour-major', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 10, filter: ['>', ['get', 'level'], 0], paint: { 'line-color': p.contourMajor, 'line-width': 1.1 } },
      {
        id: 'contour-label', type: 'symbol', source: 'contours', 'source-layer': 'contours', minzoom: 12, filter: ['>', ['get', 'level'], 0],
        layout: { 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], {}], ' მ'], 'text-font': FONT, 'text-size': 10, 'text-max-angle': 25, 'symbol-spacing': 320 },
        paint: { 'text-color': p.contourLabel, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
      },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': p.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': p.waterLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 2] } },
      { id: 'park-outline', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 7, paint: { 'line-color': p.park, 'line-width': 1.4, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': p.building } },
    )
  }

  // roads & trails
  const roadCase = sat ? 'rgba(0,0,0,0.4)' : p.roadCase
  L.push(
    { id: 'road-minor-case', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': roadCase, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.2, 16, 9] } },
    { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': sat ? 'rgba(255,255,255,0.75)' : p.roadMinor, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 7] } },
    { id: 'road-track', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['==', ['get', 'class'], 'track'], layout: { 'line-cap': 'round' }, paint: { 'line-color': sat ? '#f3d9a6' : p.track, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 2.4], 'line-dasharray': [3, 2] } },
    { id: 'road-path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['==', ['get', 'class'], 'path'], layout: { 'line-cap': 'round' }, paint: { 'line-color': sat ? '#ffd2a8' : p.path, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 2], 'line-dasharray': [2, 1.6], 'line-opacity': 0.85 } },
    { id: 'road-major-case', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': sat ? 'rgba(0,0,0,0.45)' : p.roadMajorCase, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 3, 16, 14] } },
    { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': sat ? '#f6d7a2' : p.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.8, 16, 11] } },
    { id: 'boundary-country', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': sat ? '#ffffff' : p.boundary, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2.2], 'line-dasharray': [4, 2], 'line-opacity': 0.85 } },
  )

  // labels
  const labelColor = sat ? '#ffffff' : p.label
  const halo = sat ? 'rgba(0,0,0,0.75)' : p.halo
  L.push(
    {
      id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9,
      layout: { 'text-field': NAME, 'text-font': FONT_ITALIC, 'text-size': 11 },
      paint: { 'text-color': sat ? '#cfe8ff' : p.waterLabel, 'text-halo-color': halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'park-label', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 8, filter: ['has', 'name'],
      layout: { 'text-field': NAME, 'text-font': FONT_ITALIC, 'text-size': 11, 'symbol-placement': 'point' },
      paint: { 'text-color': sat ? '#d9f2c4' : p.parkLabel, 'text-halo-color': halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'peaks', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9,
      filter: ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]],
      layout: {
        'text-field': ['case', ['has', 'ele'], ['concat', '▲ ', NAME, '\n', ['to-string', ['get', 'ele']], ' მ'], ['concat', '▲ ', NAME]],
        'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 12], 'text-anchor': 'top', 'text-offset': [0, -0.4], 'text-padding': 6,
        'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'ele'], 0]],
      },
      paint: { 'text-color': sat ? '#ffffff' : p.peak, 'text-halo-color': halo, 'text-halo-width': 1.3 },
    },
    {
      id: 'place-village', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['village', 'hamlet', 'isolated_dwelling', 'locality']]],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 14], 'text-padding': 4 },
      paint: { 'text-color': sat ? '#ffffff' : p.labelSoft, 'text-halo-color': halo, 'text-halo-width': 1.4 },
    },
    {
      id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 7,
      filter: ['==', ['get', 'class'], 'town'],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 12, 15] },
      paint: { 'text-color': labelColor, 'text-halo-color': halo, 'text-halo-width': 1.5 },
    },
    {
      id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 5,
      filter: ['==', ['get', 'class'], 'city'],
      layout: { 'text-field': NAME, 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 17] },
      paint: { 'text-color': labelColor, 'text-halo-color': halo, 'text-halo-width': 1.6 },
    },
    {
      id: 'place-country', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 8,
      filter: ['==', ['get', 'class'], 'country'],
      // No 'text-transform: uppercase' here: it turns Georgian into Mtavruli, which the map fonts don't have (labels would vanish).
      layout: { 'text-field': NAME, 'text-font': FONT_BOLD, 'text-size': 13, 'text-letter-spacing': 0.08 },
      paint: { 'text-color': sat ? '#ffffff' : p.labelSoft, 'text-halo-color': halo, 'text-halo-width': 1.5 },
    },
  )

  return style
}

export function routeCasingColor(theme: Theme, base: BaseLayer) {
  if (base === 'satellite') return '#000000'
  return theme === 'dark' ? DARK.routeCasing : LIGHT.routeCasing
}
