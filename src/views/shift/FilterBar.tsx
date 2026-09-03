import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { EMPTY_FILTERS, FILTERS, isFiltering, type FilterState } from '../../filters'
import Button from '../../ui/Button'

/** Renders whatever FILTERS holds. Adding a filter is one object in src/filters.ts. */
export default function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  const toggle = (id: string, value: string) => {
    const current = (filters[id] as string[] | undefined) ?? []
    onChange({ ...filters, [id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {FILTERS.filter((f) => f.kind === 'multi').map((f) => (
        <div key={f.id} className="flex items-center gap-1.5" role="group" aria-label={f.label}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-label">{f.label}</span>
          {f.options!.map((o) => {
            const on = ((filters[f.id] as string[] | undefined) ?? []).includes(o.value)
            return (
              <button key={o.value} type="button" onClick={() => toggle(f.id, o.value)} aria-pressed={on} className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition ${on ? 'border-ink bg-ink text-on-accent' : 'border-line bg-panel text-muted hover:border-ink/40 hover:text-ink'}`}>
                {o.label}
              </button>
            )
          })}
        </div>
      ))}
      {FILTERS.filter((f) => f.kind === 'text').map((f) => (
        <label key={f.id} className="flex items-center gap-1.5 rounded-control border border-line bg-panel px-2 py-1 text-[12px] focus-within:border-ink/50">
          <MagnifyingGlass size={14} className="text-muted" />
          <input value={(filters[f.id] as string | undefined) ?? ''} onChange={(e) => onChange({ ...filters, [f.id]: e.target.value })} placeholder={f.label} className="w-44 bg-transparent outline-none placeholder:text-muted" aria-label={f.label} />
        </label>
      ))}
      {isFiltering(filters) && (
        <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <X size={12} /> Clear filters
        </Button>
      )}
    </div>
  )
}
