import { ArrowSquareOut } from '@phosphor-icons/react'
import { Fragment, type ReactNode } from 'react'
import { RULES } from '../../alerts/rules'
import type { Severity } from '../../alerts/types'
import { DESIGN_FILES } from '../../data/designFiles'
import { DISPATCHER, shiftWindow } from '../../data/dispatcher'
import { REGIONS } from '../../data/regions'
import { fmtClock } from '../../lib/format'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import DispatcherAvatar from '../../ui/DispatcherAvatar'
import { severityTone } from '../../ui/tones'

const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Over the limit', act_now: 'Act now', watch: 'Watch', info: 'Info' }

/** Lena's settings page: who she is, the desk she is running today, the one preference the
 *  product has, and the alert rules on the desk. Everything on it is read from data
 *  (`data/dispatcher.ts`, the rules array, derived state), nothing is restated here. */
export default function SettingsPage() {
  const { views, now } = useDerived()
  const liveClock = useStore((s) => s.liveClock)
  const setLiveClock = useStore((s) => s.setLiveClock)
  const { start, end } = shiftWindow(DISPATCHER)
  const shift = `${fmtClock(start)} – ${fmtClock(end)}`
  const stops = views.reduce((n, v) => n + v.total, 0)
  const delivered = views.reduce((n, v) => n + v.done, 0)

  return (
    <div className="min-h-full bg-board px-5 pb-8 pt-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="flex items-center gap-4">
          <DispatcherAvatar dispatcher={DISPATCHER} size={56} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">Settings</p>
            <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{DISPATCHER.name}</h1>
            <p className="text-[12px] text-muted">{DISPATCHER.role} · {DISPATCHER.carrier} · Day shift {shift}</p>
          </div>
        </header>

        <Section title="Profile">
          <Facts rows={[['Name', DISPATCHER.name], ['Role', DISPATCHER.role], ['Carrier', DISPATCHER.carrier], ['Shift', shift], ['Desk', DISPATCHER.desk], ['Background', DISPATCHER.background]]} />
        </Section>

        <Section title="This desk" body="What Lena is running today, read from the same state as the board.">
          <Facts rows={[['Trucks', `${views.length} on the board`], ['Regions', REGIONS.join(', ')], ['Stops', `${delivered} of ${stops} delivered`], ['Clock', `${fmtClock(now)} · ${liveClock ? 'real time' : 'simulated shift'}`]]} />
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-control border border-line bg-canvas px-3 py-2">
            <input type="checkbox" checked={liveClock} onChange={(e) => setLiveClock(e.target.checked)} className="mt-0.5 accent-ink" aria-describedby="settings-real-time-note" />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-ink">Play against the real clock</span>
              <span id="settings-real-time-note" className="block text-[11px] leading-snug text-muted">The same day on today's clock instead of pinned at 2:47 PM. The shift panel in the product bar has the scrubber.</span>
            </span>
          </label>
        </Section>

        <Section title="Design files" body="The decks behind this build: the problem and the person first, then how the solution adapted.">
          <ul className="divide-y divide-line">
            {DESIGN_FILES.map((file) => (
              <li key={file.id} className="flex items-start justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{file.title}</span>
                  <span className="block text-[12px] leading-snug text-muted">{file.blurb}</span>
                </span>
                {file.href ? (
                  <a href={file.href} target="_blank" rel="noreferrer" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-control border border-line bg-panel px-2.5 text-[12px] font-semibold text-ink transition hover:border-ink/25">
                    Open <ArrowSquareOut size={13} />
                  </a>
                ) : (
                  <span className="shrink-0 rounded-full bg-well px-2.5 py-1 text-[11px] font-semibold text-muted">In progress</span>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Alerts on this desk" body="The rules that fire on this desk. Lookout ranks whatever fires; the three most pressing sit in its alert bar.">
          <ul className="divide-y divide-line">
            {RULES.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[13px] text-ink">{rule.label}</span>
                <Chip tone={severityTone(rule.severity)}>{SEVERITY_LABEL[rule.severity]}</Chip>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-label">{title}</h2>
      {body && <p className="mt-0.5 text-[12px] text-muted">{body}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
