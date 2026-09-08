# Active Shift — a dispatcher's dashboard

A fleet dispatcher runs ~50 heavy-duty trucks and 1,000+ deliveries a day. Her job is not monitoring; it is intervening in time. This is the view she lives in, built around one exception: the 11-hour Hours of Service driving limit.

**Live:** https://dispatch.kidastro.com · also at https://dispatcher-dashboard.vercel.app · **Source:** this repo

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # derivation tests: HOS math, rules, ranking, bands, seed, actions
npm run build
```

Node 20+. No backend, no keys. The shift is simulated: the clock is pinned to 2:47 PM so the demo is the same at any hour, and it ticks in real time. Click the clock in the product bar to scrub the whole day, play it against the real clock, or reset the shift.

## What to look at

1. **The board.** Columns are status, Act now on the left; rows are urgency. Only what needs attention carries color. Region columns are one click away, and a third lens, Metrics, charts the same filtered fleet: status mix, hours driven, who hits the limit when, closest to the limit, deliveries by region, time since a break, data freshness.
2. **Marcus R.** Twelve minutes of drive time, three stops that need thirty-four. On his route file the 11-hour limit is marked on the stop timeline with two stops in red below it. Reassign from the card: the picker only offers drivers who won't become the next problem, and previews both drivers' new figures before you confirm.
3. **Dre W.** Dark for 25 minutes with ~40 minutes left. Every figure carries a tilde and an age; position-dependent actions are disabled. Bring him online from the simulated-shift panel and watch the estimate correct itself, out loud.
4. **Lookout**, the rail on the right, reads the same ranked list the board does. If they ever disagree, that is the bug. Open a route and it turns into a plan for that driver: which stops to hand to whom and with how much room, where to put the reset, which customers to call, each button opening its dialog already filled in. Ask it "What should I do about Marcus?" and it answers with the same plans.
5. **Map.** The Map tab shows the whole fleet: quiet trucks as small dots in their band color, the ones that need attention with a name-and-countdown pill, dark trucks hollow at their last known fix. Pick one and its whole route draws, completed stops included, with Lookout focused on that driver. On any route file, the List | Map toggle beside the stop actions puts that route on a map, stops in the rail's own colors, the truck a live fix gliding along its leg with the clock. Every position is derived from the receipts and the last ping, never stored (`src/geo/truckPosition.ts`).
6. **`src/alerts/rules.ts`.** Every alert is one object. Adding a rule is appending one.

## How it is built

`docs/ARCHITECTURE.md` is the source of truth. In one line: a deterministic seeded fleet plus one clock → pure derivation (`hos/compute.ts`, `alerts/rules.ts`, `alerts/rank.ts`, `bands.ts`) → one ranked array → every surface. Actions are pure transforms with a confirm step and one-level undo.

The visual system is documented separately in [`docs/VISUAL_LANGUAGE.md`](docs/VISUAL_LANGUAGE.md): warm operations, strict semantic status color, and a restrained orange-to-periwinkle signature for Lookout and AI entry points.

## Scope

Phase 1 is the board, the route file with receipts and a schedule ribbon, and the Lookout rail. The core was scoped with discipline; the extras are labeled as extras in `docs/DECISIONS.md`. Not built yet: the driver's phone view, routing, auth, dark mode, mobile layouts. Chat is three matched intents, not a model.

## Adding a rule

The next rule up is the 30-minute break. It is one object appended to `RULES` in `src/alerts/rules.ts`:

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
