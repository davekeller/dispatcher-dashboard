import { ArrowCounterClockwise, CaretDown, Clock } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { ANCHOR, MIN } from '../time/clock'
import { fmtClock } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'

const SCRUB_MAX_MIN = 240
const SCRUB_STEP_MIN = 5

/** The simulated shift, as one button in the product bar. It opens a panel anchored under
 *  it that says plainly what this is, lets anyone scrub or fast-forward the day, and
 *  explains each demo action in a sentence. ⌘. opens it too. */
export default function SimulatedShift() {
  const open = useStore((s) => s.devOpen)
  const toggle = useStore((s) => s.toggleDev)
  const scrubOffsetMs = useStore((s) => s.scrubOffsetMs)
  const scrub = useStore((s) => s.scrub)
  const setScrubOffset = useStore((s) => s.setScrubOffset)
  const resetClock = useStore((s) => s.resetClock)
  const resetFleet = useStore((s) => s.resetFleet)
  const bringOnline = useStore((s) => s.bringOnline)
  const markDeparted = useStore((s) => s.markDeparted)
  const undo = useStore((s) => s.undo)
  const canUndo = useStore((s) => s.undoSnapshot !== undefined)
  const { now, byId } = useDerived()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape' && open) toggle()
    }
    const onDown = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) toggle()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, toggle])

  const dre = byId.get('drv-03')
  const marcus = byId.get('drv-01')
  const offsetMin = Math.round(scrubOffsetMs / MIN)
  const ticks = [0, 60, 120, 180, 240]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Simulated shift: click to scrub the day and try the demo actions (⌘.)"
        className={`flex h-9 items-center gap-2 rounded-control border px-3 text-[13px] transition ${open ? 'border-ink bg-well' : 'border-line bg-panel hover:bg-well'}`}
      >
        <Clock size={16} weight="duotone" className="text-lookout" />
        <span className="tnum font-semibold text-ink">{fmtClock(now)}</span>
        <span className="text-muted">Simulated shift</span>
        <CaretDown size={12} className="text-muted" />
      </button>

      {open && (
        <div role="dialog" aria-label="Simulated shift" className="absolute right-0 top-full z-40 mt-2 w-[26rem] rounded-card border border-line bg-panel p-4 shadow-card">
          <p className="font-display text-[15px] font-semibold text-ink">This is a simulated shift.</p>
          <p className="mt-1 text-[12px] leading-snug text-muted">
            A typical day for a fleet of 50 trucks, pinned to 2:47 PM so everyone sees the same scenario. The clock is live: it ticks, every countdown is computed from it, and you can scrub or fast-forward to watch the shift unfold. Nothing here is a recording.
          </p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-label">Time of day</span>
              <span className="tnum text-[12px] font-semibold text-ink">{fmtClock(now)}{offsetMin > 0 ? <span className="font-normal text-muted"> · +{offsetMin} min</span> : ''}</span>
            </div>
            <input
              type="range"
              min={0}
              max={SCRUB_MAX_MIN}
              step={SCRUB_STEP_MIN}
              value={Math.min(SCRUB_MAX_MIN, offsetMin)}
              onChange={(e) => setScrubOffset(Number(e.target.value) * MIN)}
              aria-label="Scrub the simulated clock"
              className="mt-2 w-full accent-lookout"
            />
            <div className="tnum mt-1 flex justify-between text-[10px] text-label">
              {ticks.map((t) => <span key={t}>{fmtClock(ANCHOR + t * MIN)}</span>)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={() => scrub(15 * MIN)}>+15 min</Button>
              <Button size="sm" onClick={() => scrub(60 * MIN)}>+1 hour</Button>
              <Button size="sm" variant="ghost" onClick={resetClock} disabled={scrubOffsetMs === 0}><ArrowCounterClockwise size={12} /> Back to 2:47 PM</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted">The fleet keeps moving as the clock runs; the planted scenarios (Marcus, Priya, Dre and the others) hold still so the demo always finds them.</p>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-label">Try these</span>
            <ul className="mt-2 flex flex-col gap-2">
              <Try label="Bring Dre online" onClick={() => bringOnline('drv-03')} disabled={!dre || dre.staleness === 'fresh'}>
                Dre W. has been dark for 25 minutes. Reconnect him and watch his estimate correct itself, out loud, from about 40 minutes to an hour.
              </Try>
              <Try label="Advance Marcus a stop" onClick={() => marcus?.next && markDeparted(marcus.next.id, 'delivered')} disabled={!marcus?.next}>
                Complete Marcus R.'s next stop. His route, his drift, and his alerts recompute.
              </Try>
              <Try label="Undo" onClick={undo} disabled={!canUndo}>
                Reverse the last action, whatever it was.
              </Try>
              <Try label="Reset the shift" onClick={resetFleet}>
                Back to 2:47 PM with the original fleet.
              </Try>
            </ul>
          </div>
          <p className="mt-3 text-[10px] text-label">⌘. opens and closes this panel.</p>
        </div>
      )}
    </div>
  )
}

function Try({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Button size="sm" onClick={onClick} disabled={disabled} className="w-40 shrink-0 justify-start">{label}</Button>
      <p className="text-[11px] leading-snug text-muted">{children}</p>
    </li>
  )
}
