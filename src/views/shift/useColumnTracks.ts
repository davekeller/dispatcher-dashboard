import { useLayoutEffect, useRef, useState } from 'react'

export const COLUMN_RAIL_PX = 40
export type TrackWeight = number | null

/** Resolve every track to pixels so open ↔ collapsed grid columns interpolate smoothly.
 * CSS cannot animate directly between `fr` and fixed length tracks. */
export function resolveColumnTracks(weights: TrackWeight[], { width, gap }: { width: number; gap: number }): string {
  const rails = weights.filter((weight) => weight === null).length
  const totalWeight = weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
  const free = width - gap * Math.max(0, weights.length - 1) - COLUMN_RAIL_PX * rails

  if (width === 0 || free <= 0 || totalWeight === 0) {
    return weights.map((weight) => (weight === null ? `${COLUMN_RAIL_PX}px` : `${weight}fr`)).join(' ')
  }

  return weights
    .map((weight) => (weight === null ? COLUMN_RAIL_PX : (free * weight) / totalWeight))
    .map((pixels) => `${Math.round(pixels * 100) / 100}px`)
    .join(' ')
}

export function useColumnTracks(weights: TrackWeight[]) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [box, setBox] = useState({ width: 0, gap: 12 })
  const [resizing, setResizing] = useState(false)
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const last = useRef({ width: -1, gap: -1 })

  useLayoutEffect(() => {
    if (!node) return
    const measure = (width: number) => {
      const gap = Number.parseFloat(getComputedStyle(node).columnGap) || 0
      if (last.current.width === width && last.current.gap === gap) return
      last.current = { width, gap }
      setBox({ width, gap })
      setResizing(true)
      clearTimeout(settle.current)
      settle.current = setTimeout(() => setResizing(false), 120)
    }
    measure(node.clientWidth)
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width))
    observer.observe(node)
    return () => {
      observer.disconnect()
      clearTimeout(settle.current)
    }
  }, [node])

  return {
    ref: setNode,
    tracks: resolveColumnTracks(weights, box),
    transition: resizing ? 'none' : 'grid-template-columns 280ms cubic-bezier(0.22, 1, 0.36, 1)',
  }
}
