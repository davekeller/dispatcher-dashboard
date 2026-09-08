import { BAND_TONE } from '../../ui/tones'
import { STOP_FILTERS, type StopFilterId } from './stopFilters'

/** The title row over the receipts doubles as their filter: one chip per object in the stop filters
 *  with its count. Issue chips carry a dot in their band color and appear only when they match
 *  something, so a clean route shows just its states and color appears only when there is work. */
export default function StopsTitleRow({ total, counts, value, onChange }: { total: number; counts: Record<StopFilterId, number>; value: StopFilterId; onChange: (id: StopFilterId) => void }) {
  const shown = STOP_FILTERS.filter((f) => !f.tone || counts[f.id] > 0 || f.id === value)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-label">
        Stops <span className="tnum font-medium normal-case tracking-normal text-muted">· {total} in route order, last first</span>
      </h2>
      <div role="group" aria-label="Show stops" className="ml-auto flex flex-wrap items-center gap-1">
        {shown.map((f) => {
          const on = f.id === value
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(f.id)}
              className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold transition ${on ? 'border-ink bg-ink text-on-accent' : 'border-line bg-panel text-muted hover:border-ink/25 hover:text-ink'}`}
            >
              {f.tone && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-on-accent/80' : BAND_TONE[f.tone].fill}`} />}
              {f.label}
              <span className={`tnum font-medium ${on ? 'text-on-accent/75' : 'text-label'}`}>{counts[f.id]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
