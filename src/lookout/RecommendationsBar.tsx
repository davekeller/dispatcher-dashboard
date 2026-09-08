import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import LookoutAvatar from './LookoutAvatar'
import { LOOKOUT } from './voice'

/** "✦ Recommended by Lookout": the ranked recommendations as a sticky header over the chat,
 *  expanded by default, collapsible to just the bar. The recommendation is context you can
 *  dismiss; the conversation is always underneath. */
export default function RecommendationsBar({ open, onToggle, summary, children }: { open: boolean; onToggle: () => void; summary: string; children: ReactNode }) {
  return (
    <section aria-label={`Recommended by ${LOOKOUT.name}`} className="lookout-recommendations-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-lookout/20 bg-panel/15 px-3 py-2 text-left font-lookout">
        <LookoutAvatar size={18} className="shrink-0" />
        <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.04em] text-ink">Recommended by {LOOKOUT.name}</span>
        {/* Collapsed, the gist rides in the bar; open, it gets its own line below so nothing is cut off. */}
        {!open && <span className="ml-auto truncate text-[11px] text-ink/80">{summary}</span>}
        {open ? <CaretUp size={14} className="ml-auto shrink-0 text-ink" /> : <CaretDown size={14} className="shrink-0 text-ink" />}
      </button>
      {open && (
        <div className="border-b border-lookout/15">
          <p className="px-3 pb-1 pt-2 font-lookout text-[11px] leading-snug text-ink/80">{summary}</p>
          <div className="flex flex-col gap-2 p-2.5">{children}</div>
        </div>
      )}
    </section>
  )
}
