import { useEffect, useState } from 'react'
import Button from '../ui/Button'

/** Insight → action, with a confirm. Idle → "Sure?" → done. The done state lingers for two
 *  seconds so the click visibly did something before the alert recomputes. */
export default function ActionConfirm({ label, confirmLabel = 'Confirm', doneLabel = 'Done', onConfirm, disabled, title, variant = 'secondary', compact = false }: { label: string; confirmLabel?: string; doneLabel?: string; onConfirm: () => void; disabled?: boolean; title?: string; variant?: 'secondary' | 'primary' | 'danger'; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'done'>('idle')
  const compactClass = compact ? 'h-6 px-2 text-[10px]' : ''
  useEffect(() => {
    if (state !== 'done') return
    const id = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(id)
  }, [state])
  if (state === 'confirming') {
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" variant="primary" className={compactClass} onClick={() => { onConfirm(); setState('done') }}>{confirmLabel}</Button>
        <Button size="sm" variant="ghost" className={compactClass} onClick={() => setState('idle')}>Cancel</Button>
      </span>
    )
  }
  return (
    <Button size="sm" variant={variant} className={compactClass} disabled={disabled || state === 'done'} title={title} onClick={() => setState('confirming')}>
      {state === 'done' ? doneLabel : label}
    </Button>
  )
}
