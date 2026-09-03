import type { FilterState } from '../../filters'
import { EMPTY_FILTERS } from '../../filters'
import type { Metrics } from '../../store/derive'
import Card from '../../ui/Card'

interface Metric {
  id: string
  label: string
  value: string
  sub?: string
  preset: FilterState
  tone?: string
}

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Fleet-wide state in one row. Every card is a filter shortcut; the numbers derive from
 *  the same views the board renders, so they can never disagree with it. */
export default function MetricsRow({ metrics, filters, onPreset }: { metrics: Metrics; filters: FilterState; onPreset: (f: FilterState) => void }) {
  const items: Metric[] = [
    { id: 'onShift', label: 'On shift', value: String(metrics.onShift), preset: EMPTY_FILTERS },
    { id: 'approaching', label: 'Approaching limit', value: String(metrics.approaching), preset: { ...EMPTY_FILTERS, band: ['act_now', 'watch'] }, tone: metrics.approaching > 0 ? 'text-watch' : undefined },
    { id: 'over', label: 'Over limit', value: String(metrics.over), preset: { ...EMPTY_FILTERS, band: ['act_now'] }, tone: metrics.over > 0 ? 'text-act-now' : undefined },
    { id: 'offline', label: 'Offline', value: String(metrics.offline), preset: { ...EMPTY_FILTERS, freshness: ['offline'] }, tone: metrics.offline > 0 ? 'text-offline' : undefined },
    { id: 'stops', label: 'Stops', value: `${metrics.stopsDone} / ${metrics.stopsRemaining}`, sub: 'done · remaining', preset: EMPTY_FILTERS },
  ]
  if (metrics.needDriver > 0) items.push({ id: 'needDriver', label: 'Need a driver', value: String(metrics.needDriver), sub: 'stops after a reset', preset: EMPTY_FILTERS, tone: 'text-break' })

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((m) => {
        const active = sameFilters(filters, m.preset) && m.id !== 'onShift' && m.id !== 'stops' && m.id !== 'needDriver'
        return (
          <Card key={m.id} role="button" tabIndex={0} onClick={() => onPreset(active ? EMPTY_FILTERS : m.preset)} onKeyDown={(e) => e.key === 'Enter' && onPreset(active ? EMPTY_FILTERS : m.preset)} className={`cursor-pointer px-4 py-3 transition hover:shadow-md ${active ? 'ring-2 ring-ink/70' : ''}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{m.label}</p>
            <p className={`tnum mt-1 font-display text-3xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</p>
            {m.sub && <p className="mt-1 text-[11px] text-muted">{m.sub}</p>}
          </Card>
        )
      })}
    </div>
  )
}
