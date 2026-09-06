import { describe, expect, it } from 'vitest'
import { nextStopSelection } from './stopSelection'

const stops = ['stop-5', 'stop-4', 'stop-3', 'stop-2']

describe('nextStopSelection', () => {
  it('toggles one stop from a plain row click', () => {
    expect(nextStopSelection([], stops, 'stop-4', null, false)).toEqual(['stop-4'])
    expect(nextStopSelection(['stop-4'], stops, 'stop-4', 'stop-4', false)).toEqual([])
  })

  it('adds an inclusive Shift-click range in visible route order', () => {
    expect(nextStopSelection(['stop-5'], stops, 'stop-2', 'stop-5', true)).toEqual(stops)
  })

  it('preserves separately selected stops when extending a range', () => {
    expect(nextStopSelection(['stop-5', 'stop-2'], stops, 'stop-3', 'stop-5', true)).toEqual(stops)
  })

  it('falls back to a toggle when the anchor is no longer selectable', () => {
    expect(nextStopSelection(['stop-5'], stops, 'stop-3', 'missing', true)).toEqual(['stop-5', 'stop-3'])
  })
})
