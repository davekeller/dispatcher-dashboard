import { ArrowsOutSimple, MagnifyingGlass, X } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { BAND_LABEL } from '../../bands'
import { applyFilters, EMPTY_FILTERS, FILTERS, isFiltering, type FilterState } from '../../filters'
import { originFor } from '../../app/origin'
import { fleetMarkers } from '../../geo/fleet'
import { fmtAge } from '../../lib/format'
import { useLookout } from '../../lookout/LookoutContext'
import { stopsPastLimit } from '../../store/actions'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import Chip from '../../ui/Chip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE } from '../../ui/tones'
import FiltersDropdown from '../shift/FiltersDropdown'

// Leaflet loads only here and on the route file's map, never on the board.
const FleetMap = lazy(() => import('./FleetMap'))

/** The fleet on a map, reading the same ranked list as the board. Quiet trucks are dots, the
 *  ones that need Lena carry a pill, and picking one focuses Lookout on that driver and draws
 *  the road ahead of them. The board's filters apply here too. */
export default function MapPage() {
  const d = useDerived()
  const deliveries = useStore((s) => s.fleet.deliveries)
  const deliveryById = useMemo(() => new Map(deliveries.map((x) => [x.id, x])), [deliveries])
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [fitKey, setFitKey] = useState(0)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const selectedId = params.get('driver')
  const select = (id: string | null) => setParams((prev) => {
    const q = new URLSearchParams(prev)
    if (id) q.set('driver', id)
    else q.delete('driver')
    return q
  }, { replace: true })
  const { setFocus } = useLookout()
  useEffect(() => {
    setFocus(selectedId)
    return () => setFocus(null)
  }, [selectedId, setFocus])

  const visible = applyFilters(d.ranked, d.byId, filters)
  const markers = useMemo(() => fleetMarkers(visible.flatMap((c) => d.byId.get(c.driverId) ?? []), d.cardById, deliveryById), [visible, d.byId, d.cardById, deliveryById])
  const selectedView = selectedId ? d.byId.get(selectedId) : undefined
  const selectedCard = selectedId ? d.cardById.get(selectedId) : undefined
  const pastLimitIds = useMemo(() => new Set(selectedView ? stopsPastLimit(selectedView) : []), [selectedView])
  const search = FILTERS.find((f) => f.kind === 'text')!
  const stale = selectedView !== undefined && selectedView.staleness !== 'fresh'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Map controls" className="nav-shadow-below relative z-20 shrink-0 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <FiltersDropdown value={filters} onChange={setFilters} />
          {isFiltering(filters) && (
            <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X size={12} /> Clear
            </Button>
          )}
          <span className="tnum text-[12px] text-muted">{markers.length} of {d.views.length} trucks</span>
          <div className="ml-2 flex items-center gap-3 text-[10px] text-label">
            <span className="flex items-center gap-1.5"><span className="fleet-marker is-act_now inline-block h-3 w-3"><span className="fleet-marker-dot" /></span> act now</span>
            <span className="flex items-center gap-1.5"><span className="fleet-marker is-watch inline-block h-3 w-3"><span className="fleet-marker-dot" /></span> watch</span>
            <span className="flex items-center gap-1.5"><span className="fleet-marker is-quiet band-break inline-block h-3 w-3"><span className="fleet-marker-dot" /></span> on break</span>
            <span className="flex items-center gap-1.5"><span className="fleet-marker is-quiet band-clear inline-block h-3 w-3"><span className="fleet-marker-dot" /></span> clear</span>
            <span className="flex items-center gap-1.5"><span className="fleet-marker is-offline is-dark inline-block h-3 w-3"><span className="fleet-marker-dot" /></span> dark</span>
          </div>
          <label className="relative ml-auto min-w-44 flex-1 lg:max-w-56">
            <span className="sr-only">{search.label}</span>
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={(filters[search.id] as string | undefined) ?? ''} onChange={(e) => setFilters({ ...filters, [search.id]: e.target.value })} placeholder={search.label} className="h-9 w-full rounded-control border border-line bg-panel pl-9 pr-3 text-[12px] text-ink outline-none transition placeholder:text-muted focus:border-ink/35 focus:ring-2 focus:ring-ink/10" aria-label={search.label} />
          </label>
          <Button size="sm" variant="secondary" onClick={() => { select(null); setFitKey((k) => k + 1) }} title="Clear the selection and fit every visible truck">
            <ArrowsOutSimple size={13} /> Fit all
          </Button>
        </div>
      </nav>
      <div className="flex min-h-0 flex-1">
        {/* The same ranked, filtered list the markers come from, as a list: one row per truck, in board order. */}
        <aside aria-label="Drivers on the map" className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-label">
            <span>Drivers</span>
            <span className="tnum">{markers.length}</span>
          </div>
          {markers.length === 0 ? (
            <p className="px-3 py-4 text-[12px] text-muted">No trucks match the filters.</p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {markers.map((m) => {
                const on = m.driverId === selectedId
                return (
                  <li key={m.driverId}>
                    <button type="button" onClick={() => select(m.driverId)} aria-current={on ? 'true' : undefined} className={`flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left transition hover:bg-well ${on ? 'bg-well' : ''}`}>
                      {/* The board's status dot, not the map marker: no white ring off the tiles. */}
                      <span className={`h-2 w-2 shrink-0 rounded-full ${m.dark ? `border border-dashed ${BAND_TONE[m.band].border}` : BAND_TONE[m.band].fill}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-ink">{m.name}</span>
                        <span className="block truncate text-[10px] text-muted"><span className="font-mono">{m.routeId.toUpperCase()}</span> · {BAND_LABEL[m.band]}{m.dark ? ` · last seen ${fmtAge(m.pingAgeMin)}` : ''}</span>
                      </span>
                      <Countdown minutes={m.minutesUntilLimit} stale={m.staleness !== 'fresh'} size="xs" className="shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
        <div className="relative min-h-0 flex-1 bg-canvas">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-[12px] text-muted">Loading the map…</div>}>
          <FleetMap markers={markers} selectedId={selectedId} selectedView={selectedView} deliveryById={deliveryById} pastLimitIds={pastLimitIds} fitKey={fitKey} onSelect={select} />
        </Suspense>
        {selectedView && selectedCard && (
          <aside aria-label={`${selectedView.driver.name}, selected`} className="absolute right-4 top-4 z-[1000] w-64 rounded-card border border-line bg-panel p-3 shadow-card">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{selectedView.driver.name}</p>
                <p className="truncate font-mono text-[11px] text-muted">{selectedView.route.id.toUpperCase()} · {selectedView.truck.plate} · {selectedView.driver.region}</p>
              </div>
              <Countdown minutes={selectedView.minutesUntilLimit} stale={stale} className="shrink-0" />
              <button type="button" onClick={() => select(null)} aria-label="Clear selection" className="-mr-1 -mt-1 shrink-0 rounded-control p-1 text-muted hover:bg-well hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <Chip tone={BAND_TONE[selectedCard.band]} dashed={selectedView.staleness === 'offline'}>{BAND_LABEL[selectedCard.band]}</Chip>
              <span>{selectedView.remaining.length} stops left</span>
              {selectedView.staleness !== 'fresh' && <span className="text-watch">last known position</span>}
            </div>
            <Link to={`/routes/${selectedView.driver.id}`} state={{ from: originFor(location) }} className="mt-3 block">
              <Button size="sm" variant="primary" className="w-full">Open route file</Button>
            </Link>
          </aside>
        )}
        </div>
      </div>
    </div>
  )
}
