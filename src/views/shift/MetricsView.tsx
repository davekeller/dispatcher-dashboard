import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL, BAND_ORDER, type Band } from '../../bands'
import { EMPTY_FILTERS, type FilterState } from '../../filters'
import { LIMIT_MIN } from '../../hos/constants'
import { fmtClock, fmtCountdown, fmtHm, fmtMinutes } from '../../lib/format'
import type { Derived } from '../../store/derive'
import { DAY_END } from '../../time/clock'
import DriverAvatar from '../../ui/DriverAvatar'
import { BAND_TONE, STALENESS_TONE } from '../../ui/tones'
import {
  bandBreakdown,
  closestToLimit,
  drivingHistogram,
  freshnessCounts,
  limitTimeline,
  metricRows,
  regionProgress,
  sinceBreakBins,
  type BreakBin,
  type HourBin,
  type LimitMark,
} from './metrics'

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// A chart filter keeps the status hue it selects; slate is reserved for lens navigation.
const METRIC_STATUS_SELECTED: Record<Band, string> = {
  act_now: 'border-act-now bg-act-now text-on-accent',
  watch: 'border-watch bg-watch text-on-accent',
  break: 'border-break bg-break text-on-accent',
  offline: 'border-offline bg-offline text-on-accent',
  clear: 'border-clear bg-clear text-on-accent',
}

/** The Metrics lens: the shift as charts. It reads the same filtered cards the board would show,
 *  so a chart and a column never disagree. Band colors appear only where they mean status; every
 *  other quantity is neutral. No chart library: bars are divs, positions are percentages. */
export default function MetricsView({ cards, d, filters, onPreset }: { cards: DriverCard[]; d: Derived; filters: FilterState; onPreset: (filters: FilterState) => void }) {
  const rows = metricRows(cards, d.byId)
  const bands = bandBreakdown(rows)
  const hours = drivingHistogram(rows)
  const marks = limitTimeline(rows, d.now, DAY_END)
  const withinShift = marks.filter((mark) => mark.withinWindow)
  const later = marks.length - withinShift.length
  const overNow = withinShift.filter((mark) => mark.over).length
  const approachingThisShift = withinShift.length - overNow
  const closest = closestToLimit(rows, 8)
  const regions = regionProgress(rows)
  const fresh = freshnessCounts(rows)
  const breaks = sinceBreakBins(rows)
  const breakDue = breaks.find((bin) => bin.due)?.count ?? 0
  const reportingIssues = fresh.stale + fresh.offline
  const visibleDelivered = regions.reduce((total, region) => total + region.delivered, 0)
  const visibleStops = regions.reduce((total, region) => total + region.total, 0)
  const visibleDeliveredPct = visibleStops === 0 ? 100 : Math.round((visibleDelivered / visibleStops) * 100)

  return (
    <div className="space-y-8 pb-2">
      <header className="flex min-w-0 items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-semibold leading-none tracking-[-0.035em] text-ink">Shift metrics</h1>
          <p className="mt-2 text-[11px] leading-snug text-label">Fleet risk, delivery progress, and driver readiness in one operational view.</p>
        </div>
        <p className="tnum shrink-0 pb-0.5 text-[10px] font-medium text-label">{rows.length} trucks in view · {fmtClock(d.now)}</p>
      </header>

      <MetricSection
        id="hos-exposure"
        title="Hours of service"
        detail="Limit exposure and legal driving balance across the filtered fleet."
        summary={<><span className="h-2 w-2 rounded-full bg-act-now-fill" />{overNow} over · {approachingThisShift} more before {fmtClock(DAY_END)}</>}
      >
        <Panel
          title="Who hits the limit when"
          detail="Projected clock time each driver exhausts 11 driving hours · service time is included"
          aside={<PanelStat tone={overNow > 0 ? 'critical' : approachingThisShift > 0 ? 'watch' : 'neutral'}>{overNow > 0 ? `${overNow} over · ` : ''}{approachingThisShift} before {fmtClock(DAY_END)}</PanelStat>}
          className="xl:col-span-2"
        >
          <LimitForecast marks={withinShift} now={d.now} dayEnd={DAY_END} />
          <p className="mt-3 border-t border-line pt-2.5 text-[10px] leading-relaxed text-label">
            {later > 0 ? `${later} ${later === 1 ? 'driver does' : 'drivers do'} not reach the limit before ${fmtClock(DAY_END)}.` : `Every visible driver reaches the limit by ${fmtClock(DAY_END)}.`}
            {' '}The countdown is drive time left; the plotted time also accounts for service at stops.
          </p>
        </Panel>

        <Panel
          title="Hours driven today"
          detail="Fleet distribution across the 11-hour legal driving window"
          aside={<PanelStat tone={hours.at(-1)?.total ? 'critical' : 'neutral'}>{hours.at(-1)?.total ?? 0} over</PanelStat>}
        >
          <HoursChart bins={hours} />
        </Panel>

        <Panel title="Closest to the limit" detail="Current driving allowance used · stop service time excluded">
          <ol className="flex flex-col gap-1">
            {closest.map(({ card, view }) => {
              const used = Math.min(1, Math.max(0, view.drivingMin / LIMIT_MIN))
              const over = view.minutesUntilLimit <= 0
              return (
                <li key={card.driverId}>
                  <Link to={`/routes/${card.driverId}`} className="grid min-h-9 grid-cols-[1.5rem_minmax(0,8.5rem)_minmax(4rem,1fr)_4rem] items-center gap-2 rounded-control px-1.5 py-1 transition hover:bg-board/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nav-selected-ink">
                    <DriverAvatar driver={view.driver} size={22} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-ink">{view.driver.name}</span>
                      <span className="block truncate font-mono text-[9px] text-label">{view.route.id.toUpperCase()} · {fmtHm(view.drivingMin)} driven</span>
                    </span>
                    <span className="relative h-2.5 overflow-hidden rounded-full bg-board" title={`${fmtHm(view.drivingMin)} of 11:00 driven`}>
                      <span className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-act-now' : BAND_TONE[card.band].fill}`} style={{ width: `${used * 100}%` }} />
                      <span className="absolute inset-y-0 right-0 w-px bg-ink/35" aria-hidden="true" />
                    </span>
                    <span className="text-right">
                      <span className={`tnum block text-[12px] font-semibold leading-none ${over ? 'text-act-now' : card.band === 'watch' ? 'text-watch' : 'text-ink'}`}>{fmtCountdown(view.minutesUntilLimit, view.staleness !== 'fresh')}</span>
                      <span className="mt-0.5 block text-[8px] uppercase tracking-wide text-label">{over ? 'over' : 'left'}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </Panel>
      </MetricSection>

      <MetricSection
        id="shift-operations"
        title="Shift operations"
        detail="Route status and delivery completion across the current view."
        summary={<>{rows.length} trucks · {visibleDeliveredPct}% delivered</>}
      >
        <Panel
          title="Fleet by status"
          detail={`The same ${rows.length} trucks shown on the board · as of ${fmtClock(d.now)}`}
          aside={<PanelStat>{rows.length} trucks</PanelStat>}
          className="xl:col-span-2"
        >
          <StackedBar total={rows.length} segments={bands.map((band) => ({ key: band.band, label: band.label, count: band.count, fill: BAND_TONE[band.band].fill }))} height="h-5" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bands.map((band) => {
              const preset: FilterState = { ...EMPTY_FILTERS, band: [band.band] }
              const on = sameFilters(filters, preset)
              return (
                <button key={band.band} type="button" aria-pressed={on} onClick={() => onPreset(on ? EMPTY_FILTERS : preset)} className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-selected-ink ${on ? `${METRIC_STATUS_SELECTED[band.band]} shadow-sm` : 'border-line bg-panel text-ink hover:border-nav-selected-line hover:bg-board/50'}`}>
                  <span className={`h-2 w-2 rounded-full ${on ? 'bg-on-accent/85' : BAND_TONE[band.band].fill}`} />
                  {band.label}
                  <span className={`tnum font-medium ${on ? 'text-on-accent/75' : 'text-label'}`}>{band.count}</span>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel title="Deliveries by region" detail="Delivered share, remaining work, and failures" className="xl:col-span-2">
          <ol className="grid grid-cols-1 gap-x-8 gap-y-3 xl:grid-cols-2">
            {regions.map((region) => {
              const pct = region.total === 0 ? 100 : Math.round((region.delivered / region.total) * 100)
              return (
                <li key={region.region} className="grid grid-cols-[4.75rem_minmax(0,1fr)_4.5rem] items-center gap-3">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-ink">{region.region}</span>
                    <span className="tnum block text-[9px] text-label">{region.drivers} trucks</span>
                  </span>
                  <StackedBar total={Math.max(1, region.total)} segments={[{ key: 'done', label: 'Delivered', count: region.delivered, fill: 'bg-clear-fill' }, { key: 'left', label: 'Remaining', count: region.remaining, fill: 'bg-nav-selected-ink/55' }, { key: 'failed', label: 'Failed', count: region.failed, fill: 'bg-act-now-fill' }]} height="h-2.5" />
                  <span className="text-right">
                    <span className="tnum block text-[13px] font-semibold leading-none text-ink">{pct}%</span>
                    <span className="tnum mt-0.5 block text-[9px] text-label">{region.delivered}/{region.total}</span>
                  </span>
                </li>
              )
            })}
          </ol>
          <Legend items={[{ label: 'Delivered', fill: 'bg-clear-fill' }, { label: 'Remaining', fill: 'bg-nav-selected-ink/55' }, { label: 'Failed', fill: 'bg-act-now-fill' }]} />
        </Panel>
      </MetricSection>

      <MetricSection
        id="driver-readiness"
        title="Driver readiness"
        detail="Break compliance and confidence in the latest telematics."
        summary={<><span className={`h-2 w-2 rounded-full ${breakDue > 0 ? 'bg-watch-fill' : 'bg-clear-fill'}`} />{breakDue} break due · {reportingIssues} reporting {reportingIssues === 1 ? 'exception' : 'exceptions'}</>}
      >
        <Panel
          title="Since the last break"
          detail="Continuous driving since a qualifying 30-minute interruption"
          aside={<PanelStat tone={breakDue > 0 ? 'watch' : 'neutral'}>{breakDue} due</PanelStat>}
        >
          <BreakChart bins={breaks} />
        </Panel>

        <Panel
          title="Data freshness"
          detail="How recently the fleet reported in"
          aside={<PanelStat>{fresh.fresh} current</PanelStat>}
        >
          <dl className="grid grid-cols-3 overflow-hidden rounded-control border border-line bg-board/45 divide-x divide-line">
            {(['fresh', 'stale', 'offline'] as const).map((key) => (
              <div key={key} className="px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-label">
                  <span className={`h-2 w-2 rounded-full ${STALENESS_TONE[key].fill}`} />
                  {key === 'fresh' ? 'Fresh · under 3m' : key === 'stale' ? 'Stale · 3–15m' : 'Offline · over 15m'}
                </dt>
                <dd className={`tnum mt-1 font-display text-[22px] font-semibold leading-none ${STALENESS_TONE[key].text}`}>{fresh[key]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3"><StackedBar total={rows.length} segments={[{ key: 'fresh', label: 'Fresh', count: fresh.fresh, fill: STALENESS_TONE.fresh.fill }, { key: 'stale', label: 'Stale', count: fresh.stale, fill: STALENESS_TONE.stale.fill }, { key: 'offline', label: 'Offline', count: fresh.offline, fill: STALENESS_TONE.offline.fill }]} height="h-2.5" /></div>
          <p className="mt-2 text-[10px] text-label">Stale and offline projections carry a tilde throughout Dispatch.</p>
        </Panel>
      </MetricSection>
    </div>
  )
}

function MetricSection({ id, title, detail, summary, children }: { id: string; title: string; detail: string; summary: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <header className="mb-3 flex min-w-0 items-end justify-between gap-6 border-b border-nav-selected-line pb-2.5">
        <div className="min-w-0">
          <h2 id={id} className="font-display text-[19px] font-semibold leading-none tracking-[-0.025em] text-ink">{title}</h2>
          <p className="mt-1.5 text-[10px] leading-snug text-label">{detail}</p>
        </div>
        <div className="tnum flex shrink-0 items-center gap-1.5 pb-0.5 text-[10px] font-semibold text-nav-selected-ink">{summary}</div>
      </header>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
    </section>
  )
}

function Panel({ title, detail, aside, className = '', children }: { title: string; detail?: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-panel p-4 shadow-card ${className}`}>
      <header className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold leading-tight tracking-[-0.015em] text-ink">{title}</h3>
          {detail && <p className="mt-1 text-[10px] leading-snug text-label">{detail}</p>}
        </div>
        {aside}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PanelStat({ tone = 'neutral', children }: { tone?: 'neutral' | 'watch' | 'critical'; children: ReactNode }) {
  const colors = tone === 'critical' ? 'border-act-now/25 bg-act-now-soft text-act-now' : tone === 'watch' ? 'border-watch/25 bg-watch-soft text-watch' : 'border-nav-selected-line bg-board/70 text-nav-selected-ink'
  return <span className={`tnum shrink-0 rounded-control border px-2 py-1 text-[10px] font-semibold ${colors}`}>{children}</span>
}

function StackedBar({ segments, total, height = 'h-2.5' }: { segments: { key: string; label: string; count: number; fill: string }[]; total: number; height?: string }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-board ${height}`} role="img" aria-label={segments.map((segment) => `${segment.label} ${segment.count}`).join(', ')}>
      {segments.filter((segment) => segment.count > 0).map((segment) => (
        <span key={segment.key} title={`${segment.label}: ${segment.count}`} className={`h-full ${segment.fill}`} style={{ width: `${(segment.count / Math.max(1, total)) * 100}%` }} />
      ))}
    </div>
  )
}

function HoursChart({ bins }: { bins: HourBin[] }) {
  const max = Math.max(1, ...bins.map((bin) => bin.total))
  const activeBands = BAND_ORDER.filter((band) => bins.some((bin) => bin.byBand[band] > 0))
  return (
    <>
      <div className="relative">
        <ChartGrid />
        <div className="relative grid h-72 grid-cols-12 items-end gap-1.5 pt-3">
          {bins.map((bin, index) => (
            <div key={bin.label} className={`flex h-full min-w-0 flex-col justify-end ${bin.over ? 'border-l-2 border-dashed border-act-now/45 bg-act-now-soft/55 pl-1' : ''}`} title={`${bin.label}: ${bin.total} trucks`}>
              <span className="tnum mb-1 block text-center text-[9px] font-semibold leading-none text-ink">{bin.total || ''}</span>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-[4px] bg-board" style={{ height: `${Math.max(2, (bin.total / max) * 224)}px` }}>
                {BAND_ORDER.map((band) => bin.byBand[band] > 0 && (
                  <span key={band} className={BAND_TONE[band].fill} style={{ height: `${(bin.byBand[band] / bin.total) * 100}%` }} title={`${BAND_LABEL[band]}: ${bin.byBand[band]}`} />
                ))}
              </div>
              <span className={`tnum mt-1.5 block h-3 text-center text-[8px] leading-none ${bin.over ? 'font-semibold text-act-now' : 'text-label'}`}>{bin.over ? '11h+' : index % 2 === 0 ? `${index}h` : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <Legend items={activeBands.map((band) => ({ label: BAND_LABEL[band], fill: BAND_TONE[band].fill }))} className="mt-0" />
        <span className="flex shrink-0 items-center gap-1.5 text-[9px] text-act-now"><span className="h-3 border-l-2 border-dashed border-act-now/55" />11h limit</span>
      </div>
    </>
  )
}

function BreakChart({ bins }: { bins: BreakBin[] }) {
  const max = Math.max(1, ...bins.map((bin) => bin.count))
  return (
    <>
      <div className="relative">
        <ChartGrid />
        <div className="relative grid h-32 grid-cols-5 items-end gap-3 pt-3">
          {bins.map((bin) => (
            <div key={bin.label} className={`flex h-full min-w-0 flex-col justify-end ${bin.due ? 'border-l-2 border-dashed border-watch/45 bg-watch-soft/60 pl-2' : ''}`} title={`${bin.label}: ${bin.count} trucks`}>
              <span className={`tnum mb-1 block text-center text-[10px] font-semibold leading-none ${bin.due ? 'text-watch' : 'text-ink'}`}>{bin.count || ''}</span>
              <div className={`w-full rounded-t-[4px] ${bin.due ? 'bg-watch-fill' : 'bg-nav-selected-ink/75'}`} style={{ height: `${Math.max(2, (bin.count / max) * 78)}px` }} />
              <span className={`tnum mt-1.5 block h-3 text-center text-[9px] leading-none ${bin.due ? 'font-semibold text-watch' : 'text-label'}`}>{bin.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[9px] text-label">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-nav-selected-ink/75" />Driving</span>
        <span className="flex items-center gap-1.5 text-watch"><span className="h-2 w-2 rounded-sm bg-watch-fill" />Break due</span>
      </div>
    </>
  )
}

function ChartGrid() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 top-3 flex flex-col justify-between" aria-hidden="true">
      <span className="border-t border-line/70" />
      <span className="border-t border-line/55" />
      <span className="border-t border-line/55" />
      <span className="border-t border-line" />
    </div>
  )
}

function LimitForecast({ marks, now, dayEnd }: { marks: LimitMark[]; now: number; dayEnd: number }) {
  const ticks = timeTicks(now, dayEnd)
  if (marks.length === 0) return <div className="rounded-control border border-line bg-board/45 px-3 py-5 text-center text-[11px] text-label">No visible driver reaches the 11-hour limit before {fmtClock(dayEnd)}.</div>

  return (
    <div role="group" aria-label={marks.map((mark) => `${mark.name}, ${mark.over ? 'over now' : `limit at ${fmtClock(mark.at)}`}`).join('; ')}>
      <div className="grid grid-cols-[7.25rem_minmax(0,1fr)_6.25rem] items-end gap-3 border-b border-line pb-2 text-[8px] font-semibold uppercase tracking-wide text-label">
        <span>Driver</span>
        <span className="relative h-3" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={tick.at} className={`tnum absolute top-0 whitespace-nowrap ${index === 0 ? '' : tick.x === 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${tick.x * 100}%` }}>{tick.label}</span>
          ))}
        </span>
        <span className="text-right">Driving balance</span>
      </div>
      <ol className="divide-y divide-line/75">
        {marks.map((mark) => (
          <li key={mark.driverId}>
            <Link to={`/routes/${mark.driverId}`} title={`${mark.name} · ${mark.routeId.toUpperCase()} · ${mark.over ? 'over the limit now' : `projected limit at ${fmtClock(mark.at)}`}`} className={`group grid min-h-10 grid-cols-[7.25rem_minmax(0,1fr)_6.25rem] items-center gap-3 px-1 transition hover:bg-board/65 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nav-selected-ink ${mark.over ? 'bg-act-now-soft/65' : ''}`}>
              <span className="min-w-0">
                <span className={`block truncate text-[11px] font-semibold ${mark.over ? 'text-act-now' : 'text-ink'}`}>{mark.name}</span>
                <span className="block font-mono text-[8px] text-label">{mark.routeId.toUpperCase()}</span>
              </span>
              <span className={`relative h-6 ${BAND_TONE[mark.band].text}`}>
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" aria-hidden="true" />
                {ticks.slice(1).map((tick) => <span key={tick.at} className="absolute inset-y-0 w-px bg-line/65" style={{ left: `${tick.x * 100}%` }} aria-hidden="true" />)}
                {!mark.over && <span className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current opacity-45" style={{ width: `${mark.x * 100}%` }} aria-hidden="true" />}
                <span className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-current shadow-sm transition-transform group-hover:scale-125 ${mark.over ? 'h-3.5 w-3.5' : 'h-3 w-3'}`} style={{ left: `${mark.x * 100}%` }} aria-hidden="true" />
                <span className={`tnum absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-control border bg-panel px-1.5 py-0.5 text-[9px] font-semibold shadow-sm ${mark.over ? 'left-2 border-act-now/35 text-act-now' : 'border-line text-ink'}`} style={mark.over ? undefined : { left: `${mark.x * 100}%`, transform: mark.x > 0.82 ? 'translate(-100%, -50%)' : 'translate(0.45rem, -50%)' }}>{mark.over ? 'Over now' : `${mark.estimated ? '~' : ''}${fmtClock(mark.at)}`}</span>
              </span>
              <span className="text-right">
                <span className={`tnum block text-[11px] font-semibold leading-none ${mark.over ? 'text-act-now' : BAND_TONE[mark.band].text}`}>{mark.estimated ? '~' : ''}{mark.over ? fmtMinutes(-mark.minutesUntilLimit) : fmtMinutes(mark.minutesUntilLimit)}</span>
                <span className="mt-0.5 block text-[8px] uppercase tracking-wide text-label">{mark.over ? 'over' : 'drive left'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

function timeTicks(now: number, dayEnd: number): { at: number; x: number; label: string }[] {
  const span = Math.max(1, dayEnd - now)
  const ticks = [{ at: now, x: 0, label: 'Now' }]
  const nextHour = new Date(now)
  nextHour.setMinutes(0, 0, 0)
  nextHour.setHours(nextHour.getHours() + 1)
  for (let at = nextHour.getTime(); at <= dayEnd; at += 60 * 60 * 1000) {
    const x = Math.min(1, Math.max(0, (at - now) / span))
    // A full-hour label very near "Now" collides, so its gridline stays implicit.
    if (x >= 0.15 || at === dayEnd) ticks.push({ at, x, label: new Date(at).toLocaleTimeString('en-US', { hour: 'numeric' }) })
  }
  if (ticks.at(-1)?.at !== dayEnd) ticks.push({ at: dayEnd, x: 1, label: fmtClock(dayEnd) })
  return ticks
}

function Legend({ items, className = '' }: { items: { label: string; fill: string }[]; className?: string }) {
  return (
    <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-label ${className}`}>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${item.fill}`} /> {item.label}</span>
      ))}
    </div>
  )
}
