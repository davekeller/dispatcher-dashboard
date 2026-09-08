import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SECTIONS } from './story'
import { SLIDES, slidesFor } from './slides'

describe('slides', () => {
  it('every slide has a static export under public/', () => {
    for (const slide of SLIDES) expect(existsSync(join(process.cwd(), 'public', slide.file)), slide.file).toBe(true)
  })

  it('numbers the whole deck once, 1 to N', () => {
    const numbers = SLIDES.map((slide) => slide.n).sort((a, b) => a - b)
    expect(numbers).toEqual(numbers.map((_, i) => i + 1))
    expect(new Set(SLIDES.map((slide) => slide.id)).size).toBe(SLIDES.length)
  })

  it('files each chapter in deck order', () => {
    for (const { id } of SECTIONS) {
      const numbers = slidesFor(id).map((slide) => slide.n)
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    }
    expect(slidesFor('project')[0]?.id).toBe('main')
  })
})
