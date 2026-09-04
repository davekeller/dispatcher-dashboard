import { PaperPlaneRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { useActions } from '../actions/ActionContext'
import type { Derived } from '../store/derive'
import Button from '../ui/Button'
import { INTENTS, matchIntent, type Reply } from './intents'
import LookoutAvatar from './LookoutAvatar'
import RecommendationCard from './RecommendationCard'
import { LOOKOUT } from './voice'

interface Message {
  role: 'user' | 'lookout'
  text: string
  reply?: Reply
}

/** A conversational way in. Intents are a lookup, not a model; the replies are the same cards
 *  the Alerts tab shows, so the two presentations can never disagree. */
export default function ChatPanel({ d }: { d: Derived }) {
  const { open } = useActions()
  const [messages, setMessages] = useState<Message[]>([{ role: 'lookout', text: LOOKOUT.chatIntro, reply: { text: '', examples: INTENTS.map((i) => i.example) } }])
  const [draft, setDraft] = useState('')

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const reply = matchIntent(trimmed, d)
    setMessages((m) => [...m, { role: 'user', text: trimmed }, { role: 'lookout', text: reply.text, reply }])
    setDraft('')
    if (reply.open) open(reply.open.action, reply.open.driverId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p key={i} className="ml-8 self-end rounded-card bg-ink px-3 py-2 text-[12px] text-on-accent">{m.text}</p>
          ) : (
            <div key={i} className="flex gap-2">
              <LookoutAvatar size={22} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {m.text && <p className="text-[12px] leading-snug text-ink">{m.text}</p>}
                {m.reply?.examples && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.reply.examples.map((e) => (
                      <button key={e} type="button" onClick={() => send(e)} className="rounded-full border border-line bg-panel px-2 py-0.5 text-[11px] text-ink hover:border-lookout hover:text-lookout-strong">{e}</button>
                    ))}
                  </div>
                )}
                {m.reply?.driverIds && m.reply.driverIds.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {m.reply.driverIds.slice(0, 3).map((id) => {
                      const view = d.byId.get(id)
                      const card = d.cardById.get(id)
                      return view && card ? <RecommendationCard key={id} view={view} card={card} /> : null
                    })}
                    {m.reply.driverIds.length > 3 && <p className="text-[11px] text-muted">and {m.reply.driverIds.length - 3} more on the board.</p>}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask ${LOOKOUT.name}…`} aria-label={`Ask ${LOOKOUT.name}`} className="h-9 min-w-0 flex-1 rounded-control border border-line bg-panel px-3 text-[13px] outline-none placeholder:text-muted focus:border-lookout/60" />
        <Button type="submit" size="md" variant="lookout" aria-label="Send" disabled={!draft.trim()}><PaperPlaneRight size={16} /></Button>
      </form>
    </div>
  )
}
