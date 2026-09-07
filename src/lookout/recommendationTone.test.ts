import { describe, expect, it } from 'vitest'
import { recommendationBorder } from './recommendationTone'

describe('recommendationBorder', () => {
  it('maps alert severity to a restrained semantic keyline', () => {
    expect(recommendationBorder('critical')).toBe('border-act-now-fill/55')
    expect(recommendationBorder('act_now')).toBe('border-act-now-fill/55')
    expect(recommendationBorder('watch')).toBe('border-watch-fill/55')
  })

  it('keeps informational recommendations neutral', () => {
    expect(recommendationBorder('info')).toBe('border-line/60')
    expect(recommendationBorder('none')).toBe('border-line/60')
  })
})
