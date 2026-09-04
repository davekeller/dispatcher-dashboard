# CLAUDE.md — Dispatcher's Dashboard

Read `docs/ARCHITECTURE.md` before substantial work; it is the source of truth for how this is built. `docs/BRIEF.md` (what and why), `docs/LAYOUT.md` (surfaces), and `docs/FLOWS.md` (flows) are context; where they differ from ARCHITECTURE, ARCHITECTURE wins. This file is the short operating contract.

## What we're building

The primary **"Active Shift" dashboard** for a fleet dispatcher (Lena) managing ~50 heavy-duty trucks and 1,000+ deliveries a day, with **one exception flow: Hours of Service (HOS)** — drivers have a legal 11-hour driving limit and must take a mandatory reset. Surface who's approaching it, and the drill-in from that alert.

Two-pane shell: a product bar ("Dispatch") over the **main view** (shift directive hero + collapsible status-column route board, and the route file page) · **Lookout**, the co-pilot rail (recommendations + chat + shift timeline). The simulated shift is anchored at 2:47 PM and ticks live.

## Hard constraints

- Real, running front-end code in the browser. Not a mockup.
- Driven by a **real data model** (drivers / trucks / routes / deliveries with attributes).
- **Time-until-reset is computed from the data against a live clock. Never hardcoded.**
- Working interactions, deployed.
- A new alert type or filter is a one-object change, small enough to add live in a demo.

## Architecture rules

1. **Alerts are data.** `src/alerts/rules.ts` is an array of `{ id, label, severity, when, message, actions }`. One object per rule. Fixed severity; two severities means two objects.
2. **Filters and groupings are data too.** `src/filters.ts`, `src/groupBy.ts`. One object each.
3. **Derived state is pure.** `src/hos/compute.ts`, `src/alerts/rank.ts`, `src/bands.ts` have no React and are unit-tested. HOS math reads `segmentsKnownAt(driver, lastPingAt)` — always.
4. **One clock.** `useNow()` ticks every 5s off the simulated anchor plus a scrub offset. Nothing else reads `Date.now()`.
5. **Deterministic seed.** mulberry32, fixed seed, planted drivers overwrite generated ones. Same fleet every load.
6. **Stale data is a state.** Staleness tiers are derived and visible; projections on stale data carry a tilde and an age; offline drivers stop pinging, everyone else pings with the clock.
7. **Actions confirm before they commit.** Preview → confirm → commit → recompute → result → undo. One implementation in `src/store/actions.ts`, called by the rail and the route file alike.
8. **Lookout reads `ranked` and nothing else.** The alert bar is `ranked.slice(0, 3)`. If a card and a board tile ever disagree, that's the bug to find first.
9. **Color is attention.** Only things needing attention carry saturated color. Lookout owns the accessible orange and the subtle peach-to-periwinkle AI spectrum. Components use tokens, never raw hex.

## Stack

Vite + React 19 + TypeScript + Tailwind v4. Zustand for the store. react-router. Phosphor icons (duotone). Bricolage Grotesque + Inter via fontsource. Vitest. No backend. Deploy to Vercel. Leaflet only in Phase 2, lazy-loaded, never required.

## Build order

**Phase 1 — shippable.** Shell · seed + clock + compute · rules + rank + bands · store + actions · Active Shift (metrics, board, cards, filters) · Lookout rail · route file (header, alert strip, metrics, ribbon, duty timeline, receipts) · action dialogs · staleness + copy + empty states · deploy + README + DECISIONS.

**Phase 2 — only after Phase 1 is deployed.** Driver phone view · map · chat intents · scrubber polish · illustration.

Ship a thin vertical slice first (seed → compute → one rule → one card → route file header → one action), then widen.

## Working style

- Prefer boring, obvious code. It will be read by senior engineers and edited live on a shared screen.
- When a decision is a judgment call, leave a one-line comment saying why.
- Log meaningful choices and cuts in `docs/DECISIONS.md` — one line each.
- Tests live beside the module (`*.test.ts`) and cover derivation, not UI.
- **Anything not meant to be public goes in `private/`.** It is gitignored. Nothing in there is part of the build, and nothing committed may reference it.

## Not for this repo

Any third party's logo, product names, or exact brand palette. Rhyme with good patterns; don't copy an identity. Lookout is this product's own feature.

## Working in parallel (Claude, Codex, or anyone)

More than one model works on this app at once. The rules that keep that clean, in the order they come up:

1. **One integration branch at a time.** Right now it is `phase-1`. `main` is the release branch and only moves by merging the integration branch. A pass never targets `main`.
2. **Your own worktree, your own branch.** Never edit in a checkout that another agent has open. From the repo root:
   ```bash
   git worktree add ../dispatcher-dashboard-<you> -b <area>/<topic> phase-1
   cd ../dispatcher-dashboard-<you> && npm install && npm run dev -- --port <your port>
   ```
   Name the branch by the area it owns: `design/board`, `ui/simulated-shift`, `docs/multi-agent`. One area per branch.
3. **Say what you own.** In the PR description, list the files or folders the pass owns. Shared files are additive: `src/index.css` gains tokens, it does not get restyled; `docs/DECISIONS.md` gets one appended line per choice; `docs/ARCHITECTURE.md` gets the paragraph that changed, not a rewrite; `CLAUDE.md` gets a section, not an edit of someone else's.
4. **Commit small, push often, open the PR early.** Target `phase-1`. The PR body says what the change does for Lena, not which files it touched. A dirty worktree is a thought in progress; a commit is a finished one, and only commits get folded.
5. **The gates, before anyone merges:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `node scripts/contrast.mjs` whenever a token moved. Green on your branch after rebasing onto the current `phase-1`, not green last week.
6. **Rebase your branch, never the integration branch.** If `phase-1` moved, `git rebase phase-1` on your branch and resolve conflicts there, where you know the intent of both sides. If the conflict is in a file the other pass rewrote, hand it back to them with a note on what you were doing; two designers' intentions should not be guessed by one merge.
7. **One folder folds.** The session that owns `phase-1` (Claude, unless Dave says otherwise) merges with `--no-ff`, re-runs the gates on the merged result, and pushes. Others hand off through the PR. Nothing is force-pushed, ever.
8. **After the merge:** delete the branch, `git worktree remove ../dispatcher-dashboard-<you>`, and move on. Stale worktrees cost the next agent a context-read to learn they are stale.
9. **The invariants hold across every pass** (the Architecture rules above): tokens only, no raw hex in a `.tsx`; one ranked array feeds every surface; no logic moves into views; rules, filters, and groupings stay data; the planted scenarios keep their figures, because the tests assert them.
