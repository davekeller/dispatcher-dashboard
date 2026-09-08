import { ArrowSquareOut } from '@phosphor-icons/react'
import { Fragment, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RULES } from '../../alerts/rules'
import type { Severity } from '../../alerts/types'
import { DESIGN_FILES, type DesignFile } from '../../data/designFiles'
import { DISPATCHER, shiftWindow } from '../../data/dispatcher'
import { REGIONS } from '../../data/regions'
import { fmtClock } from '../../lib/format'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import DispatcherAvatar from '../../ui/DispatcherAvatar'
import { NAV_ITEM_BASE, navigationItemState } from '../../ui/navigation'
import { severityTone } from '../../ui/tones'
import { isSettingsSection, PROBLEMS, PROJECT, SECTIONS, SOLUTIONS, WHY, type SettingsSection } from './story'

const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Over the limit', act_now: 'Act now', watch: 'Watch', info: 'Info' }

/** Lena's page, and the story of the build around her. A vertical nav walks Project, Lena, Problems,
 *  Solutions, Why; her section is a working settings view (profile, the desk today, the one preference,
 *  the rules on the desk), the others are the narrative, with the design decks linked where they belong.
 *  Everything is read from data: `data/dispatcher.ts`, `data/designFiles.ts`, `story.ts`, the rules array,
 *  derived state. */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('section')
  const section: SettingsSection = isSettingsSection(raw) ? raw : 'project'
  const setSection = (next: SettingsSection) => setParams((prev) => {
    const q = new URLSearchParams(prev)
    if (next === 'project') q.delete('section')
    else q.set('section', next)
    return q
  }, { replace: true })
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]

  return (
    <div className="min-h-full bg-board px-5 pb-8 pt-5">
      <div className="mx-auto flex max-w-5xl items-start gap-6">
        <nav aria-label="About this build" className="w-52 shrink-0">
          <Link to="/settings" className="flex items-center gap-3 rounded-control px-2 py-2 transition hover:bg-well">
            <DispatcherAvatar dispatcher={DISPATCHER} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-semibold leading-tight text-ink">{DISPATCHER.name}</span>
              <span className="block truncate text-[11px] text-muted">{DISPATCHER.role} · {DISPATCHER.carrier}</span>
            </span>
          </Link>
          <p className="mt-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-label">About this build</p>
          <ol className="mt-1.5 flex flex-col gap-0.5">
            {SECTIONS.map((s, i) => {
              const on = s.id === section
              return (
                <li key={s.id}>
                  <button type="button" aria-current={on ? 'page' : undefined} onClick={() => setSection(s.id)} className={`${NAV_ITEM_BASE} w-full justify-start text-[12px] ${navigationItemState(on)}`}>
                    <span className={`tnum w-4 text-[10px] ${on ? 'text-on-accent/70' : 'text-label'}`}>{i + 1}</span>
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{current.eyebrow}</p>
            <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{section === 'project' ? PROJECT.name : section === 'lena' ? DISPATCHER.name : current.label}</h1>
          </header>
          {section === 'project' && <ProjectSection />}
          {section === 'lena' && <LenaSection />}
          {section === 'problems' && <ProblemsSection />}
          {section === 'solutions' && <SolutionsSection />}
          {section === 'why' && <WhySection />}
        </div>
      </div>
    </div>
  )
}

function ProjectSection() {
  return (
    <>
      <Section title="What this is">
        <p className="text-[13px] leading-relaxed text-ink">{PROJECT.line}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROJECT.links.map((l) => <ExternalLink key={l.label} href={l.href}>{l.label}</ExternalLink>)}
        </div>
      </Section>
      <Section title="At a glance">
        <Facts rows={PROJECT.facts} />
      </Section>
    </>
  )
}

function LenaSection() {
  const { views, now } = useDerived()
  const liveClock = useStore((s) => s.liveClock)
  const setLiveClock = useStore((s) => s.setLiveClock)
  const { start, end } = shiftWindow(DISPATCHER)
  const shift = `${fmtClock(start)} – ${fmtClock(end)}`
  const stops = views.reduce((n, v) => n + v.total, 0)
  const delivered = views.reduce((n, v) => n + v.done, 0)
  return (
    <>
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
    </>
  )
}

function ProblemsSection() {
  const deck = DESIGN_FILES.find((f) => f.id === 'problems')
  return (
    <>
      <Section title="Her three jobs">
        <ol className="flex flex-col gap-1.5">
          {PROBLEMS.jobs.map((job, i) => (
            <li key={job} className="flex items-baseline gap-3 text-[13px] text-ink"><span className="tnum w-4 shrink-0 text-[11px] font-semibold text-label">{i + 1}</span>{job}</li>
          ))}
        </ol>
      </Section>
      <Section title="The problems">
        <Stories items={PROBLEMS.problems} />
      </Section>
      {deck && <DeckCard file={deck} />}
    </>
  )
}

function SolutionsSection() {
  const deck = DESIGN_FILES.find((f) => f.id === 'solution')
  return (
    <>
      <Section title="What was built">
        <Stories items={SOLUTIONS} />
      </Section>
      {deck && <DeckCard file={deck} />}
    </>
  )
}

function WhySection() {
  return (
    <>
      <Section title="Five decisions">
        <Stories items={WHY.decisions} numbered />
      </Section>
      <Section title="What was cut">
        <p className="text-[13px] leading-relaxed text-ink">{WHY.cuts}</p>
        <div className="mt-3"><ExternalLink href={WHY.logHref}>The decision log</ExternalLink></div>
      </Section>
    </>
  )
}

function DeckCard({ file }: { file: DesignFile }) {
  return (
    <Section title="Design file">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">{file.title}</span>
          <span className="block text-[12px] leading-snug text-muted">{file.blurb}</span>
        </span>
        {file.href ? <ExternalLink href={file.href}>Open the deck</ExternalLink> : <span className="shrink-0 rounded-full bg-well px-2.5 py-1 text-[11px] font-semibold text-muted">In progress</span>}
      </div>
    </Section>
  )
}

function Stories({ items, numbered = false }: { items: { title: string; body: string }[]; numbered?: boolean }) {
  return (
    <ol className="divide-y divide-line">
      {items.map((item, i) => (
        <li key={item.title} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          {numbered && <span className="tnum mt-0.5 w-4 shrink-0 text-[11px] font-semibold text-label">{i + 1}</span>}
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">{item.title}</span>
            <span className="block text-[12px] leading-snug text-muted">{item.body}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-control border border-line bg-panel px-2.5 text-[12px] font-semibold text-ink transition hover:border-ink/25">
      {children} <ArrowSquareOut size={13} />
    </a>
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
    <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
