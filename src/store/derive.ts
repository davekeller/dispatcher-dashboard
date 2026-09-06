import { evaluateRules, rankDrivers } from '../alerts/rank'
import type { Alert, DriverCard } from '../alerts/types'
import type { Delivery, Fleet } from '../data/types'
import { buildViews, type DriverView } from './view'

export interface Metrics {
  onShift: number
  approaching: number
  over: number
  offline: number
  stopsDone: number
  stopsDelivered: number
  stopsFailed: number
  stopsRemaining: number
  needDriver: number
}

export interface Derived {
  now: number
  deliveryById: Map<string, Delivery>
  views: DriverView[]
  byId: Map<string, DriverView>
  alerts: Alert[]
  ranked: DriverCard[]
  cardById: Map<string, DriverCard>
  metrics: Metrics
}

export function computeMetrics(views: DriverView[]): Metrics {
  return {
    onShift: views.filter((v) => v.status !== 'off_duty').length,
    approaching: views.filter((v) => v.hos === 'act_now' || v.hos === 'watch').length,
    over: views.filter((v) => v.hos === 'over').length,
    offline: views.filter((v) => v.staleness === 'offline').length,
    stopsDone: views.reduce((t, v) => t + v.done, 0),
    stopsDelivered: views.reduce((total, view) => total + view.route.stops.filter((stop) => stop.status === 'done').length, 0),
    stopsFailed: views.reduce((total, view) => total + view.route.stops.filter((stop) => stop.status === 'failed').length, 0),
    stopsRemaining: views.reduce((t, v) => t + v.remaining.length, 0),
    needDriver: views.reduce((t, v) => t + v.unassigned.length, 0),
  }
}

// One derivation per (fleet, tick, snoozes). Fifty drivers times eight rules is
// trivial; the memo exists so React sees one stable object per tick.
let cache: { fleet: Fleet; now: number; snoozes: Record<string, number>; result: Derived } | undefined

export function derive(fleet: Fleet, now: number, snoozes: Record<string, number>): Derived {
  if (cache && cache.fleet === fleet && cache.now === now && cache.snoozes === snoozes) return cache.result
  const views = buildViews(fleet, now)
  const alerts = evaluateRules(views)
  const ranked = rankDrivers(views, alerts, snoozes, now)
  const result: Derived = {
    now,
    deliveryById: new Map(fleet.deliveries.map((x) => [x.id, x])),
    views,
    byId: new Map(views.map((v) => [v.driver.id, v])),
    alerts,
    ranked,
    cardById: new Map(ranked.map((c) => [c.driverId, c])),
    metrics: computeMetrics(views),
  }
  cache = { fleet, now, snoozes, result }
  return result
}
