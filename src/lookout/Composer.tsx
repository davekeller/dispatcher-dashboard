import { PaperPlaneRight } from '@phosphor-icons/react'
import { useState } from 'react'
import Button from '../ui/Button'
import { LOOKOUT } from './voice'

/** The way to start a conversation, on every tab. */
export default function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <form
      className="flex shrink-0 items-center gap-2 border-t border-line p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.trim()) return
        onSend(draft)
        setDraft('')
      }}
    >
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask ${LOOKOUT.name}…`} aria-label={`Ask ${LOOKOUT.name}`} className="h-9 min-w-0 flex-1 rounded-control border border-line bg-panel px-3 text-[13px] outline-none placeholder:text-muted focus:border-lookout/60" />
      <Button type="submit" size="md" variant="lookout" aria-label="Send" disabled={!draft.trim()}><PaperPlaneRight size={16} /></Button>
    </form>
  )
}
