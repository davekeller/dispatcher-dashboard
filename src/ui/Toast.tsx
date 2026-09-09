import { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import Button from './Button'

const LINGER_MS = 10_000
/** How long the leave animation runs; the element unmounts after it, with or without motion. */
const LEAVE_MS = 200

/** The result of the last action, with a ten-second undo. Everything is local, so the commit
 *  is instant; this is what makes it read as consequential. It rises from the bottom center and,
 *  when its time is up or the undo is taken, settles back down before it goes. */
export default function Toast() {
  const last = useStore((s) => s.lastAction)
  const canUndo = useStore((s) => s.undoSnapshot !== undefined)
  const undo = useStore((s) => s.undo)
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'leaving'>('hidden')

  useEffect(() => {
    if (!last) return
    setPhase('shown')
    const leave = setTimeout(() => setPhase('leaving'), LINGER_MS)
    return () => clearTimeout(leave)
  }, [last])

  useEffect(() => {
    if (phase !== 'leaving') return
    const gone = setTimeout(() => setPhase('hidden'), LEAVE_MS)
    return () => clearTimeout(gone)
  }, [phase])

  if (!last || phase === 'hidden') return null
  return (
    // Keyed on the action's time, so a new result while one is showing rises in fresh instead of swapping its text.
    <div key={last.at} role="status" className={`toast fixed bottom-5 left-1/2 z-50 flex items-center gap-3 rounded-card border border-line bg-ink px-4 py-2.5 text-[13px] text-on-accent shadow-card ${phase === 'leaving' ? 'toast-leave' : 'toast-enter'}`}>
      <span className="font-semibold">{last.label}</span>
      {last.undoable && canUndo && (
        <Button size="sm" variant="ghost" className="text-on-accent hover:bg-on-accent/10 hover:text-on-accent" onClick={() => { undo(); setPhase('leaving') }}>Undo</Button>
      )}
    </div>
  )
}
