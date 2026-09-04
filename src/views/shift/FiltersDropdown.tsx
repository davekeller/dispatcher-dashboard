import { CaretDown, Funnel } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { FILTERS, type FilterState } from '../../filters'

const MULTI_FILTERS = FILTERS.filter((filter) => filter.kind === 'multi')

export default function FiltersDropdown({ value, onChange }: { value: FilterState; onChange: (value: FilterState) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedCount = MULTI_FILTERS.reduce((count, filter) => count + ((value[filter.id] as string[] | undefined)?.length ?? 0), 0)
  const selectedOption = MULTI_FILTERS.flatMap((filter) => filter.options ?? []).find((option) => MULTI_FILTERS.some((filter) => ((value[filter.id] as string[] | undefined) ?? []).includes(option.value)))
  const buttonLabel = selectedCount === 0 ? 'All routes' : selectedCount === 1 ? selectedOption?.label ?? '1 filter' : `${selectedCount} filters`

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
    onChange({ ...value, [filterId]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option] })
  }

  const clear = () => {
    const next = { ...value }
    MULTI_FILTERS.forEach((filter) => { next[filter.id] = [] })
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} aria-label={`Routes shown: ${buttonLabel}`} className={`inline-flex h-9 items-center gap-2 rounded-control border px-3 text-[12px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 ${selectedCount > 0 ? 'border-ink/25 bg-well text-ink' : 'border-line bg-panel text-ink hover:border-ink/20'}`}>
        <Funnel size={14} weight={selectedCount > 0 ? 'fill' : 'regular'} />
        {buttonLabel}
        <CaretDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[32rem] rounded-card border border-line bg-panel p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div>
              <p className="text-[11px] font-semibold text-ink">Filter routes</p>
              <p className="text-[10px] text-muted">Combine status, data quality, and region.</p>
            </div>
            {selectedCount > 0 && <button type="button" onClick={clear} className="text-[11px] font-semibold text-muted hover:text-ink">Clear all</button>}
          </div>
          <div className="grid grid-cols-3 divide-x divide-line">
            {MULTI_FILTERS.map((filter) => (
              <fieldset key={filter.id} className="min-w-0 px-2 first:pl-2 last:pr-2">
                <legend className="mb-1 w-full px-1 text-[9px] font-semibold uppercase tracking-[0.05em] text-label">{filter.label}</legend>
                <div className="flex flex-col gap-0.5">
                  {(filter.options ?? []).map((option) => {
                    const selected = ((value[filter.id] as string[] | undefined) ?? []).includes(option.value)
                    return (
                      <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[11px] transition ${selected ? 'bg-well font-semibold text-ink' : 'text-ink hover:bg-canvas'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggle(filter.id, option.value)} className="accent-ink" />
                        <span className="truncate">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
