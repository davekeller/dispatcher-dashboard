// The one clock. The scenario is pinned to 2:47 PM (a driver near the 11-hour limit
// by then started around 2:40 AM, which is ordinary freight) so the demo is the same at
// any hour, and it still ticks: now = anchor + real elapsed + scrub offset.
export const TICK_MS = 5000
export const MIN = 60_000
export const ANCHOR_HOUR = 14
export const ANCHOR_MINUTE = 47

export function scenarioAnchor(from: Date = new Date()): number {
  const d = new Date(from)
  d.setHours(ANCHOR_HOUR, ANCHOR_MINUTE, 0, 0)
  return d.getTime()
}

export const ANCHOR = scenarioAnchor()
export const LOADED_AT = Date.now()

export function simNow(scrubOffsetMs: number, wall: number = Date.now(), loadedAt: number = LOADED_AT, anchor: number = ANCHOR): number {
  return anchor + (wall - loadedAt) + scrubOffsetMs
}

/** Round down to the tick so every memo keyed on `now` is stable within a tick. */
export function toTick(t: number): number {
  return Math.floor(t / TICK_MS) * TICK_MS
}

export function minutesBetween(from: number, to: number): number {
  return (to - from) / MIN
}
