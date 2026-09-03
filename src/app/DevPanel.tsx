import { useEffect } from 'react'
import { MIN } from '../time/clock'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'

/** Hidden behind ⌘. and the wrench. Exists so any alert can be fired on demand during a
 *  walkthrough. The scrubber advances the clock, not the world: stops don't complete themselves. */
export default function DevPanel() {
  const open = useStore((s) => s.devOpen)
  const toggle = useStore((s) => s.toggleDev)
  const scrub = useStore((s) => s.scrub)
  const resetClock = useStore((s) => s.resetClock)
  const resetFleet = useStore((s) => s.resetFleet)
  const bringOnline = useStore((s) => s.bringOnline)
  const markDeparted = useStore((s) => s.markDeparted)
  const undo = useStore((s) => s.undo)
  const scrubOffsetMs = useStore((s) => s.scrubOffsetMs)
  const { byId } = useDerived()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  if (!open) return null
  const dre = byId.get('drv-03')
  const marcus = byId.get('drv-01')
  return (
    <aside className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-card border border-line bg-panel px-3 py-2 shadow-card" aria-label="Dev controls">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-label">Dev</span>
      <Button size="sm" onClick={() => scrub(15 * MIN)}>+15m</Button>
      <Button size="sm" onClick={() => scrub(60 * MIN)}>+1h</Button>
      <Button size="sm" onClick={resetClock} disabled={scrubOffsetMs === 0}>Reset clock</Button>
      <span className="h-5 w-px bg-line" />
      <Button size="sm" onClick={() => bringOnline('drv-03')} disabled={!dre || dre.staleness === 'fresh'}>Bring Dre online</Button>
      <Button size="sm" onClick={() => marcus?.next && markDeparted(marcus.next.id, 'delivered')} disabled={!marcus?.next}>Advance Marcus a stop</Button>
      <span className="h-5 w-px bg-line" />
      <Button size="sm" onClick={undo}>Undo</Button>
      <Button size="sm" variant="ghost" onClick={resetFleet}>Reset data</Button>
      <span className="ml-1 text-[11px] text-muted">The scrubber advances the clock, not the world.</span>
    </aside>
  )
}
