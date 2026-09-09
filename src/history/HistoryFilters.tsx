import { MagnifyingGlass } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { multi, type FilterState } from '../filters'
import { HISTORY_FILTERS } from './filters'

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`h-6 rounded-full border px-2 text-[11px] font-semibold leading-none transition ${selected ? 'border-transparent bg-nav-selected-ink text-on-accent' : 'border-line bg-panel text-muted hover:bg-well hover:text-ink'}`}>
      {children}
    </button>
  )
}

/** Renders whatever HISTORY_FILTERS holds: text filters as a search box, multi filters as a chip row with All. */
export default function HistoryFilters({ filters, onChange, shown, total }: { filters: FilterState; onChange: (next: FilterState) => void; shown: number; total: number }) {
  const count = shown === total ? `${total} ${total === 1 ? 'entry' : 'entries'}` : `${shown} of ${total}`
  return (
    <div className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 border-b border-line bg-panel/90 px-3 py-2 backdrop-blur">
      {HISTORY_FILTERS.filter((f) => f.kind === 'text').map((f) => (
        <label key={f.id} className="relative block">
          <span className="sr-only">{f.label}</span>
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={(filters[f.id] as string | undefined) ?? ''} onChange={(e) => onChange({ ...filters, [f.id]: e.target.value })} placeholder={f.label} className="h-8 w-full rounded-control border border-line bg-panel pl-8 pr-2.5 text-[12px] text-ink outline-none transition placeholder:text-muted focus:border-ink/35 focus:ring-2 focus:ring-ink/10" />
        </label>
      ))}
      {HISTORY_FILTERS.filter((f) => f.kind === 'multi').map((f) => {
        const chosen = multi(filters[f.id])
        const toggle = (value: string) => onChange({ ...filters, [f.id]: chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value] })
        return (
          <div key={f.id} role="group" aria-label={f.label} className="flex flex-wrap items-center gap-1">
            <FilterChip selected={chosen.length === 0} onClick={() => onChange({ ...filters, [f.id]: [] })}>All</FilterChip>
            {f.options?.map((o) => <FilterChip key={o.value} selected={chosen.includes(o.value)} onClick={() => toggle(o.value)}>{o.label}</FilterChip>)}
            <span className="tnum ml-auto text-[10px] text-muted">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
