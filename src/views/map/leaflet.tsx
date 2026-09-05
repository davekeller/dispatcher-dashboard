import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import type { LatLng } from '../../data/types'

// Shared by the route file's map and the fleet map. OpenStreetMap's tiles are the one
// network dependency in the app, muted to gray by a CSS filter so only the route carries
// color; everything drawn on top works with or without them.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const FIT_PADDING: [number, number] = [32, 32]

export function toLatLng(p: LatLng): L.LatLngExpression {
  return [p.lat, p.lng]
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}

export function Tiles() {
  return <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
}

/** Fit the given points once per `fitKey`, as soon as the container has a size. The
 *  container can be laid out after Leaflet mounts (a lazy chunk, a hidden pane, a rail
 *  collapsing), and a map measured at zero width fits nothing, so size changes re-measure
 *  and the first real size does the fit. Moving trucks never re-center the map. */
export function FitOnce({ fitKey, points, maxZoom }: { fitKey: string | number; points: L.LatLngExpression[]; maxZoom: number }) {
  const map = useMap()
  const fitted = useRef<string | number | null>(null)
  useEffect(() => {
    const fit = () => {
      map.invalidateSize({ animate: false })
      if (fitted.current === fitKey || points.length === 0) return
      const { x, y } = map.getSize()
      if (x === 0 || y === 0) return
      map.fitBounds(L.latLngBounds(points), { padding: FIT_PADDING, maxZoom })
      fitted.current = fitKey
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
    // Points move with the trucks; only a new fitKey re-fits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])
  return null
}

/** Pan to something the dispatcher picked: once per pick, never per tick (a moving truck's
 *  position is a new object every 5 seconds), and only once the map has a size, because
 *  Leaflet's flyTo divides by the container size and a zero-sized map yields NaN. The pick
 *  present at mount is skipped unless `flyOnMount`, so a route file opens framed on the whole
 *  route while a deep link to one truck lands on that truck. */
export function FlyTo({ id, position, minZoom, flyOnMount = false }: { id: string | null; position: LatLng | undefined; minZoom: number; flyOnMount?: boolean }) {
  const map = useMap()
  const flown = useRef<string | null | undefined>(undefined)
  const latest = useRef(position)
  latest.current = position
  useEffect(() => {
    if (flown.current === undefined && !flyOnMount) {
      flown.current = id
      return
    }
    if (!id || flown.current === id) return
    const go = () => {
      const p = latest.current
      const { x, y } = map.getSize()
      if (!p || x === 0 || y === 0) return false
      map.flyTo(toLatLng(p), Math.max(map.getZoom(), minZoom), { duration: 0.6 })
      flown.current = id
      return true
    }
    if (go()) return
    const observer = new ResizeObserver(() => {
      if (go()) observer.disconnect()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, id, minZoom, flyOnMount])
  return null
}
