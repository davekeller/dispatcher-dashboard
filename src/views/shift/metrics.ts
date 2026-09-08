import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL, BAND_ORDER, type Band } from '../../bands'
import { REGIONS } from '../../data/regions'
import type { Region } from '../../data/types'
import type { Staleness } from '../../hos/compute'
import { BREAK_DUE_AFTER_MIN, LIMIT_MIN } from '../../hos/constants'
import type { DriverView } from '../../store/view'

// The Metrics lens reads the same filtered cards the board does and counts them. Everything here
// is a pure function of rows so the charts can never disagree with the columns.

/** One row per truck on the board: the card for its band, the view for its figures. */
export interface MetricRow {
  card: DriverCard
  view: DriverView
}

export function metricRows(cards: DriverCard[], byId: Map<string, DriverView>): MetricRow[] {
  return cards.flatMap((card) => {
    const view = byId.get(card.driverId)
    return view ? [{ card, view }] : []
  })
}

export interface BandCount {
  band: Band
  label: string
  count: number
}

/** The fleet by status, in board order, zero bands included so the legend never shifts. */
export function bandBreakdown(rows: MetricRow[]): BandCount[] {
  return BAND_ORDER.map((band) => ({ band, label: BAND_LABEL[band], count: rows.filter((r) => r.card.band === band).length }))
}

const HOUR = 60

export interface HourBin {
  label: string
  total: number
  byBand: Record<Band, number>
  /** The bin past the limit: everyone whose driving already exceeds it. */
  over: boolean
}

function emptyBands(): Record<Band, number> {
  return { act_now: 0, watch: 0, break: 0, offline: 0, clear: 0 }
}

/** Hours of driving today: one bin per hour up to the limit, then one for everyone over it. */
export function drivingHistogram(rows: MetricRow[]): HourBin[] {
  const hours = LIMIT_MIN / HOUR
  const bins: HourBin[] = Array.from({ length: hours }, (_, i) => ({ label: `${i}–${i + 1}h`, total: 0, byBand: emptyBands(), over: false }))
  bins.push({ label: 'Over', total: 0, byBand: emptyBands(), over: true })
  for (const r of rows) {
    const i = r.view.drivingMin >= LIMIT_MIN ? hours : Math.max(0, Math.min(hours - 1, Math.floor(r.view.drivingMin / HOUR)))
    bins[i].total += 1
    bins[i].byBand[r.card.band] += 1
  }
  return bins
}

export interface LimitMark {
  driverId: string
  name: string
  routeId: string
  band: Band
  /** When the limit lands; for a driver already over it, now. */
  at: number
  over: boolean
  /** Position on the rest of the day: 0 is now, 1 is the end of the day. */
  x: number
}

/** When each driver with work left reaches the 11-hour limit, placed on the rest of the day. */
export function limitTimeline(rows: MetricRow[], now: number, dayEnd: number): LimitMark[] {
  const span = Math.max(1, dayEnd - now)
  return rows
    .filter((r) => r.view.remaining.length > 0 || r.view.minutesUntilLimit <= 0)
    .map((r) => {
      const over = r.view.minutesUntilLimit <= 0
      const at = over ? now : r.view.limitHitAt
      return { driverId: r.view.driver.id, name: r.view.driver.name, routeId: r.view.route.id, band: r.card.band, at, over, x: over ? 0 : Math.min(1, Math.max(0, (at - now) / span)) }
    })
    .sort((a, b) => a.at - b.at)
}

/** The drivers with the least drive time left, the ones over the limit first. */
export function closestToLimit(rows: MetricRow[], n: number): MetricRow[] {
  return [...rows].sort((a, b) => a.view.minutesUntilLimit - b.view.minutesUntilLimit).slice(0, n)
}

export interface RegionProgress {
  region: Region
  drivers: number
  delivered: number
  failed: number
  remaining: number
  total: number
}

export function regionProgress(rows: MetricRow[]): RegionProgress[] {
  return REGIONS.map((region) => {
    const rs = rows.filter((r) => r.view.driver.region === region)
    const delivered = rs.reduce((n, r) => n + r.view.route.stops.filter((s) => s.status === 'done').length, 0)
    const failed = rs.reduce((n, r) => n + r.view.route.stops.filter((s) => s.status === 'failed').length, 0)
    const total = rs.reduce((n, r) => n + r.view.total, 0)
    return { region, drivers: rs.length, delivered, failed, remaining: total - delivered - failed, total }
  })
}

export function freshnessCounts(rows: MetricRow[]): Record<Staleness, number> {
  const counts: Record<Staleness, number> = { fresh: 0, stale: 0, offline: 0 }
  for (const r of rows) counts[r.view.staleness] += 1
  return counts
}

export interface BreakBin {
  label: string
  count: number
  /** Past the point a 30-minute break is due. */
  due: boolean
}

/** Driving since the last real break, in two-hour bins; the last bin is everyone a break is due for. */
export function sinceBreakBins(rows: MetricRow[]): BreakBin[] {
  const edges = [0, 120, 240, 360, BREAK_DUE_AFTER_MIN]
  const bins: BreakBin[] = edges.slice(0, -1).map((start, i) => ({ label: `${start / HOUR}–${edges[i + 1] / HOUR}h`, count: 0, due: false }))
  bins.push({ label: `${BREAK_DUE_AFTER_MIN / HOUR}h+`, count: 0, due: true })
  for (const r of rows) {
    const m = r.view.drivingSinceBreakMin
    const i = m >= BREAK_DUE_AFTER_MIN ? bins.length - 1 : Math.max(0, Math.min(bins.length - 2, Math.floor(m / 120)))
    bins[i].count += 1
  }
  return bins
}
