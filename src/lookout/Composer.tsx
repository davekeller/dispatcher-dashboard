import { PaperPlaneRight } from '@phosphor-icons/react'
import { useState } from 'react'
import Button from '../ui/Button'
import { LOOKOUT } from './voice'

/** The way to start a conversation, on every tab. */
export default function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <form
      className="flex shrink-0 items-center gap-2 border-t border-line bg-panel/85 p-3 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.trim()) return
        onSend(draft)
        setDraft('')
      }}
    >
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask ${LOOKOUT.name}…`} aria-label={`Ask ${LOOKOUT.name}`} className="iq-input-ring h-9 min-w-0 flex-1 rounded-control border px-3 text-[13px] outline-none placeholder:text-muted focus:ring-2 focus:ring-lookout/15" />
      <Button type="submit" size="md" variant="lookout" aria-label="Send" disabled={!draft.trim()}><PaperPlaneRight size={16} /></Button>
    </form>
  )
}
