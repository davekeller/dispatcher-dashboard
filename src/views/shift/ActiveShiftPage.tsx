import { useState } from 'react'
import { EMPTY_FILTERS, applyFilters, isFiltering, type FilterState } from '../../filters'
import { groupingById } from '../../groupBy'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import Board from './Board'
import FilterBar from './FilterBar'
import MetricsRow from './MetricsRow'

export default function ActiveShiftPage() {
  const d = useDerived()
  const groupBy = useStore((s) => s.groupBy)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const visible = applyFilters(d.ranked, d.byId, filters)
  const pick = d.ranked.find((c) => c.alerts.length > 0 && !c.snoozed) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <MetricsRow metrics={d.metrics} filters={filters} onPreset={setFilters} />
      <FilterBar filters={filters} onChange={setFilters} />
      <div className="min-h-0 flex-1">
        {visible.length === 0 && isFiltering(filters) ? (
          <EmptyState title="Nothing matches those filters." body="Every driver is hidden by the current status, data, region, or search filter." action={<Button size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>} />
        ) : (
          <Board cards={visible} byId={d.byId} grouping={groupingById(groupBy)} pickId={pick?.driverId ?? null} />
        )}
      </div>
    </div>
  )
}
