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

// The simulated day is Lena's shift with the evening the routes run into: 6:00 AM to
// 6:00 PM. The scrubber covers all of it, in both directions, around the 2:47 anchor.
export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 18
export const DAY_START = scenarioAnchor(new Date(ANCHOR)) - (ANCHOR_HOUR - DAY_START_HOUR) * 60 * MIN - ANCHOR_MINUTE * MIN
export const DAY_END = DAY_START + (DAY_END_HOUR - DAY_START_HOUR) * 60 * MIN
export const SCRUB_MIN_MS = DAY_START - ANCHOR
export const SCRUB_MAX_MS = DAY_END - ANCHOR

/** Keep the scrub offset inside the simulated day. */
export function clampScrub(ms: number): number {
  return Math.min(SCRUB_MAX_MS, Math.max(SCRUB_MIN_MS, ms))
}

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
