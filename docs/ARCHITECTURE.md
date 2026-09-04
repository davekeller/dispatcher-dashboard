# ARCHITECTURE — Dispatcher's Dashboard

Source of truth for how the product is built. `BRIEF.md` says what and why, `LAYOUT.md` describes the surfaces, `FLOWS.md` walks the flows. Where those disagree with this file, this file wins (it was written last, on 2026-09-03, after the design was settled).

The co-pilot is named **Lookout**. The dispatcher is **Lena**. The simulated shift is anchored at **2:47 PM**.

---

## 1. Principles the architecture enforces

1. **Exceptions first.** The primary surface ranks by urgency. Fleet-wide state is a metrics row, not the main event.
2. **Predict, don't react.** Every HOS figure is derived from duty segments against a live clock. Alerts fire before the violation and carry their interventions.
3. **Stale data is a state.** Every entity has `lastPingAt`. Staleness is derived, visible, and changes precision and copy. Unknown + high-stakes sorts up.
4. **Insight → action, with a confirm.** Every action confirms, then commits to local state, then the derived layer recomputes. Nothing mutates silently.
5. **Rules as data.** Alerts, filters, and column grouping are config arrays. Adding one is a one-object edit.
6. **One clock, one source of truth.** A single `now`. One `alerts` array feeds the board, the route file, and Lookout. If two surfaces disagree, that is the bug to find first.
7. **Color is attention.** Only things that need attention carry saturated color. Everything else is subdued. Lookout owns the accessible orange and the subtle warm-to-cool AI spectrum.

---

## 2. Stack and dependencies

Vite · React 19 · TypeScript · Tailwind v4 (via `@tailwindcss/vite`). Light theme only. No backend. Deployed to Vercel.

| Runtime dependency | Why |
|---|---|
| `react`, `react-dom` | UI |
| `react-router` | Three real routes now, two more in Phase 2; drivers get URLs for the walkthrough |
| `zustand` | One small store with actions and one-level undo; less ceremony than context + reducer |
| `@phosphor-icons/react` | Interface icons in the duotone weight |
| `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/inter` | Display and body faces, bundled, no CDN |
| Phase 2 only: `leaflet`, `react-leaflet` | Map and phone view; lazy-loaded, never on the critical path |

Dev: `vite`, `typescript`, `vitest`, `oxlint`, `@vitejs/plugin-react`, `@types/*`.

Reviewers read the package.json. Nothing else goes in without a one-line reason in `DECISIONS.md`.

---

## 3. Directory layout

```
src/
  main.tsx · App.tsx (routes) · index.css (tokens)
  app/          Layout.tsx · Header.tsx · SimulatedShift.tsx
  data/         types.ts · prng.ts · seed.ts · planted.ts · regions.ts
  time/         clock.ts · useNow.ts
  hos/          constants.ts · compute.ts · compute.test.ts
  alerts/       types.ts · rules.ts · rank.ts · rank.test.ts
  bands.ts · filters.ts · groupBy.ts
  store/        store.ts · actions.ts · undo.ts · derive.ts
  lookout/      LookoutSidebar.tsx · LookoutPortal.tsx · AlertBar.tsx · RecommendationCard.tsx · ActionConfirm.tsx · voice.ts
  views/
    shift/      ActiveShiftPage.tsx · ShiftHero.tsx · FilterBar.tsx · OrderDropdown.tsx · FiltersDropdown.tsx · Board.tsx · RouteCard.tsx · RouteTimelineMini.tsx · boardSort.ts · useColumnTracks.ts
    route/      RouteFilePage.tsx · RouteRail.tsx · DriverCard.tsx · StaleBanner.tsx · AlertStrip.tsx · StopReceipt.tsx
    route/actions/  ReassignDialog.tsx · ResetDialog.tsx · NotifyDialog.tsx
    driver/     DriverPhoneView.tsx · PhoneFrame.tsx        (Phase 2)
    map/        MapView.tsx                                   (Phase 2, lazy)
  ui/           Chip · Button · Card · Modal · Toast · Countdown · Bar · Avatar · EmptyState · CorrectionChip
  lib/          format.ts (clock times, durations, tilde precision)
```

Files stay small and single-purpose. `rules.ts` imports nothing heavy so HMR is instant during the live change.

---

## 4. Data model

```ts
type Region = 'North' | 'West' | 'South' | 'Central'   // four, so the board fits beside the open rail

type DutyStatus = 'driving' | 'on_duty' | 'on_break' | 'off_duty'

interface DutySegment {
  status: DutyStatus
  startedAt: number            // epoch ms (sim clock)
  endedAt?: number             // undefined = ongoing
  planned?: boolean            // true for a scheduled reset the dispatcher added
}

interface Driver {
  id: string
  name: string                 // "Marcus R."
  initials: string
  truckId: string
  routeId: string
  region: Region
  shiftStartedAt: number
  segments: DutySegment[]      // the truth. HOS math reads segmentsKnownAt(lastPingAt), see §6
  lastPingAt: number           // mirrors the truck's telematics ping; one ping source, two entities show it
  pingsSuspended?: boolean     // planted stale/offline drivers stop pinging; everyone else pings with the clock
  contactAttemptedAt?: number  // set by the "call driver" action
}

interface Truck {
  id: string
  plate: string
  region: Region
  position: { lat: number; lng: number }   // around one metro; used by map and phone, seeded from day one
  lastPingAt: number
}

interface Delivery {                        // the brief's "deliveries with attributes", by name
  id: string
  customer: string
  address: string
  position: { lat: number; lng: number }
  window: { start: number; end: number }
  priority: 'standard' | 'priority'
  items: string[]                           // "12 cases · dry goods"
  instructions?: string                     // "Dock B. Call on arrival."
}

type StopStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'unassigned'

interface Stop {
  id: string
  routeId: string
  deliveryId: string
  seq: number
  driveMinutesFromPrev: number   // the leg into this stop; consumes the 11-hour limit
  serviceMinutes: number         // time at the stop; on duty, not driving
  plannedEta: number             // cumulative from route start
  status: StopStatus
  arrivedAt?: number
  departedAt?: number
  outcome?: 'delivered' | 'partial' | 'failed'
  signedBy?: string
  notifiedAt?: number            // customer notified of a delay
  note?: string                  // "Customer closed, retry after 3pm"
}

interface Route {
  id: string
  driverId: string
  region: Region
  plannedStartAt: number
  windowEnd: number
  stops: Stop[]                  // ordered by seq; the remaining ones drive reassign
}
```

A route belongs to one driver for the day, so a card on the board is a route, a driver, and a truck at once.

### Seed

- `prng.ts`: mulberry32 with a fixed seed. Never `Math.random()`.
- 50 drivers and trucks spread across the four regions (13 / 13 / 12 / 12). Generated shift starts vary 06:30–08:30; planted drivers start whenever their day requires (a driver near the limit by 2:47 PM started around 1:30–2:40 AM).
- ~20 stops per route, ~1,000 deliveries. Drive legs 8–35 min, service 6–20 min. Positions cluster by region around one metro (Chicago-shaped, no real addresses).
- Actual progress is generated by walking each route from its start with a per-driver drift factor, so most are on time, some ahead, a few behind.
- **Planted drivers** (`planted.ts`) overwrite generated ones after generation, with hand-authored segments and stop progress:

| Driver | Scenario | Proves |
|---|---|---|
| Marcus R. | ~12 min to limit, 3 stops left needing ~34 min of driving, ~15 min behind schedule | The hero: approaching + won't-finish; the ribbon lines cross |
| Priya S. | Over the limit by ~6 min, still driving | Violation state, different card and actions |
| Dre W. | Offline 25 min; last-known ~40 min to limit; truth: went on break 5 min after the last ping | Unknown + high-stakes sorts up; recovery correction on reconnect |
| Elena M. | On break, 20 min in, ~2h to limit | Segments understood; countdown paused |
| Sam K. | 8h05m cumulative driving with no 30-min break | Trips the 30-minute-break rule added live during the panel |
| Nadia F. | Stale 4 min; ~130 min to limit, driving | The stale tier on its own: tilde, dropped seconds, age label, band unchanged. Eleven minutes into a demo she goes dark and becomes the Offline band's first member, still clear |
| Tomas B. | 50 min behind schedule, 7 stops left, HOS clear | Every remaining stop misses its window; the schedule rule alone, without HOS |
| Lucia B. | All 20 stops done, heading in | The "route complete" edge path has a live example |
| Ana L. | Fresh, same region as Marcus, 7h of drive time left, 5 short stops | The obvious reassign candidate; tops the picker |
| Ravi P. | Fresh, same region as Priya, 55 min of drive time left | The marginal candidate; excluded by the capacity margin |

Everyone else is comfortably clear so the board is not all red. Each planted day is built in one backward walk from the anchor, so its duty segments and its stop receipts describe the same day: every done stop sits inside an on-duty segment and every leg is a driving segment.

---

## 5. Time

- `clock.ts`: `SCENARIO_ANCHOR` = today at 14:47:00 local. `now = anchor + (Date.now() − loadedAt) + scrubOffset`. The clock is live (it ticks), deterministic (same scenario every load), and scrubbable.
- `useNow()`: one hook, ticks every `TICK_MS = 5000`, value rounded to the tick so memo keys are stable. Nothing else reads `Date.now()`.
- **Simulated telematics.** Drivers without `pingsSuspended` are treated as pinging continuously: their effective `lastPingAt` is `now − jitter(driverId)` with jitter 0–90s. Planted stale/offline drivers keep their stored `lastPingAt`. This is derivation, not mutation, so the fleet does not go offline when the clock is scrubbed or a tab is left open.
- **The world moves.** The generated fleet is a whole simulated day: every generated stop carries the time the driver will reach it and leave it, and `materialize(fleet, now)` (`src/data/simulate.ts`) sets stop statuses from the clock on every tick and every scrub. The planted scenarios carry no future times, so they hold still for the demo. Scrub an hour and the fleet has completed its next stops; leave a tab open through a panel and the board does not slowly fill with drivers who fell behind a frozen plan.
- **The simulated-shift control.** The clock in the product bar is a button, "2:47 PM · Simulated shift" with a clock icon, that opens a panel anchored under it (`⌘.` too). The panel says in plain words that this is a simulated day pinned to 2:47 PM and that the clock is live, offers a horizontal scrubber across four hours plus +15 min, +1 hour, and back-to-2:47 buttons, and explains each demo action in a sentence: bring Dre online (clears `pingsSuspended`; the estimate corrects out loud), advance Marcus a stop, undo, reset the shift. It exists so a reviewer finds it, understands it, and can fire any alert on demand.

---

## 6. Derivation: Lookout's brain

All pure, no React, unit-tested. Memoized in `store/derive.ts` on `(entities, roundedNow)`.

### Constants (`hos/constants.ts`)

```
LIMIT_MIN = 660      ACT_NOW_MIN = 30     WATCH_MIN = 90
FRESH_MIN = 3        OFFLINE_MIN = 15     SNOOZE_MIN = 10
BEHIND_MIN = 15      CAPACITY_MARGIN_MIN = 20     WINDOW_14H_MIN = 840
```

Boundaries: `≤ 30` is act now, `≤ 90` is watch, `≤ 0` is over. `< 3` fresh, `3–15` stale, `> 15` offline. Bands are monotonic over time so nothing flaps at a boundary.

### `hos/compute.ts`

- `segmentsKnownAt(driver, at)` — segments as they were known at the last ping: those started before `at`, with any ongoing one still open. **HOS math always reads `segmentsKnownAt(driver, lastPingAt)`**, for fresh and stale drivers alike; for fresh drivers that is everything. This is what makes an offline projection honest: it continues the last-known segment and cannot see what happened after the radio died.
- `drivingMinutes(driver, now)` — sum of `driving` segments, ongoing segment closed at `now`. A driver last seen driving keeps accumulating while offline; a driver last seen on break does not.
- `minutesUntilLimit(driver, now)` — `LIMIT_MIN − drivingMinutes`. Negative means over. This is drive time left, a quantity; `limitHitAt` below is the clock time the limit lands given the remaining legs. The header shows the first, the ribbon the second.
- `hosStatus(driver, now)` — `'over' | 'act_now' | 'watch' | 'clear'`.
- `staleness(entity, now)` — `'fresh' | 'stale' | 'offline'`, and `pingAgeMinutes`.
- `remainingStops(route)` — pending + in_progress, in seq order. Unassigned stops are excluded (they are someone else's problem now, see §8).
- `remainingDriveMinutes(route)` — sum of `driveMinutesFromPrev` over remaining stops. This, against `minutesUntilLimit`, is the number that matters.
- `scheduleDrift(route, now)` — the slip at the last checkpoint, or how overdue the next stop is, or the dwell past a planned departure at the dock, whichever is worse; positive is behind. Displayed ahead/behind only past ±5 min.
- `projectedEta(stop, drift)` — `plannedEta + max(0, drift)` for pending stops.
- `projectedFinishAt(route, now)` — `now + remaining drive + remaining service`, following the leg order.
- `limitHitAt(driver, route, now)` — walk the remaining legs; the clock time at which cumulative driving reaches the limit. Service time advances the clock but does not consume the limit. This is where the limit mark sits on the ribbon, so the ribbon and the rules agree by construction.
- `breakDueIn(driver, now)` — minutes of driving since the last ≥30-min interruption, for the live-change rule.
- `precision(staleness)` — fresh shows `0:18`, stale/offline show `~0:40` and drop seconds. Precision falls with age.

### `DriverView`

`derive.ts` builds one `DriverView` per driver each tick: driver, truck, route, the computed figures above, `remaining`, `unnotifiedLateStops`, `hasUnassignedStops`, `snoozedUntil`. Rules and views read this and never recompute.

### Rules (`alerts/rules.ts`)

```ts
type Severity = 'critical' | 'act_now' | 'watch' | 'info'
type ActionId = 'reassign' | 'schedule_reset' | 'notify_customer' | 'call_driver' | 'acknowledge'

interface Rule {
  id: string
  label: string
  severity: Severity
  when: (v: DriverView) => boolean
  message: (v: DriverView) => { title: string; body: string }
  actions: ActionId[]
}
export const RULES: Rule[] = [ /* one object per rule */ ]
```

Fixed severity and a `when` predicate keeps the shape copy-pasteable in front of the panel. Rules that need two severities are two objects. Every rule but the two offline rules is gated on `visible` (not offline): the offline rules own dark drivers with one card. The limit rules (`limit_*`, `wont_finish`) also require driving or on duty, so a break pauses the clock and the alert resumes with the driver. Late means a customer's window is at risk, not merely behind the plan: the plan slips all day while the world stands still, and the window is the promise.

| id | severity | fires when | actions |
|---|---|---|---|
| `over_limit` | critical | visible and `drivingMinutes ≥ 660` | reassign, call_driver |
| `limit_act_now` | act_now | driving or on_duty, `0 < minutesUntilLimit ≤ 30` | reassign, schedule_reset, notify_customer |
| `limit_watch` | watch | driving or on_duty, `30 < minutesUntilLimit ≤ 90` | schedule_reset, reassign |
| `wont_finish` | act_now | on the road and visible, stops remain, `remainingDriveMinutes > minutesUntilLimit`, not over | reassign (pre-selects the stops past the limit), schedule_reset |
| `offline_near_limit` | act_now | offline and last-known `minutesUntilLimit ≤ 90` | call_driver, acknowledge |
| `offline` | watch | offline and last-known `minutesUntilLimit > 90` | call_driver, acknowledge |
| `behind_schedule` | watch | visible and a pending stop's projected ETA is past its delivery window | notify_customer, reassign |
| `stops_unassigned` | info | visible and the route has unassigned stops | reassign |
| `break_due` | watch | **added live during the panel**: ≥ 8h driving since last 30-min break | schedule_reset |

Copy is written in `message()` in Lookout's voice (`lookout/voice.ts` holds the name and shared phrases): "Marcus R. hits his limit in 18 min with 3 stops left." "Priya S. is over her limit by 6 min. She needs to stop now." "Dre W. hasn't pinged in 25 min. Last estimate: ~40 min to limit." Stale figures carry the tilde and the age.

### Ranking (`alerts/rank.ts`)

`rankDrivers(views, alerts, now): DriverCard[]` groups alerts by driver into one card with several reasons. Sort key, in order: severity rank (critical, act_now, watch, info), snoozed after unsnoozed at equal severity, minutes-to-violation ascending in whole minutes, so sub-minute drift never jostles cards (offline continuation counts), staleness (offline before stale before fresh), driver id. Stable across ticks so cards never jump. Snooze de-emphasizes; it never removes a critical or act-now card.

`alertBar = ranked.slice(0, 3)`. If the bar ever needs its own logic, something upstream is wrong.

### Bands (`bands.ts`)

`band(card): 'act_now' | 'watch' | 'offline' | 'break' | 'clear'` — top severity critical or act_now → act_now (critical cards label "Over limit" at the top of the band); else offline if staleness is offline (before watch, or the dark-but-clear driver could never reach her own band); else watch → watch; else break if on_break; else clear. Offline inside the watch window therefore lands in Act now with a hollow marker, and the Offline band holds only dark drivers whose last-known state is clear. Stale (3–15 min) never moves a card; it only adds the tilde and the age.

### Filters and grouping (`filters.ts`, `groupBy.ts`)

```ts
interface Filter { id: string; label: string; kind: 'multi' | 'text'; options?: {value, label}[]; apply: (v: DriverView, value) => boolean }
export const FILTERS: Filter[] = [ band, freshness, region, search ]

interface Grouping { id: 'region' | 'band'; label: string; columns: string[]; keyOf: (v: DriverView) => string }
export const GROUPINGS: Grouping[] = [ byRegion, byBand ]
```

Metrics cards set filter presets. Adding a filter or a grouping is one object.

---

## 7. Store and actions

Zustand, one store: `{ fleet, scrubOffset, snoozes, corrections, events, lastAction, undoSnapshot, groupBy, devOpen }`. `events` is the shift log: every action appends `{ seq, at, kind, label, driverId }`, and the Timeline tab renders it. Views subscribe to the derived layer, not the raw entities.

Every action follows the same protocol: **preview → confirm → commit → recompute → inline result → undo available for 10s.** The rail and the route file call the same functions in `store/actions.ts`; there is no second implementation anywhere.

| Action | What it changes | How the alert resolves |
|---|---|---|
| `reassignStops(from, to, stopIds)` | Moves stops to the end of the target route; recomputes their planned ETAs from the target's projected finish | Source's `remainingDriveMinutes` drops; `wont_finish` and `limit_*` downgrade or clear. Target may enter watch; the preview shows both drivers' new figures |
| `scheduleReset(driverId, afterStopId)` | Writes the legs and service up to that stop as planned `driving` and `on_duty` segments, then a planned `off_duty` (10h) at the projected departure; stops after it become `unassigned`. A stop no longer ahead of the driver is a no-op | Remaining drive counts only stops up to the reset point; `stops_unassigned` fires at info with a reassign action that pre-selects them |
| `notifyCustomer(stopIds, message)` | Sets `notifiedAt`; pre-filled message with the projected ETA | `behind_schedule` reads unnotified late stops; when all are notified its body says so |
| `callDriver(driverId)` | Sets `contactAttemptedAt` | Offline card shows "called 12:52", stays until a ping arrives |
| `acknowledge(alertId)` | Snoozes 10 min | De-emphasized in rank, never hidden for critical/act-now |
| `markArrived / markDeparted(stopId, outcome)` | Phone and dev panel | Receipts update; drift recomputes |
| `undo()` | Restores the snapshot taken before the last action | |

**Reassign candidates:** fresh, driving or on duty, band not act-now or over, and `minutesUntilLimit − (remainingDriveMinutes + movedDriveMinutes) ≥ CAPACITY_MARGIN_MIN`. Same region first, then most spare drive time. The picker's nav mirrors the board's (`store/candidates.ts`): an order (Lookout's order by default; closest first, by great-circle distance between the two trucks; most drive time left), manual filters (region, same region only), and search by driver name or plate on the right. Orders re-sequence and filters narrow the same capacity-safe set; nothing adds anyone back, and when filters hide everyone the dialog says how many could take the stops and offers to clear. Partial reassign is selecting receipt cards; default is every remaining stop, or the stops past the limit when opened from `wont_finish`. Empty list: "No one has the capacity. Schedule a reset instead," with the reset button right there.

**Schedule reset** suggests the last stop the driver can finish before the limit, computed from `limitHitAt`.

---

## 8. Shell and routes

The truck logo is an icon-only `ink` tile; the Dispatch wordmark remains separate dark text on the white product bar. Board is a lightweight dark text-and-icon navigation item without a resting fill, leaving the truck tile as the header's single industrial anchor.

Two panes. The product bar reads **Dispatch**, then the active **Board** workspace, the shift clock, and the dev toggle; on a route file a breadcrumb continues with "RT-01 · Marcus R." There is no left nav: the board is the whole product for this exercise. The Status/Region lens lives with the board controls. Main outlet. Lookout sidebar mounted once at app level, reading derived state directly; pages set the focus driver through context. Collapsed, it becomes a rail with the act-now count as a badge.

| Route | View | Phase |
|---|---|---|
| `/` | Active Shift | 1 |
| `/routes/:driverId` | Route file | 1 |
| `/driver/:driverId` | Driver phone | 2 |
| `/map` | Map | 2 |

The board groups by **Status** by default, Act now leftmost, because that is where Lena acts; Region is one click away.

---

## 9. Views

### Active Shift

The miniature card timeline uses shared route-completion endpoints, grading completed paths and markers from light sage at the route origin to dark clear-green at the current progress edge. A future map view should reuse these endpoints for its completed stops and route segment rather than introduce a second progress palette.

**Shift status band.** A compact, light metric instrument leads the page without promotional copy. Its saturated pastel ember-to-gold-to-rose-to-violet-to-blue wash distinguishes the shift overview from Lookout's near-white recommendation surface without becoming a dark banner. The left side follows dispatcher priority — Act now (with the over-limit count attached), Watch, On break, Offline, then Clear — and mirrors the board lanes exactly; each is also a filter shortcut. Labels and figures use the dark operational status hues, while throughput metrics use near-black. The right side continues the same single-row metric grammar with four equally aligned facts: Delivered, To deliver, Total stops, and Delivered percentage. It has no nested header, progress bar, or secondary footer.

**Board.** Columns are status bands by default (Act now, Watch, On break, Offline, Clear), switchable to regions. Every column can collapse to a 40px count rail; Offline and Clear start collapsed so intervention work gets the width. Offline sits after On break and starts collapsed because that band only holds dark-but-clear drivers (a dark driver near the limit is in Act now), and its count stays visible on the rail. Open tracks divide the remaining space by weight and resolve to pixels so collapse/expand animates smoothly. Cards never flex-shrink inside a lane; high-count columns scroll instead. The first control is the board-order dropdown: Lookout's rank is the default, with closest-to-limit, most-stops, and oldest-data alternatives that change sequence only. A single route-filter dropdown groups the data-driven Status, Data, and Region filters, followed by route search and the Status/Region lens.

**Route card.** A shared title row leads with an overall-route status dot at the same compact scale as the board-lane header dots and the route id, then pairs the highest-priority Over limit, Approaching limit, or Behind schedule badge with the live HOS countdown on the right, exactly as it does in Lookout recommendations. The miniature route spine begins directly beneath that dot and occupies a narrow full-height strip beside the card rows, so the title indicator becomes the visual head of the route's progress. The first content row combines assignment and progress: driver name and truck license plate sit inline beside the avatar with muted ping age beneath, followed by compact `14 / 16 Stops` and `#15 Up next` cells. A second two-column row preserves HOS fit and Route risk. Every stop remains a node in one evenly spaced route scale. Successfully delivered stops use smaller 5px connective nodes; unresolved, failed, late, and post-HOS work uses a fixed 6px node. Nothing compresses or magnifies by progress percentage. Completed work grades from light sage to dark clear-green, viable undelivered work is gray, and failed, past-due, or post-HOS work is red. The route-file timeline keeps one literal labeled row per stop, with only delivered rows tightened. Secondary alert reasons render as plain text and Lookout's first-pick marker follows only when present. Clear cards stay quiet but keep their full height and readable identity in narrow lanes. Click opens the route file. Nothing drags: a card's position is computed, not assigned.

**Empty states.** Nothing needs attention: "All clear. 46 drivers on shift, next check-in in 5s." A filter that matches nothing: say which filter, offer to clear it. A region with no trucks: the column says so.

### Route file (`/routes/:driverId`)

A page in the main pane; Lookout stays open and focuses on this driver. It has the shape of a case file: a **route rail** down the left, the content to its right.

The route rail shares the miniature timeline's completed-path gradient and subtle next-two-stop marker sizing. Delivered rows tighten to 32px expanded and 20px collapsed so completed history gives more vertical room to remaining work; labels and click targets remain intact, failed history stays full-size and red, and every node still maps one-to-one to its receipt.

**Route rail.** Sticky, in the case-file navigation pattern: a back link and whole-rail collapse toggle at the top, then two independent disclosures. Route status opens to a flat 2×2 divider grid for Progress, Remaining, Schedule, and HOS fit; Route timeline opens to one continuous vertical route-order timeline with one distinct node for every stop shown in the main content area. Both default open and neither uses an inset card or dark background. Each timeline row leads with the marker, then shows time above stop number and customer name. A green check means delivered, a neutral gray circle means viable undelivered work, and red means failed, past due, or projected beyond HOS. The exact point where the route crosses the 11-hour limit is labeled on the spine. The node whose receipt is in view is highlighted and kept visible as the dispatcher scrolls, and clicking a node scrolls to its matching receipt. Collapsed, the whole rail retains completion percentage, schedule/HOS signal dots, and the same one-node-per-stop spine on the light surface.

Content, in reading order:

1. **Driver card.** One card: avatar, name, band and drift chips, a scheduled-reset chip when one exists, plate, region, status, the large live countdown with data age; then the five day figures (driving today · on duty since · break taken or "none yet" · stops done / remaining · driving left vs. time to limit, the pair that decides everything).
2. **Stale banner.** If stale or offline: "Last ping 25 min ago. Figures are estimates."
3. **Alert strip.** Only when alerts exist. One row per firing rule, copy and actions from the rule object, confirm inline. New rules render here with no new UI.
4. **Stop receipts.** Oldest first, each the scroll target of its rail node. Every receipt uses a vertically centered case-file row: a first column beginning with the large `#N`, then customer, address, status, instructions, and neutral dispatcher note; a second column with a small horizontal event track; a compact single-row grid of four facts across the remaining right side; and a narrow ellipsis-action cell. Completed stops read Arrived → Left → Signed and surface On site, Outcome, Load, and Priority. Pending stops read Planned → Projected → Window and surface Projected ETA, Window, Drive in, and Load. Fact values are slightly larger than event metadata. The next stop is highlighted; stops past the limit carry a chip; notified stops show the stamp; unassigned stops show "needs a driver."
5. **Actions.** Route-level Reassign, schedule reset, and notify customer actions open their dialogs, preview, confirm, and commit. Every receipt's ellipsis opens stop-level Reassign, Add/edit note, and Cancel. Reassign preselects only that unresolved stop. Notes persist with a reassigned stop. Cancel is confirmed, removes only pending or unassigned work from the active route, resequences the remainder, logs the event, and is undoable; completed and in-progress stops disable Reassign and Cancel with a reason. Position-dependent actions are disabled when data is stale or offline; schedule reset is disabled once one is scheduled.
6. **Driver's phone** button (Phase 2) renders `DriverPhoneView` in a phone frame overlay, so the dispatcher's action and the driver's screen are visible together.

### Lookout rail

One bar, the height of the app header: the tabs on the left, and on the right the name over "AI Agent", Lookout's face (a placeholder circle until Dave draws the real one), and the collapse control. **Chat** is the first tab. A sticky "✦ Lookout recommends" bar sits over the conversation, expanded by default and collapsible to just the bar, carrying one line that reads the shift ("3 need you now. Start with Priya S.") and the top three ranked cards, one per driver with every reason and 2–3 actions, the same handlers as the route file; the rest sit behind "Show N more." Recommendation cards reuse the board card's flat shell—route/status header, miniature stop spine, centered driver row, and edge-to-edge dividers—but replace its scan metrics with Lookout's evidence rows and action footer. In the bar they take the compact form: the same header row, then the avatar beside the directive, which may wrap, then the action footer; the spine and the driver row are left to the full card, which chat replies use. On a route file that driver's card is pinned first. The conversation runs underneath. Intent matching is a lookup, not a model (`lookout/intents.ts`): near the limit, offline, and reassign by first name; the no-match reply lists what Lookout can do as tappable examples, and replies render the same cards, so the bar and the thread can never disagree. **Timeline** is the second tab: what happened this shift, newest first, from the store's append-only event log (`ShiftEvent`: actions, snoozes, reconnects, undos, and the opening entry); nothing there is invented. The composer sits at the bottom of both tabs; sending from the timeline lands in the chat.

Lookout never has its own data. It reads `ranked` and nothing else.

### Driver phone (`/driver/:driverId`, Phase 2)

Mobile-first. Header collapses to the driver's avatar and their own countdown chip, the same number Lena sees. Full-bleed map with the route to the next stop. A bottom sheet peeks with the next stop's name, ETA, and window; swipe up reveals the work order: items, instructions, contact, and Arrived / Delivered buttons that write to the store. When Lena reassigns a stop, the phone's next stop changes. The architecture commits to this now: the store is shared, `Delivery` carries items and instructions from day one, positions are seeded from day one, and `StopReceipt` and the map component are shared between the route file and the phone.

### Map (`/map`, Phase 2)

react-leaflet, CARTO light basemap with OpenStreetMap attribution, lazy-loaded. The attention rule applies: every truck a small neutral dot at reduced opacity; act-now, watch, and offline markers in their band color with a name-and-countdown pill; offline hollow at the last known position with a "last seen" tooltip. The remaining route polyline draws only for the selected driver. Click opens the route file. If tiles fail, a message and the board are one click away.

---

## 10. Edge paths

Each is designed, not discovered. Where it shows up is as important as what happens.

| Situation | Behavior | Visible in |
|---|---|---|
| Stale (3–15 min) | Tilde, seconds dropped, age shown; band unchanged | Card, header, rail |
| Offline (>15 min) | Hollow marker; projection continues the last-known segment; own band unless inside the watch window, then Act now | Board, rail, route file banner |
| Ping recovers | Figures jump; "Updated: was ~40 min, now 33 min" shown for one tick rather than silently replaced | Card, route file |
| Behind schedule | Drift chip, amber node times on the route rail, `behind_schedule` at watch when a window is missed, notify action | Route file, card badge |
| Won't finish before limit | The limit mark on the route rail with the axis red past it, `wont_finish` at act now, reassign pre-selects the stops past the limit | Route file, Lookout |
| Already over the limit | Critical card with different copy and actions: stop now, who takes the stops | Rail, route file |
| On break | Countdown paused; resumes when the break ends; `limit_*` rules skip on_break | Card, duty timeline |
| Failed stop | Receipt shows the failure and note; remaining stops shift; drift recomputes | Route file |
| No reassign candidate | Graceful path to schedule a reset | Reassign dialog |
| Partial reassign | Select receipt cards; default all remaining | Reassign dialog |
| Picker filters hide every candidate | Inline note with how many could take the stops, and a clear-filters button | Reassign dialog |
| Two alerts, one driver | One card, two reasons | Rail, card badges |
| Acknowledge | Snoozed 10 min, de-emphasized, never hidden for critical/act now; snooze expiry restores emphasis | Rail |
| Reset mid-route | Stops after the reset point become unassigned; `stops_unassigned` fires; metrics show "need a driver" | Route file, metrics, rail |
| All stops done | "Finished, heading in"; no exposure; card goes quiet | Card, route file |
| Clock scrubbed far ahead | The generated fleet keeps completing stops; the planted scenarios hold still and accumulate | Simulated-shift panel |
| Empty filter, empty region, nothing to flag | Explicit empty states | Board |
| Undo | Last action reversible for 10s from the result toast, always from the simulated-shift panel | Toast, panel |

---

## 11. Visual system

Warm, dense, calm, and direct. This is operations software used mid-shift, expressed with hospitality-adjacent paper neutrals, near-black type, and modest radii. Lookout's AI moments add a restrained ember-to-gold-to-rose-to-violet-to-blue spectrum; the gradient is never used for operational severity. The system rhymes with contemporary hospitality software without borrowing a logo, branded asset, layout, or exact palette.

**Tokens** (Tailwind v4 `@theme`, all in `index.css`; components use tokens only, never raw hex):

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#f8f6f3` | Warm paper page ground |
| `--color-board` | `#f1f3f6` | Cool porcelain ground for the live board, with visible separation from white cards |
| `--color-panel` | `#ffffff` | Cards, rail |
| `--color-well` | `#f1ede9` | Inset grounds, column backgrounds |
| `--color-line` | `#e3ddd7` | Keylines |
| `--color-ink` | `#211e1c` | Text, primary buttons |
| `--color-muted` | `#625d59` | Secondary text |
| `--color-label` | `#6d6661` | Micro-labels on panel only |
| `--color-lookout` / `-strong` / `-soft` | `#cf4620` / `#a93817` / `#fff0e9` | Accessible orange for Lookout |
| `--color-ai-warm` / `-gold` / `-rose` / `-violet` / `-cool` | `#f45b2b` / `#e9ad48` / `#d979aa` / `#8259d6` / `#4f7cdd` | Decorative AI rings and soft washes only |
| `--color-hero-warm` / `-gold` / `-rose` / `-violet` / `-cool` | `#f2d8d0` / `#eee1bf` / `#ebd6e4` / `#ddd7ec` / `#d3e0ef` | Saturated pastel shift-instrument spectrum; paired with dark operational and ink foregrounds |
| `--color-act-now` / `-fill` / `-soft` | `#9f1f3b` / `#cb3453` / `#fff0f3` | Act now and Over limit |
| `--color-watch` / `-fill` / `-soft` | `#755000` / `#c88708` / `#fff6df` | Watch |
| `--color-clear` / `-fill` / `-soft` | `#165d3f` / `#2f9164` / `#eaf8f0` | Clear (muted) |
| `--color-route-done-start` / `-end` | `#9bc5ae` / `#276548` | Completed route path from route origin to current progress edge; reusable by the future map |
| `--color-offline` / `-fill` / `-soft` | `#424c60` / `#738099` / `#eff2f6` | Offline, dashed/hollow |
| `--color-break` / `-fill` / `-soft` | `#28549a` / `#477bd0` / `#edf3ff` | On break |
| `--color-*-board` | `#f8d6df` / `#f5dfa7` / `#dce3ed` / `#d8e5fb` / `#d3eedf` | Vivid Act now → Clear lane washes, in board order |
| `--color-on-accent` | `#ffffff` | Text on saturated grounds |

Over the limit is the one state that must never be missed: its chip is solid dark red with white text everywhere it appears. Text variants must pass AA on panel; fills are for bars and markers. The AI spectrum is decorative and never carries meaning or body copy. Validate the semantic pairs whenever tokens move. Watch's text color is deliberately darker than its fill so it clears AA while staying distinct from Lookout's orange.

**Type.** Bricolage Grotesque Variable for display: page titles, the large countdown, metric numbers. Inter Variable for everything else, `font-variant-numeric: tabular-nums` on every countdown and duration so rows never jitter. Two faces, no serif.

**Shape and rhythm.** 14px radius on cards, 8px on controls, pill chips. Rows ~40px, cards compact, whitespace spent on grouping. Quiet keylines, one diffused shadow level. Phosphor duotone icons. Motion: countdown ticks and a subtle band-change transition only. Light only.

**Illustration (Phase 2 polish).** A custom two-tone truck mark can replace the Phosphor glyph without touching layout. "Cards shaped like trucks with a trailer" is an experiment to try once the board works, kept only if it costs no scanability.

---

## 12. Testing

Vitest, `*.test.ts` beside the module. No UI snapshot tests; the panel reads the derivation tests.

- `hos/compute.test.ts`: ongoing segment closes at now; break pauses accumulation; `segmentsKnownAt` hides post-ping segments; thresholds at exactly 30:00, 90:00, 0:00; staleness at 3 and 15; `limitHitAt` skips service time; drift sign.
- `alerts/rank.test.ts`: one card per driver; severity then time then staleness; stable order across two ticks; snooze demotes but never removes act now.
- `alerts/rules.test.ts`: each planted driver trips exactly the rules the table in §4 says.
- `bands.test.ts`: offline inside the watch window is act now; offline and clear is offline.
- `data/seed.test.ts`: same seed, same fleet; planted drivers present with the planted figures at the anchor.
- `derive.test.ts`: the one-source-of-truth test: the rail's order equals the board's within-column order for the same driver set.

---

## 13. Phasing and budget

**Phase 1, the submittable product.** Shell, routing, tokens · data, seed, clock, pings · compute, rules, rank, bands, tests · store, actions, undo · Active Shift with metrics, board, cards, filters · Lookout rail · route file with header, alert strip, metrics, ribbon, duty timeline, receipts · the three action dialogs · staleness, copy, empty states · deploy, README, DECISIONS.

| Block | Min |
|---|---|
| Shell + routing + tokens | 30 |
| Data + seed + clock + pings | 50 |
| Compute + rules + rank + bands + tests | 45 |
| Store + actions + undo | 30 |
| Active Shift | 55 |
| Lookout rail | 35 |
| Route file | 70 |
| Action dialogs | 45 |
| Staleness, copy, empty states | 20 |
| Deploy + README + DECISIONS | 15 |
| **Phase 1** | **~6.5h** |

Minutes are focused build effort for a person directing tools; executed by an agent from the implementation plan, the wall-clock is shorter, and the README records the real elapsed time. Either way it is over the brief's 2–3 hour guidance. The answer when asked is the honest one: the core was scoped with discipline, and the extras are labeled as extras in `DECISIONS.md` and the README.

If behind at the two-thirds mark: drop the notify dialog to a single confirm, collapse Clear cards to a count, keep the ribbon, the receipts, and the reassign flow.

**Phase 2, only after Phase 1 is deployed.** Driver phone view · map · chat intents · scrubber polish · illustration.

**Build order.** Thin vertical slice first: seed → compute → one rule → one card → route file header → one action. Then widen.

---

## 14. The live change

`rules.ts` is open. Append `break_due`: id, label, `watch`, `when: v => v.breakDueIn >= 480`, a message in Lookout's voice, `['schedule_reset']`. Save. Vite HMR. Sam K.'s card gains a badge on the board and a reason in the rail. Delete it, add it again, under two minutes, narrating. If they ask for a filter instead, `filters.ts` has the same one-object shape and nothing needs planting.
