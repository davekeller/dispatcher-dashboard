#!/usr/bin/env node
// Renders docs/chronicle/chronicle.json (+ optional remarks.json, + progress PNGs)
// into a single offline HTML page. `--embed` inlines the screenshots as data URIs
// so the file can be moved or dropped into Figma on its own.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO = resolve(process.cwd())
const DIR = join(REPO, 'docs/chronicle')
const EMBED = process.argv.includes('--embed')

const c = JSON.parse(readFileSync(join(DIR, 'chronicle.json'), 'utf8'))
const remarks = existsSync(join(DIR, 'remarks.json')) ? JSON.parse(readFileSync(join(DIR, 'remarks.json'), 'utf8')) : {}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
const n = (v) => (v ?? 0).toLocaleString('en-US')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayLabel = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`
const weekday = (iso) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(iso + 'T12:00:00Z').getUTCDay()]
const hourOf = (d) => +d.slice(11, 13) + +d.slice(14, 16) / 60
const clock = (d) => d.slice(11, 16)

// ------------------------------------------------------------- the graph log
// A driver's daily log is a 24-hour grid with four duty rows and one continuous
// stepped line. Same grid here; the rows are what the work was.
const ROW_ORDER = ['feat', 'fix', 'style', 'docs', 'other']
const ROW_LABEL = { feat: 'Built', fix: 'Fixed', style: 'Styled', docs: 'Wrote', other: 'Other', off: 'Off' }
/** Anything without its own row (chore, unconventional subjects) shares "Other". */
const typeRow = (t) => (ROW_ORDER.includes(t) ? t : 'other')
const rows = [...ROW_ORDER.filter((t) => c.commits.some((k) => typeRow(k.type) === t)), 'off']

const W = 1040, GUT = 96, TOT = 62, RH = 30
const plotW = W - GUT - TOT
const x = (h) => GUT + (h / 24) * plotW
const rowY = (type) => 22 + rows.indexOf(type) * RH + RH / 2

function graphLog(day) {
  const on = c.commits.filter((k) => k.day === day.day).sort((a, b) => a.date.localeCompare(b.date))
  const H = 22 + rows.length * RH + 20
  const p = []

  // printed grid: hour ticks, quarter-hour hashes, row rules
  for (let h = 0; h <= 24; h++) {
    const strong = h % 6 === 0
    p.push(`<line x1="${x(h).toFixed(1)}" y1="22" x2="${x(h).toFixed(1)}" y2="${22 + rows.length * RH}" stroke="var(--${strong ? 'rule' : 'rule-soft'})" stroke-width="${strong ? 1 : .5}"/>`)
    if (h < 24) p.push(`<text class="hr" x="${x(h + .5).toFixed(1)}" y="15" text-anchor="middle">${h}</text>`)
  }
  rows.forEach((t, i) => {
    const y = 22 + i * RH
    if (i % 2) p.push(`<rect x="${GUT}" y="${y}" width="${plotW}" height="${RH}" fill="var(--sheet-2)"/>`)
    p.push(`<line x1="${GUT}" y1="${y}" x2="${W - TOT}" y2="${y}" stroke="var(--rule)" stroke-width=".7"/>`)
    p.push(`<text class="rowlab" x="${GUT - 10}" y="${y + RH / 2 + 4}" text-anchor="end">${ROW_LABEL[t]}</text>`)
  })
  const base = 22 + rows.length * RH
  p.push(`<line x1="${GUT}" y1="${base}" x2="${W - TOT}" y2="${base}" stroke="var(--rule)" stroke-width=".7"/>`)
  p.push(`<line x1="${W - TOT}" y1="22" x2="${W - TOT}" y2="${base}" stroke="var(--rule)"/>`)
  p.push(`<text class="hr" x="${W - TOT / 2}" y="15" text-anchor="middle">TOTAL</text>`)
  p.push(`<text class="tot" x="${W - TOT / 2}" y="${(22 + base) / 2 + 5}" text-anchor="middle">${on.length}</text>`)

  // The pen: it rests on Off and rises only while work is happening. Commits inside
  // 90 minutes of each other are one burst; a wider gap means the driver stopped.
  const off = rowY('off'), GAP = 1.5, TRAIL = 0.12
  let d = `M${x(0).toFixed(1)} ${off}`
  for (let i = 0; i < on.length; ) {
    let j = i
    while (j + 1 < on.length && hourOf(on[j + 1].date) - hourOf(on[j].date) <= GAP) j++
    const x0 = x(hourOf(on[i].date))
    d += ` L${x0.toFixed(1)} ${off} L${x0.toFixed(1)} ${rowY(typeRow(on[i].type))}`
    for (let k = i + 1; k <= j; k++) {
      const xk = x(hourOf(on[k].date)).toFixed(1)
      d += ` L${xk} ${rowY(typeRow(on[k - 1].type))} L${xk} ${rowY(typeRow(on[k].type))}`
    }
    const xe = x(Math.min(24, hourOf(on[j].date) + TRAIL)).toFixed(1)
    d += ` L${xe} ${rowY(typeRow(on[j].type))} L${xe} ${off}`
    i = j + 1
  }
  d += ` L${x(24).toFixed(1)} ${off}`
  const len = Math.round(plotW * 2.4)
  p.push(`<path class="pen" d="${d}" fill="none" stroke="var(--pen)" stroke-width="2" stroke-linejoin="round" style="--len:${len}"/>`)
  for (const k of on) {
    p.push(`<circle class="mk" cx="${x(hourOf(k.date)).toFixed(1)}" cy="${rowY(typeRow(k.type))}" r="3.2" fill="var(--pen)"><title>${clock(k.date)} · ${esc(k.subject)}</title></circle>`)
  }

  return `<figure class="log">
  <figcaption><b>${weekday(day.day)} ${dayLabel(day.day)}</b><span>${clock(day.firstAt)}–${clock(day.lastAt)} · +${n(day.insertions)}/−${n(day.deletions)} lines</span></figcaption>
  <div class="scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${on.length} commits on ${day.day}">${p.join('')}</svg></div>
</figure>`
}

// -------------------------------------------------------------- recap panels
function recap(title, entries, unit) {
  const max = Math.max(1, ...entries.map((e) => e[1]))
  return `<section class="recap"><h3>${title}</h3><table>${entries.map(([k, v]) => `<tr>
    <th scope="row">${esc(k)}</th>
    <td class="bar"><span style="width:${(v / max * 100).toFixed(1)}%"></span></td>
    <td class="num">${n(v)}</td></tr>`).join('')}</table><p class="unit">${unit}</p></section>`
}

const models = [...new Set([...Object.keys(c.models.turns), ...Object.keys(c.models.commits).map((k) => k.replace(/^Claude\s+/, ''))])]
const crew = models.map((m) => {
  const commits = Object.entries(c.models.commits).find(([k]) => k.replace(/^Claude\s+/, '') === m)?.[1] ?? 0
  const t = c.models.tokens[m] ?? {}
  return { m, commits, turns: c.models.turns[m] ?? 0, out: t.output ?? 0 }
}).sort((a, b) => b.commits - a.commits || b.turns - a.turns)

// --------------------------------------------------------------- screenshots
// A long loop makes hundreds of captures. A progression wants roughly eight per
// view — evenly spaced, always including the first and the most recent.
const PER_VIEW = 8
const srcOf = (file) => {
  const path = join(DIR, 'progress', file)
  return EMBED && existsSync(path) ? `data:image/png;base64,${readFileSync(path).toString('base64')}` : `progress/${file}`
}
// views.json fixes the reading order — the main board before the drill-ins.
const configured = existsSync(join(DIR, 'views.json'))
  ? JSON.parse(readFileSync(join(DIR, 'views.json'), 'utf8')).views.map((v) => v.name)
  : []
const rank = (v) => { const i = configured.indexOf(v); return i === -1 ? 999 : i }
const strips = [...new Set(c.screenshots.map((s) => s.view))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((view) => {
  const all = c.screenshots.filter((s) => s.view === view)
  const step = Math.max(1, Math.ceil(all.length / PER_VIEW))
  const picked = all.filter((_, i) => i % step === 0)
  if (all.length && picked[picked.length - 1] !== all[all.length - 1]) picked.push(all[all.length - 1])
  return { view, total: all.length, shots: picked.map((s) => ({ ...s, src: srcOf(s.file) })) }
})
const shotCount = strips.reduce((n, v) => n + v.shots.length, 0)

// ------------------------------------------------------------------ remarks
function remarkFor(day) {
  const r = remarks[day.day]
  if (r) return r
  // No written remark yet: say what the commits say, and don't pretend otherwise.
  const top = Object.entries(day.areas).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
  return {
    headline: `${day.commits} commits across ${top.join(', ') || 'the repo'}`,
    body: c.commits.filter((k) => k.day === day.day && k.type === 'feat').map((k) => k.title).join(' · ') || day.subjects[0],
    draft: true,
  }
}

const span = `${dayLabel(c.span.first.slice(0, 10))} – ${dayLabel(c.span.last.slice(0, 10))}, ${c.span.last.slice(0, 4)}`
const fields = [
  ['Project', c.repo.name], ['Period', span], ['Commits', n(c.totals.commits)],
  ['Days', n(c.totals.days)], ['Source files', n(c.totals.sourceFiles)],
  ['Co-drivers', String(models.length)], ['Sessions', n(c.models.sessions)],
]

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Build Log — ${esc(c.repo.name)}</title>
<style>
:root{
  color-scheme:light;
  --paper:#d8d5c6; --sheet:#f3f0e6; --sheet-2:#eae6d8;
  --rule:#ada693; --rule-soft:#ccc6b3;
  --ink:#22252a; --muted:#6c6656;
  --pen:#2c4a7c; --stamp:#9e3129;
  --form:"Avenir Next Condensed","Arial Narrow","Helvetica Neue",Arial,sans-serif;
  --body:Charter,"Iowan Old Style","Palatino Linotype",Georgia,serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.55;
  padding:28px 16px 64px;-webkit-font-smoothing:antialiased}
.sheet{max-width:1120px;margin:0 auto;background:var(--sheet);border:1.5px solid var(--ink);
  box-shadow:0 1px 0 var(--rule),0 18px 40px -28px rgba(34,37,42,.55)}
h1,h2,h3,.lab,.hr,.rowlab,.tot,.unit,figcaption b,figcaption span{font-family:var(--form)}
h1{margin:0;font-size:27px;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.head{display:flex;justify-content:space-between;align-items:baseline;gap:20px;
  padding:18px 26px 14px;border-bottom:1.5px solid var(--ink);flex-wrap:wrap}
.head p{margin:5px 0 0;font-size:13.5px;color:var(--muted);max-width:52ch}
.sn{font-family:var(--mono);font-size:11px;color:var(--muted);text-align:right;white-space:nowrap}
.sn b{display:block;color:var(--stamp);font-size:13px;letter-spacing:.08em}

/* header fields — the boxed strip at the top of a real log sheet */
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));border-bottom:1.5px solid var(--ink)}
.fields div{padding:9px 14px 11px;border-right:1px solid var(--rule)}
.fields div:last-child{border-right:0}
.lab{display:block;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.val{font-family:var(--mono);font-size:17px;letter-spacing:-.03em;margin-top:1px;overflow-wrap:anywhere}

section{padding:22px 26px;border-bottom:1px solid var(--rule)}
h2{margin:0 0 3px;font-size:12px;letter-spacing:.2em;text-transform:uppercase}
.sub{margin:0 0 18px;font-size:13.5px;color:var(--muted);max-width:70ch}

/* graph log */
.log{margin:0 0 14px}
.log:last-child{margin-bottom:0}
figcaption{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
figcaption b{font-size:13px;letter-spacing:.1em;text-transform:uppercase}
figcaption span{font-size:11.5px;color:var(--muted);letter-spacing:.04em}
.scroll{overflow-x:auto}
.log svg{display:block;width:100%;min-width:660px;border:1px solid var(--rule);background:var(--sheet)}
.hr{font-size:9px;fill:var(--muted)}
.rowlab{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;fill:var(--ink)}
.tot{font-family:var(--mono);font-size:15px;fill:var(--pen)}
.mk:hover{r:5}

/* recap panels */
.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0;padding:0}
.panels>*{padding:22px 26px;border-right:1px solid var(--rule)}
.panels>*:last-child{border-right:0}
.recap h3{margin:0 0 12px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.recap table{width:100%;border-collapse:collapse}
.recap th{text-align:left;font-weight:400;font-family:var(--body);font-size:14px;padding:3px 10px 3px 0;white-space:nowrap}
.recap .bar{width:100%;padding:3px 8px}
.recap .bar span{display:block;height:9px;background:var(--pen);opacity:.72}
.recap .num{font-family:var(--mono);font-size:13px;text-align:right;padding:3px 0}
.unit{margin:11px 0 0;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}

/* co-driver certification block */
.crew{list-style:none;margin:0;padding:0}
.crew li{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:4px 16px;
  padding:10px 0;border-bottom:1px dotted var(--rule)}
.crew li:last-child{border-bottom:0}
.crew .who{font-size:16px}
.crew .who em{display:block;font-style:normal;font-family:var(--form);font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.crew .fig{font-family:var(--mono);font-size:11.5px;text-align:right;color:var(--muted);white-space:nowrap;line-height:1.35}
.crew .fig b{display:block;color:var(--pen);font-size:21px;letter-spacing:-.03em}
.crew .fig b::after{content:"commits";font-family:var(--form);font-size:9px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);margin-left:4px}

/* remarks */
.rem{display:grid;grid-template-columns:88px 1fr;gap:0 20px;padding:15px 0;border-top:1px solid var(--rule-soft)}
.rem:first-of-type{border-top:0;padding-top:0}
.rem .when{font-family:var(--form);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding-top:3px}
.rem .when b{display:block;font-family:var(--mono);font-size:22px;color:var(--pen);letter-spacing:-.02em}
.rem h4{margin:0 0 4px;font-size:17px;font-weight:600}
.rem p{margin:0;font-size:14px;color:var(--muted)}
.draft{display:inline-block;margin-left:7px;font-family:var(--form);font-size:9px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--stamp);border:1px solid var(--stamp);padding:1px 5px;vertical-align:2px}

/* progression */
.strip{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px}
.strip figure{margin:0;flex:0 0 268px}
.strip img{width:100%;display:block;border:1px solid var(--rule);background:#fff}
.strip figcaption{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:5px;display:block}
.vlab{font-family:var(--form);font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  margin:20px 0 8px;display:flex;align-items:baseline;gap:10px}
.vlab:first-of-type{margin-top:4px}
.vlab span{font-family:var(--mono);font-size:10px;letter-spacing:0;color:var(--muted);text-transform:none}
.empty{border:1px dashed var(--rule);padding:22px;text-align:center;color:var(--muted);font-size:13.5px}

footer{padding:18px 26px 22px;font-size:12px;color:var(--muted)}
footer code{font-family:var(--mono);font-size:11px}
a{color:var(--pen)}
a:focus-visible,.mk:focus-visible{outline:2px solid var(--stamp);outline-offset:2px}

@media (prefers-reduced-motion:no-preference){
  .pen{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:ink 1.6s .15s ease-out forwards}
  @keyframes ink{to{stroke-dashoffset:0}}
}
@media (max-width:620px){
  body{padding:12px 8px 40px}
  section,.head,.panels>*{padding-left:16px;padding-right:16px}
  h1{font-size:21px}
  .rem{grid-template-columns:1fr;gap:6px}
}
@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;max-width:none}.pen{animation:none;stroke-dashoffset:0}}
</style></head><body>
<main class="sheet">

  <div class="head">
    <div>
      <h1>Driver's Daily Log</h1>
      <p>The build record for <b>${esc(c.repo.name)}</b> — every commit, when it landed, what it touched,
      and who was in the other seat. Drawn from git history and the Claude Code session transcripts; nothing here is typed in by hand.</p>
    </div>
    <div class="sn"><b>Sheet 1 of 1</b>${esc(c.repo.branch)} @ ${esc(c.repo.head)}<br>${c.generatedAt.slice(0, 16).replace('T', ' ')} UTC</div>
  </div>

  <div class="fields">${fields.map(([k, v]) => `<div><span class="lab">${k}</span><span class="val">${esc(v)}</span></div>`).join('')}</div>

  <section>
    <h2>Graph log</h2>
    <p class="sub">One row per kind of work, twenty-four hours across. The line moves when the work moved —
    each mark is a commit, and the number in the right column is the day's total. Hover a mark for its message.</p>
    ${c.byDay.map(graphLog).join('')}
  </section>

  <div class="panels">
    <section class="crewbox">
      <h3 class="lab" style="font-size:11px;letter-spacing:.18em;color:var(--muted);margin:0 0 12px">Co-drivers</h3>
      <ul class="crew">${crew.map((k) => `<li>
        <span class="who">${esc(k.m)}<em>${k.commits ? 'signed the commits' : 'no commits signed'}</em></span>
        <span class="fig"><b>${n(k.commits)}</b><br>${n(k.turns)} turns</span></li>`).join('')}
      </ul>
      <p class="unit">From <code style="font-family:var(--mono)">Co-Authored-By</code> trailers and session transcripts</p>
    </section>
    ${recap('Where the work landed', Object.entries(c.byArea).sort((a, b) => b[1] - a[1]).slice(0, 9), 'commits touching each area')}
    ${recap('What the work was', Object.entries(c.byType).sort((a, b) => b[1] - a[1]), 'commits by type')}
  </div>

  <section>
    <h2>Remarks</h2>
    <p class="sub">What each day was actually about.</p>
    ${c.byDay.map((d) => { const r = remarkFor(d); return `<article class="rem">
      <div class="when">${weekday(d.day)}<b>${dayLabel(d.day)}</b>${d.commits} commits</div>
      <div><h4>${esc(r.headline)}${r.draft ? '<span class="draft">Auto</span>' : ''}</h4><p>${esc(r.body)}</p></div>
    </article>` }).join('')}
  </section>

  <section>
    <h2>Progression</h2>
    <p class="sub">One row per view, oldest to newest — the app changing under the commits above.</p>
    ${strips.length ? strips.map((v) => `<h4 class="vlab">${esc(v.view)}<span>${v.total} capture${v.total === 1 ? '' : 's'}</span></h4>
      <div class="strip">${v.shots.map((s) => `<figure>
        <img src="${s.src}" alt="${esc(v.view)} at ${esc(s.at ?? s.day)}" loading="lazy">
        <figcaption>${esc(dayLabel(s.day))} ${esc(s.at?.slice(11) ?? '')}</figcaption></figure>`).join('')}</div>`).join('')
      : '<p class="empty">No captures yet. Run the chronicle with the dev server up on :5173 and this fills in.</p>'}
  </section>

  <footer>
    Generated by <code>scripts/chronicle.mjs</code> + <code>scripts/flight-log.mjs</code> from
    <code>git log --all --no-merges</code> and <code>~/.claude/projects/</code> transcripts.
    ${c.repo.remote ? `Source: <a href="${esc(c.repo.remote)}">${esc(c.repo.remote.replace('https://github.com/', ''))}</a>.` : ''}
    ${n(c.models.toolCalls)} tool calls across ${n(c.models.sessions)} sessions.
    Figures recompute on every run; none are written by hand.
  </footer>
</main></body></html>`

writeFileSync(join(DIR, 'flight-log.html'), html)
console.log(`flight-log: ${c.totals.commits} commits · ${c.byDay.length} days · ${crew.length} co-drivers · ${shotCount}/${c.screenshots.length} shots${EMBED ? ' (embedded)' : ''}`)
