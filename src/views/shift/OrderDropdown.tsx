import { CaretDown, Check, ClockCountdown, ListNumbers, Sparkle, WifiSlash, type Icon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { BoardSort } from './boardSort'

const OPTIONS: { id: BoardSort; label: string; description: string; Glyph: Icon }[] = [
  { id: 'lookout', label: 'Lookout orders each column', description: 'Urgency first, then time to violation and data freshness.', Glyph: Sparkle },
  { id: 'limit', label: 'Closest to HOS limit', description: 'Least drive time remaining appears first.', Glyph: ClockCountdown },
  { id: 'stops', label: 'Most stops remaining', description: 'Routes with the most work left appear first.', Glyph: ListNumbers },
  { id: 'data_age', label: 'Oldest data first', description: 'The least recent telematics pings appear first.', Glyph: WifiSlash },
]

export default function OrderDropdown({ value, onChange }: { value: BoardSort; onChange: (value: BoardSort) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0]
  const SelectedGlyph = selected.Glyph

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Order routes by: ${selected.label}`}
        className={`inline-flex h-9 min-w-52 items-center gap-2 rounded-control border px-3 text-[12px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lookout/30 ${value === 'lookout' ? 'iq-input-ring border-transparent text-lookout-strong hover:text-lookout' : 'border-line bg-panel text-ink hover:border-ink/25'}`}
      >
        <SelectedGlyph size={16} weight={value === 'lookout' ? 'fill' : 'regular'} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{selected.label}</span>
        <CaretDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label="Order routes by" className="absolute left-0 top-full z-40 mt-2 w-[22rem] rounded-card border border-line bg-panel p-1.5 shadow-lg">
          {OPTIONS.map((option) => {
            const Glyph = option.Glyph
            const isSelected = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_1rem] items-start gap-3 rounded-control px-3 py-2.5 text-left transition ${isSelected ? 'bg-lookout-soft/55' : 'hover:bg-canvas'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-control ${option.id === 'lookout' ? 'bg-lookout-soft text-lookout-strong' : 'bg-well text-ink'}`}>
                  <Glyph size={16} weight={isSelected ? 'fill' : 'regular'} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">{option.description}</span>
                </span>
                <span className="flex h-8 items-center justify-end">{isSelected && <Check size={15} weight="bold" className="text-lookout-strong" />}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
