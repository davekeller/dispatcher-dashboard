import { ArrowLeft, ListBullets, MapTrifold } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { useActions } from '../../actions/ActionContext'
import { originOf } from '../../app/origin'
import { stopsPastLimit } from '../../store/actions'
import { useLookout } from '../../lookout/LookoutContext'
import { fmtAge } from '../../lib/format'
import { routeCompletionPct, routeHosSignal, routeScheduleSignal, type RouteSignalTone } from '../../lib/routeProgress'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import AlertStrip from './AlertStrip'
import DriverCard from './DriverCard'
import StaleBanner from './StaleBanner'
import RouteRail from './RouteRail'
import StopReceipt from './StopReceipt'
import { nextStopSelection } from './stopSelection'

// Leaflet and its stylesheet load only when someone opens the map; the board never pays for them.
const RouteMap = lazy(() => import('./map/RouteMap'))

type StopsMode = 'list' | 'map'

const SIGNAL_DOT: Record<RouteSignalTone, string> = {
  clear: 'bg-clear-fill',
  watch: 'bg-watch-fill',
  act_now: 'bg-act-now-fill',
  offline: 'bg-offline-fill',
}

const SIGNAL_TEXT: Record<RouteSignalTone, string> = {
  clear: 'text-clear',
  watch: 'text-watch',
  act_now: 'text-act-now',
  offline: 'text-offline',
}

const compactSignalValue = (value: string) => value
  .replace(/(\d+)h (\d+)m/g, '$1h$2m')
  .replace(/(\d+) min\b/g, '$1m')
  .replace(/ behind\b/g, ' late')
  .replace(/ ahead\b/g, ' early')

/** A file for one driver's day, in the case-file shape: a secondary nav bar fixed under the product
 *  bar (back, the route's stops, its status, List | Map), then the route rail down the left beside
 *  the scrolling driver-and-alert header and stop list or map. Lookout stays focused here. */
export default function RouteFilePage() {
  const { driverId = '' } = useParams()
  const d = useDerived()
  const deliveries = useStore((s) => s.fleet.deliveries)
  const deliveryById = useMemo(() => new Map(deliveries.map((x) => [x.id, x])), [deliveries])
  const { setFocus } = useLookout()
  const { open } = useActions()
  const origin = originOf(useLocation())
  const [selected, setSelected] = useState<string[]>([])
  const selectionAnchor = useRef<string | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(true)
  const [params, setParams] = useSearchParams()
  const mode: StopsMode = params.get('view') === 'map' ? 'map' : 'list'
  const setMode = (next: StopsMode) => setParams((prev) => {
    const q = new URLSearchParams(prev)
    if (next === 'map') q.set('view', 'map')
    else q.delete('view')
    return q
  }, { replace: true })
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const view = d.byId.get(driverId)
  const card = d.cardById.get(driverId)

  useEffect(() => {
    setFocus(driverId)
    return () => setFocus(null)
  }, [driverId, setFocus])
  useEffect(() => {
    setSelected([])
    selectionAnchor.current = null
  }, [driverId])
  useEffect(() => setSelectedStop(null), [driverId])
  useEffect(() => setRailCollapsed(true), [driverId])

  if (!view || !card) {
    return (
      <div className="p-6">
        <EmptyState title="No driver with that id is on this shift." action={<Link to="/"><Button size="sm">Back to the board</Button></Link>} />
      </div>
    )
  }

  const stale = view.staleness !== 'fresh'
  const staleReason = stale ? 'Position unknown. This action is disabled until the truck reports in.' : undefined
  const routeSignals = [routeScheduleSignal(view), routeHosSignal(view)]
  const progress = routeCompletionPct(view.done, view.total)
  const selectableStopIds = [...view.route.stops]
    .reverse()
    .filter((stop) => stop.status === 'pending' || stop.status === 'unassigned')
    .map((stop) => stop.id)
  const selectStop = (id: string, extendRange: boolean) => {
    const anchor = selectionAnchor.current
    setSelected((current) => nextStopSelection(current, selectableStopIds, id, anchor, extendRange))
    if (!extendRange || anchor === null) selectionAnchor.current = id
  }
  const pastLimitIds = new Set(stopsPastLimit(view))
  // On the map the rail's selection is the page's; it starts on the next stop, like the rail does when reading.
  const mapSelection = selectedStop ?? view.next?.id ?? null
  const seg = (on: boolean) => `inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11px] font-semibold transition ${on ? 'bg-nav-selected text-nav-selected-ink' : 'text-muted hover:bg-nav-selected/45 hover:text-ink'}`

  return (
    <div className="route-workspace flex h-full min-h-0 flex-col">
      {/* The secondary nav: part of the chrome, not the scroll. Back is its first column; the rail has no arrow of its own. */}
      <nav aria-label="Route" className="stops-navbar flex h-12 shrink-0 items-stretch border-b border-line">
        <Link to={origin.to} title={`Back to the ${origin.view}`} aria-label={`Back to the ${origin.view}`} className="flex w-12 shrink-0 items-center justify-center border-r border-line text-muted transition hover:bg-board hover:text-ink">
          <ArrowLeft size={16} weight="bold" />
        </Link>
        <div className="flex min-w-[12rem] shrink-0 items-center gap-2 border-r border-line pl-4 pr-5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-ink text-on-accent" aria-hidden="true">
            <ListBullets size={12} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-semibold uppercase leading-none tracking-[0.07em] text-label">{view.route.id.toUpperCase()} · Stops</p>
            <h2 className="tnum mt-1 whitespace-nowrap font-display text-[16px] font-semibold leading-none tracking-tight text-ink">
              {view.done}/{view.total} delivered <span className="font-sans text-[11px] font-medium tracking-normal text-muted">· {progress}%</span>
            </h2>
          </div>
        </div>
        <dl aria-label="Route status" className="flex min-w-0 items-stretch divide-x divide-line">
          <div className="flex w-[8.5rem] min-w-0 flex-col justify-center px-3">
            <dt className="flex min-w-0 items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-label">
              <span>Remaining</span>
              <span className="truncate font-medium normal-case tracking-normal text-muted" title={`Updated ${fmtAge(view.pingAgeMin)}`}>· {fmtAge(view.pingAgeMin)}</span>
            </dt>
            <dd className="tnum mt-1 font-display text-[13px] font-semibold leading-none tracking-tight text-ink">{view.remaining.length} <span className="font-sans text-[9px] font-medium tracking-normal text-muted">stops</span></dd>
          </div>
          {routeSignals.map((signal) => (
            <div key={signal.label} className="flex w-[7.5rem] min-w-0 flex-col justify-center px-3">
              <dt className="text-[8px] font-semibold uppercase tracking-[0.06em] text-label">{signal.label}</dt>
              <dd className={`mt-1 flex min-w-0 items-center gap-1 font-display text-[13px] font-semibold leading-none tracking-tight ${SIGNAL_TEXT[signal.tone]}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SIGNAL_DOT[signal.tone]}`} />
                <span className="truncate" title={signal.value}>{compactSignalValue(signal.value)}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-line pl-3 pr-5">
          {selected.length > 0 && (
            <Button size="sm" variant="primary" disabled={stale} title={staleReason} onClick={() => open('reassign', view.driver.id, { stopIds: selected })}>
              Reassign selected ({selected.length})
            </Button>
          )}
          <div className="flex shrink-0 items-center gap-0.5 rounded-control border border-nav-selected-line bg-canvas/80 p-0.5" role="group" aria-label="Show stops as">
            <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')} className={seg(mode === 'list')} title="Stops as a list">
              <ListBullets size={12} weight={mode === 'list' ? 'fill' : 'regular'} /> List
            </button>
            <button type="button" aria-pressed={mode === 'map'} onClick={() => setMode('map')} className={seg(mode === 'map')} title="Stops on a map, with the truck">
              <MapTrifold size={12} weight={mode === 'map' ? 'fill' : 'regular'} /> Map
            </button>
          </div>
        </div>
      </nav>
      <div className="flex min-h-0 flex-1 items-stretch gap-5 py-5 pr-5">
        <RouteRail view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} collapsed={railCollapsed} onCollapsedChange={setRailCollapsed} activeStopId={mode === 'map' ? mapSelection : undefined} onSelectStop={mode === 'map' ? setSelectedStop : undefined} />
        {/* The scroll box is a plain block so nothing inside it can flex-shrink; the column of cards sits one level down. */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3">
          <DriverCard view={view} card={card} />
          {(card.alerts.length > 0 || stale) && (
            <div className="flex flex-col gap-3">
              {card.alerts.length > 0 && <AlertStrip view={view} card={card} />}
              {stale && <StaleBanner view={view} />}
            </div>
          )}
          <section>
            {mode === 'map' ? (
              <Suspense fallback={<div className="flex h-[22rem] items-center justify-center rounded-card border border-line bg-panel text-[12px] text-muted">Loading the map…</div>}>
                <RouteMap view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} selectedStopId={mapSelection} onSelectStop={setSelectedStop} />
              </Suspense>
            ) : (
              <ol className="flex flex-col gap-2">
                {[...view.route.stops].reverse().map((s) => (
                  <li key={s.id} id={`stop-${s.id}`} className="scroll-mt-4">
                    <StopReceipt stop={s} delivery={deliveryById.get(s.deliveryId)} view={view} selected={selected.includes(s.id)} onSelect={(extendRange) => selectStop(s.id, extendRange)} pastLimit={pastLimitIds.has(s.id)} />
                  </li>
                ))}
              </ol>
            )}
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}
