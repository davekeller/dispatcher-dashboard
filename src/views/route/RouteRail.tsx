import { ArrowLeft, SidebarSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Delivery, DutyStatus, Stop } from '../../data/types'
import { knownSegments, projectedEta } from '../../hos/compute'
import { fmtClock } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'

const FILL: Record<DutyStatus, string> = { driving: 'bg-ink', on_duty: 'bg-muted', on_break: 'bg-break-fill', off_duty: 'bg-offline-fill' }
const TRACK_LEFT = 'left-3' // where the axis sits in the collapsed rail
const LABEL_GAP_PX = 26 // labels (two lines each) closer than this to the previous one stay hidden; hover still tells

interface Node {
  stop: Stop
  t: number
  late: boolean
}

/** The route file's left rail, in the case-file navigation pattern. A vertical time axis from
 *  the start of the shift through the projected finish: the duty timeline up to now, a dashed
 *  projection after it, every stop as a node at its actual or projected time, the now marker,
 *  and the limit mark with the axis red past it. The node whose receipt is in view is lit;
 *  clicking a node scrolls to its receipt. Collapse is controlled by the page. */
export default function RouteRail({ view, deliveryById, pastLimitIds, collapsed, onCollapsedChange }: { view: DriverView; deliveryById: Map<string, Delivery>; pastLimitIds: Set<string>; collapsed: boolean; onCollapsedChange: (c: boolean) => void }) {
  const { route, now, limitHitAt } = view
  const start = view.driver.shiftStartedAt
  const end = Math.max(view.projectedFinishAt ?? now, limitHitAt, (view.plannedResetAt ?? 0) + 20 * MIN, now + 20 * MIN) + 10 * MIN
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100))
  const segments = knownSegments(view.driver, now)
  const nodes = useMemo<Node[]>(() => {
    return route.stops
      .map((s) => {
        const t = s.status === 'done' || s.status === 'failed' ? (s.departedAt ?? s.plannedEta) : s.status === 'in_progress' ? (s.arrivedAt ?? now) : projectedEta(s, view.driftMin)
        const win = deliveryById.get(s.deliveryId)?.window.end
        return { stop: s, t, late: s.status === 'pending' && win !== undefined && t > win }
      })
      .sort((a, b) => a.t - b.t)
  }, [route.stops, now, view.driftMin, deliveryById])

  // The lit node follows the receipt in view, the way the case-file nav follows its sections.
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = route.stops.map((s) => document.getElementById(`stop-${s.id}`)).filter((n): n is HTMLElement => Boolean(n))
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id.replace('stop-', ''))
      },
      { rootMargin: '-15% 0px -65% 0px', threshold: [0, 0.5] },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [route.stops])

  // Label collision: with the axis proportional to time, two quick stops can sit a few pixels apart.
  const axisRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(600)
  useEffect(() => {
    const el = axisRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.clientHeight))
    ro.observe(el)
    setHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  const over = view.minutesUntilLimit <= 0
  const limitWithin = limitHitAt > start && limitHitAt < end
  const reserved = [(pct(now) / 100) * height, ...(limitWithin ? [(pct(over ? now : limitHitAt) / 100) * height] : [])]
  let lastLabelY = -Infinity
  const showLabel = nodes.map((n) => {
    const y = (pct(n.t) / 100) * height
    const ok = y - lastLabelY >= LABEL_GAP_PX && reserved.every((r) => Math.abs(y - r) >= LABEL_GAP_PX * 0.6)
    if (ok) lastLabelY = y
    return ok
  })

  const hourTicks: number[] = []
  const firstHour = new Date(start)
  firstHour.setMinutes(0, 0, 0)
  for (let t = firstHour.getTime() + 60 * MIN; t < end; t += 60 * MIN) if (t > start) hourTicks.push(t)
  const jump = (id: string) => {
    setActive(id)
    document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <nav aria-label="Route" className={`sticky top-0 flex h-[calc(100vh-3.5rem-2.5rem)] shrink-0 flex-col rounded-card border border-line bg-panel shadow-card transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-44'}`}>
      <div className={`flex items-center border-b border-line px-2 py-2 ${collapsed ? 'flex-col gap-1' : 'gap-2'}`}>
        <Link to="/" title="Back to the board" aria-label="Back to the board" className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-well hover:text-ink">
          <ArrowLeft size={16} />
        </Link>
        {!collapsed && <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">{view.driver.name} · {view.truck.plate}</span>}
        <button type="button" onClick={() => onCollapsedChange(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand the route rail' : 'Collapse the route rail'} title={collapsed ? 'Expand' : 'Collapse'} className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-well hover:text-ink">
          <SidebarSimple size={16} className={collapsed ? '-scale-x-100' : ''} />
        </button>
      </div>

      <div ref={axisRef} className="relative min-h-0 flex-1 overflow-hidden px-2 py-3">
        {/* the axis: past = duty, future = projection */}
        <div className={`absolute ${TRACK_LEFT} top-3 bottom-3 w-1.5 rounded-full bg-well`} aria-hidden="true" />
        <div className={`absolute ${TRACK_LEFT} w-1.5 border-l-2 border-dashed ${over ? 'border-act-now/60' : 'border-line'}`} style={{ top: `calc(0.75rem + ${pct(now)}% * (1 - 1.5rem / 100%))` }} aria-hidden="true" />
        <div className="absolute inset-x-0 top-3 bottom-3" aria-hidden="true">
          <div className={`absolute ${TRACK_LEFT} top-0 bottom-0 w-1.5`}>
            {/* future projection, red past the limit */}
            <div className="absolute inset-x-0 border-l-2 border-dashed border-line" style={{ top: `${pct(now)}%`, bottom: 0, left: 2 }} />
            {limitWithin && !over && <div className="absolute border-l-2 border-dashed border-act-now" style={{ top: `${pct(limitHitAt)}%`, bottom: 0, left: 2 }} />}
            {over && <div className="absolute border-l-2 border-dashed border-act-now" style={{ top: `${pct(now)}%`, bottom: 0, left: 2 }} />}
            {/* duty segments up to now; planned ones dashed */}
            {segments.map((s, i) => {
              const s0 = Math.max(s.startedAt, start)
              const s1 = Math.min(s.endedAt ?? now, end)
              if (s1 <= s0) return null
              return <div key={i} className={`absolute inset-x-0 rounded-full ${FILL[s.status]} ${s.planned ? 'opacity-50' : ''}`} style={{ top: `${pct(s0)}%`, height: `${pct(s1) - pct(s0)}%`, ...(s.planned ? { backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.7) 3px 5px)' } : {}) }} />
            })}
          </div>
          {/* hour ticks: marks on the track, no text; horizontal room is for the stops */}
          {hourTicks.map((t) => (
            <span key={t} className="absolute left-2 h-px w-2.5 bg-line" style={{ top: `${pct(t)}%` }} />
          ))}
          {/* now */}
          <div className="absolute left-1.5 -translate-y-1/2" style={{ top: `${pct(now)}%` }}>
            <span className="block h-0.5 w-4 bg-ink" />
            {!collapsed && <span className="tnum absolute left-6 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded bg-panel px-1 text-[10px] font-semibold text-ink">now · {fmtClock(now)}</span>}
          </div>
          {/* the limit */}
          {limitWithin && (
            <div className="absolute left-1.5 -translate-y-1/2" style={{ top: `${pct(over ? now : limitHitAt)}%` }}>
              <span className="block h-0.5 w-4 bg-act-now" />
              {!collapsed && <span className="tnum absolute left-6 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded bg-panel px-1 text-[10px] font-semibold text-act-now">{over ? 'over the limit' : `limit · ${fmtClock(limitHitAt)}`}</span>}
            </div>
          )}
          {/* stops */}
          {nodes.map((n, i) => {
            const s = n.stop
            const isActive = active === s.id
            const isNext = view.next?.id === s.id
            const past = pastLimitIds.has(s.id)
            const dot =
              s.status === 'done' ? 'bg-ink' : s.status === 'failed' ? 'bg-act-now' : isNext || s.status === 'in_progress' ? 'border-2 border-break bg-panel' : s.status === 'unassigned' ? 'border-2 border-dashed border-offline bg-panel' : past ? 'border-2 border-act-now bg-panel' : 'border-2 border-muted bg-panel'
            const customer = deliveryById.get(s.deliveryId)?.customer ?? s.deliveryId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(s.id)}
                aria-current={isActive ? 'location' : undefined}
                title={`${s.seq} · ${customer} · ${fmtClock(n.t)}`}
                className="group absolute left-0 flex -translate-y-1/2 items-center gap-2"
                style={{ top: `${pct(n.t)}%` }}
              >
                <span className={`ml-[7px] block h-3 w-3 shrink-0 rounded-full transition ${dot} ${isActive ? 'ring-4 ring-lookout/30' : ''}`} />
                {!collapsed && showLabel[i] && (
                  <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                    <span className={`max-w-[7.5rem] truncate text-[10px] ${isActive ? 'font-semibold text-ink' : s.status === 'done' ? 'text-muted' : 'text-ink'} group-hover:text-ink`}>{customer}</span>
                    <span className={`tnum text-[9px] ${n.late ? 'font-semibold text-watch' : 'text-label'}`}>{s.seq} · {fmtClock(n.t)}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {!collapsed && (
        <div className="border-t border-line px-3 py-2 text-[9px] leading-4 text-label">
          <span className="mr-2 inline-block h-2 w-2 rounded-sm bg-ink align-middle" />driving <span className="mx-1.5 inline-block h-2 w-2 rounded-sm bg-muted align-middle" />on duty <span className="mx-1.5 inline-block h-2 w-2 rounded-sm bg-break-fill align-middle" />break
        </div>
      )}
    </nav>
  )
}
