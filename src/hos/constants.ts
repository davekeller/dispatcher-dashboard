// Thresholds. Every one of these is a guess a real deployment would tune; the
// point is that they live in one place and the walkthrough can say so.
export const LIMIT_MIN = 660 // 11 hours of driving
export const ACT_NOW_MIN = 30
export const WATCH_MIN = 90
export const FRESH_MIN = 3
export const OFFLINE_MIN = 15
export const SNOOZE_MIN = 10
export const BEHIND_MIN = 15
export const CAPACITY_MARGIN_MIN = 20
export const WINDOW_14H_MIN = 840
export const BREAK_MIN = 30 // an interruption this long resets the 8-hour break clock
export const BREAK_DUE_AFTER_MIN = 480
export const RESET_MIN = 600 // 10 consecutive hours off duty
export const PING_JITTER_MS = 90_000
