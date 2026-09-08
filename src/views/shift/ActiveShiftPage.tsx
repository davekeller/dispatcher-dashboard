import { useState } from 'react'
import { EMPTY_FILTERS, applyFilters, isFiltering, type FilterState } from '../../filters'
import { groupingById } from '../../groupBy'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import Board from './Board'
import FilterBar from './FilterBar'
import MetricsView from './MetricsView'
import ShiftHero from './ShiftHero'
import { orderBoardCards, type BoardSort } from './boardSort'

export default function ActiveShiftPage() {
  const d = useDerived()
  const groupBy = useStore((s) => s.groupBy)
  const setGroupBy = useStore((s) => s.setGroupBy)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<BoardSort>('lookout')
  const visible = orderBoardCards(applyFilters(d.ranked, d.byId, filters), d.byId, sort)
  const pick = sort === 'lookout' ? d.ranked.find((c) => c.alerts.length > 0 && !c.snoozed) ?? null : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ShiftHero metrics={d.metrics} ranked={d.ranked} filters={filters} onPreset={setFilters} />
      <FilterBar filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} groupBy={groupBy} onGroupByChange={setGroupBy} />
      <div className="min-h-0 flex-1 bg-board px-5 pb-5 pt-4">
        {visible.length === 0 && isFiltering(filters) ? (
          <EmptyState title="Nothing matches those filters." body="Every driver is hidden by the current status, data, region, or search filter." action={<Button size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>} />
        ) : groupBy === 'metrics' ? (
          <div className="h-full overflow-y-auto"><MetricsView cards={visible} d={d} filters={filters} onPreset={setFilters} /></div>
        ) : (
          <Board cards={visible} byId={d.byId} grouping={groupingById(groupBy)} pickId={pick?.driverId ?? null} filtering={isFiltering(filters)} />
        )}
      </div>
    </div>
  )
}
