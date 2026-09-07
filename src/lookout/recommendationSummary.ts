import { fmtMinutes } from '../lib/format'

export interface RecommendationContext {
  minutesUntilLimit: number
  remainingStops: number
  remainingDriveMin: number
  driftMin: number
  unnotifiedLateStops: number
  unassignedStops: number
  pingAgeMin: number
}

const stops = (count: number, adjective = '') => `${count} ${adjective}${adjective ? ' ' : ''}stop${count === 1 ? '' : 's'}`

/** One short, action-oriented line per alert for compact Lookout surfaces. */
export function recommendationSummary(ruleId: string, context: RecommendationContext, fallback: string): string {
  switch (ruleId) {
    case 'over_limit':
      return context.remainingStops > 0
        ? `Stop now; reassign ${stops(context.remainingStops, 'remaining')}.`
        : 'Stop driving now.'
    case 'limit_act_now':
      return `Act within ${fmtMinutes(context.minutesUntilLimit)}; ${fmtMinutes(context.remainingDriveMin)} of driving remains.`
    case 'limit_watch':
      return `Plan ${stops(context.remainingStops)} around ${fmtMinutes(context.minutesUntilLimit)} of drive time.`
    case 'wont_finish':
      return 'Reassign remaining stops or schedule a reset.'
    case 'offline_near_limit':
    case 'offline':
      return `Call the driver; no ping for ${fmtMinutes(context.pingAgeMin)}.`
    case 'behind_schedule':
      return context.unnotifiedLateStops > 0
        ? `Notify ${context.unnotifiedLateStops} customer${context.unnotifiedLateStops === 1 ? '' : 's'} whose windows are at risk.`
        : `Reassign work to recover ${fmtMinutes(context.driftMin)} of delay.`
    case 'stops_unassigned':
      return `Assign ${stops(context.unassignedStops)} without a driver.`
    default:
      return fallback
  }
}
