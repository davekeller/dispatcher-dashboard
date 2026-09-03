# Active Shift — a dispatcher's dashboard

A fleet dispatcher runs ~50 heavy-duty trucks and 1,000+ deliveries a day. Her job is not monitoring; it is intervening in time. This is the view she lives in, built around one exception: the 11-hour Hours of Service driving limit.

**Live:** _the Vercel link goes here after `npx vercel --prod`_ · **Source:** this repo

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # derivation tests: HOS math, rules, ranking, bands, seed, actions
npm run build
```

Node 20+. No backend, no keys. The shift is simulated: the clock is pinned to 2:47 PM so the demo is the same at any hour, and it ticks in real time. Press `⌘.` (or the wrench in the header) for the dev panel: scrub the clock, bring a truck back online, undo.

## What to look at

1. **The board.** Columns are regions; rows are urgency. Only what needs attention carries color.
2. **Marcus R.** Twelve minutes of drive time, three stops that need thirty-four. The route ribbon shows the last stop past the limit mark. Reassign from the card: the picker only offers drivers who won't become the next problem, and previews both drivers' new figures before you confirm.
3. **Dre W.** Dark for 25 minutes with ~40 minutes left. Every figure carries a tilde and an age; position-dependent actions are disabled. Bring him online from the dev panel and watch the estimate correct itself, out loud.
4. **Lookout**, the rail on the right, reads the same ranked list the board does. If they ever disagree, that is the bug.
5. **`src/alerts/rules.ts`.** Every alert is one object. Adding a rule is appending one.

## How it is built

`docs/ARCHITECTURE.md` is the source of truth. In one line: a deterministic seeded fleet plus one clock → pure derivation (`hos/compute.ts`, `alerts/rules.ts`, `alerts/rank.ts`, `bands.ts`) → one ranked array → every surface. Actions are pure transforms with a confirm step and one-level undo.

## Scope, honestly

The brief suggests 2–3 hours. This took roughly 3 hours of directing and reviewing, counting the design conversation, and it produced more than the brief asks for: the board, the route file with receipts and a schedule ribbon, and the Lookout rail. The core was scoped with discipline; the extras are labeled as extras in `docs/DECISIONS.md`. Not built: the driver's phone view, the map, chat, routing, auth, dark mode, mobile layouts.

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
