import { ArrowUp } from '@phosphor-icons/react'
import { useState } from 'react'
import Button from '../ui/Button'
import LookoutAvatar from './LookoutAvatar'
import { LOOKOUT } from './voice'

/** The way to start a conversation, on every tab. */
export default function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <form
      className="shrink-0 border-t border-line bg-panel/85 p-3 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.trim()) return
        onSend(draft)
        setDraft('')
      }}
    >
      <div className="lookout-composer-shell flex h-11 items-center gap-2 rounded-full border-2 py-1 pl-2 pr-1">
        <LookoutAvatar size={25} className="shrink-0" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask ${LOOKOUT.name}…`} aria-label={`Ask ${LOOKOUT.name}`} className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted" />
        <Button type="submit" size="md" variant="primary" iconOnly className="shrink-0 rounded-full" aria-label="Send" disabled={!draft.trim()}><ArrowUp size={16} weight="bold" /></Button>
      </div>
    </form>
  )
}
