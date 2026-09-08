import { ArrowLeft, CaretDown, Check, SidebarSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { originOf } from '../../app/origin'
import StopStatusMarker, { stopHistoryStyle } from './StopStatusMarker'

interface Node {
  stop: Stop
  routeIndex: number
  t: number
  customer: string
  late: boolean
}

const TIMELINE_COLUMNS = { gridTemplateColumns: '1.25rem minmax(0, 1fr)' }

function detailNodeSize(index: number, firstRemainingIndex: number, status: Stop['status']): string {
  if (status === 'done') return 'h-3 w-3'
  if (index === firstRemainingIndex) return 'h-4 w-4'
  if (index === firstRemainingIndex + 1) return 'h-[15px] w-[15px]'
  return 'h-3.5 w-3.5'
}

function rowTone(node: Node, pastLimitIds: Set<string>): string {
  if (pastLimitIds.has(node.stop.id) || node.late) return 'bg-act-now-board/65 hover:bg-act-now-board/90'
  return 'hover:bg-board/70'
}

function stopState(node: Node, nextId: string | undefined, pastLimitIds: Set<string>): string {
  const { stop } = node
  if (stop.status === 'failed') return 'failed'
  if (stop.status === 'done') return 'delivered'
  if (stop.status === 'unassigned') return 'unassigned'
  if (pastLimitIds.has(stop.id)) return 'past HOS'
  if (node.late) return 'past due'
  if (stop.id === nextId || stop.status === 'in_progress') return 'current stop'
  return 'undelivered'
}

/** A route-first progress rail. The summary answers "where are we?" and "does it fit?"
 * before the stop sequence supplies detail. Stops render in reverse route order so the
 * remaining and newly reassigned work leads, while the source route order stays intact. */
export default function RouteRail({ view, deliveryById, pastLimitIds, collapsed, onCollapsedChange, activeStopId, onSelectStop }: { view: DriverView; deliveryById: Map<string, Delivery>; pastLimitIds: Set<string>; activeStopId?: string | null; onSelectStop?: (id: string) => void; collapsed: boolean; onCollapsedChange: (c: boolean) => void }) {
  const { route, now } = view
  const origin = originOf(useLocation())
  const nextId = view.next?.id
  const progress = view.total === 0 ? 100 : Math.round((view.done / view.total) * 100)
  const [active, setActive] = useState<string | null>(nextId ?? route.stops.at(-1)?.id ?? null)
  // In map mode the page owns the selection; in list mode the receipt being read does.
  const shownActive = activeStopId !== undefined ? activeStopId : active
  const [timelineOpen, setTimelineOpen] = useState(true)
  const timelineRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>())

  const nodes = useMemo<Node[]>(() => route.stops.map((stop, routeIndex) => {
    const t = stop.status === 'done' || stop.status === 'failed'
      ? (stop.departedAt ?? stop.plannedEta)
      : stop.status === 'in_progress'
        ? (stop.arrivedAt ?? now)
        : projectedEta(stop, view.driftMin)
    const windowEnd = deliveryById.get(stop.deliveryId)?.window.end
    return {
      stop,
      routeIndex,
      t,
      customer: deliveryById.get(stop.deliveryId)?.customer ?? stop.deliveryId,
      late: stop.status === 'pending' && windowEnd !== undefined && t > windowEnd,
    }
  }), [deliveryById, now, route.stops, view.driftMin])
  const displayedNodes = useMemo(() => [...nodes].reverse(), [nodes])

  const firstPastLimitId = nodes.find((node) => pastLimitIds.has(node.stop.id))?.stop.id
  const firstRemainingIndex = nodes.findIndex((node) => node.stop.status !== 'done' && node.stop.status !== 'failed')
  const lastCompleteIndex = nodes.reduce((last, node, index) => node.stop.status === 'done' || node.stop.status === 'failed' ? index : last, -1)

  useEffect(() => {
    setActive(nextId ?? route.stops.at(-1)?.id ?? null)
  }, [nextId, route.id, route.stops])

  useEffect(() => {
    setTimelineOpen(true)
  }, [route.id])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = timelineRef.current
      const node = shownActive ? nodeRefs.current.get(shownActive) : undefined
      if (!container || !node) return
      const top = node.offsetTop
      const bottom = top + node.offsetHeight
      if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = Math.max(0, top - container.clientHeight * 0.35)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [shownActive, collapsed, route.id])

  // The selected timeline node still follows the receipt currently being read.
  useEffect(() => {
    const elements = route.stops.map((stop) => document.getElementById(`stop-${stop.id}`)).filter((node): node is HTMLElement => Boolean(node))
    if (elements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id.replace('stop-', ''))
      },
      { rootMargin: '-15% 0px -65% 0px', threshold: [0, 0.5] },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [route.stops])

  const jump = (id: string) => {
    setActive(id)
    if (onSelectStop) {
      onSelectStop(id)
      return
    }
    document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <nav aria-label="Route" className={`sticky left-0 top-0 z-20 flex h-[calc(100vh-3.5rem-2.5rem)] shrink-0 flex-col overflow-hidden rounded-r-card border-y border-r border-line bg-panel shadow-card transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className={`flex shrink-0 items-center border-b border-line px-2 py-2 ${collapsed ? 'flex-col gap-1' : 'gap-2'}`}>
        <Link to={origin.to} title={`Back to the ${origin.view}`} aria-label={`Back to the ${origin.view}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-board hover:text-ink">
          <ArrowLeft size={16} weight="bold" />
        </Link>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-label">Route</p>
            <p className="truncate font-mono text-[12px] font-semibold text-ink">{route.id.toUpperCase()}</p>
          </div>
        )}
        <button type="button" onClick={() => onCollapsedChange(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand the route rail' : 'Collapse the route rail'} title={collapsed ? 'Expand' : 'Collapse'} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-board hover:text-ink">
          <SidebarSimple size={16} className={collapsed ? '-scale-x-100' : ''} />
        </button>
      </div>

      <section aria-label={`${progress}% complete; ${view.done} completed and ${view.remaining.length} remaining`} className="shrink-0 border-b border-line bg-board/45">
        {collapsed ? (
          <div className="px-1 py-2.5 text-center">
            <p className="tnum font-display text-lg font-semibold leading-none tracking-tight text-ink">{progress}%</p>
            <p className="tnum mt-1.5 text-[9px] font-semibold leading-none text-ink">{view.done} / {view.remaining.length}</p>
            <p className="mt-1 text-[7px] font-semibold uppercase leading-none tracking-[0.04em] text-label">done / left</p>
          </div>
        ) : (
          <dl className="grid grid-cols-2 divide-x divide-line">
            <div className="flex min-w-0 flex-col justify-center px-3 py-2.5">
              <dt className="text-[8px] font-semibold uppercase tracking-[0.06em] text-label">% complete</dt>
              <dd className="tnum mt-1 font-display text-xl font-semibold leading-none tracking-tight text-ink">{progress}%</dd>
            </div>
            <div className="flex min-w-0 flex-col justify-center px-3 py-2.5">
              <dt className="text-[8px] font-semibold uppercase tracking-[0.06em] text-label">Done / remaining</dt>
              <dd className="tnum mt-1 font-display text-xl font-semibold leading-none tracking-tight text-ink">{view.done} / {view.remaining.length}</dd>
            </div>
          </dl>
        )}
      </section>

      {!collapsed && (
        <button type="button" onClick={() => setTimelineOpen((open) => !open)} aria-expanded={timelineOpen} className="flex w-full shrink-0 items-center gap-2 px-3 py-2 text-left transition hover:bg-board/70">
          <h2 className="text-[9px] font-semibold uppercase tracking-[0.08em] text-label">Route timeline</h2>
          <span className="ml-auto text-[9px] text-muted">Stop order</span>
          <CaretDown size={12} className={`shrink-0 text-muted transition-transform ${timelineOpen ? '' : '-rotate-90'}`} />
        </button>
      )}

      {(collapsed || timelineOpen) && <div ref={timelineRef} data-collapsed={collapsed} className={`route-timeline-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain ${collapsed ? 'px-1 py-2' : 'px-2 pb-2'}`}>
        <ol>
          {displayedNodes.map((node) => {
            const { stop } = node
            const index = node.routeIndex
            const isActive = shownActive === stop.id
            const isFirstPast = stop.id === firstPastLimitId
            const state = stopState(node, nextId, pastLimitIds)
            const isRed = stop.status === 'failed' || pastLimitIds.has(stop.id) || node.late
            const timePrefix = view.staleness !== 'fresh' && stop.status === 'pending' ? '~' : ''
            const completed = stop.status === 'done'
            const connectorTone = completed ? 'route-history-node' : isRed ? 'bg-act-now-fill/70' : 'bg-line'
            const rowSize = collapsed ? completed ? 'h-5' : 'h-7' : completed ? 'min-h-8' : 'min-h-10'
            return (
              <li key={stop.id}>
                <button
                  ref={(element) => {
                    if (element) nodeRefs.current.set(stop.id, element)
                    else nodeRefs.current.delete(stop.id)
                  }}
                  type="button"
                  onClick={() => jump(stop.id)}
                  aria-current={isActive ? 'location' : undefined}
                  aria-label={`Stop ${stop.seq}, ${node.customer}, ${fmtClock(node.t)}, ${state}`}
                  title={`${stop.seq} · ${node.customer} · ${fmtClock(node.t)} · ${state}`}
                  style={collapsed ? undefined : TIMELINE_COLUMNS}
                  className={`${collapsed ? `flex ${rowSize} w-full items-center justify-center rounded-control hover:bg-board/70` : `grid ${rowSize} w-full items-stretch rounded-control text-left transition ${rowTone(node, pastLimitIds)}`}`}
                >
                  <span className={`relative flex ${collapsed ? rowSize : 'h-full min-h-7'} items-center justify-center`}>
                    <span className={`absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 ${connectorTone}`} style={completed ? stopHistoryStyle(index - 0.5, lastCompleteIndex) : undefined} />
                    <span className={`absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 ${connectorTone}`} style={completed ? stopHistoryStyle(index + 0.5, lastCompleteIndex) : undefined} />
                    <StopStatusMarker stop={stop} pastLimit={pastLimitIds.has(stop.id)} late={node.late} active={isActive} className={`motion-safe:transition-[width,height] motion-safe:duration-150 ${detailNodeSize(index, firstRemainingIndex, stop.status)}`} style={completed ? stopHistoryStyle(index, lastCompleteIndex) : undefined} />
                  </span>
                  {!collapsed && (
                    <span className="min-w-0 py-1 pl-2 pr-2">
                      <span className={`tnum block text-[8px] ${isRed ? 'font-semibold text-act-now' : 'text-label'}`}>{timePrefix}{fmtClock(node.t)}</span>
                      <span className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
                        <span className={`tnum shrink-0 text-[9px] font-semibold ${isRed ? 'text-act-now' : 'text-muted'}`}>{stop.seq}</span>
                        <span className={`truncate text-[10px] ${isActive ? 'font-semibold text-ink' : isRed ? 'font-semibold text-act-now' : stop.status === 'done' ? 'text-muted' : 'text-ink'}`}>{node.customer}</span>
                      </span>
                    </span>
                  )}
                </button>
                {isFirstPast && (
                  <div style={collapsed ? undefined : TIMELINE_COLUMNS} className={`${collapsed ? 'my-1 flex justify-center' : 'grid h-6 items-center'}`} title="The remaining route crosses the driver's 11-hour HOS limit here">
                    {collapsed ? (
                      <span className="h-px w-7 bg-act-now-fill" />
                    ) : (
                      <>
                        <span className="relative flex h-6 items-center justify-center"><span className="absolute inset-y-0 w-px bg-act-now-fill" /><span className="relative h-px w-4 bg-act-now-fill" /></span>
                        <span className="pl-2 text-[8px] font-semibold uppercase tracking-[0.05em] text-act-now">HOS limit</span>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>}

      {!collapsed && !timelineOpen && <div className="min-h-0 flex-1 border-t border-line bg-board/45" />}

      {!collapsed && timelineOpen && (
        <div className="flex shrink-0 items-center gap-3 border-t border-line px-3 py-2 text-[8px] text-label">
          <span className="flex items-center gap-1"><span className="route-history-progress flex h-2.5 w-2.5 items-center justify-center rounded-full text-on-accent"><Check size={7} weight="bold" className="drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]" /></span> delivered</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-muted/70" /> undelivered</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-act-now" /> late / HOS</span>
        </div>
      )}
    </nav>
  )
}
