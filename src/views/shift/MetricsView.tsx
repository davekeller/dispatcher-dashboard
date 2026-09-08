import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL, type Band } from '../../bands'
import { EMPTY_FILTERS, type FilterState } from '../../filters'
import { LIMIT_MIN } from '../../hos/constants'
import { fmtClock, fmtCountdown, fmtHm } from '../../lib/format'
import type { Derived } from '../../store/derive'
import { DAY_END } from '../../time/clock'
import DriverAvatar from '../../ui/DriverAvatar'
import { BAND_TONE, STALENESS_TONE } from '../../ui/tones'
import { bandBreakdown, closestToLimit, drivingHistogram, freshnessCounts, limitTimeline, metricRows, regionProgress, sinceBreakBins } from './metrics'

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** The Metrics lens: the shift as charts. It reads the same filtered cards the board would show,
 *  so a chart and a column never disagree. Band colors appear only where they mean status; every
 *  other quantity is neutral. No chart library: bars are divs, positions are percentages. */
export default function MetricsView({ cards, d, filters, onPreset }: { cards: DriverCard[]; d: Derived; filters: FilterState; onPreset: (filters: FilterState) => void }) {
  const rows = metricRows(cards, d.byId)
  const bands = bandBreakdown(rows)
  const hours = drivingHistogram(rows)
  const marks = limitTimeline(rows, d.now, DAY_END)
  const closest = closestToLimit(rows, 8)
  const regions = regionProgress(rows)
  const fresh = freshnessCounts(rows)
  const breaks = sinceBreakBins(rows)
  const maxBin = Math.max(1, ...hours.map((b) => b.total))
  const maxBreak = Math.max(1, ...breaks.map((b) => b.count))
  const beyondDay = marks.filter((m) => !m.over && m.x >= 1).length

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel title="Fleet by status" detail={`${rows.length} trucks · as of ${fmtClock(d.now)}`} className="xl:col-span-2">
        <StackedBar total={rows.length} segments={bands.map((b) => ({ key: b.band, label: b.label, count: b.count, fill: BAND_TONE[b.band].fill }))} height="h-4" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bands.map((b) => {
            const preset: FilterState = { ...EMPTY_FILTERS, band: [b.band] }
            const on = sameFilters(filters, preset)
            return (
              <button key={b.band} type="button" aria-pressed={on} onClick={() => onPreset(on ? EMPTY_FILTERS : preset)} className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition ${on ? 'border-ink bg-ink text-on-accent' : 'border-line bg-panel text-ink hover:border-ink/25'}`}>
                <span className={`h-2 w-2 rounded-full ${on ? 'bg-on-accent/80' : BAND_TONE[b.band].fill}`} />
                {b.label}
                <span className={`tnum font-medium ${on ? 'text-on-accent/75' : 'text-label'}`}>{b.count}</span>
              </button>
            )
          })}
        </div>
      </Panel>

      <Panel title="Hours driven today" detail="One bin per hour of driving; the 11-hour limit is the line">
        <div className="flex h-36 items-end gap-1">
          {hours.map((bin) => (
            <div key={bin.label} className={`flex min-w-0 flex-1 flex-col items-center ${bin.over ? 'ml-1 border-l border-dashed border-act-now pl-1' : ''}`} title={`${bin.label}: ${bin.total}`}>
              <span className="tnum mb-1 text-[10px] font-semibold leading-none text-ink">{bin.total || ''}</span>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] bg-well" style={{ height: `${Math.max(2, (bin.total / maxBin) * 100)}px` }}>
                {(Object.keys(bin.byBand) as Band[]).map((band) => bin.byBand[band] > 0 && (
                  <span key={band} className={BAND_TONE[band].fill} style={{ height: `${(bin.byBand[band] / bin.total) * 100}%` }} title={`${BAND_LABEL[band]}: ${bin.byBand[band]}`} />
                ))}
              </div>
              <span className={`tnum mt-1 text-[8px] leading-none ${bin.over ? 'font-semibold text-act-now' : 'text-label'}`}>{bin.over ? 'Over' : bin.label.split('–')[0]}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-label">Bars are stacked by status. Anyone past {LIMIT_MIN / 60} hours is in the Over bin.</p>
      </Panel>

      <Panel title="Who hits the limit when" detail={`From now to ${fmtClock(DAY_END)}, for drivers with work left`}>
        <div className="relative mt-1 h-16">
          <span className="absolute inset-x-0 top-7 h-px bg-line" />
          {marks.map((m, i) => {
            const emphasis = m.over || m.band === 'act_now'
            return (
              <Link key={m.driverId} to={`/routes/${m.driverId}`} title={`${m.name} · ${m.routeId.toUpperCase()} · ${m.over ? 'over the limit now' : `limit at ${fmtClock(m.at)}`}`} className="group absolute -translate-x-1/2" style={{ left: `${m.x * 100}%`, top: emphasis ? '1.25rem' : '1.5rem', zIndex: emphasis ? 2 : 1 }}>
                <span className={`block rounded-full ring-2 ring-panel ${emphasis ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} ${BAND_TONE[m.band].fill}`} />
                {emphasis && <span className={`absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold ${i % 2 ? 'top-4' : 'top-4'} ${BAND_TONE[m.band].text}`}>{m.name}</span>}
              </Link>
            )
          })}
          <span className="tnum absolute left-0 top-10 text-[9px] text-label">now</span>
          <span className="tnum absolute right-0 top-10 text-[9px] text-label">{fmtClock(DAY_END)}</span>
        </div>
        <p className="mt-1 text-[10px] text-label">{marks.filter((m) => m.over).length} over now · {marks.filter((m) => !m.over && m.x < 1).length} reach it before {fmtClock(DAY_END)} · {beyondDay} after the day ends. Click a dot for the route.</p>
      </Panel>

      <Panel title="Closest to the limit" detail="Drive time used of 11 hours">
        <ol className="flex flex-col gap-1.5">
          {closest.map(({ card, view }) => {
            const used = Math.min(1, Math.max(0, view.drivingMin / LIMIT_MIN))
            const over = view.minutesUntilLimit <= 0
            return (
              <li key={card.driverId}>
                <Link to={`/routes/${card.driverId}`} className="grid grid-cols-[1.25rem_minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-control px-1 py-0.5 transition hover:bg-well">
                  <DriverAvatar driver={view.driver} size={20} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-ink">{view.driver.name}</span>
                    <span className="block truncate font-mono text-[9px] text-label">{view.route.id.toUpperCase()} · {BAND_LABEL[card.band]}</span>
                  </span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-well" title={`${fmtHm(view.drivingMin)} driven`}>
                    <span className={`absolute inset-y-0 left-0 ${over ? 'bg-act-now' : BAND_TONE[card.band].fill}`} style={{ width: `${used * 100}%` }} />
                  </span>
                  <span className={`tnum text-right text-[12px] font-semibold ${over ? 'text-act-now' : card.band === 'watch' ? 'text-watch' : 'text-ink'}`}>{fmtCountdown(view.minutesUntilLimit, view.staleness !== 'fresh')}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </Panel>

      <Panel title="Deliveries by region" detail="Delivered, remaining, and failed stops">
        <ol className="flex flex-col gap-2">
          {regions.map((r) => (
            <li key={r.region} className="grid grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-3">
              <span className="text-[12px] font-semibold text-ink">{r.region} <span className="tnum font-normal text-label">· {r.drivers}</span></span>
              <StackedBar total={Math.max(1, r.total)} segments={[{ key: 'done', label: 'Delivered', count: r.delivered, fill: 'bg-clear-fill' }, { key: 'left', label: 'Remaining', count: r.remaining, fill: 'bg-nav-selected' }, { key: 'failed', label: 'Failed', count: r.failed, fill: 'bg-act-now-fill' }]} />
              <span className="tnum text-right text-[11px] text-muted"><span className="font-semibold text-ink">{r.delivered}</span> / {r.total}</span>
            </li>
          ))}
        </ol>
        <Legend items={[{ label: 'Delivered', fill: 'bg-clear-fill' }, { label: 'Remaining', fill: 'bg-nav-selected' }, { label: 'Failed', fill: 'bg-act-now-fill' }]} />
      </Panel>

      <Panel title="Since the last break" detail="Driving since a 30-minute interruption; a break is due after 8 hours">
        <div className="flex h-24 items-end gap-2">
          {breaks.map((bin) => (
            <div key={bin.label} className="flex min-w-0 flex-1 flex-col items-center" title={`${bin.label}: ${bin.count}`}>
              <span className="tnum mb-1 text-[10px] font-semibold leading-none text-ink">{bin.count || ''}</span>
              <div className={`w-full rounded-t-[3px] ${bin.due ? 'bg-watch-fill' : 'bg-nav-selected-ink/70'}`} style={{ height: `${Math.max(2, (bin.count / maxBreak) * 64)}px` }} />
              <span className={`tnum mt-1 text-[9px] leading-none ${bin.due ? 'font-semibold text-watch' : 'text-label'}`}>{bin.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Data freshness" detail="How recently each truck reported in">
        <StackedBar total={rows.length} segments={[{ key: 'fresh', label: 'Fresh', count: fresh.fresh, fill: STALENESS_TONE.fresh.fill }, { key: 'stale', label: 'Stale', count: fresh.stale, fill: STALENESS_TONE.stale.fill }, { key: 'offline', label: 'Offline', count: fresh.offline, fill: STALENESS_TONE.offline.fill }]} height="h-3" />
        <Legend items={[{ label: `Fresh · ${fresh.fresh}`, fill: STALENESS_TONE.fresh.fill }, { label: `Stale · ${fresh.stale}`, fill: STALENESS_TONE.stale.fill }, { label: `Offline · ${fresh.offline}`, fill: STALENESS_TONE.offline.fill }]} />
        <p className="mt-2 text-[10px] text-label">Fresh is under 3 minutes, offline is over 15. Figures for stale and offline trucks carry a tilde everywhere else.</p>
      </Panel>
    </div>
  )
}

function Panel({ title, detail, className = '', children }: { title: string; detail?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-card border border-line bg-panel p-4 shadow-card ${className}`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-label">{title}</h3>
      {detail && <p className="mt-0.5 text-[11px] text-muted">{detail}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function StackedBar({ segments, total, height = 'h-2.5' }: { segments: { key: string; label: string; count: number; fill: string }[]; total: number; height?: string }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-well ${height}`} role="img" aria-label={segments.map((s) => `${s.label} ${s.count}`).join(', ')}>
      {segments.filter((s) => s.count > 0).map((s) => (
        <span key={s.key} title={`${s.label}: ${s.count}`} className={`h-full ${s.fill}`} style={{ width: `${(s.count / Math.max(1, total)) * 100}%` }} />
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; fill: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${i.fill}`} /> {i.label}</span>
      ))}
    </div>
  )
}
