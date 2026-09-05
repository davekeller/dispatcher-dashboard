import { Check } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import type { Stop } from '../../data/types'
import { completedStopLightWeight } from '../../lib/routeTimeline'

export function stopMarkerTone(stop: Stop, pastLimit: boolean, late: boolean): string {
  if (stop.status === 'failed') return 'bg-act-now-fill text-on-accent'
  if (stop.status === 'done') return 'route-history-node text-on-accent'
  if (stop.status === 'unassigned') return 'border-2 border-dashed border-offline bg-panel text-offline'
  if (pastLimit || late) return 'border-2 border-act-now bg-panel text-act-now'
  return 'border-2 border-muted/70 bg-panel text-muted'
}

export function stopHistoryStyle(index: number, lastCompleteIndex: number): CSSProperties {
  return { '--route-history-light': `${completedStopLightWeight(index, lastCompleteIndex)}%` } as CSSProperties
}

/** One semantic stop marker shared by the route rail and its corresponding receipt. */
export default function StopStatusMarker({ stop, pastLimit = false, late = false, active = false, className = '', style }: { stop: Stop; pastLimit?: boolean; late?: boolean; active?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={`relative z-10 flex shrink-0 items-center justify-center rounded-full ${stopMarkerTone(stop, pastLimit, late)} ${active ? 'ring-4 ring-ink/10' : ''} ${className}`} style={style}>
      {stop.status === 'done' && <Check size={8} weight="bold" className="drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]" />}
    </span>
  )
}
