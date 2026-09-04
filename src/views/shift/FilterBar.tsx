import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { EMPTY_FILTERS, FILTERS, isFiltering, type FilterState } from '../../filters'
import Button from '../../ui/Button'
import Dropdown from '../../ui/Dropdown'

/** One row: a dropdown per multi filter, search at the right end. Renders whatever FILTERS holds;
 *  adding a filter is one object in src/filters.ts. */
export default function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  return (
    <div className="flex items-center gap-2">
      {FILTERS.filter((f) => f.kind === 'multi').map((f) => (
        <Dropdown key={f.id} label={f.label} options={f.options ?? []} value={(filters[f.id] as string[] | undefined) ?? []} onChange={(v) => onChange({ ...filters, [f.id]: v })} />
      ))}
      {isFiltering(filters) && (
        <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <X size={12} /> Clear
        </Button>
      )}
      {FILTERS.filter((f) => f.kind === 'text').map((f) => (
        <label key={f.id} className="ml-auto flex h-8 items-center gap-1.5 rounded-control border border-line bg-panel px-2 text-[12px] focus-within:border-ink/50">
          <MagnifyingGlass size={14} className="text-muted" />
          <input value={(filters[f.id] as string | undefined) ?? ''} onChange={(e) => onChange({ ...filters, [f.id]: e.target.value })} placeholder={f.label} className="w-48 bg-transparent outline-none placeholder:text-muted" aria-label={f.label} />
        </label>
      ))}
    </div>
  )
}
