import type { Derived } from '../store/derive'
import type { Reply } from './intents'
import LookoutAvatar from './LookoutAvatar'
import RecommendationCard from './RecommendationCard'

export interface Message {
  role: 'user' | 'lookout'
  text: string
  reply?: Reply
}

/** The conversation. Replies render the same cards the recommendations bar shows, so the two
 *  can never disagree. */
export default function ChatThread({ messages, d, onExample }: { messages: Message[]; d: Derived; onExample: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <p key={i} className="ml-8 self-end rounded-card bg-ink px-3 py-2 text-[12px] text-on-accent">{m.text}</p>
        ) : (
          <div key={i} className="flex gap-2">
            <LookoutAvatar size={22} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              {m.text && <p className="font-lookout text-[12px] leading-snug text-ink">{m.text}</p>}
              {m.reply?.examples && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.reply.examples.map((e) => (
                    <button key={e} type="button" onClick={() => onExample(e)} className="rounded-full border border-line bg-panel px-2 py-0.5 font-lookout text-[11px] text-ink hover:border-lookout hover:text-lookout-strong">{e}</button>
                  ))}
                </div>
              )}
              {m.reply?.driverIds && m.reply.driverIds.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {m.reply.driverIds.slice(0, 3).map((id) => {
                    const view = d.byId.get(id)
                    const card = d.cardById.get(id)
                    return view && card ? <RecommendationCard key={id} view={view} card={card} compact /> : null
                  })}
                  {m.reply.driverIds.length > 3 && <p className="font-lookout text-[11px] text-muted">and {m.reply.driverIds.length - 3} more on the board.</p>}
                </div>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
