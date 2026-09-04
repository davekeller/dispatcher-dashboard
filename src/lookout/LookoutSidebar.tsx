import { CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { useDerived } from '../store/hooks'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import ChatPanel from './ChatPanel'
import LookoutAvatar from './LookoutAvatar'
import { useLookout } from './LookoutContext'
import RecommendationCard from './RecommendationCard'
import { LOOKOUT } from './voice'

const TOP_N = 3

/** Lookout never has its own data. It reads `ranked` and nothing else. Two tabs: Alerts, the
 *  top few with the rest behind a count, and Chat, a conversational way to the same cards. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed, focusDriverId } = useLookout()
  const d = useDerived()
  const { ranked, byId, metrics } = d
  const [tab, setTab] = useState<'alerts' | 'chat'>('alerts')
  const [showAll, setShowAll] = useState(false)
  const withAlerts = ranked.filter((c) => c.alerts.length > 0)
  const urgentCards = withAlerts.filter((c) => c.severity === 'critical' || c.severity === 'act_now')
  const pinned = focusDriverId ? withAlerts.find((c) => c.driverId === focusDriverId) : undefined
  const rest = pinned ? withAlerts.filter((c) => c.driverId !== pinned.driverId) : withAlerts
  const shown = showAll ? rest : rest.slice(0, TOP_N)
  const hidden = rest.length - shown.length
  const first = urgentCards[0] ? byId.get(urgentCards[0].driverId)?.driver.name : undefined

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, collapsed`}>
        <button type="button" onClick={() => setCollapsed(false)} className="flex h-14 w-full items-center justify-center text-lookout-strong hover:bg-well" aria-label={`Open ${LOOKOUT.name}`}>
          <CaretDoubleLeft size={16} />
        </button>
        <LookoutAvatar size={28} className="mt-2" />
        {urgentCards.length > 0 && <span className="tnum mt-2 rounded-full bg-act-now px-1.5 text-[11px] font-semibold text-on-accent" title={`${urgentCards.length} need action now`}>{urgentCards.length}</span>}
      </aside>
    )
  }

  return (
    <aside className="flex w-[26rem] shrink-0 flex-col border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-2 pr-3">
        <div className="flex h-full items-end" role="tablist" aria-label={`${LOOKOUT.name} views`}>
          {(['alerts', 'chat'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px flex h-full items-center gap-1.5 border-b-2 px-3 text-[12px] font-semibold capitalize ${tab === t ? 'border-lookout text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
              {t}
              {t === 'alerts' && withAlerts.length > 0 && <span className={`tnum rounded-full px-1.5 text-[10px] leading-4 ${urgentCards.length > 0 ? 'bg-act-now text-on-accent' : 'bg-well text-muted'}`}>{withAlerts.length}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto min-w-0 text-right">
          <p className="font-display text-[14px] font-semibold leading-tight text-lookout-strong">{LOOKOUT.name}</p>
          <p className="text-[10px] leading-tight text-muted">{LOOKOUT.role}</p>
        </div>
        <LookoutAvatar size={30} className="shrink-0" />
        <button type="button" onClick={() => setCollapsed(true)} className="rounded-control p-1 text-muted hover:bg-well hover:text-ink" aria-label={`Collapse ${LOOKOUT.name}`}>
          <CaretDoubleRight size={16} />
        </button>
      </header>
      {tab === 'chat' ? (
        <ChatPanel d={d} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <p className="text-[12px] text-ink">{LOOKOUT.summary(urgentCards.length, first)}</p>
          {pinned && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{LOOKOUT.focusIntro(byId.get(pinned.driverId)!.driver.name)}</p>
              <RecommendationCard view={byId.get(pinned.driverId)!} card={pinned} pinned />
              {rest.length > 0 && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-label">Everyone else</p>}
            </>
          )}
          {shown.map((c) => <RecommendationCard key={c.driverId} view={byId.get(c.driverId)!} card={c} />)}
          {hidden > 0 && <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>Show {hidden} more</Button>}
          {showAll && rest.length > TOP_N && <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>Show fewer</Button>}
          {withAlerts.length === 0 && <EmptyState title={LOOKOUT.allClear(metrics.onShift)} body={`${LOOKOUT.name} re-checks every 5 seconds.`} />}
        </div>
      )}
    </aside>
  )
}
