import { describe, expect, it } from 'vitest'
import { hashString, makeRng, mulberry32 } from './prng'

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('stays in [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('makeRng', () => {
  it('int is inclusive on both ends', () => {
    const r = makeRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 3))
    expect([...seen].sort()).toEqual([1, 2, 3])
  })
  it('pick returns members', () => {
    const r = makeRng(9)
    expect(['a', 'b']).toContain(r.pick(['a', 'b']))
  })
})

describe('hashString', () => {
  it('is stable and unsigned', () => {
    expect(hashString('drv-01')).toBe(hashString('drv-01'))
    expect(hashString('drv-01')).toBeGreaterThanOrEqual(0)
    expect(hashString('drv-01')).not.toBe(hashString('drv-02'))
  })
})
