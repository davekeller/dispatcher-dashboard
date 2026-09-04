import { describe, expect, it } from 'vitest'
import { fmtAge, fmtCompactAge, fmtCountdown, fmtDrift, fmtHm, fmtMinutes } from './format'

describe('fmtHm', () => {
  it('renders hours:minutes with a two-digit minute', () => {
    expect(fmtHm(18)).toBe('0:18')
    expect(fmtHm(78)).toBe('1:18')
    expect(fmtHm(660)).toBe('11:00')
  })
  it('keeps the sign for over-limit values', () => {
    expect(fmtHm(-6)).toBe('-0:06')
  })
  it('rounds fractional minutes', () => {
    expect(fmtHm(17.6)).toBe('0:18')
  })
})

describe('fmtCountdown', () => {
  it('prefixes a tilde when the figure is an estimate', () => {
    expect(fmtCountdown(40.2, true)).toBe('~0:40')
    expect(fmtCountdown(40.2, false)).toBe('0:40')
  })
})

describe('fmtMinutes / fmtAge', () => {
  it('uses minutes under an hour and h/m above', () => {
    expect(fmtMinutes(18)).toBe('18 min')
    expect(fmtMinutes(72)).toBe('1h 12m')
    expect(fmtMinutes(120)).toBe('2h')
  })
  it('ages read as "N ago" and "just now" under a minute', () => {
    expect(fmtAge(25)).toBe('25 min ago')
    expect(fmtAge(0.4)).toBe('just now')
    expect(fmtCompactAge(0.4)).toBe('Now')
    expect(fmtCompactAge(25)).toBe('25m ago')
    expect(fmtCompactAge(65)).toBe('1h 5m ago')
  })
})

describe('fmtDrift', () => {
  it('treats ±5 minutes as on time', () => {
    expect(fmtDrift(3)).toBe('On time')
    expect(fmtDrift(-5)).toBe('On time')
    expect(fmtDrift(14)).toBe('Behind 14 min')
    expect(fmtDrift(-9)).toBe('Ahead 9 min')
  })
})
