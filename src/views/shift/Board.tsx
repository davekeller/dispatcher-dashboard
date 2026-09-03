import type { DriverCard } from '../../alerts/types'
import type { Grouping } from '../../groupBy'
import type { DriverView } from '../../store/view'
import EmptyState from '../../ui/EmptyState'
import RouteCard from './RouteCard'

/** Columns come from the grouping; rows are Lookout's rank. The top row of the board is
 *  therefore "the most urgent problem in each column." Each column scrolls on its own. */
export default function Board({ cards, byId, grouping, pickId }: { cards: DriverCard[]; byId: Map<string, DriverView>; grouping: Grouping; pickId: string | null }) {
  const columns = grouping.columns.map((col) => ({ ...col, cards: cards.filter((c) => grouping.keyOf(byId.get(c.driverId)!, c) === col.key) }))
  return (
    <div className="grid h-full min-h-0 gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(14rem, 1fr))` }}>
      {columns.map((col) => (
        <section key={col.key} className="flex min-h-0 flex-col rounded-card bg-well/60 p-2" aria-label={col.label}>
          <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-label">{col.label}</h2>
            <span className="tnum text-[12px] text-muted">{col.cards.length}</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {col.cards.length === 0 ? (
              <EmptyState title={`No trucks in ${col.label}`} body="Nothing here matches the current filters." />
            ) : (
              col.cards.map((c) => <RouteCard key={c.driverId} view={byId.get(c.driverId)!} card={c} pick={c.driverId === pickId} />)
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
