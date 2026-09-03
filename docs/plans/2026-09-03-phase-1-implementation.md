# Dispatcher's Dashboard — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the submittable Phase 1 product: the Active Shift board, the route file page, and the Lookout rail, driven by a deterministic seeded fleet and a live simulated clock, with HOS alerts computed from duty segments and every action confirming before it commits.

**Architecture:** A pure derivation layer (`hos/compute.ts` → `store/derive.ts` → `alerts/rules.ts` → `alerts/rank.ts` → `bands.ts`) turns one seeded fleet plus one `now` into one ranked `DriverCard[]`. Every surface — metrics row, region-column board, route file, Lookout rail — reads that one array. Mutations go through pure transforms in `store/actions.ts`, wrapped by a Zustand store that snapshots for undo.

**Tech Stack:** Vite · React 19 · TypeScript (strict) · Tailwind v4 (`@tailwindcss/vite`) · Zustand · react-router v7 · Phosphor icons · fontsource Bricolage Grotesque + Inter · Vitest · oxlint · Vercel.

**Spec:** `docs/ARCHITECTURE.md` (the plan argues from it; read it first). Context: `docs/BRIEF.md`, `docs/LAYOUT.md`, `docs/FLOWS.md`. Operating contract: `CLAUDE.md`.

## Global Constraints

- Runtime dependencies are exactly: `react`, `react-dom`, `react-router`, `zustand`, `@phosphor-icons/react`, `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/inter`, `tailwindcss`, `@tailwindcss/vite`. Nothing else without a one-line reason in `docs/DECISIONS.md`. No Leaflet in Phase 1.
- Pure modules (`src/hos/*`, `src/alerts/*`, `src/bands.ts`, `src/filters.ts`, `src/groupBy.ts`, `src/store/derive.ts`, `src/store/actions.ts`, `src/data/*`, `src/time/clock.ts`, `src/lib/*`) import no React and are unit-tested with Vitest, tests beside the module as `*.test.ts`.
- One clock: `useNow()` is the only hook that reads `Date.now()` at runtime. `TICK_MS = 5000`. The scenario anchor is today at **12:47:00 local**.
- Constants, verbatim from the spec: `LIMIT_MIN = 660`, `ACT_NOW_MIN = 30`, `WATCH_MIN = 90`, `FRESH_MIN = 3`, `OFFLINE_MIN = 15`, `SNOOZE_MIN = 10`, `BEHIND_MIN = 15`, `CAPACITY_MARGIN_MIN = 20`, `WINDOW_14H_MIN = 840`. Boundaries: `≤ 30` act now, `≤ 90` watch, `≤ 0` over; `< 3` fresh, `3–15` stale, `> 15` offline.
- HOS math always reads `segmentsKnownAt(driver.segments, effectiveLastPingAt(driver, now))`.
- Rules are `{ id, label, severity, when, message, actions }` objects in `src/alerts/rules.ts`, fixed severity, one object per rule. Filters and groupings are config arrays too.
- Lookout reads `ranked` and nothing else. `alertBar = ranked.slice(0, 3)` after dropping cards with no alerts.
- Components use theme tokens only (`bg-panel`, `text-ink`, `text-act-now`, …). No raw hex in a `.tsx` file.
- Copy is in Lookout's voice: a competent colleague, plain language, no system-log tone. The co-pilot is **Lookout**; the dispatcher persona is **Lena**. No Toast logo, product names, or exact brand palette anywhere in the repo.
- Everything not meant to be viewable in the submitted repo lives in `private/` (gitignored). Nothing committed references it.
- Light theme only. Rows ~40px, cards compact. Motion limited to countdown ticks and band-change transitions.
- Commit after every task with a message in the form `feat: …` / `test: …` / `chore: …`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File map

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json` | Toolchain |
| `src/index.css` | Tailwind import, fonts, every design token |
| `src/main.tsx`, `src/App.tsx` | Bootstrap and routes |
| `src/lib/format.ts` | Clock, duration, countdown, age, drift formatting |
| `src/data/types.ts` | Entity types (`Driver`, `Truck`, `Route`, `Stop`, `Delivery`, `Fleet`) |
| `src/data/prng.ts` | mulberry32 and an `Rng` helper |
| `src/data/regions.ts` | The four regions, centers, leg-length ranges |
| `src/data/seed.ts` | Deterministic fleet generator |
| `src/data/planted.ts` | The ten hand-authored drivers |
| `src/time/clock.ts` | Anchor, `simNow`, tick rounding |
| `src/hos/constants.ts` | Thresholds |
| `src/hos/compute.ts` | Pure HOS, staleness, route math |
| `src/alerts/types.ts` | `Severity`, `ActionId`, `Rule`, `Alert`, `DriverCard` |
| `src/alerts/rules.ts` | The rules array |
| `src/alerts/rank.ts` | `evaluateRules`, `rankDrivers` |
| `src/bands.ts` | `Band`, `bandOf`, band order and labels |
| `src/filters.ts`, `src/groupBy.ts` | Filter and grouping config |
| `src/store/derive.ts` | `DriverView`, `buildViews`, `derive`, `computeMetrics` |
| `src/store/actions.ts` | Pure fleet transforms and reassign candidates |
| `src/store/store.ts` | Zustand store with undo |
| `src/store/hooks.ts` | `useNow`, `useDerived` |
| `src/ui/*` | `Chip`, `Button`, `Card`, `Countdown`, `Bar`, `Avatar`, `EmptyState`, `Toast`, `tones.ts` |
| `src/app/*` | `Layout`, `LeftNav`, `Header`, `DevPanel` |
| `src/lookout/*` | `LookoutContext`, `LookoutSidebar`, `AlertBar`, `RecommendationCard`, `ActionConfirm`, `voice.ts` |
| `src/actions/ActionContext.tsx` | Opens the three dialogs from anywhere |
| `src/views/shift/*` | `ActiveShiftPage`, `MetricsRow`, `FilterBar`, `Board`, `RouteCard` |
| `src/views/route/*` | `RouteFilePage`, `RouteHeader`, `StaleBanner`, `AlertStrip`, `DayMetrics`, `RouteRibbon`, `DutyTimeline`, `StopReceipt` |
| `src/views/route/actions/*` | `ReassignDialog`, `ResetDialog`, `NotifyDialog` |
| `README.md` | Setup, what to look at, honesty about scope and time |

Deviation from the spec's §3, recorded here so nobody hunts for it: Lookout is **not** portaled from pages. It is mounted once in `Layout` and reads derived state directly; pages set a focus driver through `LookoutContext`. Simpler to read live, same behavior.

---

### Task 1: Toolchain, tokens, and the first tested module

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `fmtClock(t: number): string`, `fmtHm(minutes: number): string`, `fmtCountdown(minutes: number, stale: boolean): string`, `fmtMinutes(minutes: number): string`, `fmtAge(minutes: number): string`, `fmtDrift(minutes: number): string`. Every later task formats time through these.

- [x] **Step 1: Preflight**

Run: `node -v && npm -v && git status --short`
Expected: Node 20 or newer; a clean tree containing only `.gitignore`, `CLAUDE.md`, `docs/`.

- [x] **Step 2: Write `package.json`**

```json
{
  "name": "dispatcher-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint src"
  }
}
```

- [x] **Step 3: Install dependencies**

Run:
```bash
npm i react react-dom react-router zustand @phosphor-icons/react @fontsource-variable/bricolage-grotesque @fontsource-variable/inter tailwindcss @tailwindcss/vite
npm i -D vite @vitejs/plugin-react typescript vitest oxlint @types/react @types/react-dom @types/node
```
Expected: `package-lock.json` created; no peer warnings that mention React 18.

- [x] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [x] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [x] **Step 6: Write `index.html`, `vercel.json`, `src/main.tsx`, `src/App.tsx`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Active Shift</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vercel.json` (SPA fallback so `/routes/drv-01` deep links work):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

`src/App.tsx` (placeholder; Task 8 replaces it):
```tsx
export default function App() {
  return <p className="p-6 font-display text-2xl text-ink">Active Shift</p>
}
```

- [x] **Step 7: Write `src/index.css` with every token from the spec §11**

```css
@import "tailwindcss";
@import "@fontsource-variable/bricolage-grotesque";
@import "@fontsource-variable/inter";

/* Warm neutral ops palette. Rhymes with a warm, friendly product language without
   borrowing anyone's brand. Text variants pass AA on panel; fills are for bars and
   markers only. Lookout wears coral and nothing else does. */
@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-display: "Bricolage Grotesque Variable", "Inter Variable", ui-sans-serif, sans-serif;

  --color-canvas: #f4f3f0;
  --color-panel: #ffffff;
  --color-well: #ebe9e4;
  --color-line: #e2dfd8;
  --color-ink: #1c1a17;
  --color-muted: #6b665e;
  --color-label: #7a746a;
  --color-on-accent: #ffffff;

  --color-lookout: #cf4620;
  --color-lookout-strong: #a83a15;
  --color-lookout-soft: #ffe9e2;

  --color-act-now: #b3323f;
  --color-act-now-fill: #c9414f;
  --color-act-now-soft: #fbeaec;

  --color-watch: #8f5f0e;
  --color-watch-fill: #d19a2a;
  --color-watch-soft: #fbf3e3;

  --color-clear: #2f7d5a;
  --color-clear-fill: #5aa37f;
  --color-clear-soft: #e8f4ee;

  --color-offline: #6b7280;
  --color-offline-fill: #9aa0ab;
  --color-offline-soft: #eef0f3;

  --color-break: #3b6fb6;
  --color-break-fill: #6f9bd6;
  --color-break-soft: #e9f0fa;

  --radius-card: 12px;
  --radius-control: 8px;

  --shadow-card: 0 1px 2px rgba(28, 26, 23, 0.06), 0 1px 3px rgba(28, 26, 23, 0.08);
}

html, body, #root { height: 100%; }
body { @apply bg-canvas text-ink font-sans antialiased; }
.tnum { font-variant-numeric: tabular-nums; }
```

- [x] **Step 8: Write the failing format tests**

`src/lib/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fmtAge, fmtCountdown, fmtDrift, fmtHm, fmtMinutes } from './format'

describe('fmtHm', () => {
  it('renders hours:minutes with a two-digit minute', () => {
    expect(fmtHm(18)).toBe('0:18')
    expect(fmtHm(78)).toBe('1:18')
    expect(fmtHm(660)).toBe('11:00')
  })
  it('keeps the sign for over-limit values', () => {
    expect(fmtHm(-6)).toBe('-0:06')
  })
  it('rounds fractional minutes', () => {
    expect(fmtHm(17.6)).toBe('0:18')
  })
})

describe('fmtCountdown', () => {
  it('prefixes a tilde when the figure is an estimate', () => {
    expect(fmtCountdown(40.2, true)).toBe('~0:40')
    expect(fmtCountdown(40.2, false)).toBe('0:40')
  })
})

describe('fmtMinutes / fmtAge', () => {
  it('uses minutes under an hour and h/m above', () => {
    expect(fmtMinutes(18)).toBe('18 min')
    expect(fmtMinutes(72)).toBe('1h 12m')
    expect(fmtMinutes(120)).toBe('2h')
  })
  it('ages read as "N ago" and "just now" under a minute', () => {
    expect(fmtAge(25)).toBe('25 min ago')
    expect(fmtAge(0.4)).toBe('just now')
  })
})

describe('fmtDrift', () => {
  it('treats ±5 minutes as on time', () => {
    expect(fmtDrift(3)).toBe('On time')
    expect(fmtDrift(-5)).toBe('On time')
    expect(fmtDrift(14)).toBe('Behind 14 min')
    expect(fmtDrift(-9)).toBe('Ahead 9 min')
  })
})
```

- [x] **Step 9: Run the test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [x] **Step 10: Write `src/lib/format.ts`**

```ts
// All time formatting lives here so precision rules (tilde for estimates, no
// seconds anywhere) are enforced in one place.

export function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** 78 → "1:18", -6 → "-0:06". Minutes, never seconds: precision drops with age, and we never fake it. */
export function fmtHm(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const m = Math.round(Math.abs(minutes))
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export function fmtCountdown(minutes: number, stale: boolean): string {
  return `${stale ? '~' : ''}${fmtHm(minutes)}`
}

export function fmtMinutes(minutes: number): string {
  const m = Math.round(Math.abs(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function fmtAge(minutes: number): string {
  if (minutes < 1) return 'just now'
  return `${fmtMinutes(minutes)} ago`
}

export function fmtDrift(minutes: number): string {
  if (Math.abs(minutes) <= 5) return 'On time'
  return minutes > 0 ? `Behind ${fmtMinutes(minutes)}` : `Ahead ${fmtMinutes(-minutes)}`
}
```

- [x] **Step 11: Run tests, typecheck, and build**

Run: `npm test && npm run build`
Expected: 1 test file, 7 tests passing; `tsc` clean; `dist/` produced. Then `npm run dev` and open `http://localhost:5173`: "Active Shift" renders in Bricolage on the warm canvas.

- [x] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Tailwind v4 with tokens and format helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Types, PRNG, regions, and the simulated clock

**Files:**
- Create: `src/data/types.ts`, `src/data/prng.ts`, `src/data/regions.ts`, `src/time/clock.ts`
- Test: `src/data/prng.test.ts`, `src/time/clock.test.ts`

**Interfaces:**
- Produces: every entity type in `types.ts` (copied from the spec §4, plus `Fleet` and `LatLng`); `mulberry32(seed)`, `makeRng(seed): Rng`, `hashString(s)`; `REGIONS`, `REGION_CENTER`, `REGION_LEG_MINUTES`; `TICK_MS`, `MIN`, `ANCHOR`, `LOADED_AT`, `scenarioAnchor(from?)`, `simNow(scrubOffsetMs, wall?, loadedAt?, anchor?)`, `toTick(t)`.

- [x] **Step 1: Write `src/data/types.ts`**

```ts
export type Region = 'North' | 'West' | 'South' | 'Central'

export type DutyStatus = 'driving' | 'on_duty' | 'on_break' | 'off_duty'

export interface DutySegment {
  status: DutyStatus
  startedAt: number // epoch ms on the simulated clock
  endedAt?: number // undefined = ongoing
  planned?: boolean // a reset the dispatcher scheduled; it is our data, not telematics
}

export interface LatLng {
  lat: number
  lng: number
}

export interface Driver {
  id: string
  name: string // "Marcus R."
  initials: string
  truckId: string
  routeId: string
  region: Region
  shiftStartedAt: number
  segments: DutySegment[] // the truth; HOS math reads segmentsKnownAt(lastPing)
  lastPingAt: number // mirrors the truck's telematics ping
  pingsSuspended?: boolean // planted stale/offline drivers stop pinging
  contactAttemptedAt?: number
}

export interface Truck {
  id: string
  plate: string
  region: Region
  position: LatLng
  lastPingAt: number
}

export interface Delivery {
  id: string
  customer: string
  address: string
  position: LatLng
  window: { start: number; end: number }
  priority: 'standard' | 'priority'
  items: string[]
  instructions?: string
}

export type StopStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'unassigned'
export type StopOutcome = 'delivered' | 'partial' | 'failed'

export interface Stop {
  id: string
  routeId: string
  deliveryId: string
  seq: number
  driveMinutesFromPrev: number // the leg into this stop; consumes the 11-hour limit
  serviceMinutes: number // time at the stop; on duty, not driving
  plannedEta: number
  status: StopStatus
  arrivedAt?: number
  departedAt?: number
  outcome?: StopOutcome
  signedBy?: string
  notifiedAt?: number
  note?: string
}

export interface Route {
  id: string
  driverId: string
  region: Region
  plannedStartAt: number
  windowEnd: number
  stops: Stop[] // ordered by seq
}

export interface Fleet {
  drivers: Driver[]
  trucks: Truck[]
  routes: Route[]
  deliveries: Delivery[]
}
```

- [x] **Step 2: Write the failing PRNG and clock tests**

`src/data/prng.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { hashString, makeRng, mulberry32 } from './prng'

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('stays in [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('makeRng', () => {
  it('int is inclusive on both ends', () => {
    const r = makeRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 3))
    expect([...seen].sort()).toEqual([1, 2, 3])
  })
  it('pick returns members', () => {
    const r = makeRng(9)
    expect(['a', 'b']).toContain(r.pick(['a', 'b']))
  })
})

describe('hashString', () => {
  it('is stable and unsigned', () => {
    expect(hashString('drv-01')).toBe(hashString('drv-01'))
    expect(hashString('drv-01')).toBeGreaterThanOrEqual(0)
    expect(hashString('drv-01')).not.toBe(hashString('drv-02'))
  })
})
```

`src/time/clock.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { MIN, TICK_MS, scenarioAnchor, simNow, toTick } from './clock'

describe('scenarioAnchor', () => {
  it('is 12:47:00 local on the given day', () => {
    const d = new Date(2026, 8, 3, 9, 15, 30)
    const a = new Date(scenarioAnchor(d))
    expect([a.getHours(), a.getMinutes(), a.getSeconds(), a.getMilliseconds()]).toEqual([12, 47, 0, 0])
    expect(a.getDate()).toBe(3)
  })
})

describe('simNow', () => {
  it('advances with wall time from the anchor and adds the scrub offset', () => {
    const anchor = 1_000_000
    const loadedAt = 5_000_000
    expect(simNow(0, loadedAt, loadedAt, anchor)).toBe(anchor)
    expect(simNow(0, loadedAt + 30_000, loadedAt, anchor)).toBe(anchor + 30_000)
    expect(simNow(15 * MIN, loadedAt, loadedAt, anchor)).toBe(anchor + 15 * MIN)
  })
})

describe('toTick', () => {
  it('rounds down to the tick so memo keys are stable', () => {
    expect(toTick(TICK_MS * 3 + 4999)).toBe(TICK_MS * 3)
  })
})
```

- [x] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/data src/time`
Expected: FAIL — modules not found.

- [x] **Step 4: Write `src/data/prng.ts`**

```ts
// mulberry32: tiny, seedable, deterministic. Same seed → same fleet in every
// browser and on the deployed build. Never Math.random() in this repo.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rng {
  next(): number
  int(min: number, max: number): number // inclusive
  pick<T>(items: readonly T[]): T
  chance(p: number): boolean
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed)
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  }
}

/** FNV-1a. Used to derive per-driver jitter without touching the fleet RNG. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
```

- [x] **Step 5: Write `src/data/regions.ts`**

```ts
import type { LatLng, Region } from './types'

export const REGIONS: Region[] = ['North', 'West', 'South', 'Central']

// One invented metro, Chicago-shaped. Centers are approximate; streets and
// addresses are made up. Four regions so the board fits beside the open rail.
export const REGION_CENTER: Record<Region, LatLng> = {
  North: { lat: 42.02, lng: -87.72 },
  West: { lat: 41.87, lng: -87.85 },
  South: { lat: 41.72, lng: -87.62 },
  Central: { lat: 41.88, lng: -87.64 },
}

// Leg length ranges in minutes. Outer regions drive longer between stops.
export const REGION_LEG_MINUTES: Record<Region, [number, number]> = {
  North: [10, 26],
  West: [12, 30],
  South: [16, 35],
  Central: [8, 18],
}
```

- [x] **Step 6: Write `src/time/clock.ts`**

```ts
// The one clock. The scenario is pinned to 12:47 PM so the demo is the same at
// any hour, and it still ticks: now = anchor + real elapsed + scrub offset.
export const TICK_MS = 5000
export const MIN = 60_000
export const ANCHOR_HOUR = 12
export const ANCHOR_MINUTE = 47

export function scenarioAnchor(from: Date = new Date()): number {
  const d = new Date(from)
  d.setHours(ANCHOR_HOUR, ANCHOR_MINUTE, 0, 0)
  return d.getTime()
}

export const ANCHOR = scenarioAnchor()
export const LOADED_AT = Date.now()

export function simNow(scrubOffsetMs: number, wall: number = Date.now(), loadedAt: number = LOADED_AT, anchor: number = ANCHOR): number {
  return anchor + (wall - loadedAt) + scrubOffsetMs
}

/** Round down to the tick so every memo keyed on `now` is stable within a tick. */
export function toTick(t: number): number {
  return Math.floor(t / TICK_MS) * TICK_MS
}

export function minutesBetween(from: number, to: number): number {
  return (to - from) / MIN
}
```

- [x] **Step 7: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all green.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: entity types, seeded PRNG, regions, and the simulated clock

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: HOS constants and the pure compute layer

**Files:**
- Create: `src/hos/constants.ts`, `src/hos/compute.ts`
- Test: `src/hos/compute.test.ts`

**Interfaces:**
- Consumes: `Driver`, `DutySegment`, `DutyStatus`, `Route`, `Stop` from `src/data/types.ts`; `hashString` from `src/data/prng.ts`; `MIN` from `src/time/clock.ts`.
- Produces: `HosStatus = 'over' | 'act_now' | 'watch' | 'clear'`, `Staleness = 'fresh' | 'stale' | 'offline'`, and the functions listed in Step 3. Later tasks call `effectiveLastPingAt`, `knownSegments`, `drivingMinutes`, `minutesUntilLimit`, `hosStatusOf`, `hosStatus`, `pingAgeMinutes`, `stalenessOf`, `staleness`, `currentStatus`, `remainingStops`, `doneStops`, `unassignedStops`, `nextStop`, `remainingDriveMinutes`, `remainingServiceMinutes`, `scheduleDrift`, `projectedEta`, `projectedFinishAt`, `projectedDepartureAt`, `limitHitAt`, `drivingSinceBreak`, `plannedReset`.

- [x] **Step 1: Write `src/hos/constants.ts`**

```ts
// Thresholds. Every one of these is a guess a real deployment would tune; the
// point is that they live in one place and the walkthrough can say so.
export const LIMIT_MIN = 660 // 11 hours of driving
export const ACT_NOW_MIN = 30
export const WATCH_MIN = 90
export const FRESH_MIN = 3
export const OFFLINE_MIN = 15
export const SNOOZE_MIN = 10
export const BEHIND_MIN = 15
export const CAPACITY_MARGIN_MIN = 20
export const WINDOW_14H_MIN = 840
export const BREAK_MIN = 30 // an interruption this long resets the 8-hour break clock
export const BREAK_DUE_AFTER_MIN = 480
export const RESET_MIN = 600 // 10 consecutive hours off duty
export const PING_JITTER_MS = 90_000
```

- [x] **Step 2: Write the failing compute tests**

`src/hos/compute.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { Driver, DutySegment, Route, Stop } from '../data/types'
import { MIN } from '../time/clock'
import {
  drivingMinutes, drivingSinceBreak, effectiveLastPingAt, hosStatusOf, knownSegments, limitHitAt,
  minutesUntilLimit, remainingDriveMinutes, scheduleDrift, segmentsKnownAt, stalenessOf, currentStatus,
} from './compute'

const m = (n: number) => n * MIN

function driver(segments: DutySegment[], lastPingAt: number, pingsSuspended = false): Driver {
  return { id: 'drv-t', name: 'Test T.', initials: 'TT', truckId: 'trk-t', routeId: 'rt-t', region: 'North', shiftStartedAt: 0, segments, lastPingAt, pingsSuspended }
}

function stop(seq: number, drive: number, service: number, plannedEta: number, extra: Partial<Stop> = {}): Stop {
  return { id: `s${seq}`, routeId: 'rt-t', deliveryId: `d${seq}`, seq, driveMinutesFromPrev: drive, serviceMinutes: service, plannedEta, status: 'pending', ...extra }
}

function route(stops: Stop[]): Route {
  return { id: 'rt-t', driverId: 'drv-t', region: 'North', plannedStartAt: 0, windowEnd: m(700), stops }
}

describe('segmentsKnownAt', () => {
  it('drops segments that started after the ping and reopens ones that ended after it', () => {
    const segs: DutySegment[] = [
      { status: 'driving', startedAt: m(0), endedAt: m(50) },
      { status: 'on_break', startedAt: m(50), endedAt: m(80) },
    ]
    const known = segmentsKnownAt(segs, m(40))
    expect(known).toEqual([{ status: 'driving', startedAt: m(0), endedAt: undefined }])
  })
  it('always keeps planned segments: they are our data, not telematics', () => {
    const segs: DutySegment[] = [{ status: 'off_duty', startedAt: m(500), endedAt: m(1100), planned: true }]
    expect(segmentsKnownAt(segs, m(40))).toHaveLength(1)
  })
})

describe('drivingMinutes', () => {
  it('closes the ongoing segment at now', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(90))
    expect(drivingMinutes(d, m(90))).toBeCloseTo(90)
  })
  it('a break pauses accumulation', () => {
    const d = driver([{ status: 'driving', startedAt: m(0), endedAt: m(60) }, { status: 'on_break', startedAt: m(60) }], m(100))
    expect(drivingMinutes(d, m(100))).toBeCloseTo(60)
    expect(currentStatus(d, m(100))).toBe('on_break')
  })
  it('an offline driver last seen driving keeps accumulating (the honest pessimistic projection)', () => {
    // Truth: went on break at 45. Telematics last heard at 40. At 70 the projection says 70 min of driving.
    const d = driver([{ status: 'driving', startedAt: m(0), endedAt: m(45) }, { status: 'on_break', startedAt: m(45) }], m(40), true)
    expect(knownSegments(d, m(70))).toHaveLength(1)
    expect(drivingMinutes(d, m(70))).toBeCloseTo(70)
  })
  it('a planned reset caps the ongoing drive once it starts', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }, { status: 'off_duty', startedAt: m(30), endedAt: m(630), planned: true }], m(50))
    expect(drivingMinutes(d, m(50))).toBeCloseTo(30)
    expect(currentStatus(d, m(50))).toBe('off_duty')
  })
})

describe('thresholds', () => {
  it('bands are inclusive at the boundary and monotonic', () => {
    expect(hosStatusOf(0)).toBe('over')
    expect(hosStatusOf(0.01)).toBe('act_now')
    expect(hosStatusOf(30)).toBe('act_now')
    expect(hosStatusOf(30.01)).toBe('watch')
    expect(hosStatusOf(90)).toBe('watch')
    expect(hosStatusOf(90.01)).toBe('clear')
  })
  it('staleness tiers', () => {
    expect(stalenessOf(2.99)).toBe('fresh')
    expect(stalenessOf(3)).toBe('stale')
    expect(stalenessOf(15)).toBe('stale')
    expect(stalenessOf(15.01)).toBe('offline')
  })
  it('minutesUntilLimit is 660 minus driving', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(648))
    expect(minutesUntilLimit(d, m(648))).toBeCloseTo(12)
  })
})

describe('effectiveLastPingAt', () => {
  it('online drivers ping with the clock; suspended drivers keep their stored ping', () => {
    const online = driver([], m(0))
    expect(m(500) - effectiveLastPingAt(online, m(500))).toBeLessThan(90_000)
    const dark = driver([], m(475), true)
    expect(effectiveLastPingAt(dark, m(500))).toBe(m(475))
  })
})

describe('route math', () => {
  const r = route([
    stop(1, 10, 15, m(100), { status: 'done', arrivedAt: m(115), departedAt: m(130) }),
    stop(2, 10, 15, m(125)),
    stop(3, 15, 10, m(150)),
  ])
  it('remaining drive excludes done stops and an in-progress stop's leg', () => {
    expect(remainingDriveMinutes(r)).toBe(25)
    const arrived = route([stop(1, 10, 15, m(100), { status: 'in_progress', arrivedAt: m(120) }), stop(2, 20, 5, m(140))])
    expect(remainingDriveMinutes(arrived)).toBe(20)
  })
  it('drift is the slip at the last checkpoint, or the overdue time on the next stop, whichever is worse', () => {
    expect(scheduleDrift(r, m(135))).toBeCloseTo(15) // departed stop 1 at 130, planned departure was 115
    expect(scheduleDrift(r, m(160))).toBeCloseTo(35) // should have reached stop 2 at 125
  })
  it('limitHitAt walks legs and skips service time', () => {
    // 20 min of drive time left. Stop 2: 10 drive + 15 service. Stop 3: 15 drive. Limit lands 10 min into leg 3.
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(640))
    const now = m(640)
    expect(limitHitAt(d, r, now)).toBe(now + m(10 + 15 + 10))
  })
  it('limitHitAt is now when already over', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(700))
    expect(limitHitAt(d, r, m(700))).toBe(m(700))
  })
})

describe('drivingSinceBreak', () => {
  it('resets on an interruption of 30 minutes or more', () => {
    const d = driver([
      { status: 'driving', startedAt: m(0), endedAt: m(200) },
      { status: 'on_break', startedAt: m(200), endedAt: m(230) },
      { status: 'driving', startedAt: m(230) },
    ], m(300))
    expect(drivingSinceBreak(d, m(300))).toBeCloseTo(70)
  })
  it('a short stop does not reset it', () => {
    const d = driver([
      { status: 'driving', startedAt: m(0), endedAt: m(200) },
      { status: 'on_duty', startedAt: m(200), endedAt: m(215) },
      { status: 'driving', startedAt: m(215) },
    ], m(300))
    expect(drivingSinceBreak(d, m(300))).toBeCloseTo(285)
  })
})
```

- [x] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/hos`
Expected: FAIL — `./compute` not found.

- [x] **Step 4: Write `src/hos/compute.ts`**

```ts
import type { Driver, DutySegment, DutyStatus, Route, Stop } from '../data/types'
import { hashString } from '../data/prng'
import { MIN } from '../time/clock'
import { ACT_NOW_MIN, BREAK_MIN, FRESH_MIN, LIMIT_MIN, OFFLINE_MIN, PING_JITTER_MS, WATCH_MIN } from './constants'

export type HosStatus = 'over' | 'act_now' | 'watch' | 'clear'
export type Staleness = 'fresh' | 'stale' | 'offline'

/** Where the truck's telematics last reached us. Online drivers ping continuously
 *  (derived, not mutated), so scrubbing the clock or leaving a tab open never blacks
 *  out the fleet. Planted stale/offline drivers keep their stored ping. */
export function effectiveLastPingAt(driver: Driver, now: number): number {
  if (driver.pingsSuspended) return driver.lastPingAt
  const jitter = hashString(driver.id) % PING_JITTER_MS
  return Math.max(driver.lastPingAt, now - jitter)
}

/** The segments as they were known at `at`: started by then, with any segment that
 *  ended after `at` reopened, because at `at` its end had not happened yet. Planned
 *  segments are always known: the dispatcher added them, no radio involved. */
export function segmentsKnownAt(segments: DutySegment[], at: number): DutySegment[] {
  return segments
    .filter((s) => s.planned || s.startedAt <= at)
    .map((s) => (!s.planned && s.endedAt !== undefined && s.endedAt > at ? { ...s, endedAt: undefined } : s))
}

export function knownSegments(driver: Driver, now: number): DutySegment[] {
  return segmentsKnownAt(driver.segments, effectiveLastPingAt(driver, now))
}

/** An ongoing segment ends at `now`, or earlier if a planned segment starts before that. */
function segmentEnd(seg: DutySegment, all: DutySegment[], now: number): number {
  let end = seg.endedAt ?? now
  for (const other of all) {
    if (other.planned && other !== seg && other.startedAt > seg.startedAt && other.startedAt < end) end = other.startedAt
  }
  return Math.max(seg.startedAt, Math.min(end, now))
}

export function minutesOfStatus(segments: DutySegment[], status: DutyStatus, now: number): number {
  let total = 0
  for (const s of segments) {
    if (s.status !== status) continue
    total += (segmentEnd(s, segments, now) - s.startedAt) / MIN
  }
  return Math.max(0, total)
}

export function drivingMinutes(driver: Driver, now: number): number {
  return minutesOfStatus(knownSegments(driver, now), 'driving', now)
}

export function minutesUntilLimit(driver: Driver, now: number): number {
  return LIMIT_MIN - drivingMinutes(driver, now)
}

export function hosStatusOf(minutesLeft: number): HosStatus {
  if (minutesLeft <= 0) return 'over'
  if (minutesLeft <= ACT_NOW_MIN) return 'act_now'
  if (minutesLeft <= WATCH_MIN) return 'watch'
  return 'clear'
}

export function hosStatus(driver: Driver, now: number): HosStatus {
  return hosStatusOf(minutesUntilLimit(driver, now))
}

export function pingAgeMinutes(driver: Driver, now: number): number {
  return Math.max(0, (now - effectiveLastPingAt(driver, now)) / MIN)
}

export function stalenessOf(ageMinutes: number): Staleness {
  if (ageMinutes < FRESH_MIN) return 'fresh'
  if (ageMinutes <= OFFLINE_MIN) return 'stale'
  return 'offline'
}

export function staleness(driver: Driver, now: number): Staleness {
  return stalenessOf(pingAgeMinutes(driver, now))
}

/** What the driver is doing right now, as far as we know. The most recently started
 *  live segment wins, so a planned reset that has begun ends the drive. */
export function currentStatus(driver: Driver, now: number): DutyStatus {
  const live = knownSegments(driver, now).filter((s) => s.startedAt <= now && (s.endedAt === undefined || s.endedAt > now))
  if (live.length === 0) return 'off_duty'
  live.sort((a, b) => b.startedAt - a.startedAt)
  return live[0].status
}

export function plannedReset(driver: Driver): DutySegment | undefined {
  return driver.segments.find((s) => s.planned)
}

// ---- Route math -----------------------------------------------------------

export function remainingStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'pending' || s.status === 'in_progress')
}

export function doneStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'done' || s.status === 'failed')
}

export function unassignedStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'unassigned')
}

export function nextStop(route: Route): Stop | undefined {
  return remainingStops(route)[0]
}

/** Drive minutes still to be driven. An in-progress stop's leg is already behind us. */
export function remainingDriveMinutes(route: Route): number {
  return remainingStops(route).reduce((t, s) => t + (s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev), 0)
}

export function remainingServiceMinutes(route: Route): number {
  return remainingStops(route).reduce((t, s) => t + s.serviceMinutes, 0)
}

/** Minutes behind (positive) or ahead (negative) of the plan. The slip at the last
 *  checkpoint, or how overdue the next stop is, whichever is worse. */
export function scheduleDrift(route: Route, now: number): number {
  const done = doneStops(route)
  const last = done[done.length - 1]
  let drift = last?.departedAt !== undefined ? (last.departedAt - (last.plannedEta + last.serviceMinutes * MIN)) / MIN : 0
  const next = nextStop(route)
  if (next) {
    if (next.status === 'in_progress' && next.arrivedAt !== undefined) drift = (next.arrivedAt - next.plannedEta) / MIN
    else drift = Math.max(drift, (now - next.plannedEta) / MIN)
  }
  return drift
}

export function projectedEta(stop: Stop, driftMinutes: number): number {
  return stop.plannedEta + Math.max(0, driftMinutes) * MIN
}

/** When the driver is done, following the remaining legs from now. */
export function projectedFinishAt(route: Route, now: number): number | undefined {
  const remaining = remainingStops(route)
  if (remaining.length === 0) return undefined
  let t = now
  for (const s of remaining) {
    if (s.status !== 'in_progress') t += s.driveMinutesFromPrev * MIN
    t += s.serviceMinutes * MIN
  }
  return t
}

/** When the driver would depart the given stop, following the remaining legs from now. */
export function projectedDepartureAt(route: Route, stopId: string, now: number): number {
  let t = now
  for (const s of remainingStops(route)) {
    if (s.status !== 'in_progress') t += s.driveMinutesFromPrev * MIN
    t += s.serviceMinutes * MIN
    if (s.id === stopId) return t
  }
  return t
}

/** The clock time at which cumulative driving reaches the limit, walking the remaining
 *  legs. Service time advances the clock but does not consume the limit. This is where
 *  the limit mark sits on the route ribbon, so the ribbon and the rules agree by construction. */
export function limitHitAt(driver: Driver, route: Route, now: number): number {
  let left = minutesUntilLimit(driver, now)
  if (left <= 0) return now
  let t = now
  for (const s of remainingStops(route)) {
    const leg = s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev
    if (leg >= left) return t + left * MIN
    left -= leg
    t += (leg + s.serviceMinutes) * MIN
  }
  return t + left * MIN // past the route: assume continued driving
}

/** Driving minutes since the last interruption of BREAK_MIN or more. Feeds the
 *  30-minute-break rule that gets added live during the walkthrough. */
export function drivingSinceBreak(driver: Driver, now: number): number {
  const segs = knownSegments(driver, now).slice().sort((a, b) => a.startedAt - b.startedAt)
  let total = 0
  for (const s of segs) {
    const mins = (segmentEnd(s, segs, now) - s.startedAt) / MIN
    if ((s.status === 'on_break' || s.status === 'off_duty') && mins >= BREAK_MIN) total = 0
    else if (s.status === 'driving') total += mins
  }
  return total
}
```

- [x] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/hos && npx tsc --noEmit`
Expected: all compute tests pass. If `scheduleDrift` at `m(135)` fails, check that `last.serviceMinutes * MIN` is added to the planned ETA before subtracting.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pure HOS, staleness, and route math with boundary tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Seed generator and planted drivers

**Files:**
- Create: `src/data/seed.ts`, `src/data/planted.ts`
- Test: `src/data/seed.test.ts`

**Interfaces:**
- Consumes: types, `makeRng`, regions, `MIN`, compute functions for the tests.
- Produces: `SEED`, `DRIVER_COUNT`, `STOPS_PER_ROUTE`, `generateFleet(anchor, seed?) : Fleet` (raw), `makeFleet(anchor) : Fleet` (generated + planted), `applyPlanted(fleet, anchor): Fleet`, and the planted driver ids: `drv-01` Marcus R., `drv-02` Priya S., `drv-03` Dre W., `drv-04` Elena M., `drv-05` Sam K., `drv-06` Nadia F., `drv-07` Tomas B., `drv-08` Ana L., `drv-09` Ravi P., `drv-10` Omar H.

- [ ] **Step 1: Write the failing seed tests**

`src/data/seed.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { currentStatus, drivingSinceBreak, minutesUntilLimit, remainingDriveMinutes, scheduleDrift, staleness } from '../hos/compute'
import { MIN } from '../time/clock'
import { DRIVER_COUNT, STOPS_PER_ROUTE, generateFleet, makeFleet } from './seed'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()

function byId(fleet: ReturnType<typeof makeFleet>, id: string) {
  const driver = fleet.drivers.find((d) => d.id === id)!
  const route = fleet.routes.find((r) => r.id === driver.routeId)!
  return { driver, route }
}

describe('generateFleet', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(generateFleet(anchor))).toBe(JSON.stringify(generateFleet(anchor)))
  })
  it('has the promised shape', () => {
    const f = generateFleet(anchor)
    expect(f.drivers).toHaveLength(DRIVER_COUNT)
    expect(f.trucks).toHaveLength(DRIVER_COUNT)
    expect(f.routes).toHaveLength(DRIVER_COUNT)
    expect(f.deliveries.length).toBeGreaterThanOrEqual(DRIVER_COUNT * STOPS_PER_ROUTE)
    for (const r of f.routes) expect(r.stops.map((s) => s.seq)).toEqual(r.stops.map((_, i) => i + 1))
  })
  it('spreads drivers across the four regions', () => {
    const f = generateFleet(anchor)
    const counts = new Map<string, number>()
    for (const d of f.drivers) counts.set(d.region, (counts.get(d.region) ?? 0) + 1)
    expect([...counts.values()].every((n) => n >= 12)).toBe(true)
  })
  it('segments are consistent with stop progress: every driver has some driving today', () => {
    const f = generateFleet(anchor)
    for (const d of f.drivers) expect(d.segments.some((s) => s.status === 'driving')).toBe(true)
  })
})

describe('planted drivers at the anchor', () => {
  const f = makeFleet(anchor)
  it('Marcus R. is ~12 min from the limit with more driving left than that, behind schedule', () => {
    const { driver, route } = byId(f, 'drv-01')
    expect(driver.name).toBe('Marcus R.')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(12, 0)
    expect(remainingDriveMinutes(route)).toBe(34)
    expect(scheduleDrift(route, anchor)).toBeGreaterThanOrEqual(14)
  })
  it('Priya S. is over the limit', () => {
    const { driver } = byId(f, 'drv-02')
    expect(minutesUntilLimit(driver, anchor)).toBeLessThan(0)
    expect(currentStatus(driver, anchor)).toBe('driving')
  })
  it('Dre W. is offline 25 min with ~40 min projected, and safer once he reconnects', () => {
    const { driver } = byId(f, 'drv-03')
    expect(staleness(driver, anchor)).toBe('offline')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(40, 0)
    const online = { ...driver, pingsSuspended: false, lastPingAt: anchor }
    expect(minutesUntilLimit(online, anchor)).toBeGreaterThan(50)
  })
  it('Elena M. is on break', () => {
    expect(currentStatus(byId(f, 'drv-04').driver, anchor)).toBe('on_break')
  })
  it('Sam K. has driven 8h+ without a break and is otherwise clear', () => {
    const { driver } = byId(f, 'drv-05')
    expect(drivingSinceBreak(driver, anchor)).toBeGreaterThanOrEqual(480)
    expect(minutesUntilLimit(driver, anchor)).toBeGreaterThan(90)
  })
  it('Nadia F. is stale and inside the watch window', () => {
    const { driver } = byId(f, 'drv-06')
    expect(staleness(driver, anchor)).toBe('stale')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(70, 0)
  })
  it('Tomas B. is far behind schedule with a clear HOS', () => {
    const { driver, route } = byId(f, 'drv-07')
    expect(scheduleDrift(route, anchor)).toBeGreaterThanOrEqual(34)
    expect(minutesUntilLimit(driver, anchor)).toBeGreaterThan(90)
  })
  it('Ana L. has the capacity to take Marcus\'s stops; Ravi P. does not have capacity for Priya\'s', () => {
    const ana = byId(f, 'drv-08')
    expect(ana.driver.region).toBe('North')
    expect(minutesUntilLimit(ana.driver, anchor) - remainingDriveMinutes(ana.route)).toBeGreaterThan(100)
    const ravi = byId(f, 'drv-09')
    expect(ravi.driver.region).toBe('West')
    expect(minutesUntilLimit(ravi.driver, anchor) - remainingDriveMinutes(ravi.route)).toBeLessThan(40)
  })
  it('time flows: 10 minutes later, Marcus has 10 fewer minutes', () => {
    const { driver } = byId(f, 'drv-01')
    expect(minutesUntilLimit(driver, anchor + 10 * MIN)).toBeCloseTo(2, 0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/seed.test.ts`
Expected: FAIL — `./seed` not found.

- [ ] **Step 3: Write `src/data/seed.ts`**

```ts
import { MIN } from '../time/clock'
import { applyPlanted } from './planted'
import { makeRng, type Rng } from './prng'
import { REGIONS, REGION_CENTER, REGION_LEG_MINUTES } from './regions'
import type { Delivery, Driver, DutySegment, Fleet, LatLng, Region, Route, Stop, Truck } from './types'

export const SEED = 20260903
export const DRIVER_COUNT = 50
export const STOPS_PER_ROUTE = 20

const FIRST_NAMES = [
  'Marcus', 'Priya', 'Dre', 'Elena', 'Sam', 'Nadia', 'Tomas', 'Ana', 'Ravi', 'Omar',
  'Lucia', 'Ben', 'Kofi', 'Mei', 'Jonah', 'Sofia', 'Amir', 'Grace', 'Diego', 'Hana',
  'Leo', 'Ivy', 'Malik', 'Rosa', 'Theo', 'Yara', 'Felix', 'Nina', 'Caleb', 'Zara',
  'Owen', 'Tara', 'Idris', 'Maya', 'Ezra', 'Wren', 'Noor', 'Jude', 'Aria', 'Cole',
  'Esme', 'Rafael', 'Bo', 'Selin', 'Kai', 'Vera', 'Otis', 'Imani', 'Hugo', 'Luz',
]
const LAST_INITIALS = 'ABCDEFGHJKLMNPRSTVW'
const CUSTOMERS = [
  'Lakeside Grocers', 'Harbor Cafe', 'Prairie Market', 'Union Hardware', 'Bluebird Bakery', 'Northgate Pharmacy',
  'Ridge Auto Parts', 'Cedar Street Diner', 'Metro Print Co.', 'Oakline Furniture', 'Pine & Co. Florist', 'Summit Fitness',
  'Riverbend Books', 'Elmwood Deli', 'Crescent Hotel', 'Silver Spoon Catering', 'Greenway Nursery', 'Ironworks Brewing',
  'Starling Dental', 'Copperline Salon', 'Maple Row Pizzeria', 'Fieldstone Butcher', 'Beacon Coffee', 'Tallgrass Wines',
]
const STREETS = [
  'Ashland Ave', 'Halsted St', 'Western Ave', 'Kedzie Ave', 'Pulaski Rd', 'Cicero Ave', 'Clark St', 'Damen Ave',
  'Milwaukee Ave', 'Archer Ave', 'Lincoln Ave', 'Elston Ave', 'Stony Island Ave', 'Cottage Grove Ave', 'Belmont Ave',
  'Fullerton Ave', 'Irving Park Rd', 'Roosevelt Rd', 'Cermak Rd', 'Grand Ave',
]
const ITEMS = ['cases · dry goods', 'pallets · produce', 'cases · beverages', 'totes · frozen', 'cartons · paper goods', 'crates · dairy', 'drums · cleaning supply', 'boxes · small parts']
const INSTRUCTIONS = ['Dock B. Call on arrival.', 'Back entrance, ring twice.', 'Leave with manager only.', 'Liftgate needed.', 'Deliver before lunch rush.', 'Check in at front desk.']
const SIGNERS = ['M. Ortiz', 'J. Chen', 'R. Patel', 'S. Okafor', 'L. Nguyen', 'D. Kowalski', 'A. Haddad', 'T. Brooks']

function jitterAround(center: LatLng, rng: Rng, spread: number): LatLng {
  return { lat: center.lat + (rng.next() - 0.5) * spread, lng: center.lng + (rng.next() - 0.5) * spread * 1.3 }
}

interface Generated { driver: Driver; truck: Truck; route: Route; deliveries: Delivery[] }

function generateDriver(i: number, rng: Rng, anchor: number): Generated {
  const region: Region = REGIONS[i % REGIONS.length]
  const n = String(i + 1).padStart(2, '0')
  const id = `drv-${n}`
  const truckId = `trk-${n}`
  const routeId = `rt-${n}`
  const first = FIRST_NAMES[i]
  const lastInitial = LAST_INITIALS[rng.int(0, LAST_INITIALS.length - 1)]
  const shiftStartedAt = anchor - rng.int(6 * 60 + 17, 8 * 60 + 17) * MIN // 04:30–06:30
  const plannedStartAt = shiftStartedAt + rng.int(20, 30) * MIN // pre-trip inspection
  const [legMin, legMax] = REGION_LEG_MINUTES[region]
  const driftRate = rng.pick([-0.08, -0.04, 0, 0, 0, 0.04, 0.08, 0.15]) // fraction of each leg, per driver

  const segments: DutySegment[] = [{ status: 'on_duty', startedAt: shiftStartedAt, endedAt: plannedStartAt }]
  const stops: Stop[] = []
  const deliveries: Delivery[] = []

  let plannedT = plannedStartAt
  let actualT = plannedStartAt
  let drivingSinceBreak = 0
  let breakTaken = false
  let nowPlaced = false // has the "where the driver is right now" segment been written
  let position = jitterAround(REGION_CENTER[region], rng, 0.04)

  for (let k = 0; k < STOPS_PER_ROUTE; k++) {
    const drive = rng.int(legMin, legMax)
    const service = rng.int(6, 20)
    const plannedEta = plannedT + drive * MIN
    plannedT = plannedEta + service * MIN

    const deliveryId = `dlv-${n}-${String(k + 1).padStart(2, '0')}`
    const stopPosition = jitterAround(REGION_CENTER[region], rng, 0.07)
    deliveries.push({
      id: deliveryId,
      customer: CUSTOMERS[rng.int(0, CUSTOMERS.length - 1)],
      address: `${rng.int(100, 9900)} ${STREETS[rng.int(0, STREETS.length - 1)]}`,
      position: stopPosition,
      window: { start: plannedEta - 45 * MIN, end: plannedEta + 45 * MIN },
      priority: rng.chance(0.15) ? 'priority' : 'standard',
      items: [`${rng.int(2, 24)} ${ITEMS[rng.int(0, ITEMS.length - 1)]}`],
      instructions: rng.chance(0.3) ? INSTRUCTIONS[rng.int(0, INSTRUCTIONS.length - 1)] : undefined,
    })

    const stop: Stop = { id: `stp-${n}-${String(k + 1).padStart(2, '0')}`, routeId, deliveryId, seq: k + 1, driveMinutesFromPrev: drive, serviceMinutes: service, plannedEta, status: 'pending' }

    if (nowPlaced) { stops.push(stop); continue }

    // A 30-minute break after ~4.5h of driving, before starting the next leg.
    if (!breakTaken && drivingSinceBreak >= 270) {
      segments.push({ status: 'on_break', startedAt: actualT, endedAt: actualT + 30 * MIN })
      actualT += 30 * MIN
      breakTaken = true
      drivingSinceBreak = 0
      if (actualT > anchor) { nowPlaced = true; stops.push(stop); continue } // on break right now
    }

    const departPrev = actualT
    const actualDrive = Math.max(4, Math.round(drive * (1 + driftRate) + rng.int(-2, 2)))
    const arrivedAt = departPrev + actualDrive * MIN
    const departedAt = arrivedAt + service * MIN

    if (departedAt <= anchor) {
      const failed = rng.chance(0.03)
      segments.push({ status: 'driving', startedAt: departPrev, endedAt: arrivedAt })
      segments.push({ status: 'on_duty', startedAt: arrivedAt, endedAt: departedAt })
      stops.push({ ...stop, status: failed ? 'failed' : 'done', arrivedAt, departedAt, outcome: failed ? 'failed' : rng.chance(0.06) ? 'partial' : 'delivered', signedBy: failed ? undefined : SIGNERS[rng.int(0, SIGNERS.length - 1)], note: failed ? 'Customer closed. Retry after 3 PM.' : undefined })
      drivingSinceBreak += actualDrive
      actualT = departedAt
      position = stopPosition
    } else if (arrivedAt <= anchor) {
      segments.push({ status: 'driving', startedAt: departPrev, endedAt: arrivedAt })
      segments.push({ status: 'on_duty', startedAt: arrivedAt }) // at the dock right now
      stops.push({ ...stop, status: 'in_progress', arrivedAt })
      position = stopPosition
      nowPlaced = true
    } else {
      segments.push({ status: 'driving', startedAt: departPrev }) // on the road right now
      stops.push(stop)
      position = jitterAround({ lat: (position.lat + stopPosition.lat) / 2, lng: (position.lng + stopPosition.lng) / 2 }, rng, 0.01)
      nowPlaced = true
    }
  }

  const driver: Driver = { id, name: `${first} ${lastInitial}.`, initials: `${first[0]}${lastInitial}`, truckId, routeId, region, shiftStartedAt, segments, lastPingAt: anchor - 30_000 }
  const truck: Truck = { id: truckId, plate: `IL ${rng.int(100, 999)} ${LAST_INITIALS[rng.int(0, 18)]}${LAST_INITIALS[rng.int(0, 18)]}${LAST_INITIALS[rng.int(0, 18)]}`, region, position, lastPingAt: driver.lastPingAt }
  const route: Route = { id: routeId, driverId: id, region, plannedStartAt, windowEnd: plannedT + 60 * MIN, stops }
  return { driver, truck, route, deliveries }
}

export function generateFleet(anchor: number, seed: number = SEED): Fleet {
  const rng = makeRng(seed)
  const fleet: Fleet = { drivers: [], trucks: [], routes: [], deliveries: [] }
  for (let i = 0; i < DRIVER_COUNT; i++) {
    const g = generateDriver(i, rng, anchor)
    fleet.drivers.push(g.driver)
    fleet.trucks.push(g.truck)
    fleet.routes.push(g.route)
    fleet.deliveries.push(...g.deliveries)
  }
  return fleet
}

/** The fleet the app boots with: generated, then the planted scenarios overwrite ten drivers. */
export function makeFleet(anchor: number): Fleet {
  return applyPlanted(generateFleet(anchor), anchor)
}
```

- [ ] **Step 4: Write `src/data/planted.ts`**

Each planted driver is described as duty blocks ending at the anchor (the last block is ongoing) plus a re-timed route. The generated route's deliveries are kept; only timing and status change.

```ts
import { MIN } from '../time/clock'
import type { Driver, DutySegment, DutyStatus, Fleet, Region, Route, Stop } from './types'

interface Plant {
  id: string
  name: string
  region: Region
  /** Duty blocks in order, ending at the anchor. The last one is ongoing. */
  blocks: [DutyStatus, number][]
  /** Minutes since the last ping; undefined = online. */
  pingAgeMin?: number
  /** What really happened after the last ping (unseen by telematics until reconnect). */
  truthAfterPing?: { status: DutyStatus; startsMinAfterPing: number }
  stopsDone: number
  /** Drive legs, in minutes, for each remaining stop. */
  legsLeft: number[]
  driftMin: number
}

export const PLANTS: Plant[] = [
  // The hero: 12 min of drive time, 34 min of driving left, running late. Approaching + won't finish.
  { id: 'drv-01', name: 'Marcus R.', region: 'North', blocks: [['on_duty', 25], ['driving', 170], ['on_duty', 12], ['driving', 160], ['on_break', 30], ['driving', 150], ['on_duty', 10], ['driving', 168]], stopsDone: 12, legsLeft: [10, 14, 10], driftMin: 15 },
  // Over the limit by 6 minutes and still driving.
  { id: 'drv-02', name: 'Priya S.', region: 'West', blocks: [['on_duty', 25], ['driving', 200], ['on_duty', 12], ['driving', 180], ['on_break', 30], ['driving', 286]], stopsDone: 14, legsLeft: [12, 9], driftMin: 5 },
  // Dark for 25 minutes. Last seen driving with 65 left → the projection says 40 now. Truth: on break 5 min after the ping.
  { id: 'drv-03', name: 'Dre W.', region: 'South', blocks: [['on_duty', 25], ['driving', 220], ['on_duty', 14], ['driving', 200], ['on_break', 30], ['driving', 200]], pingAgeMin: 25, truthAfterPing: { status: 'on_break', startsMinAfterPing: 5 }, stopsDone: 11, legsLeft: [18, 22, 20, 25], driftMin: 8 },
  // On break, 20 minutes in, two hours of drive time left.
  { id: 'drv-04', name: 'Elena M.', region: 'Central', blocks: [['on_duty', 25], ['driving', 300], ['on_duty', 12], ['driving', 240], ['on_break', 20]], stopsDone: 10, legsLeft: [9, 12, 8, 10, 11], driftMin: 0 },
  // 8h05m of driving with no 30-minute break. Clear on the 11-hour rule; trips the break rule added live.
  { id: 'drv-05', name: 'Sam K.', region: 'North', blocks: [['on_duty', 25], ['driving', 200], ['on_duty', 15], ['driving', 150], ['on_duty', 12], ['driving', 135]], stopsDone: 12, legsLeft: [15, 12, 14, 11], driftMin: 3 },
  // Stale 8 minutes, inside the watch window. Tilde, dropped seconds, age label; band unchanged.
  { id: 'drv-06', name: 'Nadia F.', region: 'West', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 200], ['on_break', 30], ['driving', 140]], pingAgeMin: 8, stopsDone: 13, legsLeft: [12, 14, 10], driftMin: 4 },
  // 35 minutes behind with seven stops left and a clear HOS. The schedule rule on its own.
  { id: 'drv-07', name: 'Tomas B.', region: 'South', blocks: [['on_duty', 25], ['driving', 180], ['on_duty', 14], ['driving', 120], ['on_break', 30], ['driving', 120]], stopsDone: 9, legsLeft: [20, 22, 18, 25, 20, 24, 19], driftMin: 35 },
  // The obvious reassign candidate for Marcus: same region, four hours of drive time, five stops.
  { id: 'drv-08', name: 'Ana L.', region: 'North', blocks: [['on_duty', 25], ['driving', 180], ['on_duty', 12], ['driving', 120], ['on_break', 30], ['driving', 120]], stopsDone: 11, legsLeft: [10, 12, 9, 11, 10], driftMin: -3 },
  // The marginal candidate near Priya: 55 minutes left, 32 of driving still to do. Excluded by the capacity margin.
  { id: 'drv-09', name: 'Ravi P.', region: 'West', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 200], ['on_break', 30], ['driving', 155]], stopsDone: 13, legsLeft: [10, 12, 10], driftMin: 2 },
  // Watch, fresh, finishes fine. Fills the Watch band with a boring case.
  { id: 'drv-10', name: 'Omar H.', region: 'Central', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 220], ['on_break', 30], ['driving', 125]], stopsDone: 12, legsLeft: [9, 8, 10, 9], driftMin: 1 },
]

function segmentsFromBlocks(blocks: [DutyStatus, number][], anchor: number): { segments: DutySegment[]; shiftStartedAt: number } {
  const total = blocks.reduce((t, [, m]) => t + m, 0)
  let t = anchor - total * MIN
  const shiftStartedAt = t
  const segments: DutySegment[] = blocks.map(([status, minutes], i) => {
    const seg: DutySegment = { status, startedAt: t }
    t += minutes * MIN
    if (i < blocks.length - 1) seg.endedAt = t
    return seg
  })
  return { segments, shiftStartedAt }
}

function retimeRoute(route: Route, plant: Plant, anchor: number): Route {
  const stops = route.stops.slice(0, plant.stopsDone + plant.legsLeft.length)
  const doneStops = stops.slice(0, plant.stopsDone)
  const leftStops = stops.slice(plant.stopsDone)
  // Done stops walk backwards from the anchor; the driver departed the last one 6 minutes ago.
  let t = anchor - 6 * MIN
  const retimedDone: Stop[] = []
  for (let i = doneStops.length - 1; i >= 0; i--) {
    const s = doneStops[i]
    const departedAt = t
    const arrivedAt = departedAt - s.serviceMinutes * MIN
    retimedDone.unshift({ ...s, status: 'done', arrivedAt, departedAt, outcome: 'delivered', signedBy: s.signedBy ?? 'M. Ortiz', note: undefined, plannedEta: arrivedAt - plant.driftMin * MIN })
    t = arrivedAt - s.driveMinutesFromPrev * MIN
  }
  // Remaining stops: the next one was due `driftMin` ago; the rest follow their legs.
  let planned = anchor - plant.driftMin * MIN
  const retimedLeft: Stop[] = leftStops.map((s, i) => {
    const leg = plant.legsLeft[i]
    const plannedEta = i === 0 ? planned : planned + leg * MIN
    planned = plannedEta + s.serviceMinutes * MIN
    return { ...s, status: 'pending', arrivedAt: undefined, departedAt: undefined, outcome: undefined, signedBy: undefined, note: undefined, driveMinutesFromPrev: leg, plannedEta }
  })
  const all = [...retimedDone, ...retimedLeft].map((s, i) => ({ ...s, seq: i + 1 }))
  const plannedStartAt = (all[0]?.plannedEta ?? anchor) - (all[0]?.driveMinutesFromPrev ?? 0) * MIN
  return { ...route, region: plant.region, plannedStartAt, windowEnd: planned + 60 * MIN, stops: all }
}

export function applyPlanted(fleet: Fleet, anchor: number): Fleet {
  const drivers = fleet.drivers.map((d) => {
    const plant = PLANTS.find((p) => p.id === d.id)
    if (!plant) return d
    const { segments, shiftStartedAt } = segmentsFromBlocks(plant.blocks, anchor)
    const lastPingAt = plant.pingAgeMin === undefined ? anchor - 30_000 : anchor - plant.pingAgeMin * MIN
    if (plant.truthAfterPing) {
      const startsAt = lastPingAt + plant.truthAfterPing.startsMinAfterPing * MIN
      const last = segments[segments.length - 1]
      last.endedAt = startsAt
      segments.push({ status: plant.truthAfterPing.status, startedAt: startsAt })
    }
    const [first, ...rest] = plant.name.split(' ')
    const driver: Driver = { ...d, name: plant.name, initials: `${first[0]}${rest[0]?.[0] ?? ''}`, region: plant.region, shiftStartedAt, segments, lastPingAt, pingsSuspended: plant.pingAgeMin !== undefined }
    return driver
  })
  const routes = fleet.routes.map((r) => {
    const plant = PLANTS.find((p) => p.id === r.driverId)
    return plant ? retimeRoute(r, plant, anchor) : r
  })
  const trucks = fleet.trucks.map((t) => {
    const driver = drivers.find((d) => d.truckId === t.id)
    if (!driver || !PLANTS.some((p) => p.id === driver.id)) return t
    return { ...t, region: driver.region, lastPingAt: driver.lastPingAt }
  })
  return { ...fleet, drivers, routes, trucks }
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected: all pass. If Marcus's countdown is off by a minute, check that `segmentsFromBlocks` leaves the last block open (no `endedAt`) so it closes at `now`. If Dre reconnects to fewer than 50 minutes, check that `truthAfterPing` closed his driving block at `lastPingAt + 5 min`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: deterministic fleet seed with ten planted scenarios

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 5: DriverView, rules, ranking, bands, and metrics — Lookout's brain

**Files:**
- Create: `src/store/view.ts`, `src/store/derive.ts`, `src/alerts/types.ts`, `src/alerts/rules.ts`, `src/alerts/rank.ts`, `src/bands.ts`
- Test: `src/alerts/rules.test.ts`, `src/alerts/rank.test.ts`, `src/bands.test.ts`, `src/store/derive.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces: `DriverView` and `buildViews(fleet, now)`; `Severity`, `ActionId`, `Rule`, `Alert`, `DriverCard`; `RULES`; `evaluateRules(views)`, `topSeverity(alerts)`, `rankDrivers(views, alerts, snoozes, now)`; `Band`, `BAND_ORDER`, `BAND_LABEL`, `bandOf(view, topSeverity)`; `Metrics`, `Derived`, `computeMetrics(views)`, `derive(fleet, now, snoozes)`.

Import direction, so nothing is circular at runtime: `types.ts` and `bands.ts` import only types. `rules.ts` imports `types`, constants, format. `rank.ts` imports `rules` and `bands`. `derive.ts` imports `view` and `rank`.

- [ ] **Step 1: Write `src/store/view.ts`**

```ts
import type { Driver, DutyStatus, Fleet, Route, Stop, Truck } from '../data/types'
import {
  currentStatus, drivingSinceBreak, effectiveLastPingAt, hosStatusOf, knownSegments, limitHitAt, minutesOfStatus,
  nextStop, pingAgeMinutes, projectedFinishAt, remainingDriveMinutes, remainingStops, scheduleDrift, stalenessOf,
  unassignedStops, type HosStatus, type Staleness,
} from '../hos/compute'
import { BEHIND_MIN, LIMIT_MIN } from '../hos/constants'
import { MIN } from '../time/clock'

/** Everything a rule or a view needs about one driver at one instant. Built once per
 *  tick in derive(); rules read this and never recompute. */
export interface DriverView {
  driver: Driver
  truck: Truck
  route: Route
  now: number
  status: DutyStatus
  drivingMin: number
  breakMin: number
  shiftElapsedMin: number
  minutesUntilLimit: number
  hos: HosStatus
  lastPingAt: number
  pingAgeMin: number
  staleness: Staleness
  remaining: Stop[]
  next: Stop | undefined
  done: number
  total: number
  remainingDriveMin: number
  driftMin: number
  projectedFinishAt: number | undefined
  limitHitAt: number
  drivingSinceBreakMin: number
  lateStops: Stop[]
  unnotifiedLateStops: Stop[]
  unassigned: Stop[]
}

export function buildView(fleet: Fleet, driver: Driver, now: number): DriverView {
  const truck = fleet.trucks.find((t) => t.id === driver.truckId)
  const route = fleet.routes.find((r) => r.id === driver.routeId)
  if (!truck || !route) throw new Error(`fleet is missing truck or route for ${driver.id}`)
  const known = knownSegments(driver, now)
  const drivingMin = minutesOfStatus(known, 'driving', now)
  const left = LIMIT_MIN - drivingMin
  const lastPingAt = effectiveLastPingAt(driver, now)
  const pingAgeMin = pingAgeMinutes(driver, now)
  const remaining = remainingStops(route)
  const driftMin = scheduleDrift(route, now)
  const lateStops = driftMin >= BEHIND_MIN ? remaining.filter((s) => s.status === 'pending') : []
  return {
    driver, truck, route, now,
    status: currentStatus(driver, now),
    drivingMin,
    breakMin: minutesOfStatus(known, 'on_break', now),
    shiftElapsedMin: (now - driver.shiftStartedAt) / MIN,
    minutesUntilLimit: left,
    hos: hosStatusOf(left),
    lastPingAt,
    pingAgeMin,
    staleness: stalenessOf(pingAgeMin),
    remaining,
    next: nextStop(route),
    done: route.stops.filter((s) => s.status === 'done' || s.status === 'failed').length,
    total: route.stops.length,
    remainingDriveMin: remainingDriveMinutes(route),
    driftMin,
    projectedFinishAt: projectedFinishAt(route, now),
    limitHitAt: limitHitAt(driver, route, now),
    drivingSinceBreakMin: drivingSinceBreak(driver, now),
    lateStops,
    unnotifiedLateStops: lateStops.filter((s) => s.notifiedAt === undefined),
    unassigned: unassignedStops(route),
  }
}

export function buildViews(fleet: Fleet, now: number): DriverView[] {
  return fleet.drivers.map((d) => buildView(fleet, d, now))
}
```

- [ ] **Step 2: Write `src/alerts/types.ts` and `src/bands.ts`**

`src/alerts/types.ts`:
```ts
import type { Band } from '../bands'
import type { DriverView } from '../store/view'

export type Severity = 'critical' | 'act_now' | 'watch' | 'info'
export type ActionId = 'reassign' | 'schedule_reset' | 'notify_customer' | 'call_driver' | 'acknowledge'

/** One object per rule. Fixed severity and a `when` predicate keep the shape
 *  copy-pasteable in front of a panel; a rule that needs two severities is two objects. */
export interface Rule {
  id: string
  label: string
  severity: Severity
  when: (v: DriverView) => boolean
  message: (v: DriverView) => { title: string; body: string }
  actions: ActionId[]
}

export interface Alert {
  id: string // `${ruleId}:${driverId}`
  ruleId: string
  driverId: string
  severity: Severity
  label: string
  title: string
  body: string
  actions: ActionId[]
}

/** One card per driver, every firing reason on it. The board, the route file, and
 *  Lookout all render from this and nothing else. */
export interface DriverCard {
  driverId: string
  severity: Severity | 'none'
  alerts: Alert[]
  snoozed: boolean
  band: Band
}
```

`src/bands.ts`:
```ts
import type { Severity } from './alerts/types'
import type { DriverView } from './store/view'

export type Band = 'act_now' | 'watch' | 'offline' | 'break' | 'clear'

export const BAND_ORDER: Band[] = ['act_now', 'watch', 'offline', 'break', 'clear']

export const BAND_LABEL: Record<Band, string> = {
  act_now: 'Act now',
  watch: 'Watch',
  offline: 'Offline',
  break: 'On break',
  clear: 'Clear',
}

/** Band comes from the driver's top alert severity, then duty status. Offline inside the
 *  watch window fires at act-now severity upstream, so it lands in Act now with a hollow
 *  marker; the Offline band holds only dark drivers whose last-known HOS is clear. */
export function bandOf(v: DriverView, top: Severity | 'none'): Band {
  if (top === 'critical' || top === 'act_now') return 'act_now'
  if (top === 'watch') return 'watch'
  if (v.staleness === 'offline') return 'offline'
  if (v.status === 'on_break') return 'break'
  return 'clear'
}
```

- [ ] **Step 3: Write the failing tests for rules, rank, bands, derive**

`src/alerts/rules.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { buildViews } from '../store/view'
import { evaluateRules } from './rank'
import { RULES } from './rules'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const views = buildViews(makeFleet(anchor), anchor)
const alerts = evaluateRules(views)
const idsFor = (driverId: string) => alerts.filter((a) => a.driverId === driverId).map((a) => a.ruleId).sort()

describe('rules shape', () => {
  it('every rule has a unique id, a label, and at least one action', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length)
    for (const r of RULES) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.actions.length).toBeGreaterThan(0)
    }
  })
})

describe('planted drivers trip exactly the rules the spec says', () => {
  it('Marcus: approaching (act now), won\'t finish, behind schedule', () => {
    expect(idsFor('drv-01')).toEqual(['behind_schedule', 'limit_act_now', 'wont_finish'])
  })
  it('Priya: over the limit', () => {
    expect(idsFor('drv-02')).toEqual(['over_limit'])
  })
  it('Dre: offline near the limit', () => {
    expect(idsFor('drv-03')).toEqual(['offline_near_limit'])
  })
  it('Elena on break and Sam without a break rule yet: nothing', () => {
    expect(idsFor('drv-04')).toEqual([])
    expect(idsFor('drv-05')).toEqual([])
  })
  it('Nadia, Ravi, Omar: watch', () => {
    expect(idsFor('drv-06')).toEqual(['limit_watch'])
    expect(idsFor('drv-09')).toEqual(['limit_watch'])
    expect(idsFor('drv-10')).toEqual(['limit_watch'])
  })
  it('Tomas: behind schedule only', () => {
    expect(idsFor('drv-07')).toEqual(['behind_schedule'])
  })
  it('Ana: nothing', () => {
    expect(idsFor('drv-08')).toEqual([])
  })
})

describe('copy', () => {
  it('reads like a colleague and carries the tilde when stale', () => {
    const marcus = alerts.find((a) => a.id === 'limit_act_now:drv-01')!
    expect(marcus.title).toMatch(/^Marcus R\. hits the limit in 12 min/)
    const dre = alerts.find((a) => a.id === 'offline_near_limit:drv-03')!
    expect(dre.title).toBe("Dre W. hasn't pinged in 25 min.")
    expect(dre.body).toContain('~40 min')
  })
})
```

`src/alerts/rank.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { MIN } from '../time/clock'
import { buildViews } from '../store/view'
import { evaluateRules, rankDrivers } from './rank'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const fleet = makeFleet(anchor)

function rankedAt(now: number, snoozes: Record<string, number> = {}) {
  const views = buildViews(fleet, now)
  return rankDrivers(views, evaluateRules(views), snoozes, now)
}

describe('rankDrivers', () => {
  it('produces one card per driver', () => {
    const ranked = rankedAt(anchor)
    expect(ranked).toHaveLength(fleet.drivers.length)
    expect(new Set(ranked.map((c) => c.driverId)).size).toBe(fleet.drivers.length)
  })
  it('orders by severity, then time to violation, then staleness', () => {
    const top = rankedAt(anchor).slice(0, 3).map((c) => c.driverId)
    expect(top).toEqual(['drv-02', 'drv-01', 'drv-03']) // Priya (critical), Marcus (12 min), Dre (~40, offline)
  })
  it('is stable across a tick', () => {
    const a = rankedAt(anchor).map((c) => c.driverId)
    const b = rankedAt(anchor + 5000).map((c) => c.driverId)
    expect(b).toEqual(a)
  })
  it('snooze demotes within a severity but never removes an act-now card', () => {
    const snoozes = { 'limit_act_now:drv-01': anchor + 10 * MIN, 'wont_finish:drv-01': anchor + 10 * MIN, 'behind_schedule:drv-01': anchor + 10 * MIN }
    const ranked = rankedAt(anchor, snoozes)
    const marcus = ranked.find((c) => c.driverId === 'drv-01')!
    expect(marcus.snoozed).toBe(true)
    expect(marcus.severity).toBe('act_now')
    expect(ranked.findIndex((c) => c.driverId === 'drv-03')).toBeLessThan(ranked.findIndex((c) => c.driverId === 'drv-01'))
  })
  it('snooze expires with the clock', () => {
    const snoozes = { 'limit_act_now:drv-01': anchor + 1 * MIN, 'wont_finish:drv-01': anchor + 1 * MIN, 'behind_schedule:drv-01': anchor + 1 * MIN }
    expect(rankedAt(anchor + 2 * MIN, snoozes).find((c) => c.driverId === 'drv-01')!.snoozed).toBe(false)
  })
})
```

`src/bands.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from './data/seed'
import { buildViews } from './store/view'
import { evaluateRules, rankDrivers } from './alerts/rank'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const views = buildViews(makeFleet(anchor), anchor)
const cards = rankDrivers(views, evaluateRules(views), {}, anchor)
const bandOf = (id: string) => cards.find((c) => c.driverId === id)!.band

describe('bands', () => {
  it('offline inside the watch window is Act now; Priya over the limit is Act now', () => {
    expect(bandOf('drv-03')).toBe('act_now')
    expect(bandOf('drv-02')).toBe('act_now')
  })
  it('stale never moves a card: Nadia is Watch, not Offline', () => {
    expect(bandOf('drv-06')).toBe('watch')
  })
  it('on break, clear, and behind-schedule-with-clear-HOS land where expected', () => {
    expect(bandOf('drv-04')).toBe('break')
    expect(bandOf('drv-08')).toBe('clear')
    expect(bandOf('drv-07')).toBe('watch')
  })
})
```

`src/store/derive.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from './derive'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()

describe('derive', () => {
  it('memoizes on fleet, now, and snoozes identity', () => {
    const fleet = makeFleet(anchor)
    const snoozes = {}
    expect(derive(fleet, anchor, snoozes)).toBe(derive(fleet, anchor, snoozes))
    expect(derive(fleet, anchor + 5000, snoozes)).not.toBe(derive(fleet, anchor, snoozes))
  })
  it('one source of truth: every alert belongs to exactly one ranked card', () => {
    const d = derive(makeFleet(anchor), anchor, {})
    const fromCards = d.ranked.flatMap((c) => c.alerts.map((a) => a.id)).sort()
    expect(fromCards).toEqual(d.alerts.map((a) => a.id).sort())
  })
  it('metrics count what the board shows', () => {
    const d = derive(makeFleet(anchor), anchor, {})
    expect(d.metrics.over).toBe(1)
    expect(d.metrics.offline).toBe(1)
    expect(d.metrics.approaching).toBe(d.views.filter((v) => v.hos === 'act_now' || v.hos === 'watch').length)
    expect(d.metrics.onShift).toBeGreaterThanOrEqual(48)
    expect(d.metrics.needDriver).toBe(0)
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/alerts src/bands.test.ts src/store`
Expected: FAIL — modules not found.

- [ ] **Step 5: Write `src/alerts/rules.ts`**

```ts
import { ACT_NOW_MIN, BEHIND_MIN, WATCH_MIN } from '../hos/constants'
import { fmtClock, fmtMinutes } from '../lib/format'
import type { DriverView } from '../store/view'
import type { Rule } from './types'

// Alerts are data. To add one, append an object. Keep this file free of heavy
// imports so HMR is instant when it is edited live. Copy is Lookout's voice: a
// competent colleague, not a system log.

// The offline rules own dark drivers; the limit rules speak only for drivers we can see.
const onTheRoad = (v: DriverView) => (v.status === 'driving' || v.status === 'on_duty') && v.staleness !== 'offline'
const stops = (n: number) => `${n} stop${n === 1 ? '' : 's'}`
const first = (v: DriverView) => v.driver.name.split(' ')[0]
const est = (v: DriverView) => (v.staleness === 'fresh' ? '' : '~')

export const RULES: Rule[] = [
  {
    id: 'over_limit',
    label: 'Over limit',
    severity: 'critical',
    when: (v) => v.minutesUntilLimit <= 0,
    message: (v) => ({
      title: `${v.driver.name} is ${est(v)}over the limit by ${fmtMinutes(-v.minutesUntilLimit)}.`,
      body: v.remaining.length > 0 ? `${first(v)} needs to stop now. ${stops(v.remaining.length)} left need another driver.` : `${first(v)} needs to stop now.`,
    }),
    actions: ['reassign', 'call_driver'],
  },
  {
    id: 'limit_act_now',
    label: 'Approaching limit',
    severity: 'act_now',
    when: (v) => onTheRoad(v) && v.minutesUntilLimit > 0 && v.minutesUntilLimit <= ACT_NOW_MIN,
    message: (v) => ({
      title: `${v.driver.name} hits the limit in ${est(v)}${fmtMinutes(v.minutesUntilLimit)} with ${stops(v.remaining.length)} left.`,
      body: `${fmtMinutes(v.remainingDriveMin)} of driving still to do.`,
    }),
    actions: ['reassign', 'schedule_reset', 'notify_customer'],
  },
  {
    id: 'limit_watch',
    label: 'Approaching limit',
    severity: 'watch',
    when: (v) => onTheRoad(v) && v.minutesUntilLimit > ACT_NOW_MIN && v.minutesUntilLimit <= WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} has ${est(v)}${fmtMinutes(v.minutesUntilLimit)} of drive time left.`,
      body: `${stops(v.remaining.length)} left, ${fmtMinutes(v.remainingDriveMin)} of driving.`,
    }),
    actions: ['schedule_reset', 'reassign'],
  },
  {
    id: 'wont_finish',
    label: "Won't finish",
    severity: 'act_now',
    when: (v) => v.minutesUntilLimit > 0 && v.remaining.length > 0 && v.remainingDriveMin > v.minutesUntilLimit,
    message: (v) => ({
      title: `${v.driver.name} can't finish the route before the limit.`,
      body: `Last stop projected ${fmtClock(v.projectedFinishAt ?? v.now)}; the limit hits at ${est(v)}${fmtClock(v.limitHitAt)}.`,
    }),
    actions: ['reassign', 'schedule_reset'],
  },
  {
    id: 'offline_near_limit',
    label: 'Offline',
    severity: 'act_now',
    when: (v) => v.staleness === 'offline' && v.minutesUntilLimit <= WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} hasn't pinged in ${fmtMinutes(v.pingAgeMin)}.`,
      body: v.minutesUntilLimit <= 0 ? 'Last estimate: over the limit if still driving.' : `Last estimate: ~${fmtMinutes(v.minutesUntilLimit)} to the limit if still driving.`,
    }),
    actions: ['call_driver', 'acknowledge'],
  },
  {
    id: 'offline',
    label: 'Offline',
    severity: 'watch',
    when: (v) => v.staleness === 'offline' && v.minutesUntilLimit > WATCH_MIN,
    message: (v) => ({
      title: `${v.driver.name} hasn't pinged in ${fmtMinutes(v.pingAgeMin)}.`,
      body: `HOS was clear at the last ping, ~${fmtMinutes(v.minutesUntilLimit)} left.`,
    }),
    actions: ['call_driver', 'acknowledge'],
  },
  {
    id: 'behind_schedule',
    label: 'Behind schedule',
    severity: 'watch',
    when: (v) => v.driftMin >= BEHIND_MIN && v.remaining.length > 0,
    message: (v) => ({
      title: `${v.driver.name} is ${fmtMinutes(v.driftMin)} behind with ${stops(v.remaining.length)} left.`,
      body: v.unnotifiedLateStops.length > 0 ? `${stops(v.unnotifiedLateStops.length)} haven't been told yet.` : 'Customers have been notified.',
    }),
    actions: ['notify_customer', 'reassign'],
  },
  {
    id: 'stops_unassigned',
    label: 'Needs a driver',
    severity: 'info',
    when: (v) => v.unassigned.length > 0,
    message: (v) => ({
      title: `${stops(v.unassigned.length)} on ${first(v)}'s route need a driver.`,
      body: 'They fall after the scheduled reset.',
    }),
    actions: ['reassign'],
  },
]
```

- [ ] **Step 6: Write `src/alerts/rank.ts`**

```ts
import { bandOf } from '../bands'
import type { DriverView } from '../store/view'
import { RULES } from './rules'
import type { Alert, DriverCard, Severity } from './types'

const SEVERITY_RANK: Record<Severity | 'none', number> = { critical: 0, act_now: 1, watch: 2, info: 3, none: 4 }
const STALE_RANK = { offline: 0, stale: 1, fresh: 2 } as const

export function evaluateRules(views: DriverView[]): Alert[] {
  const out: Alert[] = []
  for (const v of views) {
    for (const r of RULES) {
      if (!r.when(v)) continue
      const { title, body } = r.message(v)
      out.push({ id: `${r.id}:${v.driver.id}`, ruleId: r.id, driverId: v.driver.id, severity: r.severity, label: r.label, title, body, actions: r.actions })
    }
  }
  return out
}

export function topSeverity(alerts: Alert[]): Severity | 'none' {
  let top: Severity | 'none' = 'none'
  for (const a of alerts) if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[top]) top = a.severity
  return top
}

/** One card per driver. Sort: severity, then unsnoozed before snoozed, then time to
 *  violation (offline continuation counts), then staleness (offline first), then id so
 *  ties never reorder on a tick. Snooze de-emphasizes; it never removes a card. */
export function rankDrivers(views: DriverView[], alerts: Alert[], snoozes: Record<string, number>, now: number): DriverCard[] {
  const byDriver = new Map<string, Alert[]>()
  for (const a of alerts) byDriver.set(a.driverId, [...(byDriver.get(a.driverId) ?? []), a])
  const viewById = new Map(views.map((v) => [v.driver.id, v]))
  const cards: DriverCard[] = views.map((v) => {
    const mine = byDriver.get(v.driver.id) ?? []
    const severity = topSeverity(mine)
    const snoozed = mine.length > 0 && mine.every((a) => (snoozes[a.id] ?? 0) > now)
    return { driverId: v.driver.id, severity, alerts: mine, snoozed, band: bandOf(v, severity) }
  })
  cards.sort((a, b) => {
    const va = viewById.get(a.driverId)!
    const vb = viewById.get(b.driverId)!
    return (
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Number(a.snoozed) - Number(b.snoozed) ||
      va.minutesUntilLimit - vb.minutesUntilLimit ||
      STALE_RANK[va.staleness] - STALE_RANK[vb.staleness] ||
      a.driverId.localeCompare(b.driverId)
    )
  })
  return cards
}
```

- [ ] **Step 7: Write `src/store/derive.ts`**

```ts
import { evaluateRules, rankDrivers } from '../alerts/rank'
import type { Alert, DriverCard } from '../alerts/types'
import type { Fleet } from '../data/types'
import { buildViews, type DriverView } from './view'

export interface Metrics {
  onShift: number
  approaching: number
  over: number
  offline: number
  stopsDone: number
  stopsRemaining: number
  needDriver: number
}

export interface Derived {
  now: number
  views: DriverView[]
  byId: Map<string, DriverView>
  alerts: Alert[]
  ranked: DriverCard[]
  cardById: Map<string, DriverCard>
  metrics: Metrics
}

export function computeMetrics(views: DriverView[]): Metrics {
  return {
    onShift: views.filter((v) => v.status !== 'off_duty').length,
    approaching: views.filter((v) => v.hos === 'act_now' || v.hos === 'watch').length,
    over: views.filter((v) => v.hos === 'over').length,
    offline: views.filter((v) => v.staleness === 'offline').length,
    stopsDone: views.reduce((t, v) => t + v.done, 0),
    stopsRemaining: views.reduce((t, v) => t + v.remaining.length, 0),
    needDriver: views.reduce((t, v) => t + v.unassigned.length, 0),
  }
}

// One derivation per (fleet, tick, snoozes). Fifty drivers times eight rules is
// trivial; the memo exists so React sees one stable object per tick.
let cache: { fleet: Fleet; now: number; snoozes: Record<string, number>; result: Derived } | undefined

export function derive(fleet: Fleet, now: number, snoozes: Record<string, number>): Derived {
  if (cache && cache.fleet === fleet && cache.now === now && cache.snoozes === snoozes) return cache.result
  const views = buildViews(fleet, now)
  const alerts = evaluateRules(views)
  const ranked = rankDrivers(views, alerts, snoozes, now)
  const result: Derived = {
    now,
    views,
    byId: new Map(views.map((v) => [v.driver.id, v])),
    alerts,
    ranked,
    cardById: new Map(ranked.map((c) => [c.driverId, c])),
    metrics: computeMetrics(views),
  }
  cache = { fleet, now, snoozes, result }
  return result
}
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all green. If the rank test's top three differ, print `ranked.slice(0, 5)` with severity and `minutesUntilLimit`; the usual cause is a planted block sum off by a minute in Task 4.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: driver views, rules as data, ranking, bands, and metrics

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Store, pure actions, and the hooks

**Files:**
- Create: `src/store/actions.ts`, `src/store/store.ts`, `src/store/hooks.ts`
- Test: `src/store/actions.test.ts`, `src/store/store.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces (pure, `actions.ts`): `reassignStops(fleet, fromDriverId, toDriverId, stopIds, now)`, `scheduleReset(fleet, driverId, afterStopId: string | null, now)`, `notifyCustomer(fleet, stopIds, now)`, `callDriver(fleet, driverId, now)`, `markArrived(fleet, stopId, now)`, `markDeparted(fleet, stopId, outcome, now)`, `bringOnline(fleet, driverId, now)`, `reassignCandidates(views, from, stopIds): Candidate[]`, `suggestResetStop(view): string | null`, `stopsPastLimit(view): string[]`.
- Produces (store): `useStore` with state `{ fleet, scrubOffsetMs, snoozes, corrections, lastAction, undoSnapshot, groupBy, devOpen }` and methods `now()`, `reassignStops`, `scheduleReset`, `notifyCustomer`, `callDriver`, `acknowledge`, `markArrived`, `markDeparted`, `bringOnline`, `undo`, `scrub`, `resetClock`, `resetFleet`, `setGroupBy`, `toggleDev`.
- Produces (hooks): `useNow(): number`, `useDerived(): Derived`.

- [ ] **Step 1: Write the failing action tests**

`src/store/actions.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { minutesUntilLimit, plannedReset, remainingDriveMinutes, remainingStops, unassignedStops } from '../hos/compute'
import { MIN } from '../time/clock'
import { bringOnline, markArrived, markDeparted, notifyCustomer, reassignCandidates, reassignStops, scheduleReset, stopsPastLimit, suggestResetStop } from './actions'
import { buildView, buildViews } from './view'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const fleet = makeFleet(anchor)
const routeOf = (f: typeof fleet, driverId: string) => f.routes.find((r) => r.driverId === driverId)!
const marcusStops = remainingStops(routeOf(fleet, 'drv-01')).map((s) => s.id)

describe('reassignStops', () => {
  it('moves stops to the end of the target route and re-times them after the target finishes', () => {
    const next = reassignStops(fleet, 'drv-01', 'drv-08', marcusStops, anchor)
    expect(remainingDriveMinutes(routeOf(next, 'drv-01'))).toBe(0)
    const ana = routeOf(next, 'drv-08')
    const moved = ana.stops.filter((s) => marcusStops.includes(s.id))
    expect(moved).toHaveLength(3)
    expect(moved.map((s) => s.routeId)).toEqual(['rt-08', 'rt-08', 'rt-08'])
    expect(ana.stops.map((s) => s.seq)).toEqual(ana.stops.map((_, i) => i + 1))
    const anaOwnLast = ana.stops[ana.stops.length - 4]
    expect(moved[0].plannedEta).toBeGreaterThan(anaOwnLast.plannedEta)
    expect(next).not.toBe(fleet) // immutable
  })
  it('a partial reassign leaves the rest with the driver', () => {
    const next = reassignStops(fleet, 'drv-01', 'drv-08', marcusStops.slice(1), anchor)
    expect(remainingStops(routeOf(next, 'drv-01'))).toHaveLength(1)
  })
})

describe('reassignCandidates', () => {
  const views = buildViews(fleet, anchor)
  const marcus = views.find((v) => v.driver.id === 'drv-01')!
  it('puts same-region drivers first, includes Ana, and excludes anyone who would enter act now', () => {
    const cands = reassignCandidates(views, marcus, marcusStops)
    expect(cands[0].sameRegion).toBe(true)
    expect(cands.map((c) => c.view.driver.id)).toContain('drv-08')
    const ids = cands.map((c) => c.view.driver.id)
    expect(ids).not.toContain('drv-01')
    expect(ids).not.toContain('drv-02') // over
    expect(ids).not.toContain('drv-03') // offline
    expect(ids).not.toContain('drv-09') // marginal: 55 left, 32 to drive, plus 34 moved
  })
  it('the marginal candidate is excluded for Priya too', () => {
    const priya = views.find((v) => v.driver.id === 'drv-02')!
    const ids = reassignCandidates(views, priya, remainingStops(priya.route).map((s) => s.id)).map((c) => c.view.driver.id)
    expect(ids).not.toContain('drv-09')
  })
})

describe('scheduleReset', () => {
  it('suggests the last stop finishable before the limit and orphans the rest', () => {
    const marcus = buildView(fleet, fleet.drivers[0], anchor)
    const after = suggestResetStop(marcus)
    expect(after).toBe(marcusStops[0]) // 10 min leg fits in 12; 10 + 14 does not
    const next = scheduleReset(fleet, 'drv-01', after, anchor)
    const route = routeOf(next, 'drv-01')
    expect(unassignedStops(route).map((s) => s.id)).toEqual(marcusStops.slice(1))
    expect(remainingDriveMinutes(route)).toBe(10)
    const driver = next.drivers.find((d) => d.id === 'drv-01')!
    expect(plannedReset(driver)?.startedAt).toBeGreaterThan(anchor)
  })
  it('null means reset now: every remaining stop needs a driver', () => {
    const next = scheduleReset(fleet, 'drv-01', null, anchor)
    expect(unassignedStops(routeOf(next, 'drv-01'))).toHaveLength(3)
    expect(plannedReset(next.drivers.find((d) => d.id === 'drv-01')!)?.startedAt).toBe(anchor)
  })
  it('stopsPastLimit names the stops the driver cannot reach', () => {
    const marcus = buildView(fleet, fleet.drivers[0], anchor)
    expect(stopsPastLimit(marcus)).toEqual(marcusStops.slice(1))
  })
})

describe('notify, call, arrive, depart, reconnect', () => {
  it('notifyCustomer stamps the stops', () => {
    const next = notifyCustomer(fleet, marcusStops, anchor)
    for (const s of remainingStops(routeOf(next, 'drv-01'))) expect(s.notifiedAt).toBe(anchor)
  })
  it('markArrived then markDeparted advances the route and the segments', () => {
    const arrived = markArrived(fleet, marcusStops[0], anchor)
    expect(routeOf(arrived, 'drv-01').stops.find((s) => s.id === marcusStops[0])!.status).toBe('in_progress')
    const departed = markDeparted(arrived, marcusStops[0], 'delivered', anchor + 10 * MIN)
    const stop = routeOf(departed, 'drv-01').stops.find((s) => s.id === marcusStops[0])!
    expect(stop.status).toBe('done')
    expect(stop.departedAt).toBe(anchor + 10 * MIN)
    const driver = departed.drivers.find((d) => d.id === 'drv-01')!
    expect(driver.segments[driver.segments.length - 1]).toMatchObject({ status: 'driving', startedAt: anchor + 10 * MIN })
  })
  it('bringOnline reveals the truth and the countdown corrects upward for Dre', () => {
    const dre = fleet.drivers.find((d) => d.id === 'drv-03')!
    const before = minutesUntilLimit(dre, anchor)
    const next = bringOnline(fleet, 'drv-03', anchor)
    const after = next.drivers.find((d) => d.id === 'drv-03')!
    expect(after.pingsSuspended).toBe(false)
    expect(minutesUntilLimit(after, anchor)).toBeGreaterThan(before)
  })
})
```

`src/store/store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { remainingDriveMinutes } from '../hos/compute'
import { useStore } from './store'

describe('store', () => {
  beforeEach(() => useStore.getState().resetFleet())

  it('commits, then undo restores the previous fleet', () => {
    const s = useStore.getState()
    const before = s.fleet
    const marcusRoute = before.routes.find((r) => r.driverId === 'drv-01')!
    const ids = marcusRoute.stops.filter((x) => x.status === 'pending').map((x) => x.id)
    s.reassignStops('drv-01', 'drv-08', ids)
    expect(remainingDriveMinutes(useStore.getState().fleet.routes.find((r) => r.driverId === 'drv-01')!)).toBe(0)
    expect(useStore.getState().lastAction?.label).toContain('Ana L.')
    useStore.getState().undo()
    expect(useStore.getState().fleet).toBe(before)
  })

  it('acknowledge snoozes for ten minutes on the simulated clock', () => {
    const s = useStore.getState()
    s.acknowledge('offline_near_limit:drv-03')
    const until = useStore.getState().snoozes['offline_near_limit:drv-03']
    expect(until - s.now()).toBeGreaterThan(9 * 60_000)
  })

  it('scrub moves the simulated clock', () => {
    const t0 = useStore.getState().now()
    useStore.getState().scrub(15 * 60_000)
    expect(useStore.getState().now() - t0).toBeGreaterThanOrEqual(15 * 60_000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/actions.test.ts src/store/store.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/store/actions.ts`**

```ts
import type { Driver, DutySegment, Fleet, Route, Stop, StopOutcome } from '../data/types'
import { projectedDepartureAt, projectedFinishAt, remainingStops } from '../hos/compute'
import { CAPACITY_MARGIN_MIN, RESET_MIN } from '../hos/constants'
import { MIN } from '../time/clock'
import type { DriverView } from './view'

// Every mutation is a pure (fleet, args, now) => fleet. The store wraps them with a
// snapshot for undo. The rail and the route file call the same functions.

function routeOf(fleet: Fleet, driverId: string): Route {
  const r = fleet.routes.find((x) => x.driverId === driverId)
  if (!r) throw new Error(`no route for ${driverId}`)
  return r
}

function driverOf(fleet: Fleet, driverId: string): Driver {
  const d = fleet.drivers.find((x) => x.id === driverId)
  if (!d) throw new Error(`no driver ${driverId}`)
  return d
}

function routeWithStop(fleet: Fleet, stopId: string): Route {
  const r = fleet.routes.find((x) => x.stops.some((s) => s.id === stopId))
  if (!r) throw new Error(`no route holds ${stopId}`)
  return r
}

function withRoutes(fleet: Fleet, ...updated: Route[]): Fleet {
  return { ...fleet, routes: fleet.routes.map((r) => updated.find((u) => u.id === r.id) ?? r) }
}

function withDriver(fleet: Fleet, driver: Driver): Fleet {
  return { ...fleet, drivers: fleet.drivers.map((d) => (d.id === driver.id ? driver : d)) }
}

const reseq = (stops: Stop[]): Stop[] => stops.map((s, i) => ({ ...s, seq: i + 1 }))

/** Close whatever live segment the driver has (never a planned one) at `at`. */
function closeLive(segments: DutySegment[], at: number): DutySegment[] {
  return segments.map((s) => (s.endedAt === undefined && !s.planned ? { ...s, endedAt: at } : s))
}

export function reassignStops(fleet: Fleet, fromDriverId: string, toDriverId: string, stopIds: string[], now: number): Fleet {
  const from = routeOf(fleet, fromDriverId)
  const to = routeOf(fleet, toDriverId)
  const moving = from.stops.filter((s) => stopIds.includes(s.id) && (s.status === 'pending' || s.status === 'unassigned'))
  if (moving.length === 0) return fleet
  const keep = from.stops.filter((s) => !moving.includes(s))
  // The target's tail starts when the target is projected to finish. The moved stops keep
  // their leg estimate; it was measured from a different previous stop, so it is an estimate.
  let t = projectedFinishAt(to, now) ?? now
  const tail: Stop[] = moving.map((s) => {
    const plannedEta = t + s.driveMinutesFromPrev * MIN
    t = plannedEta + s.serviceMinutes * MIN
    return { ...s, routeId: to.id, status: 'pending', plannedEta }
  })
  return withRoutes(
    fleet,
    { ...from, stops: reseq(keep) },
    { ...to, stops: reseq([...to.stops, ...tail]), windowEnd: Math.max(to.windowEnd, t + 30 * MIN) },
  )
}

/** Plan a 10-hour reset after `afterStopId` (null = right now). Stops past that point
 *  become unassigned: they are somebody else's problem now, and the info rule says so. */
export function scheduleReset(fleet: Fleet, driverId: string, afterStopId: string | null, now: number): Fleet {
  const driver = driverOf(fleet, driverId)
  const route = routeOf(fleet, driverId)
  const remaining = remainingStops(route)
  const cutoff = afterStopId === null ? -1 : remaining.findIndex((s) => s.id === afterStopId)
  const orphaned = new Set(remaining.slice(cutoff + 1).filter((s) => s.status === 'pending').map((s) => s.id))
  const resetAt = afterStopId === null ? now : projectedDepartureAt(route, afterStopId, now)
  const segments: DutySegment[] = [
    ...driver.segments.filter((s) => !s.planned),
    { status: 'off_duty', startedAt: resetAt, endedAt: resetAt + RESET_MIN * MIN, planned: true },
  ]
  const stops = route.stops.map((s) => (orphaned.has(s.id) ? { ...s, status: 'unassigned' as const } : s))
  return withRoutes(withDriver(fleet, { ...driver, segments }), { ...route, stops })
}

export function notifyCustomer(fleet: Fleet, stopIds: string[], now: number): Fleet {
  return { ...fleet, routes: fleet.routes.map((r) => ({ ...r, stops: r.stops.map((s) => (stopIds.includes(s.id) ? { ...s, notifiedAt: now } : s)) })) }
}

export function callDriver(fleet: Fleet, driverId: string, now: number): Fleet {
  return withDriver(fleet, { ...driverOf(fleet, driverId), contactAttemptedAt: now })
}

export function markArrived(fleet: Fleet, stopId: string, now: number): Fleet {
  const route = routeWithStop(fleet, stopId)
  const driver = driverOf(fleet, route.driverId)
  const stops = route.stops.map((s) => (s.id === stopId ? { ...s, status: 'in_progress' as const, arrivedAt: now } : s))
  const segments: DutySegment[] = [...closeLive(driver.segments, now), { status: 'on_duty', startedAt: now }]
  return withRoutes(withDriver(fleet, { ...driver, segments }), { ...route, stops })
}

export function markDeparted(fleet: Fleet, stopId: string, outcome: StopOutcome, now: number): Fleet {
  const route = routeWithStop(fleet, stopId)
  const driver = driverOf(fleet, route.driverId)
  const stops = route.stops.map((s) =>
    s.id === stopId ? { ...s, status: outcome === 'failed' ? ('failed' as const) : ('done' as const), departedAt: now, outcome, signedBy: outcome === 'failed' ? undefined : 'On file' } : s,
  )
  const moreToDo = stops.some((s) => s.status === 'pending')
  const segments: DutySegment[] = [...closeLive(driver.segments, now), { status: moreToDo ? 'driving' : 'on_duty', startedAt: now }]
  const delivery = fleet.deliveries.find((d) => d.id === route.stops.find((s) => s.id === stopId)!.deliveryId)
  const trucks = delivery ? fleet.trucks.map((t) => (t.id === driver.truckId ? { ...t, position: delivery.position } : t)) : fleet.trucks
  return { ...withRoutes(withDriver(fleet, { ...driver, segments }), { ...route, stops }), trucks }
}

export function bringOnline(fleet: Fleet, driverId: string, now: number): Fleet {
  return withDriver(fleet, { ...driverOf(fleet, driverId), pingsSuspended: false, lastPingAt: now })
}

export interface Candidate {
  view: DriverView
  spare: number
  sameRegion: boolean
}

/** Who can take these stops without becoming the next problem. Fresh, on the road, not
 *  act-now or over, and still holding CAPACITY_MARGIN_MIN after the move. Same region
 *  first, then most spare drive time. */
export function reassignCandidates(views: DriverView[], from: DriverView, stopIds: string[]): Candidate[] {
  const moved = from.route.stops.filter((s) => stopIds.includes(s.id)).reduce((t, s) => t + s.driveMinutesFromPrev, 0)
  return views
    .filter((v) => v.driver.id !== from.driver.id)
    .filter((v) => v.staleness === 'fresh' && (v.status === 'driving' || v.status === 'on_duty'))
    .filter((v) => v.hos !== 'over' && v.hos !== 'act_now')
    .map((v) => ({ view: v, spare: v.minutesUntilLimit - (v.remainingDriveMin + moved), sameRegion: v.driver.region === from.driver.region }))
    .filter((c) => c.spare >= CAPACITY_MARGIN_MIN)
    .sort((a, b) => Number(b.sameRegion) - Number(a.sameRegion) || b.spare - a.spare)
}

/** The last remaining stop the driver can still reach before the limit; null = none. */
export function suggestResetStop(view: DriverView): string | null {
  let left = view.minutesUntilLimit
  let last: string | null = null
  for (const s of view.remaining) {
    const leg = s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev
    if (leg > left) break
    left -= leg
    last = s.id
  }
  return last
}

/** The stops after the point the limit is reached: what a reassign should pre-select. */
export function stopsPastLimit(view: DriverView): string[] {
  const reachable = suggestResetStop(view)
  const idx = reachable === null ? -1 : view.remaining.findIndex((s) => s.id === reachable)
  return view.remaining.slice(idx + 1).filter((s) => s.status === 'pending').map((s) => s.id)
}
```

- [ ] **Step 4: Write `src/store/store.ts`**

```ts
import { create } from 'zustand'
import { makeFleet } from '../data/seed'
import type { Fleet, StopOutcome } from '../data/types'
import type { GroupingId } from '../groupBy'
import { minutesUntilLimit } from '../hos/compute'
import { SNOOZE_MIN } from '../hos/constants'
import { ANCHOR, MIN, simNow } from '../time/clock'
import * as A from './actions'

export interface LastAction {
  label: string
  at: number // wall-clock ms, for the toast timer
  undoable: boolean
}

export interface Correction {
  was: number
  now: number
  at: number // wall-clock ms
}

export interface State {
  fleet: Fleet
  scrubOffsetMs: number
  snoozes: Record<string, number>
  corrections: Record<string, Correction>
  lastAction?: LastAction
  undoSnapshot?: Fleet
  groupBy: GroupingId
  devOpen: boolean
  now: () => number
  reassignStops: (fromDriverId: string, toDriverId: string, stopIds: string[]) => void
  scheduleReset: (driverId: string, afterStopId: string | null) => void
  notifyCustomer: (stopIds: string[]) => void
  callDriver: (driverId: string) => void
  acknowledge: (alertId: string) => void
  markArrived: (stopId: string) => void
  markDeparted: (stopId: string, outcome: StopOutcome) => void
  bringOnline: (driverId: string) => void
  undo: () => void
  scrub: (ms: number) => void
  resetClock: () => void
  resetFleet: () => void
  setGroupBy: (id: GroupingId) => void
  toggleDev: () => void
}

export const useStore = create<State>()((set, get) => {
  const name = (driverId: string) => get().fleet.drivers.find((d) => d.id === driverId)?.name ?? driverId
  /** Snapshot, apply, record. Every consequential action goes through here so undo is uniform. */
  const commit = (label: string, next: (fleet: Fleet, now: number) => Fleet) => {
    const before = get().fleet
    set({ fleet: next(before, get().now()), undoSnapshot: before, lastAction: { label, at: Date.now(), undoable: true } })
  }
  return {
    fleet: makeFleet(ANCHOR),
    scrubOffsetMs: 0,
    snoozes: {},
    corrections: {},
    groupBy: 'region',
    devOpen: false,
    now: () => simNow(get().scrubOffsetMs),
    reassignStops: (from, to, stopIds) =>
      commit(`${name(from)}'s stops reassigned to ${name(to)}`, (f, now) => A.reassignStops(f, from, to, stopIds, now)),
    scheduleReset: (driverId, after) => commit(`Reset scheduled for ${name(driverId)}`, (f, now) => A.scheduleReset(f, driverId, after, now)),
    notifyCustomer: (stopIds) => commit(`${stopIds.length} customer${stopIds.length === 1 ? '' : 's'} notified`, (f, now) => A.notifyCustomer(f, stopIds, now)),
    callDriver: (driverId) => commit(`Call to ${name(driverId)} logged`, (f, now) => A.callDriver(f, driverId, now)),
    acknowledge: (alertId) =>
      set((s) => ({ snoozes: { ...s.snoozes, [alertId]: s.now() + SNOOZE_MIN * MIN }, lastAction: { label: 'Snoozed for 10 min', at: Date.now(), undoable: false } })),
    markArrived: (stopId) => commit('Arrived', (f, now) => A.markArrived(f, stopId, now)),
    markDeparted: (stopId, outcome) => commit('Stop completed', (f, now) => A.markDeparted(f, stopId, outcome, now)),
    bringOnline: (driverId) => {
      const now = get().now()
      const before = get().fleet.drivers.find((d) => d.id === driverId)
      if (!before) return
      const was = minutesUntilLimit(before, now)
      const fleet = A.bringOnline(get().fleet, driverId, now)
      const after = fleet.drivers.find((d) => d.id === driverId)!
      set({ fleet, corrections: { ...get().corrections, [driverId]: { was, now: minutesUntilLimit(after, now), at: Date.now() } } })
    },
    undo: () => {
      const snap = get().undoSnapshot
      if (snap) set({ fleet: snap, undoSnapshot: undefined, lastAction: { label: 'Undone', at: Date.now(), undoable: false } })
    },
    scrub: (ms) => set((s) => ({ scrubOffsetMs: s.scrubOffsetMs + ms })),
    resetClock: () => set({ scrubOffsetMs: 0 }),
    resetFleet: () => set({ fleet: makeFleet(ANCHOR), snoozes: {}, corrections: {}, undoSnapshot: undefined, lastAction: undefined, scrubOffsetMs: 0 }),
    setGroupBy: (groupBy) => set({ groupBy }),
    toggleDev: () => set((s) => ({ devOpen: !s.devOpen })),
  }
})
```

`GroupingId` is defined in Task 7's `src/groupBy.ts`. To keep this task green on its own, create `src/groupBy.ts` now with only the type, and let Task 7 fill the rest:

```ts
export type GroupingId = 'region' | 'band'
```

- [ ] **Step 5: Write `src/store/hooks.ts`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { simNow, TICK_MS, toTick } from '../time/clock'
import { derive, type Derived } from './derive'
import { useStore } from './store'

/** The one clock. Ticks every TICK_MS; the value is rounded to the tick so memo keys are stable. */
export function useNow(): number {
  const scrub = useStore((s) => s.scrubOffsetMs)
  const [wall, setWall] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setWall(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])
  return toTick(simNow(scrub, wall))
}

/** Everything derived from the fleet at this tick. One object per tick, shared by every surface. */
export function useDerived(): Derived {
  const fleet = useStore((s) => s.fleet)
  const snoozes = useStore((s) => s.snoozes)
  const now = useNow()
  return useMemo(() => derive(fleet, now, snoozes), [fleet, now, snoozes])
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all green. `store.test.ts` runs in the node environment; Zustand works without a DOM.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pure fleet actions, Zustand store with undo, and the clock hooks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Filters, groupings, tones, and UI primitives

**Files:**
- Create: `src/filters.ts`, `src/ui/tones.ts`, `src/ui/Chip.tsx`, `src/ui/Button.tsx`, `src/ui/Card.tsx`, `src/ui/Countdown.tsx`, `src/ui/Bar.tsx`, `src/ui/Avatar.tsx`, `src/ui/EmptyState.tsx`
- Modify: `src/groupBy.ts`
- Test: `src/filters.test.ts`

**Interfaces:**
- Produces: `FilterDef`, `FilterState`, `FILTERS`, `EMPTY_FILTERS`, `applyFilters(cards, byId, state)`, `isFiltering(state)`; `Grouping`, `GROUPINGS`, `groupingById(id)`; `Tone`, `BAND_TONE`, `INFO_TONE`, `STALENESS_TONE`, `severityTone(sev)`; components `Chip`, `Button`, `Card`, `Countdown`, `Bar`, `Avatar`, `EmptyState`.

- [ ] **Step 1: Write the failing filter test**

`src/filters.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { makeFleet } from './data/seed'
import { EMPTY_FILTERS, applyFilters, isFiltering } from './filters'
import { derive } from './store/derive'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const d = derive(makeFleet(anchor), anchor, {})

describe('applyFilters', () => {
  it('empty filters pass everything, in rank order', () => {
    expect(applyFilters(d.ranked, d.byId, EMPTY_FILTERS).map((c) => c.driverId)).toEqual(d.ranked.map((c) => c.driverId))
    expect(isFiltering(EMPTY_FILTERS)).toBe(false)
  })
  it('band and freshness narrow', () => {
    const actNow = applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, band: ['act_now'] })
    expect(actNow.map((c) => c.driverId)).toEqual(['drv-02', 'drv-01', 'drv-03'])
    const offline = applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, freshness: ['offline'] })
    expect(offline.map((c) => c.driverId)).toEqual(['drv-03'])
  })
  it('search matches name or plate, case-insensitive', () => {
    expect(applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, search: 'marc' }).map((c) => c.driverId)).toEqual(['drv-01'])
    expect(isFiltering({ ...EMPTY_FILTERS, search: 'x' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/filters.test.ts`
Expected: FAIL — `./filters` not found.

- [ ] **Step 3: Write `src/filters.ts` and finish `src/groupBy.ts`**

`src/filters.ts`:
```ts
import type { DriverCard } from './alerts/types'
import { BAND_LABEL, BAND_ORDER } from './bands'
import { REGIONS } from './data/regions'
import type { DriverView } from './store/view'

// Filters are data. Adding one is one object; the FilterBar renders whatever is here.
export type FilterValue = string[] | string
export type FilterState = Record<string, FilterValue>

export interface FilterDef {
  id: string
  label: string
  kind: 'multi' | 'text'
  options?: { value: string; label: string }[]
  apply: (v: DriverView, c: DriverCard, value: FilterValue) => boolean
}

const multi = (value: FilterValue): string[] => (Array.isArray(value) ? value : [])
const text = (value: FilterValue): string => (typeof value === 'string' ? value.trim().toLowerCase() : '')

export const FILTERS: FilterDef[] = [
  { id: 'band', label: 'Status', kind: 'multi', options: BAND_ORDER.map((b) => ({ value: b, label: BAND_LABEL[b] })), apply: (_v, c, value) => multi(value).length === 0 || multi(value).includes(c.band) },
  { id: 'freshness', label: 'Data', kind: 'multi', options: [{ value: 'fresh', label: 'Fresh' }, { value: 'stale', label: 'Stale' }, { value: 'offline', label: 'Offline' }], apply: (v, _c, value) => multi(value).length === 0 || multi(value).includes(v.staleness) },
  { id: 'region', label: 'Region', kind: 'multi', options: REGIONS.map((r) => ({ value: r, label: r })), apply: (v, _c, value) => multi(value).length === 0 || multi(value).includes(v.driver.region) },
  { id: 'search', label: 'Find a driver or plate', kind: 'text', apply: (v, _c, value) => { const q = text(value); return q === '' || v.driver.name.toLowerCase().includes(q) || v.truck.plate.toLowerCase().includes(q) } },
]

export const EMPTY_FILTERS: FilterState = Object.fromEntries(FILTERS.map((f) => [f.id, f.kind === 'multi' ? [] : '']))

export function applyFilters(cards: DriverCard[], byId: Map<string, DriverView>, state: FilterState): DriverCard[] {
  return cards.filter((c) => {
    const v = byId.get(c.driverId)
    return v !== undefined && FILTERS.every((f) => f.apply(v, c, state[f.id] ?? EMPTY_FILTERS[f.id]))
  })
}

export function isFiltering(state: FilterState): boolean {
  return FILTERS.some((f) => (f.kind === 'multi' ? multi(state[f.id]).length > 0 : text(state[f.id]) !== ''))
}
```

`src/groupBy.ts` (replace the type-only stub):
```ts
import type { DriverCard } from './alerts/types'
import { BAND_LABEL, BAND_ORDER } from './bands'
import { REGIONS } from './data/regions'
import type { DriverView } from './store/view'

// Column grouping is config. Same cards, same rank, different column function.
export type GroupingId = 'region' | 'band'

export interface Grouping {
  id: GroupingId
  label: string
  columns: { key: string; label: string }[]
  keyOf: (v: DriverView, c: DriverCard) => string
}

export const GROUPINGS: Grouping[] = [
  { id: 'region', label: 'Region', columns: REGIONS.map((r) => ({ key: r, label: r })), keyOf: (v) => v.driver.region },
  { id: 'band', label: 'Status', columns: BAND_ORDER.map((b) => ({ key: b, label: BAND_LABEL[b] })), keyOf: (_v, c) => c.band },
]

export function groupingById(id: GroupingId): Grouping {
  return GROUPINGS.find((g) => g.id === id) ?? GROUPINGS[0]
}
```

- [ ] **Step 4: Write `src/ui/tones.ts`**

Class names live here as literal strings so Tailwind's scanner sees them and so no component invents its own color.

```ts
import type { Severity } from '../alerts/types'
import type { Band } from '../bands'
import type { Staleness } from '../hos/compute'

export interface Tone {
  text: string
  fill: string
  soft: string
  border: string
}

export const BAND_TONE: Record<Band, Tone> = {
  act_now: { text: 'text-act-now', fill: 'bg-act-now-fill', soft: 'bg-act-now-soft', border: 'border-act-now' },
  watch: { text: 'text-watch', fill: 'bg-watch-fill', soft: 'bg-watch-soft', border: 'border-watch' },
  offline: { text: 'text-offline', fill: 'bg-offline-fill', soft: 'bg-offline-soft', border: 'border-offline' },
  break: { text: 'text-break', fill: 'bg-break-fill', soft: 'bg-break-soft', border: 'border-break' },
  clear: { text: 'text-clear', fill: 'bg-clear-fill', soft: 'bg-clear-soft', border: 'border-clear' },
}

export const INFO_TONE: Tone = { text: 'text-muted', fill: 'bg-offline-fill', soft: 'bg-well', border: 'border-line' }
export const LOOKOUT_TONE: Tone = { text: 'text-lookout-strong', fill: 'bg-lookout', soft: 'bg-lookout-soft', border: 'border-lookout' }

export const STALENESS_TONE: Record<Staleness, Tone> = { fresh: BAND_TONE.clear, stale: BAND_TONE.watch, offline: BAND_TONE.offline }

export function severityTone(severity: Severity | 'none'): Tone {
  if (severity === 'critical' || severity === 'act_now') return BAND_TONE.act_now
  if (severity === 'watch') return BAND_TONE.watch
  if (severity === 'info') return INFO_TONE
  return BAND_TONE.clear
}
```

- [ ] **Step 5: Write the primitives**

`src/ui/Chip.tsx`:
```tsx
import type { ReactNode } from 'react'
import type { Tone } from './tones'

export default function Chip({ tone, dashed = false, children, title, className = '' }: { tone?: Tone; dashed?: boolean; children: ReactNode; title?: string; className?: string }) {
  const color = tone ? `${tone.soft} ${tone.text}` : 'bg-well text-muted'
  const border = dashed && tone ? `border border-dashed ${tone.border}` : ''
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${color} ${border} ${className}`}>
      {children}
    </span>
  )
}
```

`src/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'lookout' | 'ghost'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-on-accent hover:bg-ink/90',
  secondary: 'bg-panel text-ink border border-line hover:bg-well',
  danger: 'bg-act-now text-on-accent hover:bg-act-now/90',
  lookout: 'bg-lookout text-on-accent hover:bg-lookout-strong',
  ghost: 'bg-transparent text-muted hover:bg-well hover:text-ink',
}
const SIZE: Record<Size, string> = { sm: 'h-7 px-2.5 text-[12px]', md: 'h-9 px-3.5 text-[13px]' }

export default function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-control font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  )
}
```

`src/ui/Card.tsx`:
```tsx
import type { HTMLAttributes } from 'react'

export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-panel shadow-card ${className}`} {...props} />
}
```

`src/ui/Countdown.tsx`:
```tsx
import { hosStatusOf } from '../hos/compute'
import { fmtCountdown } from '../lib/format'
import { BAND_TONE } from './tones'

const SIZE = { sm: 'text-[13px]', md: 'text-lg', lg: 'font-display text-5xl leading-none tracking-tight' } as const

/** The number that matters. Tabular figures so it never jitters; tilde when it is an estimate. */
export default function Countdown({ minutes, stale, size = 'sm', className = '' }: { minutes: number; stale: boolean; size?: keyof typeof SIZE; className?: string }) {
  const hos = hosStatusOf(minutes)
  const color = hos === 'over' || hos === 'act_now' ? BAND_TONE.act_now.text : hos === 'watch' ? BAND_TONE.watch.text : 'text-ink'
  return (
    <span className={`tnum font-semibold ${SIZE[size]} ${color} ${className}`} title={stale ? 'Estimate: last ping is stale' : undefined}>
      {fmtCountdown(minutes, stale)}
    </span>
  )
}
```

`src/ui/Bar.tsx`:
```tsx
import type { Tone } from './tones'

/** A 0–1 progress bar. Used for drive time on the 11h scale and route progress. */
export default function Bar({ value, tone, className = '', marker }: { value: number; tone: Tone; className?: string; marker?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-well ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-300 ${tone.fill}`} style={{ width: `${pct}%` }} />
      {marker !== undefined && <div className="absolute inset-y-0 w-px bg-ink/60" style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }} />}
    </div>
  )
}
```

`src/ui/Avatar.tsx`:
```tsx
const SIZE = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[12px]', lg: 'h-12 w-12 text-base' } as const

export default function Avatar({ initials, size = 'md', className = '' }: { initials: string; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-well font-semibold text-muted ${SIZE[size]} ${className}`} aria-hidden="true">
      {initials}
    </span>
  )
}
```

`src/ui/EmptyState.tsx`:
```tsx
import type { ReactNode } from 'react'

export default function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line px-4 py-5">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[12px] text-muted">{body}</p>}
      {action}
    </div>
  )
}
```

- [ ] **Step 6: Run tests, typecheck, and a Tailwind sanity check**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: green. Open `dist/assets/*.css` and confirm `.bg-act-now-fill` and `.text-lookout-strong` exist; if not, the token names in `index.css` and `tones.ts` disagree.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: filter and grouping config, tone map, and UI primitives

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 8: Shell — routes, layout, nav, header, dev panel, Lookout context

**Files:**
- Create: `src/app/Layout.tsx`, `src/app/LeftNav.tsx`, `src/app/Header.tsx`, `src/app/DevPanel.tsx`, `src/lookout/LookoutContext.tsx`, `src/lookout/LookoutSidebar.tsx` (stub, replaced in Task 10), `src/lookout/voice.ts`, `src/actions/ActionContext.tsx`, `src/actions/ActionDialogs.tsx` (stub, filled in Task 12)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: store, hooks, format, primitives.
- Produces: `useLookout(): { collapsed, setCollapsed, focusDriverId, setFocus }`; `LOOKOUT` voice constants; `useActions(): { request, open, close }` where `open(action: DialogAction, driverId: string, opts?: { stopIds?: string[] })` and `DialogAction = 'reassign' | 'schedule_reset' | 'notify_customer'`; `<ActionDialogs />` (renders nothing until Task 12). Routes: `/`, `/routes/:driverId`, `/drivers`, `/routes`, `/reports`.

- [ ] **Step 1: Write `src/lookout/voice.ts`**

```ts
// Lookout's name and shared phrases. The co-pilot is a feature of this product with its
// own voice: a competent colleague who says what she sees and what Lena can do about it.
export const LOOKOUT = {
  name: 'Lookout',
  tagline: 'Watching the shift',
  allClear: (onShift: number) => `All clear. ${onShift} drivers on shift, nothing needs you right now.`,
  focusIntro: (name: string) => `What I see on ${name}`,
  snoozed: (until: string) => `Snoozed until ${until}`,
  called: (at: string) => `Called at ${at}`,
} as const
```

- [ ] **Step 2: Write `src/lookout/LookoutContext.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface LookoutState {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  focusDriverId: string | null
  setFocus: (id: string | null) => void
}

const Ctx = createContext<LookoutState | null>(null)

export function LookoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [focusDriverId, setFocus] = useState<string | null>(null)
  const value = useMemo(() => ({ collapsed, setCollapsed, focusDriverId, setFocus }), [collapsed, focusDriverId])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLookout(): LookoutState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLookout must be used inside <LookoutProvider>')
  return v
}
```

- [ ] **Step 3: Write `src/actions/ActionContext.tsx`**

The three consequential actions open a dialog. Anything can request one; Task 12 renders them. Inline actions (acknowledge, call driver) never come through here.

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type DialogAction = 'reassign' | 'schedule_reset' | 'notify_customer'

export interface ActionRequest {
  action: DialogAction
  driverId: string
  stopIds?: string[]
}

interface ActionState {
  request: ActionRequest | null
  open: (action: DialogAction, driverId: string, opts?: { stopIds?: string[] }) => void
  close: () => void
}

const Ctx = createContext<ActionState | null>(null)

export function ActionProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ActionRequest | null>(null)
  const value = useMemo<ActionState>(
    () => ({ request, open: (action, driverId, opts) => setRequest({ action, driverId, stopIds: opts?.stopIds }), close: () => setRequest(null) }),
    [request],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useActions(): ActionState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useActions must be used inside <ActionProvider>')
  return v
}
```

`src/actions/ActionDialogs.tsx` (stub; Task 12 fills it in, and it lives in its own file so the dialogs can import `useActions` without a cycle):
```tsx
export default function ActionDialogs() {
  return null
}
```

- [ ] **Step 4: Write `src/app/LeftNav.tsx`**

```tsx
import { ChartBar, Path, SquaresFour, Users, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink } from 'react-router'

const ITEMS = [
  { to: '/', label: 'Active Shift', Icon: SquaresFour, end: true },
  { to: '/drivers', label: 'Drivers', Icon: Users, end: false },
  { to: '/routes', label: 'Routes', Icon: Path, end: false },
  { to: '/reports', label: 'Reports', Icon: ChartBar, end: false },
]

/** Light. Enough to show this is one view inside a product. Only Active Shift is built. */
export default function LeftNav() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <nav className={`flex shrink-0 flex-col border-r border-line bg-panel transition-[width] ${collapsed ? 'w-14' : 'w-48'}`} aria-label="Primary">
      <div className={`flex h-14 items-center border-b border-line ${collapsed ? 'justify-center' : 'px-4'}`}>
        <span className="font-display text-[15px] font-semibold tracking-tight">{collapsed ? 'D' : 'Dispatch'}</span>
      </div>
      <ul className="flex flex-col gap-0.5 p-2">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13px] font-medium transition ${isActive ? 'bg-well text-ink' : 'text-muted hover:bg-well/60 hover:text-ink'} ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} weight="duotone" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="mt-auto flex h-10 items-center justify-center text-muted hover:text-ink" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
        {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
      </button>
    </nav>
  )
}
```

- [ ] **Step 5: Write `src/app/Header.tsx`**

```tsx
import { Wrench } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { GROUPINGS } from '../groupBy'
import { fmtClock } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'

export default function Header() {
  const { pathname } = useLocation()
  const { now, byId } = useDerived()
  const groupBy = useStore((s) => s.groupBy)
  const setGroupBy = useStore((s) => s.setGroupBy)
  const toggleDev = useStore((s) => s.toggleDev)
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-panel px-5">
      <h1 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
        {focused ? (
          <>
            <Link to="/" className="text-muted hover:text-ink">Active Shift</Link>
            <span className="text-muted">/</span>
            <span>{focused.driver.name}</span>
          </>
        ) : (
          'Active Shift'
        )}
      </h1>
      {!focused && (
        <div className="ml-2 flex items-center gap-1 rounded-control border border-line p-0.5" role="group" aria-label="Group columns by">
          {GROUPINGS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupBy(g.id)}
              className={`rounded-[6px] px-2.5 py-1 text-[12px] font-semibold ${groupBy === g.id ? 'bg-ink text-on-accent' : 'text-muted hover:text-ink'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="tnum text-[13px] text-muted" title="Simulated shift clock; it ticks in real time">
          <span className="font-semibold text-ink">{fmtClock(now)}</span> · simulated shift
        </span>
        <button type="button" onClick={toggleDev} title="Dev controls (⌘.)" className="rounded-control p-1.5 text-muted hover:bg-well hover:text-ink" aria-label="Toggle dev controls">
          <Wrench size={16} weight="duotone" />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Write `src/app/DevPanel.tsx`**

```tsx
import { useEffect } from 'react'
import { MIN } from '../time/clock'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'
import Button from '../ui/Button'

/** Hidden behind ⌘. and the wrench. Exists so any alert can be fired on demand during a
 *  walkthrough. The scrubber advances the clock, not the world: stops don't complete themselves. */
export default function DevPanel() {
  const open = useStore((s) => s.devOpen)
  const toggle = useStore((s) => s.toggleDev)
  const scrub = useStore((s) => s.scrub)
  const resetClock = useStore((s) => s.resetClock)
  const resetFleet = useStore((s) => s.resetFleet)
  const bringOnline = useStore((s) => s.bringOnline)
  const markDeparted = useStore((s) => s.markDeparted)
  const undo = useStore((s) => s.undo)
  const scrubOffsetMs = useStore((s) => s.scrubOffsetMs)
  const { byId } = useDerived()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  if (!open) return null
  const dre = byId.get('drv-03')
  const marcus = byId.get('drv-01')
  return (
    <aside className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-card border border-line bg-panel px-3 py-2 shadow-card" aria-label="Dev controls">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-label">Dev</span>
      <Button size="sm" onClick={() => scrub(15 * MIN)}>+15m</Button>
      <Button size="sm" onClick={() => scrub(60 * MIN)}>+1h</Button>
      <Button size="sm" onClick={resetClock} disabled={scrubOffsetMs === 0}>Reset clock</Button>
      <span className="h-5 w-px bg-line" />
      <Button size="sm" onClick={() => bringOnline('drv-03')} disabled={!dre || dre.staleness === 'fresh'}>Bring Dre online</Button>
      <Button size="sm" onClick={() => marcus?.next && markDeparted(marcus.next.id, 'delivered')} disabled={!marcus?.next}>Advance Marcus a stop</Button>
      <span className="h-5 w-px bg-line" />
      <Button size="sm" onClick={undo}>Undo</Button>
      <Button size="sm" variant="ghost" onClick={resetFleet}>Reset data</Button>
      <span className="ml-1 text-[11px] text-muted">The scrubber advances the clock, not the world.</span>
    </aside>
  )
}
```

- [ ] **Step 7: Write the Lookout sidebar stub and the Layout**

`src/lookout/LookoutSidebar.tsx` (stub; Task 10 replaces it entirely):
```tsx
import { useLookout } from './LookoutContext'
import { LOOKOUT } from './voice'

export default function LookoutSidebar() {
  const { collapsed, setCollapsed } = useLookout()
  return (
    <aside className={`flex shrink-0 flex-col border-l border-line bg-panel transition-[width] ${collapsed ? 'w-14' : 'w-[26rem]'}`} aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <button type="button" onClick={() => setCollapsed(!collapsed)} className="h-14 border-b border-line px-4 text-left font-display text-[15px] font-semibold text-lookout-strong">
        {collapsed ? 'L' : LOOKOUT.name}
      </button>
    </aside>
  )
}
```

`src/app/Layout.tsx`:
```tsx
import { Outlet } from 'react-router'
import { ActionProvider } from '../actions/ActionContext'
import ActionDialogs from '../actions/ActionDialogs'
import { LookoutProvider } from '../lookout/LookoutContext'
import LookoutSidebar from '../lookout/LookoutSidebar'
import DevPanel from './DevPanel'
import Header from './Header'
import LeftNav from './LeftNav'

/** Three panes: nav · main · Lookout. Lookout is mounted once here and reads derived
 *  state itself; pages tell it which driver to focus through LookoutContext. */
export default function Layout() {
  return (
    <LookoutProvider>
      <ActionProvider>
        <div className="flex h-screen overflow-hidden bg-canvas text-ink">
          <LeftNav />
          <main className="flex min-w-0 flex-1 flex-col">
            <Header />
            <div className="min-h-0 flex-1 overflow-auto">
              <Outlet />
            </div>
          </main>
          <LookoutSidebar />
        </div>
        <ActionDialogs />
        <DevPanel />
      </ActionProvider>
    </LookoutProvider>
  )
}
```

- [ ] **Step 8: Write `src/App.tsx` with the routes and placeholder pages**

```tsx
import { Route, Routes } from 'react-router'
import Layout from './app/Layout'
import EmptyState from './ui/EmptyState'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <EmptyState title={`${title} isn't built for this exercise.`} body="Active Shift is the view a dispatcher lives in; this is here to show it sits inside a product." />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Placeholder title="Active Shift" />} />
        <Route path="routes/:driverId" element={<Placeholder title="Route file" />} />
        <Route path="drivers" element={<Placeholder title="Drivers" />} />
        <Route path="routes" element={<Placeholder title="Routes" />} />
        <Route path="reports" element={<Placeholder title="Reports" />} />
        <Route path="*" element={<Placeholder title="This page" />} />
      </Route>
    </Routes>
  )
}
```

Task 9 swaps the index element for `ActiveShiftPage`; Task 11 swaps the route-file element for `RouteFilePage`.

- [ ] **Step 9: Verify in the browser**

Run: `npx tsc --noEmit && npm run dev`
Check: three panes render; the header clock shows 12:47 PM and advances; `⌘.` opens the dev panel; +15m moves the clock; the left nav collapses; the Lookout stub collapses to a rail. Nothing in the console.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: three-pane shell with routes, header clock, dev panel, and contexts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Active Shift — metrics row, filter bar, region-column board, route cards

**Files:**
- Create: `src/views/shift/ActiveShiftPage.tsx`, `src/views/shift/MetricsRow.tsx`, `src/views/shift/FilterBar.tsx`, `src/views/shift/Board.tsx`, `src/views/shift/RouteCard.tsx`
- Modify: `src/App.tsx` (index route)

**Interfaces:**
- Consumes: `useDerived`, `useStore.groupBy`, `FILTERS`/`applyFilters`/`EMPTY_FILTERS`/`isFiltering`, `groupingById`, tones, primitives, `LIMIT_MIN`.
- Produces: `<RouteCard view card pick />` reused nowhere else but designed to match the rail's card anatomy.

- [ ] **Step 1: Write `src/views/shift/MetricsRow.tsx`**

```tsx
import type { FilterState } from '../../filters'
import { EMPTY_FILTERS } from '../../filters'
import type { Metrics } from '../../store/derive'
import Card from '../../ui/Card'

interface Metric {
  id: string
  label: string
  value: string
  sub?: string
  preset: FilterState
  tone?: string
}

function sameFilters(a: FilterState, b: FilterState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Fleet-wide state in one row. Every card is a filter shortcut; the numbers derive from
 *  the same views the board renders, so they can never disagree with it. */
export default function MetricsRow({ metrics, filters, onPreset }: { metrics: Metrics; filters: FilterState; onPreset: (f: FilterState) => void }) {
  const items: Metric[] = [
    { id: 'onShift', label: 'On shift', value: String(metrics.onShift), preset: EMPTY_FILTERS },
    { id: 'approaching', label: 'Approaching limit', value: String(metrics.approaching), preset: { ...EMPTY_FILTERS, band: ['act_now', 'watch'] }, tone: metrics.approaching > 0 ? 'text-watch' : undefined },
    { id: 'over', label: 'Over limit', value: String(metrics.over), preset: { ...EMPTY_FILTERS, band: ['act_now'] }, tone: metrics.over > 0 ? 'text-act-now' : undefined },
    { id: 'offline', label: 'Offline', value: String(metrics.offline), preset: { ...EMPTY_FILTERS, freshness: ['offline'] }, tone: metrics.offline > 0 ? 'text-offline' : undefined },
    { id: 'stops', label: 'Stops', value: `${metrics.stopsDone} / ${metrics.stopsRemaining}`, sub: 'done · remaining', preset: EMPTY_FILTERS },
  ]
  if (metrics.needDriver > 0) items.push({ id: 'needDriver', label: 'Need a driver', value: String(metrics.needDriver), sub: 'stops after a reset', preset: EMPTY_FILTERS, tone: 'text-break' })

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((m) => {
        const active = sameFilters(filters, m.preset) && m.id !== 'onShift' && m.id !== 'stops' && m.id !== 'needDriver'
        return (
          <Card key={m.id} role="button" tabIndex={0} onClick={() => onPreset(active ? EMPTY_FILTERS : m.preset)} onKeyDown={(e) => e.key === 'Enter' && onPreset(active ? EMPTY_FILTERS : m.preset)} className={`cursor-pointer px-4 py-3 transition hover:shadow-md ${active ? 'ring-2 ring-ink/70' : ''}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{m.label}</p>
            <p className={`tnum mt-1 font-display text-3xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</p>
            {m.sub && <p className="mt-1 text-[11px] text-muted">{m.sub}</p>}
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/views/shift/FilterBar.tsx`**

```tsx
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { EMPTY_FILTERS, FILTERS, isFiltering, type FilterState } from '../../filters'
import Button from '../../ui/Button'

/** Renders whatever FILTERS holds. Adding a filter is one object in src/filters.ts. */
export default function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  const toggle = (id: string, value: string) => {
    const current = (filters[id] as string[] | undefined) ?? []
    onChange({ ...filters, [id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {FILTERS.filter((f) => f.kind === 'multi').map((f) => (
        <div key={f.id} className="flex items-center gap-1.5" role="group" aria-label={f.label}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-label">{f.label}</span>
          {f.options!.map((o) => {
            const on = ((filters[f.id] as string[] | undefined) ?? []).includes(o.value)
            return (
              <button key={o.value} type="button" onClick={() => toggle(f.id, o.value)} aria-pressed={on} className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition ${on ? 'border-ink bg-ink text-on-accent' : 'border-line bg-panel text-muted hover:border-ink/40 hover:text-ink'}`}>
                {o.label}
              </button>
            )
          })}
        </div>
      ))}
      {FILTERS.filter((f) => f.kind === 'text').map((f) => (
        <label key={f.id} className="flex items-center gap-1.5 rounded-control border border-line bg-panel px-2 py-1 text-[12px] focus-within:border-ink/50">
          <MagnifyingGlass size={14} className="text-muted" />
          <input value={(filters[f.id] as string | undefined) ?? ''} onChange={(e) => onChange({ ...filters, [f.id]: e.target.value })} placeholder={f.label} className="w-44 bg-transparent outline-none placeholder:text-muted" aria-label={f.label} />
        </label>
      ))}
      {isFiltering(filters) && (
        <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <X size={12} /> Clear filters
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/views/shift/RouteCard.tsx`**

```tsx
import { Truck } from '@phosphor-icons/react'
import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { LIMIT_MIN } from '../../hos/constants'
import { fmtAge } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Bar from '../../ui/Bar'
import Chip from '../../ui/Chip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, LOOKOUT_TONE, STALENESS_TONE, severityTone } from '../../ui/tones'

/** One route, one driver, one truck. Color is attention: a clear card is quiet, and only
 *  the marker strip, the glyph, and the badges carry band color. Nothing drags. */
export default function RouteCard({ view, card, pick = false }: { view: DriverView; card: DriverCard; pick?: boolean }) {
  const tone = BAND_TONE[card.band]
  const quiet = card.band === 'clear' && !pick
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const surface = quiet ? 'border-line/70 bg-panel/80 opacity-80 hover:opacity-100' : 'border-line bg-panel shadow-card'
  const dim = card.snoozed ? 'opacity-60' : ''
  return (
    <Link to={`/routes/${view.driver.id}`} className={`group flex overflow-hidden rounded-card border transition hover:border-ink/30 hover:shadow-md ${surface} ${dim}`}>
      <div className={`w-1.5 shrink-0 transition-colors duration-300 ${offline ? `border-l-[6px] border-dashed ${tone.border} bg-transparent` : tone.fill}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Truck size={18} weight="duotone" className={quiet ? 'text-muted' : tone.text} />
          <span className="truncate text-[13px] font-semibold text-ink">{view.driver.name}</span>
          <span className="truncate text-[11px] text-muted">{view.truck.plate}</span>
          <Countdown minutes={view.minutesUntilLimit} stale={stale} className="ml-auto" />
        </div>
        <Bar value={view.drivingMin / LIMIT_MIN} tone={quiet ? { ...tone, fill: 'bg-offline-fill' } : tone} />
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="tnum font-medium text-ink">{view.done}/{view.total}</span>
          <span className="truncate">{view.next ? `next · ${nextLabel(view)}` : view.unassigned.length ? `${view.unassigned.length} need a driver` : 'route complete'}</span>
          <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline} className="ml-auto" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</Chip>
        </div>
        {(card.alerts.length > 0 || pick) && (
          <div className="flex flex-wrap gap-1">
            {pick && <Chip tone={LOOKOUT_TONE} title="Lookout's top pick across the fleet">✦ Lookout's pick</Chip>}
            {card.alerts.map((a) => (
              <Chip key={a.id} tone={severityTone(a.severity)} title={a.title}>{a.label}</Chip>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function nextLabel(view: DriverView): string {
  const s = view.next!
  return `stop ${s.seq}${s.status === 'in_progress' ? ' · at the dock' : ''}`
}
```

- [ ] **Step 4: Write `src/views/shift/Board.tsx`**

```tsx
import type { DriverCard } from '../../alerts/types'
import type { Grouping } from '../../groupBy'
import type { DriverView } from '../../store/view'
import EmptyState from '../../ui/EmptyState'
import RouteCard from './RouteCard'

/** Columns come from the grouping; rows are Lookout's rank. The top row of the board is
 *  therefore "the most urgent problem in each column." Each column scrolls on its own. */
export default function Board({ cards, byId, grouping, pickId }: { cards: DriverCard[]; byId: Map<string, DriverView>; grouping: Grouping; pickId: string | null }) {
  const columns = grouping.columns.map((col) => ({ ...col, cards: cards.filter((c) => grouping.keyOf(byId.get(c.driverId)!, c) === col.key) }))
  return (
    <div className="grid h-full min-h-0 gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(14rem, 1fr))` }}>
      {columns.map((col) => (
        <section key={col.key} className="flex min-h-0 flex-col rounded-card bg-well/60 p-2" aria-label={col.label}>
          <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-label">{col.label}</h2>
            <span className="tnum text-[12px] text-muted">{col.cards.length}</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {col.cards.length === 0 ? (
              <EmptyState title={`No trucks in ${col.label}`} body="Nothing here matches the current filters." />
            ) : (
              col.cards.map((c) => <RouteCard key={c.driverId} view={byId.get(c.driverId)!} card={c} pick={c.driverId === pickId} />)
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write `src/views/shift/ActiveShiftPage.tsx` and wire the route**

```tsx
import { useState } from 'react'
import { EMPTY_FILTERS, applyFilters, isFiltering, type FilterState } from '../../filters'
import { groupingById } from '../../groupBy'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import Board from './Board'
import FilterBar from './FilterBar'
import MetricsRow from './MetricsRow'

export default function ActiveShiftPage() {
  const d = useDerived()
  const groupBy = useStore((s) => s.groupBy)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const visible = applyFilters(d.ranked, d.byId, filters)
  const pick = d.ranked.find((c) => c.alerts.length > 0 && !c.snoozed) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <MetricsRow metrics={d.metrics} filters={filters} onPreset={setFilters} />
      <FilterBar filters={filters} onChange={setFilters} />
      <div className="min-h-0 flex-1">
        {visible.length === 0 && isFiltering(filters) ? (
          <EmptyState title="Nothing matches those filters." body="Every driver is hidden by the current status, data, region, or search filter." action={<Button size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>} />
        ) : (
          <Board cards={visible} byId={d.byId} grouping={groupingById(groupBy)} pickId={pick?.driverId ?? null} />
        )}
      </div>
    </div>
  )
}
```

In `src/App.tsx`, replace the index route:
```tsx
import ActiveShiftPage from './views/shift/ActiveShiftPage'
// ...
<Route index element={<ActiveShiftPage />} />
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && npm run dev`
Check, at the anchor:
- Metrics: On shift 50 · Approaching limit at least 5 (Marcus, Nadia, Ravi, Omar, and Dre's projection) · Over limit 1 · Offline 1 · Stops done/remaining are nonzero.
- Four region columns. North's top card is Marcus with "✦ Lookout's pick", then Sam and Ana lower. West's top is Priya with an "Over limit" badge. South's top is Dre with a dashed marker and "25 min ago" chip. Clear cards are visibly quieter.
- Clicking "Over limit" filters to Priya, Marcus, Dre (the Act now band); clicking it again clears. Group by Status shows five columns.
- +1h in the dev panel: Marcus's countdown goes negative and his badge changes to "Over limit" within a tick.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Active Shift with metrics row, filter bar, region-column board, and route cards

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Lookout rail — alert bar, recommendation cards, inline confirm

**Files:**
- Create: `src/lookout/AlertBar.tsx`, `src/lookout/RecommendationCard.tsx`, `src/lookout/AlertActions.tsx`, `src/lookout/ActionConfirm.tsx`
- Modify: `src/lookout/LookoutSidebar.tsx` (replace the stub)

**Interfaces:**
- Consumes: `useDerived`, `useLookout`, `useActions`, store methods, tones, primitives, `LOOKOUT`.
- Produces: `<AlertActions driverId actions disabledReason? />` — the single component that renders action buttons for any alert, used by both the rail and the route file's alert strip (Task 11). `<ActionConfirm label confirmLabel onConfirm />` — the two-step inline confirm.

- [ ] **Step 1: Write `src/lookout/ActionConfirm.tsx`**

```tsx
import { useEffect, useState } from 'react'
import Button from '../ui/Button'

/** Insight → action, with a confirm. Idle → "Sure?" → done. The done state lingers for two
 *  seconds so the click visibly did something before the alert recomputes. */
export default function ActionConfirm({ label, confirmLabel = 'Confirm', doneLabel = 'Done', onConfirm, disabled, title, variant = 'secondary' }: { label: string; confirmLabel?: string; doneLabel?: string; onConfirm: () => void; disabled?: boolean; title?: string; variant?: 'secondary' | 'primary' | 'danger' }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'done'>('idle')
  useEffect(() => {
    if (state !== 'done') return
    const id = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(id)
  }, [state])
  if (state === 'confirming') {
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" variant="primary" onClick={() => { onConfirm(); setState('done') }}>{confirmLabel}</Button>
        <Button size="sm" variant="ghost" onClick={() => setState('idle')}>Cancel</Button>
      </span>
    )
  }
  return (
    <Button size="sm" variant={variant} disabled={disabled || state === 'done'} title={title} onClick={() => setState('confirming')}>
      {state === 'done' ? doneLabel : label}
    </Button>
  )
}
```

- [ ] **Step 2: Write `src/lookout/AlertActions.tsx`**

```tsx
import { useActions } from '../actions/ActionContext'
import type { ActionId } from '../alerts/types'
import { useStore } from '../store/store'
import Button from '../ui/Button'
import ActionConfirm from './ActionConfirm'

const LABEL: Record<ActionId, string> = {
  reassign: 'Reassign stops',
  schedule_reset: 'Schedule reset',
  notify_customer: 'Notify customers',
  call_driver: 'Call driver',
  acknowledge: 'Snooze 10 min',
}

/** The one place action buttons are rendered. The rail and the route file both use it, so
 *  the same handler runs from either surface. Dialog actions open a dialog; the two light
 *  actions confirm inline. `positionDependentDisabled` carries the stale-data reason. */
export default function AlertActions({ driverId, actions, alertIds, positionDependentDisabled }: { driverId: string; actions: ActionId[]; alertIds: string[]; positionDependentDisabled?: string }) {
  const { open } = useActions()
  const callDriver = useStore((s) => s.callDriver)
  const acknowledge = useStore((s) => s.acknowledge)
  const unique = [...new Set(actions)]
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((a) => {
        if (a === 'call_driver') return <ActionConfirm key={a} label={LABEL[a]} confirmLabel="Place call" doneLabel="Call logged" onConfirm={() => callDriver(driverId)} />
        if (a === 'acknowledge') return <ActionConfirm key={a} label={LABEL[a]} confirmLabel="Snooze" doneLabel="Snoozed" onConfirm={() => alertIds.forEach((id) => acknowledge(id))} />
        const disabled = positionDependentDisabled !== undefined && (a === 'reassign' || a === 'notify_customer')
        return (
          <Button key={a} size="sm" variant={a === 'reassign' ? 'primary' : 'secondary'} disabled={disabled} title={disabled ? positionDependentDisabled : undefined} onClick={() => open(a, driverId)}>
            {LABEL[a]}
          </Button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/lookout/RecommendationCard.tsx`**

```tsx
import { Link } from 'react-router'
import type { DriverCard } from '../alerts/types'
import { fmtAge, fmtClock } from '../lib/format'
import type { DriverView } from '../store/view'
import { useStore } from '../store/store'
import Avatar from '../ui/Avatar'
import Chip from '../ui/Chip'
import Countdown from '../ui/Countdown'
import { BAND_TONE, STALENESS_TONE, severityTone } from '../ui/tones'
import AlertActions from './AlertActions'
import { LOOKOUT } from './voice'

/** One card per driver, every reason on it, 2–3 actions. Same handlers as the route file. */
export default function RecommendationCard({ view, card, pinned = false }: { view: DriverView; card: DriverCard; pinned?: boolean }) {
  const snoozes = useStore((s) => s.snoozes)
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const staleReason = stale ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  const snoozedUntil = card.snoozed ? Math.max(...card.alerts.map((a) => snoozes[a.id] ?? 0)) : undefined
  return (
    <article className={`rounded-card border bg-panel p-3 shadow-card ${pinned ? 'border-lookout/50' : 'border-line'} ${card.snoozed ? 'opacity-60' : ''}`}>
      <header className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${offline ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
        <Avatar initials={view.driver.initials} size="sm" />
        <Link to={`/routes/${view.driver.id}`} className="truncate text-[13px] font-semibold text-ink hover:underline">{view.driver.name}</Link>
        <span className="text-[11px] text-muted">{view.driver.region}</span>
        <Countdown minutes={view.minutesUntilLimit} stale={stale} className="ml-auto" />
      </header>
      <ul className="mt-2 flex flex-col gap-1.5">
        {card.alerts.map((a) => (
          <li key={a.id} className="text-[12px] leading-snug">
            <Chip tone={severityTone(a.severity)} className="mr-1.5 align-middle">{a.label}</Chip>
            <span className="font-semibold text-ink">{a.title}</span> <span className="text-muted">{a.body}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline}>{fmtAge(view.pingAgeMin)}</Chip>
        {view.driver.contactAttemptedAt !== undefined && <span>{LOOKOUT.called(fmtClock(view.driver.contactAttemptedAt))}</span>}
        {snoozedUntil !== undefined && <span>{LOOKOUT.snoozed(fmtClock(snoozedUntil))}</span>}
      </div>
      <div className="mt-2.5">
        <AlertActions driverId={view.driver.id} actions={card.alerts.flatMap((a) => a.actions)} alertIds={card.alerts.map((a) => a.id)} positionDependentDisabled={staleReason} />
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Write `src/lookout/AlertBar.tsx`**

```tsx
import { Link } from 'react-router'
import type { DriverCard } from '../alerts/types'
import type { DriverView } from '../store/view'
import Countdown from '../ui/Countdown'
import { BAND_TONE } from '../ui/tones'

/** The three most pressing alerts, one line each. It is ranked.slice(0, 3); if it ever
 *  needs its own logic, something upstream is wrong. */
export default function AlertBar({ cards, byId }: { cards: DriverCard[]; byId: Map<string, DriverView> }) {
  return (
    <ol className="flex flex-col divide-y divide-line border-b border-line">
      {cards.map((c) => {
        const v = byId.get(c.driverId)!
        const tone = BAND_TONE[c.band]
        const lead = c.alerts[0]
        return (
          <li key={c.driverId}>
            <Link to={`/routes/${c.driverId}`} className="flex items-center gap-2 px-4 py-2 text-[12px] hover:bg-well/60">
              <span className={`h-2 w-2 shrink-0 rounded-full ${v.staleness === 'offline' ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
              <span className="truncate"><span className="font-semibold text-ink">{v.driver.name}</span> <span className="text-muted">· {lead.label.toLowerCase()}</span></span>
              <Countdown minutes={v.minutesUntilLimit} stale={v.staleness !== 'fresh'} className="ml-auto" />
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 5: Replace `src/lookout/LookoutSidebar.tsx`**

```tsx
import { CaretDoubleRight, CaretDoubleLeft } from '@phosphor-icons/react'
import { useDerived } from '../store/hooks'
import EmptyState from '../ui/EmptyState'
import AlertBar from './AlertBar'
import { useLookout } from './LookoutContext'
import RecommendationCard from './RecommendationCard'
import { LOOKOUT } from './voice'

/** Lookout never has its own data. It reads `ranked` and nothing else. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed, focusDriverId } = useLookout()
  const { ranked, byId, metrics } = useDerived()
  const withAlerts = ranked.filter((c) => c.alerts.length > 0)
  const urgent = withAlerts.filter((c) => c.severity === 'critical' || c.severity === 'act_now').length
  const bar = withAlerts.slice(0, 3)
  const pinned = focusDriverId ? withAlerts.find((c) => c.driverId === focusDriverId) : undefined
  const rest = pinned ? withAlerts.filter((c) => c.driverId !== pinned.driverId) : withAlerts

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, collapsed`}>
        <button type="button" onClick={() => setCollapsed(false)} className="flex h-14 w-full items-center justify-center text-lookout-strong hover:bg-well" aria-label={`Open ${LOOKOUT.name}`}>
          <CaretDoubleLeft size={16} />
        </button>
        <span className="mt-2 font-display text-[15px] font-semibold text-lookout-strong">L</span>
        {urgent > 0 && <span className="tnum mt-2 rounded-full bg-act-now px-1.5 text-[11px] font-semibold text-on-accent" title={`${urgent} need action now`}>{urgent}</span>}
      </aside>
    )
  }

  return (
    <aside className="flex w-[26rem] shrink-0 flex-col border-l border-line bg-panel" aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <header className="flex h-14 items-center gap-2 border-b border-line px-4">
        <span className="text-lookout" aria-hidden="true">✦</span>
        <span className="font-display text-[15px] font-semibold text-lookout-strong">{LOOKOUT.name}</span>
        <span className="text-[11px] text-muted">{LOOKOUT.tagline}</span>
        <button type="button" onClick={() => setCollapsed(true)} className="ml-auto rounded-control p-1 text-muted hover:bg-well hover:text-ink" aria-label={`Collapse ${LOOKOUT.name}`}>
          <CaretDoubleRight size={16} />
        </button>
      </header>
      {bar.length > 0 && <AlertBar cards={bar} byId={byId} />}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {pinned && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{LOOKOUT.focusIntro(byId.get(pinned.driverId)!.driver.name)}</p>
            <RecommendationCard view={byId.get(pinned.driverId)!} card={pinned} pinned />
            {rest.length > 0 && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-label">Everyone else</p>}
          </>
        )}
        {rest.map((c) => <RecommendationCard key={c.driverId} view={byId.get(c.driverId)!} card={c} />)}
        {withAlerts.length === 0 && <EmptyState title={LOOKOUT.allClear(metrics.onShift)} body="Lookout re-checks every 5 seconds." />}
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && npm run dev`
Check:
- The alert bar shows Priya, Marcus, Dre, in that order, with live countdowns. Clicking a row navigates to `/routes/drv-02` (a placeholder page for now).
- Cards below list every alerted driver. Marcus's card carries three reasons and three action buttons. Dre's card has "Call driver" and "Snooze 10 min", both two-step; Reassign is absent for him because his rules don't offer it.
- Snoozing Dre dims his card and moves him below Marcus; the "Snoozed until 12:57 PM" line appears. Dev panel +15m clears the snooze.
- Collapsing shows a rail with a red "3".
- Clicking "Reassign stops" on Marcus does nothing visible yet (dialogs arrive in Task 12); it must not throw.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Lookout rail with alert bar, recommendation cards, and inline confirms

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 11: Route file — header, stale banner, alert strip, day metrics, ribbon, duty timeline, receipts

**Files:**
- Create: `src/views/route/RouteFilePage.tsx`, `src/views/route/RouteHeader.tsx`, `src/views/route/StaleBanner.tsx`, `src/views/route/AlertStrip.tsx`, `src/views/route/DayMetrics.tsx`, `src/views/route/RouteRibbon.tsx`, `src/views/route/DutyTimeline.tsx`, `src/views/route/StopReceipt.tsx`
- Modify: `src/App.tsx` (route-file route)

**Interfaces:**
- Consumes: `useDerived`, `useStore.fleet.deliveries`, `useLookout().setFocus`, `useActions().open`, `AlertActions`, compute helpers (`projectedEta`, `knownSegments`), `WINDOW_14H_MIN`, format, tones, primitives.
- Produces: `ribbonAxis(view): { start: number; end: number; pct(t: number): number }` exported from `RouteRibbon.tsx` and shared with `DutyTimeline`, so both draw on one axis.

- [ ] **Step 1: Write `src/views/route/RouteHeader.tsx`**

```tsx
import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL } from '../../bands'
import type { DutyStatus } from '../../data/types'
import { fmtAge, fmtClock, fmtDrift } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Avatar from '../../ui/Avatar'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, STALENESS_TONE } from '../../ui/tones'

const STATUS_LABEL: Record<DutyStatus, string> = { driving: 'driving', on_duty: 'on duty at a stop', on_break: 'on break', off_duty: 'off duty' }

export default function RouteHeader({ view, card }: { view: DriverView; card: DriverCard }) {
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  return (
    <Card className="flex items-center gap-5 px-5 py-4">
      <Avatar initials={view.driver.initials} size="lg" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{view.driver.name}</h2>
          <Chip tone={tone} dashed={offline}>{card.severity === 'critical' ? 'Over limit' : BAND_LABEL[card.band]}</Chip>
          <Chip tone={view.driftMin > 5 ? BAND_TONE.watch : BAND_TONE.clear}>{fmtDrift(view.driftMin)}</Chip>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {view.truck.plate} · {view.driver.region} · on duty since {fmtClock(view.driver.shiftStartedAt)} · {STATUS_LABEL[view.status]}
        </p>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1">
        <Countdown minutes={view.minutesUntilLimit} stale={stale} size="lg" />
        <span className="flex items-center gap-2 text-[11px] text-muted">
          {view.minutesUntilLimit <= 0 ? 'past the 11-hour limit' : 'to the 11-hour limit'}
          <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline} title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</Chip>
        </span>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Write `src/views/route/StaleBanner.tsx` and `src/views/route/AlertStrip.tsx`**

`StaleBanner.tsx`:
```tsx
import { WifiSlash } from '@phosphor-icons/react'
import { fmtAge } from '../../lib/format'
import type { DriverView } from '../../store/view'

/** The system says "we don't know" instead of showing a confident number it can't stand behind. */
export default function StaleBanner({ view }: { view: DriverView }) {
  const offline = view.staleness === 'offline'
  const first = view.driver.name.split(' ')[0]
  return (
    <div role="status" className={`flex items-center gap-3 rounded-card border px-4 py-2.5 text-[12px] ${offline ? 'border-offline bg-offline-soft text-offline' : 'border-watch bg-watch-soft text-watch'}`}>
      <WifiSlash size={16} weight="duotone" />
      <span>
        <strong>Last ping {fmtAge(view.pingAgeMin)}.</strong> Figures are estimates that assume {first} kept doing what the truck last reported
        {view.status === 'driving' ? ', which was driving' : ''}. Position-dependent actions are disabled until it reports in.
      </span>
    </div>
  )
}
```

`AlertStrip.tsx`:
```tsx
import type { DriverCard } from '../../alerts/types'
import { fmtAge } from '../../lib/format'
import AlertActions from '../../lookout/AlertActions'
import type { DriverView } from '../../store/view'
import Chip from '../../ui/Chip'
import { severityTone } from '../../ui/tones'

/** One row per firing rule. Copy and actions come from the rule object, so a rule added
 *  live during the walkthrough renders here with no new UI. */
export default function AlertStrip({ view, card }: { view: DriverView; card: DriverCard }) {
  const reason = view.staleness !== 'fresh' ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  return (
    <ul className="flex flex-col gap-2">
      {card.alerts.map((a) => {
        const tone = severityTone(a.severity)
        return (
          <li key={a.id} className={`flex items-start gap-3 rounded-card border border-line border-l-4 bg-panel px-4 py-3 shadow-card ${tone.border}`}>
            <Chip tone={tone} className="mt-0.5">{a.label}</Chip>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{a.title}</p>
              <p className="text-[12px] text-muted">{a.body}</p>
            </div>
            <AlertActions driverId={view.driver.id} actions={a.actions} alertIds={[a.id]} positionDependentDisabled={reason} />
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 3: Write `src/views/route/DayMetrics.tsx`**

```tsx
import { fmtClock, fmtCountdown, fmtHm } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Card from '../../ui/Card'

export default function DayMetrics({ view }: { view: DriverView }) {
  const stale = view.staleness !== 'fresh'
  const fits = view.remainingDriveMin <= view.minutesUntilLimit
  const items = [
    { label: 'Driving today', value: fmtHm(view.drivingMin), sub: 'of 11:00' },
    { label: 'On duty', value: fmtHm(view.shiftElapsedMin), sub: `since ${fmtClock(view.driver.shiftStartedAt)}` },
    { label: 'Break', value: view.breakMin > 0 ? fmtHm(view.breakMin) : 'none yet', sub: view.breakMin > 0 ? 'taken today' : 'no 30-min break yet', tone: view.breakMin === 0 ? 'text-watch' : undefined },
    { label: 'Stops', value: `${view.done} / ${view.remaining.length}`, sub: 'done · remaining' },
    { label: 'Driving left vs. limit', value: `${fmtHm(view.remainingDriveMin)} vs ${fmtCountdown(view.minutesUntilLimit, stale)}`, sub: fits ? 'fits before the limit' : 'does not fit', tone: fits ? 'text-clear' : 'text-act-now' },
  ]
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map((m) => (
        <Card key={m.label} className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{m.label}</p>
          <p className={`tnum mt-1 font-display text-2xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</p>
          <p className="mt-1 text-[11px] text-muted">{m.sub}</p>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/views/route/RouteRibbon.tsx`**

```tsx
import type { ReactNode } from 'react'
import { projectedEta } from '../../hos/compute'
import { WINDOW_14H_MIN } from '../../hos/constants'
import { fmtClock } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'

/** One time axis for the ribbon and the duty timeline: route start to the latest of window
 *  end, the limit, the 14-hour mark, and now, plus a little air. */
export function ribbonAxis(view: DriverView): { start: number; end: number; pct: (t: number) => number } {
  const start = view.route.plannedStartAt
  const window14 = view.driver.shiftStartedAt + WINDOW_14H_MIN * MIN
  const end = Math.max(view.route.windowEnd, view.limitHitAt, window14, view.now) + 20 * MIN
  return { start, end, pct: (t) => Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100)) }
}

function Label({ at, children, className = '', below = false }: { at: number; children: ReactNode; className?: string; below?: boolean }) {
  return (
    <span className={`tnum absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold ${below ? 'bottom-0' : 'top-0'} ${className}`} style={{ left: `${at}%` }}>
      {children}
    </span>
  )
}

/** Stops as ticks on a time axis, filled through the last completed stop, with the now-line,
 *  the limit mark at limitHitAt, and the window end. If the last pending tick sits past the
 *  limit mark, the span between is hatched, and wont_finish is the rule that fires, on the
 *  same math. */
export default function RouteRibbon({ view }: { view: DriverView }) {
  const { route, now, driftMin, limitHitAt } = view
  const { pct } = ribbonAxis(view)
  const done = route.stops.filter((s) => s.status === 'done' || s.status === 'failed')
  const filledTo = done.length > 0 ? (done[done.length - 1].departedAt ?? route.plannedStartAt) : route.plannedStartAt
  const ticks = route.stops.map((s) => ({
    s,
    t: s.status === 'done' || s.status === 'failed' ? (s.departedAt ?? s.plannedEta) : s.status === 'in_progress' ? (s.arrivedAt ?? now) : projectedEta(s, driftMin),
  }))
  const lastPending = [...ticks].reverse().find((k) => k.s.status === 'pending')
  const overrunTo = lastPending !== undefined && lastPending.t > limitHitAt ? lastPending.t : undefined
  const window14 = view.driver.shiftStartedAt + WINDOW_14H_MIN * MIN
  const stale = view.staleness !== 'fresh'

  return (
    <div>
      <div className="mb-1 flex items-center gap-3 text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-label">Route ribbon</span>
        <span className="text-muted">ticks are stops · filled through the last completed · pending ETAs include today's drift</span>
      </div>
      <div className="relative h-14">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="24" width="1000" height="8" rx="4" className="fill-well" />
          <rect x="0" y="24" width={pct(filledTo) * 10} height="8" rx="4" className="fill-clear-fill" />
          {overrunTo !== undefined && (
            <rect x={pct(limitHitAt) * 10} y="24" width={Math.max(0, (pct(overrunTo) - pct(limitHitAt)) * 10)} height="8" className="fill-act-now-fill" opacity="0.55" />
          )}
          {ticks.map(({ s, t }) => (
            <rect
              key={s.id}
              x={pct(t) * 10 - 1.5}
              y={s.status === 'unassigned' ? 26 : 20}
              width="3"
              height={s.status === 'unassigned' ? 4 : 16}
              className={s.status === 'unassigned' ? 'fill-offline-fill' : s.status === 'pending' ? 'fill-muted' : s.status === 'failed' ? 'fill-act-now' : 'fill-ink'}
            />
          ))}
          <rect x={pct(now) * 10 - 1} y="8" width="2" height="40" className="fill-ink" />
          <rect x={pct(limitHitAt) * 10 - 1} y="8" width="2" height="40" className="fill-act-now" />
          <rect x={pct(route.windowEnd) * 10 - 0.5} y="14" width="1" height="28" className="fill-muted" opacity="0.6" />
          <rect x={pct(window14) * 10 - 0.5} y="14" width="1" height="28" className="fill-muted" opacity="0.35" />
        </svg>
        <Label at={pct(now)} className="text-ink">now {fmtClock(now)}</Label>
        <Label at={pct(limitHitAt)} className="text-act-now" below>{stale ? '~' : ''}limit {fmtClock(limitHitAt)}</Label>
        <Label at={pct(route.windowEnd)} className="text-muted">window {fmtClock(route.windowEnd)}</Label>
        <Label at={pct(window14)} className="text-muted/70" below>14h</Label>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/views/route/DutyTimeline.tsx`**

```tsx
import type { DutyStatus } from '../../data/types'
import { knownSegments } from '../../hos/compute'
import type { DriverView } from '../../store/view'
import { ribbonAxis } from './RouteRibbon'

const FILL: Record<DutyStatus, string> = { driving: 'fill-ink', on_duty: 'fill-muted', on_break: 'fill-break-fill', off_duty: 'fill-offline-fill' }

/** Today's segments as we know them (segmentsKnownAt the last ping), on the ribbon's axis.
 *  A planned reset draws dashed and ahead of the now-line. */
export default function DutyTimeline({ view, className = '' }: { view: DriverView; className?: string }) {
  const { start, end, pct } = ribbonAxis(view)
  const segs = knownSegments(view.driver, view.now)
  return (
    <div className={className}>
      <div className="mb-1 text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-label">Duty timeline</span>{' '}
        <span className="text-muted">driving · on duty · break · planned reset (dashed)</span>
      </div>
      <svg className="h-4 w-full" viewBox="0 0 1000 16" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="4" width="1000" height="8" rx="2" className="fill-well" />
        {segs.map((s, i) => {
          const s0 = Math.max(s.startedAt, start)
          const s1 = Math.min(s.endedAt ?? view.now, end)
          if (s1 <= s0) return null
          return <rect key={i} x={pct(s0) * 10} y="4" width={(pct(s1) - pct(s0)) * 10} height="8" className={FILL[s.status]} opacity={s.planned ? 0.45 : 1} strokeDasharray={s.planned ? '6 4' : undefined} stroke={s.planned ? 'currentColor' : 'none'} strokeWidth={s.planned ? 2 : 0} />
        })}
        <rect x={pct(view.now) * 10 - 1} y="0" width="2" height="16" className="fill-ink" />
      </svg>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/views/route/StopReceipt.tsx`**

```tsx
import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock, fmtMinutes } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'
import Chip from '../../ui/Chip'
import { BAND_TONE } from '../../ui/tones'

/** The receipt of what happened at a stop, or what is planned to. Pending and unassigned
 *  stops carry a checkbox, so a partial reassign is just selecting cards. */
export default function StopReceipt({ stop, delivery, view, selected, onToggle }: { stop: Stop; delivery: Delivery | undefined; view: DriverView; selected: boolean; onToggle: () => void }) {
  const isNext = view.next?.id === stop.id
  const pending = stop.status === 'pending'
  const eta = pending ? projectedEta(stop, view.driftMin) : undefined
  const pastWindow = eta !== undefined && delivery !== undefined && eta > delivery.window.end
  const statusTone = stop.status === 'failed' ? BAND_TONE.act_now : stop.status === 'unassigned' ? BAND_TONE.offline : isNext ? BAND_TONE.break : undefined
  const statusLabel = stop.status === 'failed' ? 'failed' : stop.status === 'unassigned' ? 'needs a driver' : isNext ? 'next' : undefined
  const selectable = pending || stop.status === 'unassigned'
  return (
    <li className={`flex gap-3 rounded-card border bg-panel px-3 py-2.5 ${isNext ? 'border-break shadow-card' : 'border-line'} ${stop.status === 'done' ? 'opacity-80' : ''} ${stop.status === 'unassigned' ? 'border-dashed' : ''}`}>
      {selectable ? (
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select stop ${stop.seq} to reassign`} className="mt-1 accent-ink" />
      ) : (
        <span className="w-[13px] shrink-0" aria-hidden="true" />
      )}
      <span className="tnum w-5 shrink-0 pt-px text-[12px] font-semibold text-muted">{stop.seq}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-semibold text-ink">{delivery?.customer ?? stop.deliveryId}</span>
          {delivery?.priority === 'priority' && <Chip tone={BAND_TONE.watch}>priority</Chip>}
          {statusTone && statusLabel && <Chip tone={statusTone} dashed={stop.status === 'unassigned'}>{statusLabel}</Chip>}
          {stop.notifiedAt !== undefined && <Chip>customer notified {fmtClock(stop.notifiedAt)}</Chip>}
          {pastWindow && <Chip tone={BAND_TONE.act_now}>past window</Chip>}
        </div>
        <p className="truncate text-[12px] text-muted">
          {delivery?.address} · {delivery?.items.join(', ')}
          {delivery?.instructions ? ` · ${delivery.instructions}` : ''}
        </p>
        <p className="tnum mt-0.5 text-[11px] text-muted">
          {(stop.status === 'done' || stop.status === 'failed') && stop.arrivedAt !== undefined && stop.departedAt !== undefined && (
            <>
              arrived {fmtClock(stop.arrivedAt)} · left {fmtClock(stop.departedAt)} · {fmtMinutes((stop.departedAt - stop.arrivedAt) / MIN)} on site
              {stop.signedBy ? ` · signed ${stop.signedBy}` : ''}
              {stop.outcome === 'partial' ? ' · partial delivery' : ''}
              {stop.note ? ` · ${stop.note}` : ''}
            </>
          )}
          {stop.status === 'in_progress' && stop.arrivedAt !== undefined && <>arrived {fmtClock(stop.arrivedAt)} · at the dock</>}
          {(pending || stop.status === 'unassigned') && (
            <>
              planned {fmtClock(stop.plannedEta)}
              {eta !== undefined && eta !== stop.plannedEta ? ` · projected ${fmtClock(eta)}` : ''}
              {delivery ? ` · window until ${fmtClock(delivery.window.end)}` : ''} · {stop.driveMinutesFromPrev} min drive
            </>
          )}
        </p>
      </div>
    </li>
  )
}
```

- [ ] **Step 7: Write `src/views/route/RouteFilePage.tsx` and wire the route**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useActions } from '../../actions/ActionContext'
import { useLookout } from '../../lookout/LookoutContext'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import EmptyState from '../../ui/EmptyState'
import AlertStrip from './AlertStrip'
import DayMetrics from './DayMetrics'
import DutyTimeline from './DutyTimeline'
import RouteHeader from './RouteHeader'
import RouteRibbon from './RouteRibbon'
import StaleBanner from './StaleBanner'
import StopReceipt from './StopReceipt'

/** A file for one driver's day. Lookout stays open and focuses on this driver. */
export default function RouteFilePage() {
  const { driverId = '' } = useParams()
  const d = useDerived()
  const deliveries = useStore((s) => s.fleet.deliveries)
  const deliveryById = useMemo(() => new Map(deliveries.map((x) => [x.id, x])), [deliveries])
  const { setFocus } = useLookout()
  const { open } = useActions()
  const [selected, setSelected] = useState<string[]>([])
  const view = d.byId.get(driverId)
  const card = d.cardById.get(driverId)

  useEffect(() => {
    setFocus(driverId)
    return () => setFocus(null)
  }, [driverId, setFocus])
  useEffect(() => setSelected([]), [driverId])

  if (!view || !card) {
    return (
      <div className="p-6">
        <EmptyState title="No driver with that id is on this shift." action={<Link to="/"><Button size="sm">Back to Active Shift</Button></Link>} />
      </div>
    )
  }

  const stale = view.staleness !== 'fresh'
  const staleReason = stale ? 'Position unknown. This action is disabled until the truck reports in.' : undefined
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const remainingLabel = view.remaining.length === 0 && view.unassigned.length === 0 ? 'Route complete. Heading in.' : undefined

  return (
    <div className="flex flex-col gap-4 p-5">
      <RouteHeader view={view} card={card} />
      {stale && <StaleBanner view={view} />}
      {card.alerts.length > 0 && <AlertStrip view={view} card={card} />}
      <DayMetrics view={view} />
      <Card className="px-4 py-3">
        <RouteRibbon view={view} />
        <DutyTimeline view={view} className="mt-3" />
      </Card>
      <section>
        <header className="mb-2 flex items-center gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-label">Stops</h2>
          <span className="tnum text-[12px] text-muted">{view.done} of {view.total} done{remainingLabel ? ` · ${remainingLabel}` : ''}</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="primary" disabled={selected.length === 0 || stale} title={staleReason} onClick={() => open('reassign', view.driver.id, { stopIds: selected })}>
              Reassign selected{selected.length > 0 ? ` (${selected.length})` : ''}
            </Button>
            <Button size="sm" disabled={view.remaining.length === 0} onClick={() => open('schedule_reset', view.driver.id)}>Schedule reset</Button>
            <Button size="sm" disabled={stale || view.remaining.length === 0} title={staleReason} onClick={() => open('notify_customer', view.driver.id)}>Notify customers</Button>
          </div>
        </header>
        <ol className="flex flex-col gap-2">
          {view.route.stops.map((s) => (
            <StopReceipt key={s.id} stop={s} delivery={deliveryById.get(s.deliveryId)} view={view} selected={selected.includes(s.id)} onToggle={() => toggle(s.id)} />
          ))}
        </ol>
      </section>
    </div>
  )
}
```

In `src/App.tsx`:
```tsx
import RouteFilePage from './views/route/RouteFilePage'
// ...
<Route path="routes/:driverId" element={<RouteFilePage />} />
```

- [ ] **Step 8: Verify in the browser**

Run: `npx tsc --noEmit && npm run dev`, then open `/routes/drv-01` (Marcus):
- Header: big red `0:12`, "Act now" chip, "Behind 15 min" chip. Lookout pins Marcus's card at the top of the rail.
- Alert strip: three rows, each with its own action buttons.
- Day metrics: "Driving left vs. limit" reads `0:34 vs 0:12 · does not fit` in red.
- Ribbon: the last pending tick sits past the red limit mark, with a red hatch between; the now-line is a few minutes past stop 13's projected ETA.
- Receipts: 12 done with times and signatures, stop 13 marked next, 14 and 15 pending with checkboxes. Selecting two enables "Reassign selected (2)".
- `/routes/drv-03` (Dre): the offline banner, a tilde on every figure, Reassign and Notify disabled with a reason on hover, Call driver enabled.
- `/routes/drv-04` (Elena): "on break", no alerts, no alert strip, a blue break block on the duty timeline ending at the now-line.
- `/routes/nope`: the not-found empty state.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: route file page with ribbon, duty timeline, and stop receipts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: The three action dialogs and the result toast

**Files:**
- Create: `src/ui/Modal.tsx`, `src/ui/Toast.tsx`, `src/views/route/actions/ReassignDialog.tsx`, `src/views/route/actions/ResetDialog.tsx`, `src/views/route/actions/NotifyDialog.tsx`
- Modify: `src/actions/ActionDialogs.tsx` (replace the stub), `src/app/Layout.tsx` (mount `Toast`)

**Interfaces:**
- Consumes: `useActions`, `useDerived`, store methods, `reassignCandidates`, `suggestResetStop`, `stopsPastLimit`, `projectedDepartureAt`, `projectedEta`, format, primitives.
- Produces: `<Modal title onClose>…</Modal>` with Esc-to-close; `<Toast />`.

- [ ] **Step 1: Write `src/ui/Modal.tsx`**

```tsx
import { X } from '@phosphor-icons/react'
import { useEffect, type ReactNode } from 'react'

export default function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-full w-full max-w-2xl flex-col rounded-card border border-line bg-panel shadow-card">
        <header className="flex items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="ml-auto rounded-control p-1 text-muted hover:bg-well hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/views/route/actions/ReassignDialog.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useActions } from '../../../actions/ActionContext'
import { CAPACITY_MARGIN_MIN } from '../../../hos/constants'
import { fmtCountdown, fmtHm } from '../../../lib/format'
import { reassignCandidates, stopsPastLimit } from '../../../store/actions'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import type { DriverView } from '../../../store/view'
import Button from '../../../ui/Button'
import Chip from '../../../ui/Chip'
import EmptyState from '../../../ui/EmptyState'
import Modal from '../../../ui/Modal'
import { BAND_TONE } from '../../../ui/tones'

function defaultSelection(from: DriverView, hasWontFinish: boolean): string[] {
  const past = hasWontFinish ? stopsPastLimit(from) : []
  if (past.length > 0) return past
  return from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned').map((s) => s.id)
}

/** Preview → confirm → commit. The candidate filter excludes anyone who would enter act now,
 *  and the preview shows the receiving driver's new figures, so a reassign never just moves
 *  the violation to someone else. */
export default function ReassignDialog({ driverId, initialStopIds, onClose }: { driverId: string; initialStopIds?: string[]; onClose: () => void }) {
  const d = useDerived()
  const { open } = useActions()
  const reassign = useStore((s) => s.reassignStops)
  const from = d.byId.get(driverId)!
  const card = d.cardById.get(driverId)!
  const [stopIds, setStopIds] = useState<string[]>(() => initialStopIds?.length ? initialStopIds : defaultSelection(from, card.alerts.some((a) => a.ruleId === 'wont_finish')))
  const [toId, setToId] = useState<string | null>(null)
  const candidates = useMemo(() => reassignCandidates(d.views, from, stopIds), [d.views, from, stopIds])
  useEffect(() => {
    if (toId !== null && !candidates.some((c) => c.view.driver.id === toId)) setToId(null)
  }, [candidates, toId])
  const to = toId ? d.byId.get(toId) : undefined
  const selectable = from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned')
  const moved = selectable.filter((s) => stopIds.includes(s.id)).reduce((t, s) => t + s.driveMinutesFromPrev, 0)
  const toggle = (id: string) => setStopIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const deliveries = useStore((s) => s.fleet.deliveries)
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId

  return (
    <Modal
      title={`Reassign ${from.driver.name}'s stops`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!to || stopIds.length === 0} onClick={() => { if (to) { reassign(driverId, to.driver.id, stopIds); onClose() } }}>
            Confirm reassign{to ? ` to ${to.driver.name}` : ''}
          </Button>
        </>
      }
    >
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label">Stops to move · {fmtHm(moved)} of driving</h3>
        <ul className="flex flex-col gap-1">
          {selectable.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-2 rounded-control px-2 py-1 text-[13px] hover:bg-well">
                <input type="checkbox" checked={stopIds.includes(s.id)} onChange={() => toggle(s.id)} className="accent-ink" />
                <span className="tnum w-5 text-muted">{s.seq}</span>
                <span className="font-medium">{customer(s.deliveryId)}</span>
                <span className="tnum ml-auto text-[11px] text-muted">{s.driveMinutesFromPrev} min drive</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-5">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label">Who can take them</h3>
        {candidates.length === 0 ? (
          <EmptyState
            title="No one has the capacity for these stops."
            body="Every fresh driver on the road would end up inside the act-now window. Schedule a reset for the stops that fit and let the rest wait for a driver."
            action={<Button size="sm" variant="primary" onClick={() => { onClose(); open('schedule_reset', driverId) }}>Schedule a reset instead</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {candidates.map((c) => (
              <li key={c.view.driver.id}>
                <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${toId === c.view.driver.id ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
                  <input type="radio" name="candidate" checked={toId === c.view.driver.id} onChange={() => setToId(c.view.driver.id)} className="accent-ink" />
                  <span className="font-semibold">{c.view.driver.name}</span>
                  <span className="text-muted">{c.view.driver.region}</span>
                  {c.sameRegion && <Chip tone={BAND_TONE.clear}>same region</Chip>}
                  <span className="tnum ml-auto text-[12px] text-muted">{c.view.remaining.length} stops left · {fmtHm(c.spare)} spare after the move</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-5 grid grid-cols-2 gap-3">
        <Preview title={from.driver.name} before={`${fmtHm(from.remainingDriveMin)} of driving vs ${fmtCountdown(from.minutesUntilLimit, from.staleness !== 'fresh')} left`} after={`${fmtHm(Math.max(0, from.remainingDriveMin - moved))} of driving vs ${fmtCountdown(from.minutesUntilLimit, from.staleness !== 'fresh')} left`} good={from.remainingDriveMin - moved <= from.minutesUntilLimit} />
        {to ? (
          <Preview title={to.driver.name} before={`${fmtHm(to.remainingDriveMin)} of driving vs ${fmtHm(to.minutesUntilLimit)} left`} after={`${fmtHm(to.remainingDriveMin + moved)} of driving vs ${fmtHm(to.minutesUntilLimit)} left`} good={to.minutesUntilLimit - (to.remainingDriveMin + moved) >= CAPACITY_MARGIN_MIN} />
        ) : (
          <div className="rounded-card border border-dashed border-line px-4 py-3 text-[12px] text-muted">Pick a driver to preview their new figures.</div>
        )}
      </section>
    </Modal>
  )
}

function Preview({ title, before, after, good }: { title: string; before: string; after: string; good: boolean }) {
  return (
    <div className="rounded-card border border-line px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-muted">now: {before}</p>
      <p className={`mt-0.5 font-semibold ${good ? 'text-clear' : 'text-act-now'}`}>after: {after}</p>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/views/route/actions/ResetDialog.tsx`**

```tsx
import { useState } from 'react'
import { projectedDepartureAt } from '../../../hos/compute'
import { fmtClock } from '../../../lib/format'
import { suggestResetStop } from '../../../store/actions'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import Button from '../../../ui/Button'
import Chip from '../../../ui/Chip'
import Modal from '../../../ui/Modal'
import { BAND_TONE } from '../../../ui/tones'

/** Pick the stop after which the driver goes off duty for ten hours. Stops after that point
 *  need another driver; the dialog says so in numbers before anything commits. */
export default function ResetDialog({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const d = useDerived()
  const scheduleReset = useStore((s) => s.scheduleReset)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const view = d.byId.get(driverId)!
  const suggested = suggestResetStop(view)
  const [afterId, setAfterId] = useState<string | null>(suggested)
  const idx = afterId === null ? -1 : view.remaining.findIndex((s) => s.id === afterId)
  const orphaned = view.remaining.slice(idx + 1).filter((s) => s.status === 'pending').length
  const resetAt = afterId === null ? view.now : projectedDepartureAt(view.route, afterId, view.now)
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId

  return (
    <Modal
      title={`Schedule ${view.driver.name}'s reset`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { scheduleReset(driverId, afterId); onClose() }}>Confirm reset at {fmtClock(resetAt)}</Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1">
        <li>
          <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${afterId === null ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
            <input type="radio" name="after" checked={afterId === null} onChange={() => setAfterId(null)} className="accent-ink" />
            <span className="font-semibold">Reset now</span>
            <span className="text-muted">every remaining stop needs a driver</span>
          </label>
        </li>
        {view.remaining.map((s) => (
          <li key={s.id}>
            <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${afterId === s.id ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
              <input type="radio" name="after" checked={afterId === s.id} onChange={() => setAfterId(s.id)} className="accent-ink" />
              <span className="tnum w-5 text-muted">{s.seq}</span>
              <span className="font-semibold">after {customer(s.deliveryId)}</span>
              {s.id === suggested && <Chip tone={BAND_TONE.clear}>last stop that fits</Chip>}
              <span className="tnum ml-auto text-[12px] text-muted">departs ~{fmtClock(projectedDepartureAt(view.route, s.id, view.now))}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-muted">
        {view.driver.name.split(' ')[0]} goes off duty at <span className="tnum font-semibold text-ink">{fmtClock(resetAt)}</span> for 10 hours.{' '}
        {orphaned > 0 ? <span className="font-semibold text-watch">{orphaned} stop{orphaned === 1 ? '' : 's'} after that point will need a driver.</span> : 'Every remaining stop is done before then.'}
      </p>
    </Modal>
  )
}
```

- [ ] **Step 4: Write `src/views/route/actions/NotifyDialog.tsx`**

```tsx
import { useState } from 'react'
import { projectedEta } from '../../../hos/compute'
import { fmtClock, fmtMinutes } from '../../../lib/format'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import Button from '../../../ui/Button'
import Modal from '../../../ui/Modal'

/** Pre-filled, editable, confirmed. Stamps the stops so the schedule rule and the receipts know. */
export default function NotifyDialog({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const d = useDerived()
  const notify = useStore((s) => s.notifyCustomer)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const view = d.byId.get(driverId)!
  const affected = (view.lateStops.length > 0 ? view.lateStops : view.remaining.filter((s) => s.status === 'pending'))
  const [ids, setIds] = useState<string[]>(() => affected.filter((s) => s.notifiedAt === undefined).map((s) => s.id))
  const delay = Math.max(5, Math.round(view.driftMin / 5) * 5)
  const firstEta = affected.find((s) => ids.includes(s.id))
  const [message, setMessage] = useState(
    () => `Hi, this is dispatch. Your delivery is running about ${fmtMinutes(delay)} late; the new ETA is around ${fmtClock(firstEta ? projectedEta(firstEta, view.driftMin) : view.now)}. Sorry for the delay.`,
  )
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Modal
      title="Notify customers"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={ids.length === 0} onClick={() => { notify(ids); onClose() }}>Send to {ids.length} customer{ids.length === 1 ? '' : 's'}</Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1">
        {affected.map((s) => (
          <li key={s.id}>
            <label className="flex items-center gap-2 rounded-control px-2 py-1 text-[13px] hover:bg-well">
              <input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} className="accent-ink" />
              <span className="tnum w-5 text-muted">{s.seq}</span>
              <span className="font-medium">{customer(s.deliveryId)}</span>
              <span className="tnum ml-auto text-[11px] text-muted">{s.notifiedAt !== undefined ? `notified ${fmtClock(s.notifiedAt)}` : `projected ${fmtClock(projectedEta(s, view.driftMin))}`}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-label">
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="mt-1 w-full rounded-control border border-line bg-panel px-3 py-2 text-[13px] font-normal normal-case tracking-normal text-ink outline-none focus:border-ink/50" />
      </label>
    </Modal>
  )
}
```

- [ ] **Step 5: Wire `ActionDialogs` and write `src/ui/Toast.tsx`**

Replace `src/actions/ActionDialogs.tsx`:
```tsx
import NotifyDialog from '../views/route/actions/NotifyDialog'
import ReassignDialog from '../views/route/actions/ReassignDialog'
import ResetDialog from '../views/route/actions/ResetDialog'
import { useActions } from './ActionContext'

export default function ActionDialogs() {
  const { request, close } = useActions()
  if (!request) return null
  if (request.action === 'reassign') return <ReassignDialog key={request.driverId} driverId={request.driverId} initialStopIds={request.stopIds} onClose={close} />
  if (request.action === 'schedule_reset') return <ResetDialog key={request.driverId} driverId={request.driverId} onClose={close} />
  return <NotifyDialog key={request.driverId} driverId={request.driverId} onClose={close} />
}
```

`src/ui/Toast.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import Button from './Button'

const LINGER_MS = 10_000

/** The result of the last action, with a ten-second undo. Everything is local, so the commit
 *  is instant; this is what makes it read as consequential. */
export default function Toast() {
  const last = useStore((s) => s.lastAction)
  const canUndo = useStore((s) => s.undoSnapshot !== undefined)
  const undo = useStore((s) => s.undo)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!last) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), LINGER_MS)
    return () => clearTimeout(id)
  }, [last])
  if (!last || !visible) return null
  return (
    <div role="status" className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-card border border-line bg-ink px-4 py-2.5 text-[13px] text-on-accent shadow-card">
      <span className="font-semibold">{last.label}</span>
      {last.undoable && canUndo && (
        <Button size="sm" variant="ghost" className="text-on-accent hover:bg-on-accent/10 hover:text-on-accent" onClick={() => { undo(); setVisible(false) }}>Undo</Button>
      )}
    </div>
  )
}
```

Mount it in `src/app/Layout.tsx` next to `<ActionDialogs />`:
```tsx
import Toast from '../ui/Toast'
// ...
<ActionDialogs />
<Toast />
<DevPanel />
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && npm run dev`, on `/routes/drv-01`:
- "Reassign stops" on the won't-finish row opens the dialog with stops 14 and 15 pre-selected (the ones past the limit), Ana L. among the same-region drivers at the top, Ravi absent. Selecting Ana shows Marcus "after: 0:10 vs 0:12" in green and Ana still green. Confirm → toast "Marcus R.'s stops reassigned to Ana L." with Undo; Marcus's won't-finish row disappears within a tick; his approaching row remains; Ana's card gains two stops. Undo restores everything.
- "Schedule reset" pre-selects stop 13 as "last stop that fits" and says two stops will need a driver. Confirm → the receipts show 14 and 15 as "needs a driver", the duty timeline shows a dashed block after stop 13, the rail shows an info card "2 stops on Marcus's route need a driver" with a Reassign button, and the metrics row shows "Need a driver 2".
- "Notify customers" pre-fills a message with the projected ETA; confirm stamps the receipts and the behind-schedule row's body changes to "Customers have been notified."
- On `/routes/drv-02` (Priya, over): Reassign opens with both stops selected and Ravi correctly missing from candidates; the empty-candidate path appears only if you scrub the clock until nobody has capacity, and its button opens the reset dialog.
- Esc closes any dialog; clicking the scrim closes it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: reassign, reset, and notify dialogs with preview, confirm, and undo toast

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Edge-path pass — recovery correction, snooze expiry, copy, empty states

**Files:**
- Modify: `src/views/route/RouteHeader.tsx`, `src/views/shift/RouteCard.tsx`, `src/lookout/RecommendationCard.tsx`, `src/lookout/LookoutSidebar.tsx`, `src/alerts/rules.ts`
- Test: `src/alerts/rules.test.ts` (extend)

**Interfaces:**
- Consumes: `useStore.corrections`.
- Produces: `<CorrectionChip driverId />` in `src/ui/CorrectionChip.tsx`.

- [ ] **Step 1: Write `src/ui/CorrectionChip.tsx` and place it**

```tsx
import { fmtHm } from '../lib/format'
import { useStore } from '../store/store'
import Chip from './Chip'
import { LOOKOUT_TONE } from './tones'

const SHOW_MS = 30_000

/** When a ping comes back the estimate may jump. Show the correction briefly rather than
 *  silently replacing it. Cheap, and it is the honest thing. */
export default function CorrectionChip({ driverId }: { driverId: string }) {
  const c = useStore((s) => s.corrections[driverId])
  if (!c || Date.now() - c.at > SHOW_MS) return null
  return (
    <Chip tone={LOOKOUT_TONE} title="The truck reported in; the estimate was replaced by what actually happened">
      updated · was ~{fmtHm(c.was)}, now {fmtHm(c.now)}
    </Chip>
  )
}
```

Place it: in `RouteHeader.tsx` after the drift chip; in `RouteCard.tsx` inside the badge row (render the row when a correction exists too: change the condition to `card.alerts.length > 0 || pick || hasCorrection`, reading `hasCorrection` with `useStore((s) => Boolean(s.corrections[view.driver.id]))`); in `RecommendationCard.tsx` in the footer line.

- [ ] **Step 2: Extend the rules test with the edge paths that are copy-driven**

Add the three imports below to the top of `src/alerts/rules.test.ts`, then append the `describe` block:
```ts
import { MIN } from '../time/clock'
import { bringOnline, notifyCustomer, scheduleReset } from '../store/actions'
import { remainingStops } from '../hos/compute'

describe('edge paths change the copy, not just the numbers', () => {
  const fleet = makeFleet(anchor)
  it('after a reset, the unassigned rule fires and the approaching rule reads the shorter route', () => {
    const marcusStops = remainingStops(fleet.routes.find((r) => r.driverId === 'drv-01')!).map((s) => s.id)
    const next = scheduleReset(fleet, 'drv-01', marcusStops[0], anchor)
    const ids = evaluateRules(buildViews(next, anchor)).filter((a) => a.driverId === 'drv-01').map((a) => a.ruleId).sort()
    expect(ids).toEqual(['behind_schedule', 'limit_act_now', 'stops_unassigned'])
  })
  it('after notifying, the schedule rule says so', () => {
    const tomasStops = remainingStops(fleet.routes.find((r) => r.driverId === 'drv-07')!).map((s) => s.id)
    const next = notifyCustomer(fleet, tomasStops, anchor)
    const a = evaluateRules(buildViews(next, anchor)).find((x) => x.id === 'behind_schedule:drv-07')!
    expect(a.body).toBe('Customers have been notified.')
  })
  it('when Dre reconnects the offline rule clears and nothing else fires', () => {
    const next = bringOnline(fleet, 'drv-03', anchor)
    expect(evaluateRules(buildViews(next, anchor)).filter((a) => a.driverId === 'drv-03')).toEqual([])
  })
  it('an hour later Marcus is over, and over-limit is the only limit rule on him', () => {
    const ids = evaluateRules(buildViews(fleet, anchor + 60 * MIN)).filter((a) => a.driverId === 'drv-01').map((a) => a.ruleId).sort()
    expect(ids).toEqual(['behind_schedule', 'over_limit'])
  })
})
```

Run: `npx vitest run src/alerts/rules.test.ts`
Expected: PASS. If `limit_act_now` also fires for Marcus an hour later, its `when` is missing `v.minutesUntilLimit > 0`.

- [ ] **Step 3: Walk every edge path in the browser and fix what's off**

Using the dev panel and the planted drivers, confirm each row of `docs/ARCHITECTURE.md` §10:

| Check | Where | Pass when |
|---|---|---|
| Stale | Nadia's card and route file | Tilde on the countdown, "8 min ago" chip in amber, band unchanged (Watch) |
| Offline | Dre | Hollow marker on card, rail, and header; banner on the route file; Reassign/Notify disabled with reason |
| Recovery | Dev panel → Bring Dre online | Correction chip appears on card, rail, and header; Dre's card drops out of Act now within a tick |
| Behind schedule | Tomas | "Behind 35 min" chip, ribbon gap between fill and now-line, watch row with Notify |
| Won't finish | Marcus | Red hatch on the ribbon, act-now row, reassign pre-selects stops past the limit |
| Over the limit | Priya | Critical row "needs to stop now", Reassign + Call driver, no Schedule reset |
| On break | Elena | Countdown holds still across ticks, blue block on the duty timeline, no alert |
| Failed stop | Any generated driver with a failed receipt (search "failed" is not a filter; scan a Central column card with a red tick on its ribbon) | Receipt shows "failed" and the note; the remaining stops shift |
| No candidate | Scrub +2h, open Reassign on anyone still on the road | Empty-state with "Schedule a reset instead" |
| Two alerts, one driver | Marcus | One card in the rail with three reasons, three badges on the board card |
| Acknowledge | Dre → Snooze | Dimmed, "Snoozed until", still in Act now; +15m restores emphasis |
| Reset mid-route | Marcus → Schedule reset | Unassigned receipts, info card, "Need a driver" metric |
| All stops done | Dev panel → Advance Marcus a stop ×3 | "Route complete. Heading in." and no limit rules once he is off the road |
| Empty filter | Search "zzz" | The filtered empty state with Clear filters |
| Undo | Any action | Toast with Undo for 10s; the dev panel's Undo always works |

Fix anything that fails in the component that owns it. Keep fixes to the file responsible; do not add logic to views that belongs in `compute.ts` or `rules.ts`.

- [ ] **Step 4: Copy pass**

Read every string in `rules.ts`, `voice.ts`, the dialogs, and the empty states aloud. Each must read like a competent colleague talking to Lena. No "Error", no "Invalid", no "N/A", no system-log tone. Every figure that comes from stale data carries a tilde. Fix inline.

- [ ] **Step 5: Run everything and commit**

Run: `npm test && npm run lint && npm run build`
Expected: green.

```bash
git add -A
git commit -m "feat: recovery corrections, edge-path copy, and empty states

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: README, contrast check, decisions, deploy

**Files:**
- Create: `README.md`, `scripts/contrast.mjs`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Write `scripts/contrast.mjs` and run it**

```js
// Validates the text tokens against the grounds they sit on. Run once at theme setup and
// whenever a token moves; paste the table into docs/DECISIONS.md.
const tokens = {
  panel: '#ffffff', canvas: '#f4f3f0', well: '#ebe9e4',
  ink: '#1c1a17', muted: '#6b665e', label: '#7a746a',
  'lookout-strong': '#a83a15', lookout: '#cf4620',
  'act-now': '#b3323f', watch: '#8f5f0e', clear: '#2f7d5a', offline: '#6b7280', break: '#3b6fb6',
  'act-now-soft': '#fbeaec', 'watch-soft': '#fbf3e3', 'clear-soft': '#e8f4ee', 'offline-soft': '#eef0f3', 'break-soft': '#e9f0fa', 'lookout-soft': '#ffe9e2',
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2) }
const pairs = [
  ['ink', 'panel'], ['muted', 'panel'], ['label', 'panel'], ['muted', 'canvas'], ['muted', 'well'],
  ['lookout-strong', 'panel'], ['lookout', 'panel'], ['lookout-strong', 'lookout-soft'],
  ['act-now', 'panel'], ['act-now', 'act-now-soft'], ['watch', 'panel'], ['watch', 'watch-soft'],
  ['clear', 'panel'], ['clear', 'clear-soft'], ['offline', 'panel'], ['offline', 'offline-soft'], ['break', 'panel'], ['break', 'break-soft'],
]
console.log('| text | ground | ratio | AA |\n|---|---|---|---|')
for (const [t, g] of pairs) { const r = ratio(tokens[t], tokens[g]); console.log(`| ${t} | ${g} | ${r} | ${r >= 4.5 ? 'pass' : 'FAIL'} |`) }
```

Run: `node scripts/contrast.mjs`
Expected: every row passes. If a soft-ground pair fails, darken that band's text token in `src/index.css` and `scripts/contrast.mjs` together and re-run; do not lighten a fill to fix a text pair.

- [ ] **Step 2: Write `README.md`**

````markdown
# Active Shift — a dispatcher's dashboard

A fleet dispatcher runs ~50 heavy-duty trucks and 1,000+ deliveries a day. Her job is not monitoring; it is intervening in time. This is the view she lives in, built around one exception: the 11-hour Hours of Service driving limit.

**Live:** <deployed URL> · **Source:** this repo

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # derivation tests: HOS math, rules, ranking, bands, seed, actions
npm run build
```

Node 20+. No backend, no keys. The shift is simulated: the clock is pinned to 12:47 PM so the demo is the same at any hour, and it ticks in real time. Press `⌘.` for the dev panel (scrub the clock, bring a truck back online, undo).

## What to look at

1. **The board.** Columns are regions; rows are urgency. Only what needs attention carries color.
2. **Marcus R.** Twelve minutes of drive time, three stops that need thirty-four. The route ribbon shows the last stop past the limit mark. Reassign from the card: the picker only offers drivers who won't become the next problem, and previews both drivers' new figures before you confirm.
3. **Dre W.** Dark for 25 minutes with ~40 minutes left. Every figure carries a tilde and an age; position-dependent actions are disabled. Bring him online from the dev panel and watch the estimate correct itself, out loud.
4. **Lookout**, the rail on the right, reads the same ranked list the board does. If they ever disagree, that is the bug.
5. **`src/alerts/rules.ts`.** Every alert is one object. Adding a rule is appending one.

## How it is built

`docs/ARCHITECTURE.md` is the source of truth. In one line: a deterministic seeded fleet plus one clock → pure derivation (`hos/compute.ts`, `alerts/rules.ts`, `alerts/rank.ts`, `bands.ts`) → one ranked array → every surface. Actions are pure transforms with a confirm step and one-level undo.

## Scope, honestly

The brief suggests 2–3 hours. This took roughly <hours> hours of directing and reviewing, counting the design conversation, and it produced more than the brief asks for: the board, the route file with receipts and a schedule ribbon, and the Lookout rail. The core was scoped with discipline; the extras are labeled as extras in `docs/DECISIONS.md`. Not built: the driver's phone view, the map, chat, routing, auth, dark mode, mobile layouts.

## The live change

Add the 30-minute-break rule by appending one object to `RULES` in `src/alerts/rules.ts`:

```ts
{
  id: 'break_due',
  label: 'Break due',
  severity: 'watch',
  when: (v) => v.drivingSinceBreakMin >= 480 && v.status === 'driving',
  message: (v) => ({ title: `${v.driver.name} needs a 30-minute break.`, body: `${fmtMinutes(v.drivingSinceBreakMin)} of driving since the last one.` }),
  actions: ['schedule_reset'],
},
```

Sam K. trips it.
````

Fill in the deployed URL after Step 4, and replace `<hours>` with the real elapsed time from the first design commit to the deploy commit, rounded to the half hour. The number is whatever it is; the README's job is to be honest about it.

- [ ] **Step 3: Append to `docs/DECISIONS.md`**

Add rows for: the contrast table result (one line: "All 18 text/ground pairs pass AA; see scripts/contrast.mjs"), "Lookout reads derived state directly instead of a per-page portal" (simpler to read live), "TICK_MS = 5000 with minute-precision countdowns" (no false precision), and anything cut or changed during Tasks 8–13.

- [ ] **Step 4: Deploy**

Two options; either is fine:

1. Push the repo to GitHub, import it in Vercel with framework preset **Vite**, build command `npm run build`, output `dist`. `vercel.json` already rewrites deep links.
2. `npx vercel --prod` from the repo root, accept the detected Vite settings.

Verify on the deployed URL: the board loads at 12:47 PM, `/routes/drv-01` deep-links straight to Marcus, the dev panel opens with `⌘.`, and the console is clean. Paste the URL into `README.md`.

- [ ] **Step 5: Final verification and commit**

Run: `npm test && npm run lint && npm run build`
Expected: green.

```bash
git add -A
git commit -m "docs: README, contrast check, decisions, deploy notes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

Rehearse the live change once against the deployed dev server: add `break_due`, watch Sam K. gain a badge, delete it, add it again. Under two minutes, narrating.

---

## Plan self-review

**Spec coverage.** §1 principles → enforced by Tasks 5, 6, 10. §2 stack → Task 1. §3 layout → file map (one recorded deviation: no portal). §4 data model and seed → Tasks 2, 4 (all ten planted drivers, plus Nadia). §5 time → Tasks 2, 6, 8 (dev panel). §6 derivation → Tasks 3, 5. §7 store and actions → Task 6, dialogs in Task 12. §8 shell and routes → Task 8. §9 views → Tasks 9, 10, 11; phone and map are Phase 2 and out of this plan. §10 edge paths → Task 13's table. §11 visual system → Task 1 tokens, Task 7 tones, Task 14 contrast. §12 tests → Tasks 1–7, 13. §13 phasing → this plan is Phase 1. §14 live change → Task 14's README snippet.

**Type consistency.** `DriverView` fields used by rules (`minutesUntilLimit`, `remaining`, `remainingDriveMin`, `driftMin`, `unnotifiedLateStops`, `unassigned`, `staleness`, `pingAgeMin`, `status`, `projectedFinishAt`, `limitHitAt`, `drivingSinceBreakMin`) are all defined in Task 5 Step 1. `DriverCard.band` is set in `rankDrivers`. `useActions().open(action, driverId, { stopIds })` matches its callers in Tasks 10, 11, 12. `AlertActions` props (`driverId`, `actions`, `alertIds`, `positionDependentDisabled`) match Tasks 10 and 11. `ribbonAxis` is exported from `RouteRibbon.tsx` and consumed by `DutyTimeline.tsx`. `scheduleReset(afterStopId: string | null)` is the same in actions, store, and the dialog.

**Known judgment calls an executor may hit.** (1) Tailwind v4 may not emit `fill-*` utilities for custom colors in some versions; if `.fill-well` is missing from the built CSS, replace SVG `className` fills with `style={{ fill: 'var(--color-well)' }}`. (2) `scheduleDrift` for a driver whose next stop is `in_progress` reads the arrival slip; that is intended. (3) The seed's generated (non-planted) drivers may include one or two in Watch naturally; the tests assert planted figures only.
