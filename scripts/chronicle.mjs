#!/usr/bin/env node
// Derives the build's story from things that already exist: git history and the
// Claude Code transcripts on this machine. Reads only — never touches src/ or docs/
// outside docs/chronicle/. Output: docs/chronicle/chronicle.json.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO = resolve(process.cwd())
const OUT = join(REPO, 'docs/chronicle/chronicle.json')
const US = '\x1f' // field separator
const RS = '\x1e' // record separator

const git = (...args) => execFileSync('git', args, { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString()
const safe = (fn, fallback) => { try { return fn() } catch { return fallback } }

// ---------------------------------------------------------------- commits

// --all so work on any branch counts; the build thread lives on phase-1 today and
// may not tomorrow. Merges are bookkeeping, not story.
const meta = git('log', '--all', '--no-merges', `--format=%H${US}%aI${US}%an${US}%s${US}%b${RS}`)
const churn = git('log', '--all', '--no-merges', '--format=%x1d%H', '--numstat')

const churnByHash = new Map()
for (const block of churn.split('\x1d').slice(1)) {
  const [hash, ...lines] = block.trim().split('\n')
  const files = []
  let ins = 0, del = 0
  for (const line of lines) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (!m) continue
    // "-" is git's marker for a binary file: no line counts to add.
    const a = m[1] === '-' ? 0 : +m[1]
    const b = m[2] === '-' ? 0 : +m[2]
    ins += a; del += b
    files.push({ path: m[3], ins: a, del: b })
  }
  churnByHash.set(hash.trim(), { files, ins, del })
}

/** Group a changed path into the area a reader would recognize on a slide. */
function areaOf(path) {
  const m = path.match(/^src\/([^/]+)\//)
  if (m) return m[1]
  if (path.startsWith('src/')) return 'app'
  if (path.startsWith('docs/chronicle/')) return 'chronicle'
  if (path.startsWith('docs/')) return 'docs'
  if (path.startsWith('scripts/')) return 'scripts'
  if (path.startsWith('.claude/')) return 'chronicle'
  return 'config'
}

/** Model names ride in the Co-Authored-By trailer Claude Code writes on every commit. */
function creditsOf(body) {
  const out = []
  for (const m of body.matchAll(/Co-Authored-By:\s*([^<\n]+?)\s*</gi)) {
    const name = m[1].trim()
    out.push(name === 'Claude' ? 'Claude (model unspecified)' : name)
  }
  return [...new Set(out)]
}

const commits = []
for (const rec of meta.split(RS)) {
  const line = rec.replace(/^\n/, '')
  if (!line.trim()) continue
  const [hash, date, author, subject, body = ''] = line.split(US)
  const conv = subject.match(/^(\w+)(?:\(([^)]*)\))?!?:\s*(.*)$/)
  const c = churnByHash.get(hash) ?? { files: [], ins: 0, del: 0 }
  commits.push({
    hash: hash.slice(0, 7),
    date,
    day: date.slice(0, 10),
    hour: +date.slice(11, 13),
    author,
    subject,
    type: conv ? conv[1] : 'other',
    scope: conv?.[2] ?? null,
    title: conv ? conv[3] : subject,
    credits: creditsOf(body),
    insertions: c.ins,
    deletions: c.del,
    fileCount: c.files.length,
    areas: [...new Set(c.files.map((f) => areaOf(f.path)))],
  })
}
commits.sort((a, b) => a.date.localeCompare(b.date))

const tally = (items, key) => items.reduce((acc, i) => { const k = key(i); acc[k] = (acc[k] ?? 0) + 1; return acc }, {})

const byDay = [...new Set(commits.map((c) => c.day))].sort().map((day) => {
  const on = commits.filter((c) => c.day === day)
  const areas = {}
  for (const c of on) for (const a of c.areas) areas[a] = (areas[a] ?? 0) + 1
  return {
    day,
    commits: on.length,
    byType: tally(on, (c) => c.type),
    areas,
    insertions: on.reduce((n, c) => n + c.insertions, 0),
    deletions: on.reduce((n, c) => n + c.deletions, 0),
    firstAt: on[0].date,
    lastAt: on[on.length - 1].date,
    subjects: on.map((c) => c.subject),
  }
})

const byHour = Array.from({ length: 24 }, (_, h) => commits.filter((c) => c.hour === h).length)
const byArea = {}
for (const c of commits) for (const a of c.areas) byArea[a] = (byArea[a] ?? 0) + 1
const commitsByModel = {}
for (const c of commits) for (const m of (c.credits.length ? c.credits : ['uncredited'])) commitsByModel[m] = (commitsByModel[m] ?? 0) + 1

// ---------------------------------------------------------------- transcripts

/** Claude Code stores a project's transcripts under a dir named for its path. */
const PROJECTS = join(homedir(), '.claude/projects')
const slug = REPO.replace(/\//g, '-')
const transcriptDirs = existsSync(PROJECTS)
  ? readdirSync(PROJECTS).filter((d) => d === slug || d.startsWith(slug + '-')).map((d) => join(PROJECTS, d))
  : []

const PRETTY = {
  'claude-fable-5-1': 'Fable 5.1', 'claude-fable-5': 'Fable 5', 'claude-opus-5': 'Opus 5',
  'claude-sonnet-5': 'Sonnet 5', 'claude-haiku-4-5': 'Haiku 4.5', opus: 'Opus 5', sonnet: 'Sonnet 5',
}
const prettyModel = (id) => PRETTY[id] ?? PRETTY[id?.replace(/-\d{8}$/, '')] ?? id

const turnsByModel = {}, tokensByModel = {}, sessions = new Map()
let subagentTurns = 0, userTurns = 0, toolCalls = 0

for (const dir of transcriptDirs) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue
      let d; try { d = JSON.parse(line) } catch { continue }
      const at = d.timestamp
      const sid = d.sessionId ?? file.replace('.jsonl', '')
      if (at) {
        const s = sessions.get(sid) ?? { id: sid.slice(0, 8), start: at, end: at, turns: 0, models: new Set() }
        if (at < s.start) s.start = at
        if (at > s.end) s.end = at
        sessions.set(sid, s)
      }
      if (d.type === 'user') { userTurns++; continue }
      if (d.type !== 'assistant') continue
      const id = d.message?.model
      if (!id || id === '<synthetic>') continue
      const name = prettyModel(id)
      if (d.isSidechain) subagentTurns++
      turnsByModel[name] = (turnsByModel[name] ?? 0) + 1
      const u = d.message?.usage ?? {}
      const t = tokensByModel[name] ?? { input: 0, output: 0, cacheRead: 0 }
      t.input += u.input_tokens ?? 0
      t.output += u.output_tokens ?? 0
      t.cacheRead += u.cache_read_input_tokens ?? 0
      tokensByModel[name] = t
      for (const blk of d.message?.content ?? []) if (blk?.type === 'tool_use') toolCalls++
      const s = sessions.get(sid); if (s) { s.turns++; s.models.add(name) }
    }
  }
}

// ---------------------------------------------------------------- screenshots

const SHOTS = join(REPO, 'docs/chronicle/progress')
const screenshots = existsSync(SHOTS)
  ? readdirSync(SHOTS).filter((f) => f.endsWith('.png')).sort().map((file) => {
      const m = file.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})-(.+)\.png$/)
      return {
        file,
        day: m?.[1] ?? statSync(join(SHOTS, file)).mtime.toISOString().slice(0, 10),
        at: m ? `${m[1]}T${m[2]}:${m[3]}` : null,
        view: m?.[4] ?? file.replace(/\.png$/, ''),
      }
    })
  : []

// ---------------------------------------------------------------- write

const chronicle = {
  generatedAt: new Date().toISOString(),
  repo: {
    name: REPO.split('/').pop(),
    branch: safe(() => git('rev-parse', '--abbrev-ref', 'HEAD').trim(), 'unknown'),
    remote: safe(() => git('remote', 'get-url', 'origin').trim().replace(/\.git$/, ''), null),
    head: commits[commits.length - 1]?.hash ?? null,
  },
  totals: {
    commits: commits.length,
    days: byDay.length,
    insertions: commits.reduce((n, c) => n + c.insertions, 0),
    deletions: commits.reduce((n, c) => n + c.deletions, 0),
    sourceFiles: safe(() => git('ls-files', 'src').trim().split('\n').filter(Boolean).length, 0),
    screenshots: screenshots.length,
  },
  span: { first: commits[0]?.date ?? null, last: commits[commits.length - 1]?.date ?? null },
  byType: tally(commits, (c) => c.type),
  byDay,
  byHour,
  byArea,
  models: {
    commits: commitsByModel,
    turns: turnsByModel,
    tokens: tokensByModel,
    sessions: sessions.size,
    subagentTurns,
    userTurns,
    toolCalls,
  },
  sessions: [...sessions.values()]
    .map((s) => ({ ...s, models: [...s.models] }))
    .sort((a, b) => a.start.localeCompare(b.start)),
  screenshots,
  commits,
}

writeFileSync(OUT, JSON.stringify(chronicle, null, 2))
console.log(
  `chronicle: ${chronicle.totals.commits} commits · ${chronicle.totals.days} days · ` +
  `${Object.keys(turnsByModel).length} models · ${sessions.size} sessions · ${screenshots.length} screenshots`
)
