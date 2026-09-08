import { ArrowCounterClockwise, CaretDown, Clock, SunHorizon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { ANCHOR, DAY_END, DAY_START, MIN } from '../time/clock'
import { fmtClock } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'

const SCRUB_STEP_MIN = 5
const DAY_MIN = (DAY_END - DAY_START) / MIN
const TICKS = [0, 120, 240, 360, 480, 600, 720] // every two hours across the twelve-hour day
const ANCHOR_PCT = ((ANCHOR - DAY_START) / (DAY_END - DAY_START)) * 100

function fmtOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h > 0 ? `${h}h ${m}m` : `${m} min`}`
}

/** The simulated shift, as one button in the product bar. Its panel says what this is, lets
 *  anyone scrub the day, play it against the real clock, or reset the shift. ⌘. opens it too. */
export default function SimulatedShift() {
  const open = useStore((s) => s.devOpen)
  const toggle = useStore((s) => s.toggleDev)
  const scrubOffsetMs = useStore((s) => s.scrubOffsetMs)
  const setClock = useStore((s) => s.setClock)
  const liveClock = useStore((s) => s.liveClock)
  const setLiveClock = useStore((s) => s.setLiveClock)
  const resetFleet = useStore((s) => s.resetFleet)
  const { now } = useDerived()
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

  const offsetMin = Math.round(scrubOffsetMs / MIN)
  const dayMin = Math.min(DAY_MIN, Math.max(0, Math.round((now - DAY_START) / MIN)))
  const outsideDay = now < DAY_START || now > DAY_END

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Simulated shift: click to scrub the day (⌘.)"
        className={`flex h-9 items-center gap-2 rounded-control border px-3 text-[13px] transition ${open ? 'border-ink bg-well' : 'border-line bg-panel hover:bg-well'}`}
      >
        <Clock size={16} weight="duotone" className="text-ink" />
        <span className="tnum font-semibold text-ink">{fmtClock(now)}</span>
        <span className="text-muted">{liveClock ? 'Real time' : 'Simulated shift'}</span>
        <CaretDown size={12} className="text-muted" />
      </button>

      {open && (
        <div role="dialog" aria-label="Simulated shift" className="absolute right-0 top-full z-40 mt-2 w-[22rem] rounded-card border border-line bg-panel shadow-card">
          <div className="flex items-start gap-3 px-4 pt-4">
            <SunHorizon size={22} weight="duotone" className="mt-px shrink-0 text-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold leading-tight text-ink">Simulated shift</p>
              <p className="mt-1 text-[12px] leading-snug text-muted">A typical day for 50 trucks, pinned to 2:47 PM so everyone sees the same scenario. The clock ticks, and every countdown is computed from it.</p>
            </div>
          </div>

          <div className="mt-4 border-t border-line px-4 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-label">Time of day</span>
              <span className="tnum text-[12px] font-semibold text-ink">{fmtClock(now)}{liveClock ? <span className="font-normal text-muted"> · real time</span> : offsetMin !== 0 ? <span className="font-normal text-muted"> · {fmtOffset(offsetMin)} from 2:47</span> : ''}</span>
            </div>
            <div className="relative mt-2">
              <span aria-hidden="true" title="2:47 PM, where the shift is pinned" className="pointer-events-none absolute -top-1.5 h-2 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${ANCHOR_PCT}%` }} />
              <input
                type="range"
                min={0}
                max={DAY_MIN}
                step={SCRUB_STEP_MIN}
                value={dayMin}
                onChange={(e) => setClock(DAY_START + Number(e.target.value) * MIN)}
                disabled={liveClock}
                aria-label="Scrub the simulated clock across the day"
                aria-valuetext={fmtClock(now)}
                className="w-full accent-ink"
              />
            </div>
            <div className="tnum mt-1 flex justify-between text-[10px] text-label">
              {TICKS.map((t) => <span key={t}>{fmtClock(DAY_START + t * MIN)}</span>)}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted">Scrub anywhere from 6:00 AM to 6:00 PM. The fleet moves with the clock in both directions; the planted scenarios hold still at 2:47.</p>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-line px-4 py-3">
            <input type="checkbox" checked={liveClock} onChange={(e) => setLiveClock(e.target.checked)} className="mt-0.5 accent-ink" aria-describedby="real-time-note" />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-ink">Play against the real clock</span>
              <span id="real-time-note" className="block text-[11px] leading-snug text-muted">
                {liveClock
                  ? outsideDay
                    ? `It is ${fmtClock(now)}: the shift ${now < DAY_START ? 'has not started yet' : 'is over for the day'}. Scrub, or reset, to see it live.`
                    : `The same day on today's clock: it is ${fmtClock(now)}, and the board shows ${fmtClock(now)}. Scrubbing returns to the pinned shift.`
                  : 'The same day on today\'s clock, unfolding in real time: at 10:15 AM the board shows 10:15.'}
              </span>
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <p className="text-[11px] leading-snug text-muted">Back to 2:47 PM with the fleet as seeded.</p>
            <Button size="sm" onClick={resetFleet} className="shrink-0"><ArrowCounterClockwise size={12} /> Reset the shift</Button>
          </div>
          <p className="border-t border-line px-4 py-2 text-[10px] text-label">⌘. opens and closes this panel.</p>
        </div>
      )}
    </div>
  )
}
