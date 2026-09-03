import { CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react'
import { useDerived } from '../store/hooks'
import EmptyState from '../ui/EmptyState'
import AlertBar from './AlertBar'
import { useLookout } from './LookoutContext'
import RecommendationCard from './RecommendationCard'
import { LOOKOUT } from './voice'

/** Lookout never has its own data. It reads `ranked` and nothing else. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed, focusDriverId } = useLookout()
  const { ranked, byId, metrics } = useDerived()
  const withAlerts = ranked.filter((c) => c.alerts.length > 0)
  const urgent = withAlerts.filter((c) => c.severity === 'critical' || c.severity === 'act_now').length
  const bar = withAlerts.slice(0, 3)
  const pinned = focusDriverId ? withAlerts.find((c) => c.driverId === focusDriverId) : undefined
  const rest = pinned ? withAlerts.filter((c) => c.driverId !== pinned.driverId) : withAlerts

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, collapsed`}>
        <button type="button" onClick={() => setCollapsed(false)} className="flex h-14 w-full items-center justify-center text-lookout-strong hover:bg-well" aria-label={`Open ${LOOKOUT.name}`}>
          <CaretDoubleLeft size={16} />
        </button>
        <span className="mt-2 font-display text-[15px] font-semibold text-lookout-strong">L</span>
        {urgent > 0 && <span className="tnum mt-2 rounded-full bg-act-now px-1.5 text-[11px] font-semibold text-on-accent" title={`${urgent} need action now`}>{urgent}</span>}
      </aside>
    )
  }

  return (
    <aside className="flex w-[26rem] shrink-0 flex-col border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <header className="flex h-14 items-center gap-2 border-b border-line px-4">
        <span className="text-lookout" aria-hidden="true">✦</span>
        <span className="font-display text-[15px] font-semibold text-lookout-strong">{LOOKOUT.name}</span>
        <span className="text-[11px] text-muted">{LOOKOUT.tagline}</span>
        <button type="button" onClick={() => setCollapsed(true)} className="ml-auto rounded-control p-1 text-muted hover:bg-well hover:text-ink" aria-label={`Collapse ${LOOKOUT.name}`}>
          <CaretDoubleRight size={16} />
        </button>
      </header>
      {bar.length > 0 && <AlertBar cards={bar} byId={byId} />}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {pinned && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{LOOKOUT.focusIntro(byId.get(pinned.driverId)!.driver.name)}</p>
            <RecommendationCard view={byId.get(pinned.driverId)!} card={pinned} pinned />
            {rest.length > 0 && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-label">Everyone else</p>}
          </>
        )}
        {rest.map((c) => <RecommendationCard key={c.driverId} view={byId.get(c.driverId)!} card={c} />)}
        {withAlerts.length === 0 && <EmptyState title={LOOKOUT.allClear(metrics.onShift)} body="Lookout re-checks every 5 seconds." />}
      </div>
    </aside>
  )
}
