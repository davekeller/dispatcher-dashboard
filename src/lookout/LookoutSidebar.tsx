import { CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { useActions } from '../actions/ActionContext'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'
import { NAV_ITEM_BASE, navigationItemState } from '../ui/navigation'
import ChatThread, { type Message } from './ChatThread'
import Composer from './Composer'
import { INTENTS, matchIntent } from './intents'
import LookoutAvatar from './LookoutAvatar'
import { useLookout } from './LookoutContext'
import PlanCard from './PlanCard'
import { routePlans } from './plans'
import RecommendationCard from './RecommendationCard'
import RecommendationsBar from './RecommendationsBar'
import TimelinePanel from './TimelinePanel'
import { LOOKOUT } from './voice'

const TOP_N = 3

/** Lookout never has its own data. It reads `ranked` and nothing else. Two tabs: Chat, with the
 *  recommendations as a sticky bar over the conversation, and Timeline, the shift's log. The
 *  composer is on both; sending from the timeline lands in the chat. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed, focusDriverId } = useLookout()
  const { open } = useActions()
  const d = useDerived()
  const events = useStore((s) => s.events)
  const { ranked, byId } = d
  const [tab, setTab] = useState<'chat' | 'timeline'>('chat')
  const [recOpen, setRecOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ role: 'lookout', text: LOOKOUT.chatIntro, reply: { text: '', examples: INTENTS.map((i) => i.example) } }])

  const withAlerts = ranked.filter((c) => c.alerts.length > 0)
  const urgentCards = withAlerts.filter((c) => c.severity === 'critical' || c.severity === 'act_now')
  // A focused driver (a route file, a fleet-map pick) gets plans for that route instead of the generic card.
  const focusView = focusDriverId ? byId.get(focusDriverId) : undefined
  const focusCard = focusDriverId ? d.cardById.get(focusDriverId) : undefined
  const plans = focusView && focusCard ? routePlans(focusView, focusCard, d) : []
  const rest = focusDriverId ? withAlerts.filter((c) => c.driverId !== focusDriverId) : withAlerts
  const shown = showAll ? rest : rest.slice(0, TOP_N)
  const hidden = rest.length - shown.length
  const first = urgentCards[0] ? byId.get(urgentCards[0].driverId)?.driver.name : undefined
  const summary = LOOKOUT.summary(urgentCards.length, first)

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const reply = matchIntent(trimmed, d)
    setMessages((m) => [...m, { role: 'user', text: trimmed }, { role: 'lookout', text: reply.text, reply }])
    setTab('chat')
    if (reply.open) open(reply.open.action, reply.open.driverId)
  }

  if (collapsed) {
    return (
      <aside className="lookout-panel flex w-14 shrink-0 flex-col items-center border-l border-line" aria-label={`${LOOKOUT.name}, collapsed`}>
        <button type="button" onClick={() => setCollapsed(false)} className="flex h-14 w-full items-center justify-center text-lookout-strong hover:bg-well" aria-label={`Open ${LOOKOUT.name}`}>
          <CaretDoubleLeft size={16} />
        </button>
        <LookoutAvatar size={28} className="mt-2" />
        {urgentCards.length > 0 && <span className="tnum mt-2 rounded-full bg-act-now px-1.5 text-[11px] font-semibold text-on-accent" title={`${urgentCards.length} need action now`}>{urgentCards.length}</span>}
      </aside>
    )
  }

  return (
    <aside className="lookout-panel flex w-[26rem] shrink-0 flex-col border-l border-line" aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel/90 pl-2 pr-1.5 backdrop-blur">
        <div className="flex items-center gap-0.5" role="tablist" aria-label={`${LOOKOUT.name} views`}>
          {(['chat', 'timeline'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`${NAV_ITEM_BASE} font-lookout text-[12px] capitalize ${navigationItemState(tab === t)}`}>
              {t}
              {t === 'chat' && urgentCards.length > 0 && <span className="tnum rounded-full bg-act-now px-1.5 text-[10px] font-semibold leading-4 text-on-accent" title={`${urgentCards.length} need action now`}>{urgentCards.length}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto min-w-0 text-right font-lookout">
          <p className="text-[14px] font-semibold leading-tight text-lookout-strong">{LOOKOUT.name}</p>
          <p className="text-[10px] leading-tight text-muted">{LOOKOUT.role}</p>
        </div>
        <LookoutAvatar size={30} className="shrink-0" />
        <button type="button" onClick={() => setCollapsed(true)} className="rounded-control p-0.5 text-muted hover:bg-well hover:text-ink" aria-label={`Collapse ${LOOKOUT.name}`}>
          <CaretDoubleRight size={16} />
        </button>
      </header>
      {tab === 'chat' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RecommendationsBar open={recOpen} onToggle={() => setRecOpen((o) => !o)} summary={summary}>
            {focusView && plans.length > 0 && (
              <>
                <p className="font-lookout text-[11px] font-semibold uppercase tracking-wide text-label">{LOOKOUT.focusIntro(focusView.driver.name)}</p>
                {plans.map((plan) => <PlanCard key={plan.id} plan={plan} view={focusView} />)}
                {rest.length > 0 && <p className="mt-1 font-lookout text-[11px] font-semibold uppercase tracking-wide text-label">Everyone else</p>}
              </>
            )}
            {shown.map((c) => <RecommendationCard key={c.driverId} view={byId.get(c.driverId)!} card={c} compact />)}
            {hidden > 0 && <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>Show {hidden} more</Button>}
            {showAll && rest.length > TOP_N && <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>Show fewer</Button>}
            {withAlerts.length === 0 && !focusView && <p className="font-lookout text-[12px] text-muted">{LOOKOUT.allClear(d.metrics.onShift)}</p>}
          </RecommendationsBar>
          <ChatThread messages={messages} d={d} onExample={send} />
        </div>
      ) : (
        <TimelinePanel events={events} />
      )}
      <Composer onSend={send} />
    </aside>
  )
}
