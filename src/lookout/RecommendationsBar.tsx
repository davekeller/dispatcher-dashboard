import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import LookoutAvatar from './LookoutAvatar'
import { LOOKOUT } from './voice'

/** "✦ Lookout recommends": the ranked recommendations as a sticky header over the chat,
 *  expanded by default, collapsible to just the bar. The recommendation is context you can
 *  dismiss; the conversation is always underneath. */
export default function RecommendationsBar({ open, onToggle, summary, children }: { open: boolean; onToggle: () => void; summary: string; children: ReactNode }) {
  return (
    <section aria-label={`${LOOKOUT.name} recommends`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="lookout-soft-surface sticky top-0 z-10 flex w-full items-center gap-2 border-b border-lookout/20 px-3 py-2 text-left">
        <LookoutAvatar size={18} className="shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-lookout-strong">{LOOKOUT.name} recommends</span>
        <span className="ml-auto truncate text-[11px] text-lookout-strong/80">{summary}</span>
        {open ? <CaretUp size={14} className="shrink-0 text-lookout-strong" /> : <CaretDown size={14} className="shrink-0 text-lookout-strong" />}
      </button>
      {open && <div className="lookout-soft-surface flex flex-col gap-3 border-b border-lookout/15 p-3">{children}</div>}
    </section>
  )
}
