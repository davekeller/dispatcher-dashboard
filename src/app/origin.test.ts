import { describe, expect, it } from 'vitest'
import { BOARD_ORIGIN, originFor, originOf } from './origin'

describe('view origin', () => {
  it('defaults a deep link or reload to the board', () => {
    expect(originOf({ state: null })).toEqual(BOARD_ORIGIN)
    expect(originOf({ state: { from: { view: 'elsewhere' } } })).toEqual(BOARD_ORIGIN)
  })

  it('keeps the map, and the pick, when a route was opened from it', () => {
    expect(originOf({ state: { from: { view: 'map', to: '/map?driver=drv-01' } } })).toEqual({ view: 'map', to: '/map?driver=drv-01' })
    expect(originOf({ state: { from: { view: 'map', to: 'https://elsewhere' } } })).toEqual({ view: 'map', to: '/map' })
  })

  it('links from the map carry the map and its query; links from the board carry the board', () => {
    expect(originFor({ pathname: '/map', search: '?driver=drv-03', state: null })).toEqual({ view: 'map', to: '/map?driver=drv-03' })
    expect(originFor({ pathname: '/', search: '', state: null })).toEqual(BOARD_ORIGIN)
  })

  it('a route file passes its own origin along, so a card in Lookout keeps the trail', () => {
    expect(originFor({ pathname: '/routes/drv-01', search: '', state: { from: { view: 'map', to: '/map' } } })).toEqual({ view: 'map', to: '/map' })
    expect(originFor({ pathname: '/routes/drv-01', search: '', state: null })).toEqual(BOARD_ORIGIN)
  })
})
