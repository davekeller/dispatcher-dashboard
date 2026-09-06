import type { ReactNode } from 'react'
import type { Tone } from './tones'

export default function Chip({ tone, dashed = false, children, title, className = '' }: { tone?: Tone; dashed?: boolean; children: ReactNode; title?: string; className?: string }) {
  const color = tone ? `${tone.soft} ${tone.text} ${tone.pattern ?? ''}` : 'bg-well text-muted'
  const border = dashed && tone ? `border border-dashed ${tone.border}` : ''
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${color} ${border} ${className}`}>
      {children}
    </span>
  )
}
