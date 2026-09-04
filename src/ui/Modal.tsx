import { X } from '@phosphor-icons/react'
import { useEffect, type ReactNode } from 'react'

export default function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-full w-full max-w-2xl flex-col rounded-card border border-line bg-panel shadow-card">
        <header className="flex items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="ml-auto rounded-control p-1 text-muted hover:bg-well hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
