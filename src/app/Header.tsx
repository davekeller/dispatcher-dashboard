import { CaretRight, MapTrifold, SquaresFour, TruckTrailer } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { useDerived } from '../store/hooks'
import { navigationItemState } from '../ui/navigation'
import { originOf } from './origin'
import SimulatedShift from './SimulatedShift'

/** The product bar. Dispatch is the product; Board and Map are one segmented view switch; a route file is
 *  one level in from whichever of them it was opened from, and reads that way. */
export default function Header() {
  const location = useLocation()
  const { pathname } = location
  const { byId } = useDerived()
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined
  // On a route file the segment of the view it was opened from stays selected, and Map returns to that pick.
  const origin = routeMatch ? originOf(location) : null
  const onMap = pathname === '/map' || origin?.view === 'map'
  const onBoard = !onMap
  const mapTo = origin?.view === 'map' ? origin.to : '/map'
  const segment = (on: boolean) => `flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 ${navigationItemState(on)}`

  return (
    <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-5">
      <Link to="/" aria-label="Open the Dispatch board" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink text-on-accent shadow-sm transition hover:bg-ink/90">
        <TruckTrailer size={17} weight="fill" />
      </Link>
      <Link to="/" className="ml-2 whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">Dispatch</Link>
      <span aria-hidden="true" className="ml-5 mr-3 h-5 w-px shrink-0 bg-line" />
      <nav aria-label="Workspace view" className="flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-panel p-0.5 shadow-sm">
        <Link to="/" aria-current={onBoard ? 'page' : undefined} className={segment(onBoard)}>
          <SquaresFour size={14} weight={onBoard ? 'fill' : 'regular'} /> Board
        </Link>
        <Link to={mapTo} aria-current={onMap ? 'page' : undefined} className={segment(onMap)}>
          <MapTrifold size={14} weight={onMap ? 'fill' : 'regular'} /> Map
        </Link>
      </nav>
      {focused && (
        <div className="ml-1 flex min-w-0 items-center gap-2 text-[12px] text-muted">
          <CaretRight size={13} className="shrink-0" />
          <span className="truncate font-semibold text-ink">{focused.route.id.toUpperCase()} · {focused.driver.name}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        <SimulatedShift />
      </div>
    </header>
  )
}
