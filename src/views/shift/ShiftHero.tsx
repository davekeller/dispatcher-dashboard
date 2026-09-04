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
  tone?: string
  detail?: string
  detailTone?: string
}

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** A terse shift instrument ordered by intervention priority. Its five status counts
 * mirror the board lanes exactly; the over-limit count stays attached to Act now. */
export default function ShiftHero({ metrics, ranked, filters, onPreset }: { metrics: Metrics; ranked: DriverCard[]; filters: FilterState; onPreset: (filters: FilterState) => void }) {
  const count = (band: Band) => ranked.filter((card) => card.band === band).length
  const items: Metric[] = [
    { id: 'act_now', label: BAND_LABEL.act_now, value: count('act_now'), preset: { ...EMPTY_FILTERS, band: ['act_now'] }, dot: 'bg-act-now', tone: 'text-act-now', detail: `${metrics.over} over limit`, detailTone: 'text-act-now' },
    { id: 'watch', label: BAND_LABEL.watch, value: count('watch'), preset: { ...EMPTY_FILTERS, band: ['watch'] }, dot: 'bg-watch', tone: 'text-watch' },
    { id: 'break', label: BAND_LABEL.break, value: count('break'), preset: { ...EMPTY_FILTERS, band: ['break'] }, dot: 'bg-break', tone: 'text-break' },
    { id: 'offline', label: BAND_LABEL.offline, value: count('offline'), preset: { ...EMPTY_FILTERS, band: ['offline'] }, dot: 'bg-offline', tone: 'text-offline' },
    { id: 'clear', label: BAND_LABEL.clear, value: count('clear'), preset: { ...EMPTY_FILTERS, band: ['clear'] }, dot: 'bg-clear', tone: 'text-clear' },
  ]
  const toDeliver = metrics.stopsRemaining + metrics.needDriver
  const totalStops = metrics.stopsDelivered + toDeliver + metrics.stopsFailed
  const deliveredPercent = totalStops === 0 ? 100 : Math.round((metrics.stopsDelivered / totalStops) * 100)

  return (
    <section className="iq-metrics-band shrink-0 border-b border-ink/10 px-5 py-4 text-ink" aria-label="Shift status">
      <div className="flex min-w-[46rem] items-stretch">
        <dl className="flex min-w-0 flex-1 items-stretch divide-x divide-ink/10">
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
                className={`min-w-[5.75rem] cursor-pointer px-4 py-1 text-left outline-none transition first:pl-0 hover:bg-panel/35 focus-visible:bg-panel/55 ${active ? 'iq-metric-active bg-panel/45' : ''}`}
              >
                <dt className={`flex items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.05em] ${item.tone ?? 'text-label'}`}>
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} /> {item.label}
                </dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className={`tnum font-display text-[2rem] font-semibold leading-none tracking-[-0.045em] ${item.tone ?? 'text-ink'}`}>{item.value}</span>
                  {item.detail && <span className={`whitespace-nowrap text-[10px] font-semibold ${item.detailTone ?? 'text-muted'}`}>{item.detail}</span>}
                </dd>
              </div>
            )
          })}
        </dl>

        <dl className="ml-4 grid w-80 shrink-0 grid-cols-4 divide-x divide-ink/10 border-l border-ink/10" aria-label={`${metrics.stopsDelivered} delivered today, ${toDeliver} to deliver, ${totalStops} total stops, ${deliveredPercent}% delivered`}>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Delivered</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-ink">{metrics.stopsDelivered}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-label">To deliver</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-ink">{toDeliver}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Total stops</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-ink">{totalStops}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3">
            <dt className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Delivered</dt>
            <dd className="tnum mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-ink">{deliveredPercent}%</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
