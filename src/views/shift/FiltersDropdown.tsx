import { CaretDown, CaretLeft, Funnel } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { FILTERS, type FilterDef, type FilterState } from '../../filters'

/** What the menu needs from a filter: the board passes FILTERS, the reassign picker its own groups. */
export type FilterGroup = Pick<FilterDef, 'id' | 'label' | 'kind' | 'options'>

export interface FiltersCopy {
  all: string
  aria: string
  title: string
  hint: string
}

export const BOARD_FILTER_COPY: FiltersCopy = { all: 'All routes', aria: 'Routes shown', title: 'Filter routes', hint: 'Combine alerts, status, data quality, and region.' }

/** Board columns the menu can open and close: their state by column key, and which filter groups are columns. */
export interface ColumnControls {
  openState: Record<string, boolean>
  onOpenChange: (key: string, open: boolean) => void
  groupIds: string[]
}

export default function FiltersDropdown({ value, onChange, filters = FILTERS, copy = BOARD_FILTER_COPY, columns }: { value: FilterState; onChange: (value: FilterState) => void; filters?: FilterGroup[]; copy?: FiltersCopy; columns?: ColumnControls }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const multiFilters = filters.filter((filter) => filter.kind === 'multi')
  const selectedCount = multiFilters.reduce((count, filter) => count + ((value[filter.id] as string[] | undefined)?.length ?? 0), 0)
  const selectedOption = multiFilters.flatMap((filter) => filter.options ?? []).find((option) => multiFilters.some((filter) => ((value[filter.id] as string[] | undefined) ?? []).includes(option.value)))
  const buttonLabel = selectedCount === 0 ? copy.all : selectedCount === 1 ? selectedOption?.label ?? '1 filter' : `${selectedCount} filters`

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (filterId: string, option: string) => {
    const current = (value[filterId] as string[] | undefined) ?? []
    const selecting = !current.includes(option)
    onChange({ ...value, [filterId]: selecting ? [...current, option] : current.filter((item) => item !== option) })
    // Choosing a column's row opens that column: the filter and the board should agree on what she is looking at.
    if (selecting && columns?.groupIds.includes(filterId)) columns.onOpenChange(option, true)
  }

  const clear = () => {
    const next = { ...value }
    multiFilters.forEach((filter) => { next[filter.id] = [] })
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${copy.aria}: ${buttonLabel}`} className={`inline-flex h-9 items-center gap-2 rounded-control border px-3 text-[12px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 ${selectedCount > 0 ? 'border-ink/25 bg-well text-ink' : 'border-line bg-panel text-ink hover:border-ink/20'}`}>
        <Funnel size={14} weight={selectedCount > 0 ? 'fill' : 'regular'} />
        {buttonLabel}
        <CaretDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute left-0 top-full z-40 mt-2 overflow-hidden rounded-card border border-line bg-panel shadow-lg ${columns ? 'w-[30rem]' : multiFilters.length >= 3 ? 'w-[32rem]' : 'w-[24rem]'}`}>
          {/* A title row, a divider, then the fields: the menu reads as a small form, not a pile of checkboxes. */}
          <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-[14px] font-semibold leading-tight text-ink">{copy.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">{copy.hint}</p>
            </div>
            {selectedCount > 0 && <button type="button" onClick={clear} className="shrink-0 text-[11px] font-semibold text-muted hover:text-ink">Clear all</button>}
          </div>
          <div className={columns ? 'flex flex-col divide-y divide-line' : 'grid divide-x divide-line p-2'} style={columns ? undefined : { gridTemplateColumns: `repeat(${multiFilters.length}, minmax(0, 1fr))` }}>
            {multiFilters.map((filter) => {
              const isColumns = columns?.groupIds.includes(filter.id) ?? false
              return (
                <fieldset key={filter.id} className={columns ? 'min-w-0 px-4 py-3' : 'min-w-0 px-2 pt-1 first:pl-2 last:pr-2'}>
                  <legend className="mb-1.5 w-full px-1 text-[9px] font-semibold uppercase tracking-[0.05em] text-label">{filter.label}{isColumns ? <span className="ml-1.5 font-medium normal-case tracking-normal text-muted">· columns</span> : null}</legend>
                  <div className={isColumns ? 'flex flex-col gap-0.5' : columns ? 'flex flex-wrap gap-1' : 'flex flex-col gap-0.5'}>
                    {(filter.options ?? []).map((option) => {
                      const selected = ((value[filter.id] as string[] | undefined) ?? []).includes(option.value)
                      const open = columns ? columns.openState[option.value] !== false : true
                      if (isColumns && columns) {
                        return (
                          <div key={option.value} className={`flex items-center gap-2 rounded-control px-2 py-1 text-[11px] transition ${selected ? 'bg-well font-semibold text-ink' : 'text-ink hover:bg-canvas'}`}>
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={selected} onChange={() => toggle(filter.id, option.value)} className="accent-ink" />
                              <span className="truncate">{option.label}</span>
                            </label>
                            <button type="button" onClick={() => columns.onOpenChange(option.value, !open)} aria-pressed={open} aria-label={`${open ? 'Collapse' : 'Expand'} the ${option.label} column`} title={open ? 'Collapse this column' : 'Expand this column'} className={`inline-flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[10px] font-semibold transition ${open ? 'text-muted hover:bg-well hover:text-ink' : 'bg-nav-selected text-nav-selected-ink hover:bg-nav-selected/70'}`}>
                              <CaretLeft size={11} weight="bold" className={open ? '' : 'rotate-180'} />
                              {open ? 'Open' : 'Collapsed'}
                            </button>
                          </div>
                        )
                      }
                      return (
                        <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[11px] transition ${selected ? 'bg-well font-semibold text-ink' : 'text-ink hover:bg-canvas'}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggle(filter.id, option.value)} className="accent-ink" />
                          <span className="truncate">{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
