import { describe, expect, it } from 'vitest'
import { resolveColumnTracks } from './useColumnTracks'

describe('resolveColumnTracks', () => {
  it('reserves forty pixels for each collapsed rail', () => {
    expect(resolveColumnTracks([1, null, 1], { width: 500, gap: 10 })).toBe('220px 40px 220px')
  })

  it('respects open-column weights', () => {
    expect(resolveColumnTracks([1.5, 1, null], { width: 540, gap: 10 })).toBe('288px 192px 40px')
  })

  it('falls back to mixed units before the grid is measured', () => {
    expect(resolveColumnTracks([1.25, null], { width: 0, gap: 12 })).toBe('1.25fr 40px')
  })
})
