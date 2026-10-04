import { lazy, Suspense } from 'react'
import type { MapViewProps } from './MapView'

const MapView = lazy(() => import('./MapView'))

export default function LazyMap(props: MapViewProps) {
  return (
    <Suspense fallback={<div className={`topo-texture animate-pulse bg-surface-2 ${props.className ?? 'h-[420px]'}`} />}>
      <MapView {...props} />
    </Suspense>
  )
}
