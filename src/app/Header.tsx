import { CaretRight, MapTrifold, SquaresFour, TruckTrailer } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { useDerived } from '../store/hooks'
import { NAV_ITEM_BASE, navigationItemState } from '../ui/navigation'
import SimulatedShift from './SimulatedShift'

/** The product bar. Dispatch is the product; the board is its home; a route file is one level in. */
export default function Header() {
  const { pathname } = useLocation()
  const { byId } = useDerived()
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined
  const onMap = pathname === '/map'
  const onBoard = pathname === '/' || routeMatch !== null
  const tab = (on: boolean) => `${NAV_ITEM_BASE} text-[13px] ${navigationItemState(on)}`

  return (
    <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-5">
      <Link to="/" aria-label="Open the Dispatch board" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink text-on-accent shadow-sm transition hover:bg-ink/90">
        <TruckTrailer size={17} weight="fill" />
      </Link>
      <Link to="/" className="ml-2 whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">Dispatch</Link>
      <span aria-hidden="true" className="ml-5 mr-3 h-5 w-px shrink-0 bg-line" />
      <nav aria-label="Workspace navigation" className="flex items-center gap-0.5">
        <Link to="/" aria-current={onBoard ? 'page' : undefined} className={tab(onBoard)}>
          <SquaresFour size={15} weight={onBoard ? 'fill' : 'regular'} /> Board
        </Link>
        <Link to="/map" aria-current={onMap ? 'page' : undefined} className={tab(onMap)}>
          <MapTrifold size={15} weight={onMap ? 'fill' : 'regular'} /> Map
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
