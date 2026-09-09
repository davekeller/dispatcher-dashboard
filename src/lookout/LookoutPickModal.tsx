import { createPortal } from 'react-dom'
import { RANK_KEYS } from '../alerts/rank'
import { RULES } from '../alerts/rules'
import type { DriverCard } from '../alerts/types'
import { useDerived } from '../store/hooks'
import type { DriverView } from '../store/view'
import Button from '../ui/Button'
import Chip from '../ui/Chip'
import Modal from '../ui/Modal'
import { severityTone } from '../ui/tones'
import { aboutReply } from './intents'
import LookoutAvatar from './LookoutAvatar'
import { useLookout } from './LookoutContext'
import { LOOKOUT } from './voice'

const SEVERITY_WORD = { critical: 'Over the limit', act_now: 'Act now', watch: 'Watch', info: 'Info' } as const

/** Opened from the ✦ chip on the board's top card. Why this card is first, how the order
 *  works (the rank's own keys), what Lookout watches for (the rules array), and the way to
 *  hand Lookout a directive: the chat. Every line reads the same data the board draws. */
export default function LookoutPickModal({ view, card, onClose }: { view: DriverView; card: DriverCard; onClose: () => void }) {
  const d = useDerived()
  const { requestCompose } = useLookout()
  const intro = aboutReply(d)
  const snoozedAbove = d.ranked.slice(0, d.ranked.indexOf(card)).filter((c) => c.snoozed).length
  const addDirective = () => {
    onClose()
    requestCompose()
  }
  // Portaled to the body: the board sits before the rail in the DOM and the rail is its own layer, so an in-place dialog would slide under it.
  return createPortal(
    <Modal
      title={LOOKOUT.pickTitle}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="lookout" className="font-lookout" onClick={addDirective}>Add a directive in chat</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="lookout-recommendations-surface flex items-start gap-3 rounded-card border border-line px-4 py-3">
          <LookoutAvatar size={30} className="mt-0.5 shrink-0" />
          <p className="font-lookout text-[13px] leading-5 text-ink">{intro.text}</p>
        </div>

        <section>
          <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{LOOKOUT.pickWhy(view.driver.name)}</h3>
          <p className="mt-1 text-[12px] text-muted">
            <span className="font-mono font-semibold text-ink">{view.route.id.toUpperCase()}</span> · {snoozedAbove === 0 ? LOOKOUT.pickTop : LOOKOUT.pickBehind(snoozedAbove)}
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {card.alerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-2.5 rounded-control border border-line bg-panel px-3 py-2">
                <Chip tone={severityTone(alert.severity)} className="mt-0.5">{alert.label}</Chip>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-4 text-ink">{alert.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">{alert.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">How {LOOKOUT.name} orders the shift</h3>
          <ol className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {RANK_KEYS.map((key, i) => (
              <li key={key.label} className="flex gap-2.5">
                <span className="tnum mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nav-selected-ink font-lookout text-[10px] font-semibold text-on-accent">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-4 text-ink">{key.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">{key.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">What {LOOKOUT.name} watches for</h3>
          <p className="mt-1 text-[12px] text-muted">Every rule, re-read against the clock on each tick. Nothing here is typed in by hand.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RULES.map((rule) => (
              <Chip key={rule.id} tone={severityTone(rule.severity)} title={`${rule.label} · ${SEVERITY_WORD[rule.severity]}`}>{rule.label}</Chip>
            ))}
          </div>
        </section>

        <div className="border-l-2 border-line pl-3">
          <p className="font-lookout text-[12px] leading-5 text-ink">{LOOKOUT.aboutTrust}</p>
          <p className="mt-1 font-lookout text-[12px] leading-5 text-muted">{LOOKOUT.directive}</p>
        </div>
      </div>
    </Modal>,
    document.body,
  )
}
