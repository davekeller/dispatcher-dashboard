import { ACT_NOW_MIN, BEHIND_MIN, WATCH_MIN } from '../hos/constants'
import { fmtClock, fmtMinutes } from '../lib/format'
import type { DriverView } from '../store/view'
import type { Rule } from './types'

// Alerts are data. To add one, append an object. Keep this file free of heavy
// imports so HMR is instant when it is edited live. Copy is Lookout's voice: a
// competent colleague, not a system log.

// The offline rules own dark drivers; the limit rules speak only for drivers we can see.
const onTheRoad = (v: DriverView) => (v.status === 'driving' || v.status === 'on_duty') && v.staleness !== 'offline'
const stops = (n: number) => `${n} stop${n === 1 ? '' : 's'}`
const first = (v: DriverView) => v.driver.name.split(' ')[0]
const est = (v: DriverView) => (v.staleness === 'fresh' ? '' : '~')

export const RULES: Rule[] = [
  {
    id: 'over_limit',
    label: 'Over limit',
    severity: 'critical',
    when: (v) => v.minutesUntilLimit <= 0,
    message: (v) => ({
      title: `${v.driver.name} is ${est(v)}over the limit by ${fmtMinutes(-v.minutesUntilLimit)}.`,
      body: v.remaining.length > 0 ? `${first(v)} needs to stop now. ${stops(v.remaining.length)} left need another driver.` : `${first(v)} needs to stop now.`,
    }),
    actions: ['reassign', 'call_driver'],
  },
  {
    id: 'limit_act_now',
    label: 'Approaching limit',
    severity: 'act_now',
    when: (v) => onTheRoad(v) && v.minutesUntilLimit > 0 && v.minutesUntilLimit <= ACT_NOW_MIN,
    message: (v) => ({
      title: `${v.driver.name} hits the limit in ${est(v)}${fmtMinutes(v.minutesUntilLimit)} with ${stops(v.remaining.length)} left.`,
      body: `${fmtMinutes(v.remainingDriveMin)} of driving still to do.`,
    }),
    actions: ['reassign', 'schedule_reset', 'notify_customer'],
  },
  {
    id: 'limit_watch',
    label: 'Approaching limit',
    severity: 'watch',
    when: (v) => onTheRoad(v) && v.minutesUntilLimit > ACT_NOW_MIN && v.minutesUntilLimit <= WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} has ${est(v)}${fmtMinutes(v.minutesUntilLimit)} of drive time left.`,
      body: `${stops(v.remaining.length)} left, ${fmtMinutes(v.remainingDriveMin)} of driving.`,
    }),
    actions: ['schedule_reset', 'reassign'],
  },
  {
    id: 'wont_finish',
    label: "Won't finish",
    severity: 'act_now',
    when: (v) => v.minutesUntilLimit > 0 && v.remaining.length > 0 && v.remainingDriveMin > v.minutesUntilLimit,
    message: (v) => ({
      title: `${v.driver.name} can't finish the route before the limit.`,
      body: `Last stop projected ${fmtClock(v.projectedFinishAt ?? v.now)}; the limit hits at ${est(v)}${fmtClock(v.limitHitAt)}.`,
    }),
    actions: ['reassign', 'schedule_reset'],
  },
  {
    id: 'offline_near_limit',
    label: 'Offline',
    severity: 'act_now',
    when: (v) => v.staleness === 'offline' && v.minutesUntilLimit <= WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} hasn't pinged in ${fmtMinutes(v.pingAgeMin)}.`,
      body: v.minutesUntilLimit <= 0 ? 'Last estimate: over the limit if still driving.' : `Last estimate: ~${fmtMinutes(v.minutesUntilLimit)} to the limit if still driving.`,
    }),
    actions: ['call_driver', 'acknowledge'],
  },
  {
    id: 'offline',
    label: 'Offline',
    severity: 'watch',
    when: (v) => v.staleness === 'offline' && v.minutesUntilLimit > WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} hasn't pinged in ${fmtMinutes(v.pingAgeMin)}.`,
      body: `HOS was clear at the last ping, ~${fmtMinutes(v.minutesUntilLimit)} left.`,
    }),
    actions: ['call_driver', 'acknowledge'],
  },
  {
    id: 'behind_schedule',
    label: 'Behind schedule',
    severity: 'watch',
    when: (v) => v.driftMin >= BEHIND_MIN && v.remaining.length > 0,
    message: (v) => ({
      title: `${v.driver.name} is ${fmtMinutes(v.driftMin)} behind with ${stops(v.remaining.length)} left.`,
      body: v.unnotifiedLateStops.length > 0 ? `${stops(v.unnotifiedLateStops.length)} haven't been told yet.` : 'Customers have been notified.',
    }),
    actions: ['notify_customer', 'reassign'],
  },
  {
    id: 'stops_unassigned',
    label: 'Needs a driver',
    severity: 'info',
    when: (v) => v.unassigned.length > 0,
    message: (v) => ({
      title: `${stops(v.unassigned.length)} on ${first(v)}'s route need a driver.`,
      body: 'They fall after the scheduled reset.',
    }),
    actions: ['reassign'],
  },
]
