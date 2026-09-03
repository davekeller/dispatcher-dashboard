import { useEffect, useMemo, useState } from 'react'
import { simNow, TICK_MS, toTick } from '../time/clock'
import { derive, type Derived } from './derive'
import { useStore } from './store'

/** The one clock. Ticks every TICK_MS; the value is rounded to the tick so memo keys are stable. */
export function useNow(): number {
  const scrub = useStore((s) => s.scrubOffsetMs)
  const [wall, setWall] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setWall(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])
  return toTick(simNow(scrub, wall))
}

/** Everything derived from the fleet at this tick. One object per tick, shared by every surface. */
export function useDerived(): Derived {
  const fleet = useStore((s) => s.fleet)
  const snoozes = useStore((s) => s.snoozes)
  const now = useNow()
  return useMemo(() => derive(fleet, now, snoozes), [fleet, now, snoozes])
}
