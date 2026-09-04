import type { DriverView } from '../store/view'
import { fmtMinutes } from './format'

export type RouteSignalTone = 'clear' | 'watch' | 'act_now' | 'offline'

export interface RouteSignal {
  label: string
  value: string
  tone: RouteSignalTone
}

export type RouteProgressView = Pick<DriverView, 'driftMin' | 'minutesUntilLimit' | 'remaining' | 'remainingDriveMin' | 'staleness'>

export function routeScheduleSignal(view: RouteProgressView): RouteSignal {
  const estimated = view.staleness === 'fresh' ? '' : '~'
  if (Math.abs(view.driftMin) <= 5) return { label: 'Schedule', value: view.staleness === 'fresh' ? 'On time' : 'On time · est.', tone: view.staleness === 'offline' ? 'offline' : 'clear' }
  if (view.driftMin > 0) return { label: 'Schedule', value: `${estimated}${fmtMinutes(view.driftMin)} behind`, tone: 'watch' }
  return { label: 'Schedule', value: `${estimated}${fmtMinutes(-view.driftMin)} ahead`, tone: 'clear' }
}

export function routeHosSignal(view: RouteProgressView): RouteSignal {
  const estimated = view.staleness === 'fresh' ? '' : '~'
  if (view.remaining.length === 0) return { label: 'HOS fit', value: 'Complete', tone: 'clear' }
  if (view.minutesUntilLimit <= 0) return { label: 'HOS fit', value: `${estimated}${fmtMinutes(-view.minutesUntilLimit)} over`, tone: 'act_now' }

  const spare = view.minutesUntilLimit - view.remainingDriveMin
  if (spare < 0) return { label: 'HOS fit', value: `${estimated}${fmtMinutes(-spare)} over`, tone: 'act_now' }
  if (spare <= 30) return { label: 'HOS fit', value: `${estimated}${fmtMinutes(spare)} spare`, tone: 'watch' }
  return { label: 'HOS fit', value: `${estimated}${fmtMinutes(spare)} spare`, tone: 'clear' }
}
