import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL, type Band } from '../../bands'
import type { FilterState } from '../../filters'
import { EMPTY_FILTERS } from '../../filters'
import type { Metrics } from '../../store/derive'

interface Metric {
  id: string
  label: string
  value: number
  preset: FilterState
  dot: string
  tone: string
  /** The big count's own color when it should be louder than the label (the Act now red). */
  valueTone?: string
  /** The cell's own band color as a wash: on hover and focus, and a little stronger when selected. */
  wash: string
  washActive: string
  detail?: string
}

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** A terse shift instrument ordered by intervention priority. Its five status counts
 * mirror the board lanes exactly; the over-limit count stays attached to Act now. */
export default function ShiftHero({ metrics, ranked, filters, onPreset }: { metrics: Metrics; ranked: DriverCard[]; filters: FilterState; onPreset: (filters: FilterState) => void }) {
  const count = (band: Band) => ranked.filter((card) => card.band === band).length
  const items: Metric[] = [
    { id: 'act_now', label: BAND_LABEL.act_now, value: count('act_now'), preset: { ...EMPTY_FILTERS, band: ['act_now'] }, dot: 'bg-act-now-hero', tone: 'text-act-now-hero-text', valueTone: 'text-act-now-hero', wash: 'hover:bg-act-now-fill/15 focus-visible:bg-act-now-fill/15', washActive: 'bg-act-now-fill/25', detail: `${metrics.over} over limit` }, // the one saturated red on the band; the label is lighter to hold 4.5:1
    { id: 'watch', label: BAND_LABEL.watch, value: count('watch'), preset: { ...EMPTY_FILTERS, band: ['watch'] }, dot: 'bg-watch-board', tone: 'text-watch-board', wash: 'hover:bg-watch-fill/15 focus-visible:bg-watch-fill/15', washActive: 'bg-watch-fill/25' },
    { id: 'break', label: BAND_LABEL.break, value: count('break'), preset: { ...EMPTY_FILTERS, band: ['break'] }, dot: 'bg-break-board', tone: 'text-break-board', wash: 'hover:bg-break-fill/15 focus-visible:bg-break-fill/15', washActive: 'bg-break-fill/25' },
    { id: 'offline', label: BAND_LABEL.offline, value: count('offline'), preset: { ...EMPTY_FILTERS, band: ['offline'] }, dot: 'bg-offline-board', tone: 'text-offline-board', wash: 'hover:bg-offline-fill/15 focus-visible:bg-offline-fill/15', washActive: 'bg-offline-fill/25' },
    { id: 'clear', label: BAND_LABEL.clear, value: count('clear'), preset: { ...EMPTY_FILTERS, band: ['clear'] }, dot: 'bg-clear-board', tone: 'text-clear-board', wash: 'hover:bg-clear-fill/15 focus-visible:bg-clear-fill/15', washActive: 'bg-clear-fill/25' },
  ]
  const toDeliver = metrics.stopsRemaining + metrics.needDriver
  const totalStops = metrics.stopsDelivered + toDeliver + metrics.stopsFailed
  const deliveredPercent = totalStops === 0 ? 100 : Math.round((metrics.stopsDelivered / totalStops) * 100)

  return (
    <section className="lookout-metrics-band shrink-0 border-b border-white/15 pr-5 text-on-accent" aria-label="Shift status">
      <div className="flex min-w-[46rem] items-stretch">
        <dl className="flex min-w-0 flex-1 items-stretch divide-x divide-white/15">
          {items.map((item) => {
            const active = sameFilters(filters, item.preset)
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`${item.label}: ${item.value}${item.detail ? `. ${item.detail}` : ''}`}
                onClick={() => onPreset(active ? EMPTY_FILTERS : item.preset)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onPreset(active ? EMPTY_FILTERS : item.preset)
                  }
                }}
                data-band={item.id}
                className={`flex min-w-[5.75rem] cursor-pointer flex-col justify-center px-4 py-4 text-left outline-none transition first:pl-5 ${item.wash} ${active ? `lookout-metric-active ${item.washActive}` : ''}`}
              >
                <dt className={`flex items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.05em] ${item.tone}`}>
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} /> {item.label}
                </dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className={`tnum font-display text-[2rem] font-semibold leading-none tracking-[-0.045em] ${item.valueTone ?? item.tone}`}>{item.value}</span>
                  {item.detail && <span className={`whitespace-nowrap text-[10px] font-semibold ${item.tone}`}>{item.detail}</span>}
                </dd>
              </div>
            )
          })}
        </dl>

        <dl className="ml-4 grid w-96 shrink-0 grid-cols-5 divide-x divide-white/15 border-l border-white/15 py-4" aria-label={`${metrics.trucks} trucks, ${metrics.stopsDelivered} delivered today, ${toDeliver} to deliver, ${totalStops} total stops, ${deliveredPercent}% delivered`}>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">Trucks</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-on-accent">{metrics.trucks}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">Delivered</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-on-accent">{metrics.stopsDelivered}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">To deliver</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-on-accent">{toDeliver}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">Total stops</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-on-accent">{totalStops}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">Delivered</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-on-accent">{deliveredPercent}%</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
