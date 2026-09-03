# CLAUDE.md — Dispatcher's Dashboard

Read `docs/ARCHITECTURE.md` before substantial work; it is the source of truth for how this is built. `docs/BRIEF.md` (what and why), `docs/LAYOUT.md` (surfaces), and `docs/FLOWS.md` (flows) are context; where they differ from ARCHITECTURE, ARCHITECTURE wins. This file is the short operating contract.

## What we're building

The primary **"Active Shift" dashboard** for a fleet dispatcher (Lena) managing ~50 heavy-duty trucks and 1,000+ deliveries a day, with **one exception flow: Hours of Service (HOS)** — drivers have a legal 11-hour driving limit and must take a mandatory reset. Surface who's approaching it, and the drill-in from that alert.

Three-pane shell: **left nav** · **main view** (metrics row + region-column board, and the route file page) · **Lookout**, the co-pilot rail (alert bar + recommendation cards). The simulated shift is anchored at 2:47 PM and ticks live.

## Hard constraints (from the brief)

- Real, running front-end code in the browser. Not a mockup.
- Driven by a **real data model** (drivers / trucks / routes / deliveries with attributes).
- **Time-until-reset is computed from the data against a live clock. Never hardcoded.**
- Working interactions. Deployed link + source repo.
- A small live change (a new alert type or filter) will be made during the panel.

## Architecture rules

1. **Alerts are data.** `src/alerts/rules.ts` is an array of `{ id, label, severity, when, message, actions }`. One object per rule. Fixed severity; two severities means two objects.
2. **Filters and groupings are data too.** `src/filters.ts`, `src/groupBy.ts`. One object each.
3. **Derived state is pure.** `src/hos/compute.ts`, `src/alerts/rank.ts`, `src/bands.ts` have no React and are unit-tested. HOS math reads `segmentsKnownAt(driver, lastPingAt)` — always.
4. **One clock.** `useNow()` ticks every 5s off the simulated anchor plus a scrub offset. Nothing else reads `Date.now()`.
5. **Deterministic seed.** mulberry32, fixed seed, planted drivers overwrite generated ones. Same fleet every load.
6. **Stale data is a state.** Staleness tiers are derived and visible; projections on stale data carry a tilde and an age; offline drivers stop pinging, everyone else pings with the clock.
7. **Actions confirm before they commit.** Preview → confirm → commit → recompute → result → undo. One implementation in `src/store/actions.ts`, called by the rail and the route file alike.
8. **Lookout reads `ranked` and nothing else.** The alert bar is `ranked.slice(0, 3)`. If a card and a board tile ever disagree, that's the bug to find first.
9. **Color is attention.** Only things needing attention carry saturated color. Lookout wears coral and nothing else does. Components use tokens, never raw hex.

## Stack

Vite + React 19 + TypeScript + Tailwind v4. Zustand for the store. react-router. Phosphor icons (duotone). Bricolage Grotesque + Inter via fontsource. Vitest. No backend. Deploy to Vercel. Leaflet only in Phase 2, lazy-loaded, never required.

## Build order

**Phase 1 — submittable.** Shell · seed + clock + compute · rules + rank + bands · store + actions · Active Shift (metrics, board, cards, filters) · Lookout rail · route file (header, alert strip, metrics, ribbon, duty timeline, receipts) · action dialogs · staleness + copy + empty states · deploy + README + DECISIONS.

**Phase 2 — only after Phase 1 is deployed.** Driver phone view · map · chat intents · scrubber polish · illustration.

Ship a thin vertical slice first (seed → compute → one rule → one card → route file header → one action), then widen.

## Working style

- Prefer boring, obvious code. It will be read by senior engineers and edited live on a shared screen.
- When a decision is a judgment call, leave a one-line comment saying why.
- Log meaningful choices and cuts in `docs/DECISIONS.md` — one line each.
- Tests live beside the module (`*.test.ts`) and cover derivation, not UI.
- **Anything not meant to be viewable in the submitted repo goes in `private/`.** It is gitignored. Nothing in there is part of the build, and nothing committed may reference it.

## Not for this repo

Toast's logo, name as a product, exact brand palette, or product names. Rhyme with good patterns; don't copy an identity. Lookout is this product's own feature.
