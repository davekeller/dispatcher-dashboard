import { useMemo, useState } from 'react'
import { type FilterState } from '../filters'
import { fmtClock, fmtHour } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import HistoryCard from './HistoryCard'
import HistoryFilters from './HistoryFilters'
import { historyFeed, groupByHour, type HistoryItem } from './derive'
import { EMPTY_HISTORY_FILTERS, applyHistoryFilters, isFilteringHistory } from './filters'

/** The node on the spine. Her actions are ink; a marker wears the state it announced, hollow. */
function nodeClass(item: HistoryItem): string {
  if (item.kind === 'card') return 'bg-ink'
  if (item.tone === 'over') return 'bg-act-now'
  if (item.tone === 'act_now') return 'border-2 border-act-now bg-panel'
  if (item.tone === 'went_dark') return 'border-2 border-dashed border-offline bg-panel'
  return 'border-2 border-line bg-panel'
}

/** The shift's record: what she did, with what was true when she did it, and what the shift did around her. */
export default function HistoryPanel() {
  const events = useStore((s) => s.events)
  const d = useDerived()
  const [filters, setFilters] = useState<FilterState>(EMPTY_HISTORY_FILTERS)
  const feed = useMemo(() => historyFeed(events, d), [events, d])
  const shown = useMemo(() => applyHistoryFilters(feed, filters), [feed, filters])
  const groups = groupByHour(shown)
  const filtering = isFilteringHistory(filters)
  const actions = feed.filter((i) => i.kind === 'card').length
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto font-lookout">
      <HistoryFilters filters={filters} onChange={setFilters} shown={shown.length} total={feed.length} />
      <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
        {actions === 0 && !filtering && <EmptyState title="Nothing from you yet." body="Every reassignment, reset, call, and note you make this shift lands here, with what was true when you did it." />}
        {groups.length === 0 && <EmptyState title="Nothing matches." action={<Button size="sm" onClick={() => setFilters(EMPTY_HISTORY_FILTERS)}>Clear filters</Button>} />}
        {groups.map((g) => (
          <section key={g.hourStart} aria-label={fmtHour(g.hourStart)}>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-label">{fmtHour(g.hourStart)}</h3>
            <ol>
              {g.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[3.25rem_1rem_1fr] gap-x-1.5">
                  <span className="tnum pt-[3px] text-right text-[10px] leading-4 text-muted">{item.kind === 'marker' && item.estimated ? '~' : ''}{fmtClock(item.at)}</span>
                  <span className="relative flex justify-center" aria-hidden="true">
                    <span className="absolute bottom-0 top-0 w-px bg-line" />
                    <span className={`relative z-10 mt-[6px] h-2 w-2 rounded-full ${nodeClass(item)}`} />
                  </span>
                  <div className="min-w-0 pb-2">
                    {item.kind === 'card' ? <HistoryCard item={item} d={d} /> : <p className={`pt-[3px] text-[11px] leading-4 ${item.tone === 'neutral' ? 'text-muted' : 'text-ink'}`}>{item.label}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
