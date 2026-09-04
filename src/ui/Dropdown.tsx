import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

/** A compact multi-select: a button that opens a checkbox list. Closes on outside click or Escape. */
export default function Dropdown({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const active = value.length > 0
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-[12px] font-semibold transition ${active ? 'border-ink bg-ink text-on-accent' : 'border-line bg-panel text-ink hover:bg-well'}`}
      >
        {label}
        {active && <span className="tnum rounded-full bg-on-accent/25 px-1.5 text-[10px] leading-4">{value.length}</span>}
        <CaretDown size={12} />
      </button>
      {open && (
        <ul role="listbox" aria-multiselectable="true" aria-label={label} className="absolute left-0 top-full z-30 mt-1 min-w-44 rounded-card border border-line bg-panel p-1 shadow-card">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={value.includes(o.value)}>
              <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[12px] hover:bg-well">
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} className="accent-ink" />
                {o.label}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
