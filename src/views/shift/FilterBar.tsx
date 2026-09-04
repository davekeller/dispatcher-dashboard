import { Columns, MagnifyingGlass, MapPin, X } from '@phosphor-icons/react'
import { EMPTY_FILTERS, FILTERS, isFiltering, type FilterState } from '../../filters'
import { GROUPINGS, type GroupingId } from '../../groupBy'
import Button from '../../ui/Button'
import FiltersDropdown from './FiltersDropdown'
import OrderDropdown, { BOARD_ORDERS } from './OrderDropdown'
import type { BoardSort } from './boardSort'

/** One sticky-feeling control band: order first, then scope, search, and the board lens.
 * Filters still render from FILTERS, so a live-added filter stays a one-object change. */
export default function FilterBar({ filters, onChange, sort, onSortChange, groupBy, onGroupByChange }: { filters: FilterState; onChange: (f: FilterState) => void; sort: BoardSort; onSortChange: (sort: BoardSort) => void; groupBy: GroupingId; onGroupByChange: (groupBy: GroupingId) => void }) {
  return (
    <nav aria-label="Board controls" className="relative z-20 shrink-0 border-b border-line bg-panel/95 px-5 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <OrderDropdown value={sort} onChange={onSortChange} options={BOARD_ORDERS} />
        <FiltersDropdown value={filters} onChange={onChange} />
        {isFiltering(filters) && (
          <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            <X size={12} /> Clear
          </Button>
        )}
        {FILTERS.filter((f) => f.kind === 'text').map((f) => (
          <label key={f.id} className="relative ml-auto min-w-44 flex-1 lg:max-w-56">
            <span className="sr-only">{f.label}</span>
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={(filters[f.id] as string | undefined) ?? ''} onChange={(e) => onChange({ ...filters, [f.id]: e.target.value })} placeholder={f.label} className="h-9 w-full rounded-control border border-line bg-panel pl-9 pr-3 text-[12px] text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-ink/35 focus:ring-2 focus:ring-ink/10" aria-label={f.label} />
          </label>
        ))}
        <div className="flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-panel p-1 shadow-sm" role="group" aria-label="Group columns by">
          {GROUPINGS.map((grouping) => {
            const selected = groupBy === grouping.id
            const Glyph = grouping.id === 'band' ? Columns : MapPin
            return (
              <button key={grouping.id} type="button" aria-pressed={selected} onClick={() => onGroupByChange(grouping.id)} className={`inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-semibold transition ${selected ? 'bg-well text-ink' : 'text-muted hover:text-ink'}`}>
                <Glyph size={14} weight={selected ? 'fill' : 'regular'} /> {grouping.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
