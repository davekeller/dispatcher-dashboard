import { CaretDoubleRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { useActions } from '../actions/ActionContext'
import { useDerived } from '../store/hooks'
import Button from '../ui/Button'
import { NAV_ITEM_BASE, navigationItemState } from '../ui/navigation'
import ArtifactsPanel from './ArtifactsPanel'
import ChatThread, { type Message } from './ChatThread'
import Composer from './Composer'
import { INTENTS, matchIntent } from './intents'
import LookoutAvatar from './LookoutAvatar'
import { useLookout } from './LookoutContext'
import PlanCard from './PlanCard'
import { routePlans } from './plans'
import RecommendationCard from './RecommendationCard'
import RecommendationsBar from './RecommendationsBar'
import { LOOKOUT } from './voice'

const TOP_N = 3
/** On a route file the focused route's plans are the point; everyone else gets one card and a count. */
const FOCUS_TOP_N = 1

/** Lookout never has its own data. It reads `ranked` and nothing else. Chat carries the live
 * recommendations; Artifacts is deliberately reserved as an empty workspace for later. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed, focusDriverId } = useLookout()
  const { open } = useActions()
  const d = useDerived()
  const { ranked, byId } = d
  const [tab, setTab] = useState<'chat' | 'artifacts'>('chat')
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
  const topN = focusView ? FOCUS_TOP_N : TOP_N
  const shown = showAll ? rest : rest.slice(0, topN)
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


  return (
    // Collapsed, the slot closes to zero and the panel slides off to the right; the product bar's Ask Lookout pill brings it back.
    <div className={`lookout-slot min-w-0 shrink-0 ${collapsed ? 'is-closed w-0' : 'w-[26rem]'}`} aria-hidden={collapsed}>
    <aside className="lookout-panel flex h-full w-[26rem] shrink-0 flex-col border-l border-line" aria-label={`${LOOKOUT.name}, the shift co-pilot`} inert={collapsed || undefined}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel/90 pl-2 pr-1.5 backdrop-blur">
        <div className="flex items-center gap-0.5" role="tablist" aria-label={`${LOOKOUT.name} views`}>
          {(['chat', 'artifacts'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`${NAV_ITEM_BASE} font-lookout text-[12px] capitalize ${navigationItemState(tab === t)}`}>
              {t}
              {t === 'chat' && urgentCards.length > 0 && <span className={`tnum inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${tab === t ? 'bg-on-accent text-act-now' : 'bg-act-now text-on-accent'}`} title={`${urgentCards.length} need action now`}>{urgentCards.length}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto min-w-0 text-right font-lookout">
          <p className="text-[14px] font-semibold leading-tight text-ink">{LOOKOUT.name}</p>
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
            {showAll && rest.length > topN && <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>Show fewer</Button>}
            {withAlerts.length === 0 && !focusView && <p className="font-lookout text-[12px] text-muted">{LOOKOUT.allClear(d.metrics.onShift)}</p>}
          </RecommendationsBar>
          {/* The intro and its example prompts are the chat's empty state: shown only once the recommendations are collapsed, so an open rail is not two things asking for attention. */}
          <ChatThread messages={recOpen && messages.length === 1 ? [] : messages} d={d} onExample={send} />
        </div>
      ) : (
        <ArtifactsPanel />
      )}
      <Composer onSend={send} />
    </aside>
    </div>
  )
}
