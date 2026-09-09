import { ArrowSquareOut, Lightbulb, Path, SquaresFour, UserCircle, WarningDiamond, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { RULES } from '../../alerts/rules'
import type { Severity } from '../../alerts/types'
import { BAND_LABEL, BAND_ORDER } from '../../bands'
import { DESIGN_FILES, type DesignFile } from '../../data/designFiles'
import { DISPATCHER, shiftWindow } from '../../data/dispatcher'
import { REGIONS } from '../../data/regions'
import { LIMIT_MIN, WATCH_MIN } from '../../hos/constants'
import { fmtClock } from '../../lib/format'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import DispatcherAvatar from '../../ui/DispatcherAvatar'
import { navigationItemState } from '../../ui/navigation'
import { BAND_TONE, severityTone } from '../../ui/tones'
import SlideFrame from './SlideFrame'
import { slidesFor } from './slides'
import { isSettingsSection, PROBLEMS, PROJECT, SECTIONS, SOLUTIONS, WHY, type SettingsSection } from './story'

const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Over the limit', act_now: 'Act now', watch: 'Watch', info: 'Info' }
const SECTION_ICON: Record<SettingsSection, Icon> = {
  project: SquaresFour,
  lena: UserCircle,
  problems: WarningDiamond,
  solutions: Lightbulb,
  why: Path,
}

/** Lena's working settings and the story of the build around her. The left rail is persistent;
 * each centered chapter stays driven by dispatcher, fleet, rule, design-file, and story data. */
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
  const currentIndex = Math.max(0, SECTIONS.findIndex((item) => item.id === section))
  const current = SECTIONS[currentIndex]
  const title = section === 'project' ? PROJECT.name : section === 'lena' ? DISPATCHER.name : current.label

  return (
    <div className="settings-page min-h-full">
      <div className="grid min-h-full md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-nav-selected-line bg-panel/95 md:sticky md:top-0 md:h-[calc(100vh-3.5rem)] md:self-start md:border-b-0 md:border-r">
          <div className="flex h-full flex-col px-4 py-5">
            <div className="px-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-label">Project file</p>
              <p className="mt-1 whitespace-nowrap font-brand text-[18px] font-bold leading-tight tracking-[-0.04em] text-nav-selected-ink">{PROJECT.name}</p>
            </div>

            {/* The dispatcher sits right under the product's name: the project file is hers. */}
            <button type="button" onClick={() => setSection('lena')} aria-current={section === 'lena' ? 'page' : undefined} className="mt-4 flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition hover:bg-board/70">
              <DispatcherAvatar dispatcher={DISPATCHER} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-ink">{DISPATCHER.name}</span>
                <span className="block truncate text-[10px] text-muted">The dispatcher</span>
              </span>
            </button>

            <nav aria-label="About this build" className="mt-4">
              <ol className="flex flex-col gap-1">
                {SECTIONS.map((item, index) => {
                  const on = item.id === section
                  const Glyph = SECTION_ICON[item.id]
                  return (
                    <li key={item.id}>
                      <button type="button" aria-current={on ? 'page' : undefined} onClick={() => setSection(item.id)} className={`flex h-10 w-full items-center gap-2.5 rounded-control px-3 text-left text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40 ${navigationItemState(on)}`}>
                        <Glyph size={15} weight={on ? 'fill' : 'regular'} />
                        <span className="flex-1">{item.label}</span>
                        <span className={`tnum text-[9px] ${on ? 'text-on-accent/65' : 'text-label'}`}>0{index + 1}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div className="mt-6 border-t border-line pt-4 md:mt-auto">
              <p className="px-2 text-[10px] leading-snug text-muted">Designed by {PROJECT.author.name}<br /><a href={PROJECT.author.href} target="_blank" rel="noreferrer" className="text-ink underline-offset-2 hover:underline">{PROJECT.author.site}</a></p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[80rem]">
            <header className="mb-5 flex min-w-0 items-end justify-between gap-5 border-b border-nav-selected-line pb-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-label">{current.eyebrow}</p>
                <h1 className="mt-1 font-display text-[28px] font-semibold leading-none tracking-[-0.035em] text-ink">{title}</h1>
              </div>
              <p className="tnum shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-label">Chapter 0{currentIndex + 1} / 05</p>
            </header>

            <div className="settings-section-enter flex flex-col gap-4" key={section}>
              <Slides section={section} />
              {section === 'project' && <ProjectSection />}
              {section === 'lena' && <LenaSection />}
              {section === 'problems' && <ProblemsSection />}
              {section === 'solutions' && <SolutionsSection />}
              {section === 'why' && <WhySection />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/** The chapter's pages from the design file, in deck order, ahead of the working detail. */
function Slides({ section }: { section: SettingsSection }) {
  const slides = slidesFor(section)
  if (slides.length === 0) return null
  return (
    <section aria-label="From the design file" className="flex flex-col gap-5">
      {slides.map((slide) => <SlideFrame key={slide.id} slide={slide} />)}
    </section>
  )
}

function ProjectSection() {
  return (
    <>
      <ProjectSnapshot />
      <Section title="Build facts" body="The product and technical frame behind the live model.">
        <Facts rows={PROJECT.facts} />
      </Section>
    </>
  )
}

function ProjectSnapshot() {
  const { metrics, now, ranked, views } = useDerived()
  const totalStops = metrics.stopsDelivered + metrics.stopsFailed + metrics.stopsRemaining + metrics.needDriver
  const deliveredPct = totalStops === 0 ? 100 : Math.round((metrics.stopsDelivered / totalStops) * 100)
  const attention = ranked.filter((card) => card.band === 'act_now' || card.band === 'watch').length
  const bandCounts = BAND_ORDER.map((band) => ({ band, count: ranked.filter((card) => card.band === band).length }))
  const exposure = views
    .filter((view) => view.minutesUntilLimit <= WATCH_MIN)
    .sort((a, b) => a.minutesUntilLimit - b.minutesUntilLimit)
    .slice(0, 8)

  return (
    <Card className="overflow-hidden border-nav-selected-line">
      <div className="bg-nav-selected-ink px-5 py-5 text-on-accent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[38rem]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-accent/60">Operations product case study</p>
            <h2 className="mt-2 font-display text-[25px] font-semibold leading-[1.05] tracking-[-0.035em]">One shift. Fifty trucks. One legal line.</h2>
            <p className="mt-3 text-[12px] leading-relaxed text-on-accent/75">{PROJECT.line}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROJECT.links.map((link) => <ExternalLink key={link.label} href={link.href} inverse>{link.label}</ExternalLink>)}
          </div>
        </div>
      </div>

      <div className="grid divide-y divide-line bg-panel md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="p-4">
          <PulseHeading title="Fleet status" detail={`${attention} need attention`} />
          <p className="tnum mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.04em] text-ink">{metrics.trucks} <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-label">trucks</span></p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-board" role="img" aria-label={bandCounts.map(({ band, count }) => `${BAND_LABEL[band]} ${count}`).join(', ')}>
            {bandCounts.filter(({ count }) => count > 0).map(({ band, count }) => <span key={band} className={BAND_TONE[band].fill} style={{ width: `${(count / Math.max(1, metrics.trucks)) * 100}%` }} />)}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
            {bandCounts.map(({ band, count }) => <span key={band} className="tnum flex items-center gap-1 text-[8px] font-semibold text-label" title={BAND_LABEL[band]}><span className={`h-1.5 w-1.5 rounded-full ${BAND_TONE[band].fill}`} />{count}</span>)}
          </div>
        </div>

        <div className="p-4">
          <PulseHeading title="Delivery progress" detail={`${metrics.stopsRemaining + metrics.needDriver} to deliver`} />
          <p className="tnum mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.04em] text-clear">{deliveredPct}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-board" role="img" aria-label={`${metrics.stopsDelivered} of ${totalStops} stops delivered`}>
            <span className="block h-full rounded-full bg-clear-fill" style={{ width: `${deliveredPct}%` }} />
          </div>
          <p className="tnum mt-2 text-[9px] text-label">{metrics.stopsDelivered} delivered · {totalStops} total stops</p>
        </div>

        <div className="p-4">
          <PulseHeading title="HOS exposure" detail={`Live at ${fmtClock(now)}`} />
          <p className="tnum mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.04em] text-act-now">{metrics.over} <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-label">over</span></p>
          <div className="relative mt-3 h-5" role="img" aria-label={`${metrics.over} over the driving limit and ${metrics.approaching} approaching it`}>
            <span className="absolute inset-x-0 top-2 h-1 rounded-full bg-board" />
            <span className="absolute right-0 top-0.5 h-4 border-r border-dashed border-act-now/70" />
            {exposure.map((view, index) => {
              const position = Math.min(100, Math.max(0, (view.drivingMin / LIMIT_MIN) * 100))
              return <span key={view.driver.id} className={`absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-panel ${view.minutesUntilLimit <= 0 ? 'bg-act-now-fill' : 'bg-watch-fill'} ${index % 2 === 0 ? 'top-0.5' : 'top-2.5'}`} style={{ left: `${position}%` }} title={`${view.driver.name}: ${Math.round(view.drivingMin / 60 * 10) / 10} hours driven`} />
            })}
          </div>
          <p className="tnum flex justify-between text-[8px] font-semibold uppercase tracking-wide text-label"><span>0h</span><span>{metrics.approaching} approaching</span><span>11h</span></p>
        </div>
      </div>
    </Card>
  )
}

function PulseHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="flex items-baseline justify-between gap-2"><h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">{title}</h3><span className="tnum text-[9px] text-muted">{detail}</span></div>
}

function LenaSection() {
  const { views, now } = useDerived()
  const liveClock = useStore((state) => state.liveClock)
  const setLiveClock = useStore((state) => state.setLiveClock)
  const { start, end } = shiftWindow(DISPATCHER)
  const shift = `${fmtClock(start)} – ${fmtClock(end)}`
  const stops = views.reduce((total, view) => total + view.total, 0)
  const delivered = views.reduce((total, view) => total + view.done, 0)
  return (
    <>
      <Section title="Profile">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <DispatcherAvatar dispatcher={DISPATCHER} size={52} />
          <span>
            <span className="block font-display text-[18px] font-semibold tracking-tight text-ink">{DISPATCHER.name}</span>
            <span className="block text-[11px] text-muted">{DISPATCHER.role} · {DISPATCHER.carrier}</span>
          </span>
        </div>
        <Facts rows={[["Name", DISPATCHER.name], ["Role", DISPATCHER.role], ["Carrier", DISPATCHER.carrier], ["Shift", shift], ["Desk", DISPATCHER.desk], ["Background", DISPATCHER.background]]} />
      </Section>
      <Section title="This desk" body="Live state from the same model as the board.">
        <Facts rows={[["Trucks", `${views.length} on the board`], ["Regions", REGIONS.join(', ')], ["Stops", `${delivered} of ${stops} delivered`], ["Clock", `${fmtClock(now)} · ${liveClock ? 'real time' : 'simulated shift'}`]]} />
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-control border border-nav-selected-line bg-board/55 px-3.5 py-3 transition hover:bg-nav-selected/55">
          <input type="checkbox" checked={liveClock} onChange={(event) => setLiveClock(event.target.checked)} className="mt-0.5 accent-ink" aria-describedby="settings-real-time-note" />
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-ink">Play against the real clock</span>
            <span id="settings-real-time-note" className="mt-0.5 block text-[10px] leading-snug text-muted">Run the seeded day against today's clock. The shift panel still owns the scrubber.</span>
          </span>
        </label>
      </Section>
      <Section title="Alerts on this desk" body="Lookout ranks the rules that fire; the most pressing rise to its alert bar.">
        <ul className="divide-y divide-line">
          {RULES.map((rule) => (
            <li key={rule.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <span className="text-[12px] font-medium text-ink">{rule.label}</span>
              <Chip tone={severityTone(rule.severity)}>{SEVERITY_LABEL[rule.severity]}</Chip>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function ProblemsSection() {
  const deck = DESIGN_FILES.find((file) => file.id === 'problems')
  return (
    <>
      <Section title="Her three jobs">
        <ol className="grid gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-3">
          {PROBLEMS.jobs.map((job, index) => (
            <li key={job} className="bg-panel p-3.5">
              <span className="tnum text-[9px] font-semibold text-label">0{index + 1}</span>
              <span className="mt-2 block text-[12px] font-semibold leading-snug text-ink">{job}</span>
            </li>
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
  const deck = DESIGN_FILES.find((file) => file.id === 'solution')
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
        <p className="text-[12px] leading-relaxed text-ink">{WHY.cuts}</p>
        <div className="mt-3"><ExternalLink href={WHY.logHref}>The decision log</ExternalLink></div>
      </Section>
    </>
  )
}

function DeckCard({ file }: { file: DesignFile }) {
  return (
    <Section title="Design file">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block font-display text-[16px] font-semibold tracking-tight text-ink">{file.title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted">{file.blurb}</span>
        </span>
        {file.href ? <ExternalLink href={file.href}>Open the deck</ExternalLink> : <span className="shrink-0 rounded-full bg-well px-2.5 py-1 text-[10px] font-semibold text-muted">In progress</span>}
      </div>
    </Section>
  )
}

function Stories({ items, numbered = false }: { items: { title: string; body: string }[]; numbered?: boolean }) {
  return (
    <ol className="divide-y divide-line">
      {items.map((item, index) => (
        <li key={item.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`tnum flex h-8 w-8 items-center justify-center rounded-control text-[10px] font-semibold ${numbered ? 'bg-nav-selected text-nav-selected-ink' : 'border border-line bg-board/55 text-label'}`}>0{index + 1}</span>
          <span className="min-w-0 pt-0.5">
            <span className="block text-[13px] font-semibold text-ink">{item.title}</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted">{item.body}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function ExternalLink({ href, inverse = false, children }: { href: string; inverse?: boolean; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border px-2.5 text-[11px] font-semibold transition ${inverse ? 'border-white/25 bg-white/10 text-on-accent hover:bg-white/15' : 'border-line bg-panel text-ink hover:border-ink/25 hover:bg-board/40'}`}>
      {children} <ArrowSquareOut size={13} />
    </a>
  )
}

function Section({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <header className="flex min-w-0 items-baseline justify-between gap-4 border-b border-line bg-board/35 px-4 py-3">
        <h2 className="font-display text-[15px] font-semibold leading-none tracking-[-0.015em] text-ink">{title}</h2>
        {body && <p className="max-w-[28rem] text-right text-[10px] leading-snug text-muted">{body}</p>}
      </header>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 bg-panel px-3.5 py-3">
          <dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-label">{label}</dt>
          <dd className="mt-1 text-[12px] leading-relaxed text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
