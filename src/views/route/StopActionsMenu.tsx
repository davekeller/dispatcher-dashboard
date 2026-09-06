import { ArrowsLeftRight, DotsThreeVertical, NotePencil, Prohibit } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActions } from '../../actions/ActionContext'
import type { Stop } from '../../data/types'
import { useStore } from '../../store/store'
import type { DriverView } from '../../store/view'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'

type Dialog = 'note' | 'cancel' | null

export default function StopActionsMenu({ stop, view, customer }: { stop: Stop; view: DriverView; customer: string }) {
  const { open: openAction } = useActions()
  const updateStopNote = useStore((state) => state.updateStopNote)
  const cancelStop = useStore((state) => state.cancelStop)
  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [draft, setDraft] = useState(stop.note ?? '')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const unresolved = stop.status === 'pending' || stop.status === 'unassigned'

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    const onMove = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  const toggleMenu = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = 176
      const height = 112
      setPosition({
        left: Math.max(8, rect.right - width),
        top: rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      })
    }
    setOpen((current) => !current)
  }

  const openNote = () => {
    setDraft(stop.note ?? '')
    setOpen(false)
    setDialog('note')
  }

  return (
    <>
      <div className="absolute right-1.5 top-1.5 z-20 flex items-center lg:top-1/2 lg:-translate-y-1/2">
        <button ref={buttonRef} type="button" onClick={toggleMenu} aria-haspopup="menu" aria-expanded={open} aria-label={`More actions for stop ${stop.seq}, ${customer}`} title="More stop actions" className="flex h-8 w-6 items-center justify-center rounded-control text-muted transition hover:bg-well hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15">
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      </div>

      {open && createPortal(
        <div ref={menuRef} role="menu" aria-label={`Actions for stop ${stop.seq}`} className="fixed z-50 w-44 rounded-card border border-line bg-panel p-1.5 shadow-lg" style={position}>
          <MenuItem icon={<ArrowsLeftRight size={15} />} label="Reassign stop" disabled={!unresolved} title={!unresolved ? 'Only pending or unassigned stops can be reassigned.' : undefined} onClick={() => { setOpen(false); openAction('reassign', view.driver.id, { stopIds: [stop.id] }) }} />
          <MenuItem icon={<NotePencil size={15} />} label={stop.note ? 'Edit note' : 'Add note'} onClick={openNote} />
          <MenuItem icon={<Prohibit size={15} />} label="Cancel stop" danger disabled={!unresolved} title={!unresolved ? 'Only pending or unassigned stops can be canceled.' : undefined} onClick={() => { setOpen(false); setDialog('cancel') }} />
        </div>,
        document.body,
      )}

      {dialog === 'note' && createPortal(
        <Modal
          title={`${stop.note ? 'Edit' : 'Add'} note · Stop ${stop.seq}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="primary" disabled={draft.trim() === (stop.note ?? '')} onClick={() => { updateStopNote(stop.id, draft); setDialog(null) }}>Save note</Button>
            </>
          }
        >
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-label" htmlFor={`stop-note-${stop.id}`}>Dispatcher note</label>
          <textarea id={`stop-note-${stop.id}`} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} placeholder={`Add handling or delivery context for ${customer}…`} className="mt-2 w-full resize-none rounded-control border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted/70 focus:border-ink/30 focus:ring-2 focus:ring-ink/10" />
          <p className="mt-2 text-[11px] text-muted">This note stays with the stop if it is reassigned.</p>
        </Modal>,
        document.body,
      )}

      {dialog === 'cancel' && createPortal(
        <Modal
          title={`Cancel stop ${stop.seq}?`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>Keep stop</Button>
              <Button variant="danger" onClick={() => { setDialog(null); cancelStop(stop.id) }}>Cancel stop</Button>
            </>
          }
        >
          <p className="text-[13px] leading-5 text-ink"><span className="font-semibold">{customer}</span> will be removed from this active route and the remaining stops will be renumbered.</p>
          <p className="mt-2 text-[11px] text-muted">The change is recorded in the shift timeline and can be undone from the confirmation message.</p>
        </Modal>,
        document.body,
      )}
    </>
  )
}

function MenuItem({ icon, label, onClick, disabled = false, danger = false, title }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; title?: string }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} title={title} onClick={onClick} className={`flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? 'text-act-now hover:bg-act-now-soft' : 'text-ink hover:bg-canvas'}`}>
      <span className="shrink-0 text-current">{icon}</span>
      {label}
    </button>
  )
}
