import { CaretRight, Kanban, MapPin } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { DISPATCHER } from '../data/dispatcher'
import LookoutAvatar from '../lookout/LookoutAvatar'
import { useLookout } from '../lookout/LookoutContext'
import { LOOKOUT } from '../lookout/voice'
import { useDerived } from '../store/hooks'
import DispatcherAvatar from '../ui/DispatcherAvatar'
import { navigationItemState } from '../ui/navigation'
import DispatchMark from './DispatchMark'
import { originOf } from './origin'
import SimulatedShift from './SimulatedShift'

/** The product bar. Dispatch is the product; Board and Map are one segmented view switch; a route file is
 *  one level in from whichever of them it was opened from, and reads that way. The bar ends with the
 *  dispatcher's own mark, which opens her settings. */
export default function Header() {
  const location = useLocation()
  const { pathname } = location
  const { byId, ranked } = useDerived()
  const { collapsed, setCollapsed } = useLookout()
  const urgent = ranked.filter((c) => c.alerts.length > 0 && (c.severity === 'critical' || c.severity === 'act_now')).length
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined
  // On a route file the segment of the view it was opened from stays selected, and Map returns to that pick.
  const origin = routeMatch ? originOf(location) : null
  const onMap = pathname === '/map' || origin?.view === 'map'
  const onSettings = pathname === '/settings'
  const onBoard = !onMap && !onSettings
  const mapTo = origin?.view === 'map' ? origin.to : '/map'
  // The nav shadow belongs under the lowest nav layer only: on a route file the Stops bar casts it and on the map the controls bar does, so the product bar does not.
  const lowestNav = !focused && !onMap
  const segment = (on: boolean) => `flex h-full flex-1 items-center justify-center gap-1.5 px-3 text-[12px] font-semibold transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink/40 ${navigationItemState(on)}`

  return (
    <header className={`relative z-30 flex h-14 shrink-0 items-center gap-0.5 border-b border-line bg-panel pr-3.5 ${lowestNav ? 'nav-shadow-below' : ''}`}>
      {/* The standalone brand mark sits centered over the route file's 64px back-arrow cell. */}
      <div className="flex w-16 shrink-0 items-center justify-center">
        <Link to="/" aria-label="Open the Dispatch board" className="flex h-9 w-9 shrink-0 items-center justify-center text-nav-selected-ink transition-colors hover:text-ink focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-selected-ink/40">
          <DispatchMark className="h-[29px] w-[29px]" />
        </Link>
      </div>
      <Link to="/" className="-ml-3.5 translate-y-px whitespace-nowrap font-brand text-[17px] font-bold leading-none tracking-[-0.035em] text-nav-selected-ink">Dispatch</Link>
      {/* The shell's keyline is an inset ring at partial alpha; the selected half paints over it, so its edge is its own dark fill. Filled glyphs stay crisp at 15px. */}
      <nav aria-label="Workspace view" className="workspace-shell ml-5 flex h-8 w-48 shrink-0 items-stretch overflow-hidden rounded-control bg-panel">
        <Link to="/" aria-current={onBoard ? 'page' : undefined} className={segment(onBoard)}>
          <Kanban size={15} weight="fill" /> Board
        </Link>
        <Link to={mapTo} aria-current={onMap ? 'page' : undefined} className={`${segment(onMap)} ${!onBoard && !onMap ? 'border-l border-nav-selected-ink/45' : ''}`}>
          <MapPin size={15} weight="fill" /> Map
        </Link>
      </nav>
      {focused && (
        <div className="ml-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted" aria-label={`Route Details: ${focused.route.id.toUpperCase()}`}>
          <CaretRight size={13} className="shrink-0" />
          <span className="whitespace-nowrap font-medium">Route Details</span>
          <span aria-hidden="true" className="text-label">·</span>
          <span className="truncate font-semibold text-ink">{focused.route.id.toUpperCase()}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        <SimulatedShift />
        <Link
          to="/settings"
          aria-label={`${DISPATCHER.name}: open settings`}
          aria-current={onSettings ? 'page' : undefined}
          title={`${DISPATCHER.name} · ${DISPATCHER.role}`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 ${onSettings ? 'ring-2 ring-ink ring-offset-2 ring-offset-panel' : 'hover:ring-2 hover:ring-ink/25 hover:ring-offset-2 hover:ring-offset-panel'}`}
        >
          <DispatcherAvatar dispatcher={DISPATCHER} size={36} />
        </Link>
        {/* With the rail closed, Lookout lives here as a pill, the act-now count still on it, until it is asked back. */}
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} aria-expanded="false" title={`Open ${LOOKOUT.name}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-lookout-soft pl-3 pr-1.5 text-[12px] font-semibold text-ink transition hover:bg-lookout-soft/70">
            <span className="font-lookout">Ask {LOOKOUT.name}</span>
            {urgent > 0 && <span className="tnum inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-act-now px-1 text-[10px] font-semibold leading-none text-on-accent" title={`${urgent} need action now`}>{urgent}</span>}
            <LookoutAvatar size={24} />
          </button>
        )}
      </div>
    </header>
  )
}
