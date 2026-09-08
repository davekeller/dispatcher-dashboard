import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import LookoutAvatar from './LookoutAvatar'
import { LOOKOUT } from './voice'

/** "✦ Lookout recommends": the ranked recommendations as a sticky header over the chat,
 *  expanded by default, collapsible to just the bar. The recommendation is context you can
 *  dismiss; the conversation is always underneath. */
export default function RecommendationsBar({ open, onToggle, summary, children }: { open: boolean; onToggle: () => void; summary: string; children: ReactNode }) {
  return (
    <section aria-label={`${LOOKOUT.name} recommends`} className="lookout-recommendations-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-lookout/20 bg-panel/15 px-3 py-2 text-left font-lookout">
        <LookoutAvatar size={18} className="shrink-0" />
        <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.04em] text-lookout-strong">{LOOKOUT.name} recommends</span>
        <span className="ml-auto truncate text-[11px] text-lookout-strong/80">{summary}</span>
        {open ? <CaretUp size={14} className="shrink-0 text-lookout-strong" /> : <CaretDown size={14} className="shrink-0 text-lookout-strong" />}
      </button>
      {open && <div className="flex flex-col gap-2 border-b border-lookout/15 p-2.5">{children}</div>}
    </section>
  )
}
