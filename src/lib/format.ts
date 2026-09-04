// All time formatting lives here so precision rules (tilde for estimates, no
// seconds anywhere) are enforced in one place.

export function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** 78 → "1:18", -6 → "-0:06". Minutes, never seconds: precision drops with age, and we never fake it. */
export function fmtHm(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const m = Math.round(Math.abs(minutes))
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export function fmtCountdown(minutes: number, stale: boolean): string {
  return `${stale ? '~' : ''}${fmtHm(minutes)}`
}

export function fmtMinutes(minutes: number): string {
  const m = Math.round(Math.abs(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function fmtAge(minutes: number): string {
  if (minutes < 1) return 'just now'
  return `${fmtMinutes(minutes)} ago`
}

/** Narrow-card freshness label; the full wording remains available in tooltips and detail views. */
export function fmtCompactAge(minutes: number): string {
  if (minutes < 1) return 'Now'
  const m = Math.round(minutes)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${h}h${r ? ` ${r}m` : ''} ago`
}

export function fmtDrift(minutes: number): string {
  if (Math.abs(minutes) <= 5) return 'On time'
  return minutes > 0 ? `Behind ${fmtMinutes(minutes)}` : `Ahead ${fmtMinutes(-minutes)}`
}
