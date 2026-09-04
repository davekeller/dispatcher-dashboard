import { CaretLeft } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { DriverCard } from '../../alerts/types'
import { BAND_ORDER, type Band } from '../../bands'
import type { Grouping } from '../../groupBy'
import type { DriverView } from '../../store/view'
import EmptyState from '../../ui/EmptyState'
import { BAND_TONE } from '../../ui/tones'
import RouteCard from './RouteCard'
import { useColumnTracks } from './useColumnTracks'

/** Columns come from the grouping; rows are Lookout's rank. The top row of the board is
 *  therefore "the most urgent problem in each column." Quiet tail columns start as rails;
 *  every column can collapse, and expanded columns share the remaining width smoothly. */
export default function Board({ cards, byId, grouping, pickId, filtering = false }: { cards: DriverCard[]; byId: Map<string, DriverView>; grouping: Grouping; pickId: string | null; filtering?: boolean }) {
  const columns = grouping.columns.map((col) => ({ ...col, cards: cards.filter((c) => grouping.keyOf(byId.get(c.driverId)!, c) === col.key) }))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ break: false, clear: false })
  useEffect(() => {
    setExpanded(grouping.id === 'band' ? { break: false, clear: false } : {})
  }, [grouping.id])
  const isExpanded = (key: string) => expanded[key] !== false
  const tracks = useColumnTracks(columns.map((column) => {
    if (!isExpanded(column.key)) return null
    if (grouping.id !== 'band') return 1
    if (column.key === 'act_now') return 1.25
    if (column.key === 'watch') return 1.1
    return 1
  }))
  const isBand = (key: string): key is Band => BAND_ORDER.includes(key as Band)
  const wash = (key: string) => grouping.id === 'band' && isBand(key) ? BAND_TONE[key].board ?? BAND_TONE[key].soft : 'bg-panel'
  const labelTone = (key: string) => grouping.id === 'band' && isBand(key) ? BAND_TONE[key].text : 'text-ink'

  return (
    <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-1">
      <div ref={tracks.ref} className="grid h-full min-w-[46rem] items-start gap-3" style={{ gridTemplateColumns: tracks.tracks, transition: tracks.transition }}>
        {columns.map((col) => {
          const open = isExpanded(col.key)
          return (
            <section key={col.key} className="relative flex h-full min-h-0 min-w-0 flex-col overflow-x-clip" aria-label={col.label}>
              {open ? (
                <div className="lane-content-enter flex min-h-0 flex-1 flex-col">
                  <header className={`mb-2.5 flex shrink-0 items-center gap-2 rounded-control px-3 py-2 ${wash(col.key)}`}>
                    <span className={`h-2 w-2 rounded-full ${grouping.id === 'band' && isBand(col.key) ? BAND_TONE[col.key].fill : 'bg-offline-fill'}`} aria-hidden="true" />
                    <h2 className={`min-w-0 truncate text-[12px] font-semibold ${labelTone(col.key)}`}>{col.label}</h2>
                    <span className="tnum ml-auto rounded-full bg-panel/80 px-2 py-0.5 text-[10px] font-semibold text-ink/80">{col.cards.length}</span>
                    <button type="button" onClick={() => setExpanded((state) => ({ ...state, [col.key]: false }))} aria-expanded="true" aria-label={`Collapse ${col.label}`} title={`Collapse ${col.label}`} className="shrink-0 rounded-[6px] p-0.5 text-muted transition hover:bg-panel/70 hover:text-ink">
                      <CaretLeft size={14} />
                    </button>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
                    {col.cards.length === 0 ? (
                      <EmptyState title={grouping.id === 'band' ? `No routes in ${col.label.toLowerCase()}` : `No routes in ${col.label}`} body={filtering ? 'Nothing here matches the current filters.' : grouping.id === 'band' ? 'Nothing needs you here right now.' : 'No routes are assigned here.'} />
                    ) : (
                      col.cards.map((card) => <RouteCard key={card.driverId} view={byId.get(card.driverId)!} card={card} pick={card.driverId === pickId} />)
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpanded((state) => ({ ...state, [col.key]: true }))}
                  aria-expanded="false"
                  title={`${col.label} — ${col.cards.length} route${col.cards.length === 1 ? '' : 's'}. Expand.`}
                  className={`lane-content-enter flex h-56 w-full shrink-0 flex-col items-center gap-2 rounded-control py-2.5 transition hover:brightness-[.97] ${wash(col.key)}`}
                >
                  <span className="tnum rounded-full bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-ink shadow-sm">{col.cards.length}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] [writing-mode:vertical-rl] ${labelTone(col.key)}`}>{col.label}</span>
                  <CaretLeft size={14} className="mt-auto rotate-180 text-muted/70" />
                </button>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
