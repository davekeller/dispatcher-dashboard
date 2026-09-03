import { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import Button from './Button'

const LINGER_MS = 10_000

/** The result of the last action, with a ten-second undo. Everything is local, so the commit
 *  is instant; this is what makes it read as consequential. */
export default function Toast() {
  const last = useStore((s) => s.lastAction)
  const canUndo = useStore((s) => s.undoSnapshot !== undefined)
  const undo = useStore((s) => s.undo)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!last) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), LINGER_MS)
    return () => clearTimeout(id)
  }, [last])
  if (!last || !visible) return null
  return (
    <div role="status" className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-card border border-line bg-ink px-4 py-2.5 text-[13px] text-on-accent shadow-card">
      <span className="font-semibold">{last.label}</span>
      {last.undoable && canUndo && (
        <Button size="sm" variant="ghost" className="text-on-accent hover:bg-on-accent/10 hover:text-on-accent" onClick={() => { undo(); setVisible(false) }}>Undo</Button>
      )}
    </div>
  )
}
