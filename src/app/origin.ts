import type { Location } from 'react-router'

// A route file is one level in from the board or the map. Which one travels with the
// navigation as router state, so the product bar keeps that view's segment selected and
// the rail's back arrow returns there (the map with its pick intact). A deep link or a
// reload has no state and defaults to the board.

export interface ViewOrigin {
  view: 'board' | 'map'
  to: string
}

export const BOARD_ORIGIN: ViewOrigin = { view: 'board', to: '/' }

/** Where the current route file was opened from. */
export function originOf(location: Pick<Location, 'state'>): ViewOrigin {
  const from = (location.state as { from?: Partial<ViewOrigin> } | null)?.from
  return from?.view === 'map' ? { view: 'map', to: typeof from.to === 'string' && from.to.startsWith('/map') ? from.to : '/map' } : BOARD_ORIGIN
}

/** What a link into a route file should carry from the current location. */
export function originFor(location: Pick<Location, 'pathname' | 'search' | 'state'>): ViewOrigin {
  if (location.pathname === '/map') return { view: 'map', to: `/map${location.search}` }
  if (location.pathname.startsWith('/routes/')) return originOf(location)
  return BOARD_ORIGIN
}
