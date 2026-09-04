import { fmtClock } from '../lib/format'
import type { ShiftEvent } from '../store/store'
import EmptyState from '../ui/EmptyState'

const DOT: Record<ShiftEvent['kind'], string> = { action: 'bg-ink', snooze: 'bg-muted', reconnect: 'bg-clear-fill', undo: 'bg-watch-fill', system: 'bg-lookout' }

/** What happened this shift, newest first. It is a log, not a surface: every entry was written
 *  by an action, and nothing here is invented. */
export default function TimelinePanel({ events }: { events: ShiftEvent[] }) {
  const rows = [...events].reverse()
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      {rows.length <= 1 && <EmptyState title="Nothing has happened yet this session." body="Actions, snoozes, and reconnects land here as they happen." />}
      <ol className="flex flex-col">
        {rows.map((e, i) => (
          <li key={e.seq} className="grid grid-cols-[4rem_1rem_1fr] gap-x-2">
            <span className="tnum pt-0.5 text-right text-[11px] text-muted">{fmtClock(e.at)}</span>
            <span className="relative flex justify-center" aria-hidden="true">
              {i < rows.length - 1 && <span className="absolute top-3 bottom-0 w-px bg-line" />}
              <span className={`relative mt-1.5 h-2 w-2 rounded-full ${DOT[e.kind]}`} />
            </span>
            <p className="pb-3 text-[12px] leading-snug text-ink">{e.label}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
