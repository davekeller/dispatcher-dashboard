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
| `react-router` | Four real routes (board, route file, map, not found), the phone view still Phase 2; drivers get URLs worth sharing |
| `zustand` | One small store with actions and one-level undo; less ceremony than context + reducer |
| `@phosphor-icons/react` | Interface icons in the duotone weight |
| `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/inter`, `@fontsource/ibm-plex-mono` | Display, body, and Lookout agent faces, bundled, no CDN |
| `leaflet`, `react-leaflet` | The route file's map, behind the Map toggle as a lazy chunk; the board never loads them. OpenStreetMap tiles, muted to gray by a CSS filter, are the app's one network dependency, and the legs and markers draw without them |

Dev: `vite`, `typescript`, `vitest`, `oxlint`, `@vitejs/plugin-react`, `@types/*`.

The dependency list is read as closely as the code. Nothing else goes in without a one-line reason in `DECISIONS.md`.

---

## 3. Directory layout

```
src/
  main.tsx · App.tsx (routes) · index.css (tokens)
  app/          Layout.tsx · Header.tsx · SimulatedShift.tsx
  data/         types.ts · prng.ts · seed.ts · planted.ts · regions.ts · dispatcher.ts (Lena, as data)
  time/         clock.ts · useNow.ts
  hos/          constants.ts · compute.ts · compute.test.ts
  alerts/       types.ts · rules.ts · rank.ts · rank.test.ts
  bands.ts · filters.ts · groupBy.ts
  geo/          truckPosition.ts (the truck's fix, walked from the receipts as of its last ping)
  store/        store.ts · actions.ts · undo.ts · derive.ts
  lookout/      LookoutSidebar.tsx · RecommendationsBar.tsx · RecommendationCard.tsx · plans.ts (+ test) · PlanCard.tsx · intents.ts · ActionConfirm.tsx · voice.ts
  views/
    shift/      ActiveShiftPage.tsx · ShiftHero.tsx · FilterBar.tsx · OrderDropdown.tsx · FiltersDropdown.tsx · Board.tsx · RouteCard.tsx · RouteTimelineMini.tsx · boardSort.ts · useColumnTracks.ts · MetricsView.tsx · metrics.ts (+ test: the charts' figures)
    route/      RouteFilePage.tsx · RouteRail.tsx · DriverCard.tsx · StaleBanner.tsx · AlertStrip.tsx · StopReceipt.tsx · StopStatusMarker.tsx · StopsTitleRow.tsx · stopFilters.ts (+ test: the stop filters, one object each)
    route/actions/  ReassignDialog.tsx · ResetDialog.tsx · NotifyDialog.tsx
    route/map/  RouteMap.tsx                                  (lazy chunk: the route file's map)
    driver/     DriverPhoneView.tsx · PhoneFrame.tsx        (Phase 2)
    map/        MapPage.tsx · FleetMap.tsx (lazy) · RouteOverlay.tsx (one route in the rail's states, both maps) · leaflet.tsx (tiles, fit, fly)
    settings/   SettingsPage.tsx                             (the dispatcher's page: profile, the desk today, the clock preference, the rules on the desk)
  ui/           Chip · Button · Card · Modal · Toast · Countdown · Bar · Avatar · DispatcherAvatar · EmptyState · CorrectionChip
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

interface Delivery {                        // deliveries with attributes, as a named entity
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
- ~20 stops per route, ~1,000 deliveries. Drive legs 8–35 min, service 6–20 min. Positions cluster by region around one metro (Chicago-shaped, no real addresses); each stop is a walk from the previous one, the leg's drive minutes setting the distance (0.25 km per minute, ±30%) and reflected inside the region's box, so on the map a route reads as a route and the geography agrees with the schedule.
- Actual progress is generated by walking each route from its start with a per-driver drift factor, so most are on time, some ahead, a few behind.
- **Planted drivers** (`planted.ts`) overwrite generated ones after generation, with hand-authored segments and stop progress:

| Driver | Scenario | Proves |
|---|---|---|
| Marcus R. | ~12 min to limit, 3 stops left needing ~34 min of driving, ~15 min behind schedule | The hero: approaching + won't-finish; the ribbon lines cross |
| Priya S. | Over the limit by ~6 min, still driving | Violation state, different card and actions |
| Dre W. | Offline 25 min; last-known ~40 min to limit; truth: went on break 5 min after the last ping | Unknown + high-stakes sorts up; recovery correction on reconnect |
| Elena M. | On break, 20 min in, ~2h to limit | Segments understood; countdown paused |
| Sam K. | 8h05m cumulative driving with no 30-min break | Trips the 30-minute-break rule, the worked example for adding a rule |
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
- **The world moves.** The generated fleet is a whole simulated day: every generated stop carries the time the driver will reach it and leave it, and `materialize(fleet, now)` (`src/data/simulate.ts`) sets stop statuses from the clock on every tick and every scrub. The planted scenarios carry no future times, so they hold still for the demo. Scrub an hour and the fleet has completed its next stops; leave a tab open for an hour and the board does not slowly fill with drivers who fell behind a frozen plan. Scrubbed back, the same times unwind it: `effectiveLastPingAt` is never in the future and duty segments are clipped to the clock, so the morning is honest and a dark driver is fresh again before his last ping.
- **The simulated-shift control.** The clock in the product bar is a button, "2:47 PM · Simulated shift" with a clock icon, that opens a panel anchored under it (`⌘.` too). The panel says in plain words that this is a simulated day pinned to 2:47 PM and that the clock is live, offers a horizontal scrubber across the whole simulated day, 6:00 AM to 6:00 PM, in either direction with the 2:47 anchor marked, a switch that plays the same day against the real clock, and one button that resets the shift: back to 2:47 PM with the fleet as seeded. It exists so a reviewer finds it, understands it, and can fire any alert on demand by scrubbing.
- **Real time.** A switch in the panel plays the same day against the actual clock: `scrubOffset = loadedAt − anchor`, so simulated time equals wall time and stays equal as both advance. A panel at 10:15 AM sees the 10:15 board; the planted scenarios unwind before 2:47 and hold after it; outside 6:00 AM–6:00 PM the shift has not started or is over, and the panel says so. Any scrub, or Back to 2:47 PM, returns to the pinned shift. The brief asks for figures computed against a live clock; both modes tick, and this one also matches the wall.

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

### Truck fix (`geo/truckPosition.ts`)

Nothing stores a moving position. The seed holds one fix per truck; everything after is the legs walked since, derived from the route's receipts and the clock. `truckFixAt(route, truck, deliveries, at)` returns `at_stop` (arrived by `at`, not departed), `en_route` (from the last departed stop toward the next assigned one, with a fraction of the leg), or `parked` (before the first leg or after the last). Arrival is the simulated day's own `arrivedAt` where it exists, so the truck reaches the dock exactly when the receipt flips to in progress; for a planted route that holds still it is the projection, and the fraction caps at 96% so a late driver hovers short of a dock they have not reached instead of teleporting onto a pending stop. `at` is the effective last ping and drift is evaluated at `at`, so a fresh truck moves with the 5-second tick and a stale one shows its last known fix without creeping. Pure, no React, unit-tested against hand-built routes and against every driver in the seeded fleet.

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

Fixed severity and a `when` predicate keeps the shape copy-pasteable in a live demo. Rules that need two severities are two objects. Every rule but the two offline rules is gated on `visible` (not offline): the offline rules own dark drivers with one card. The limit rules (`limit_*`, `wont_finish`) also require driving or on duty, so a break pauses the clock and the alert resumes with the driver. Late means a customer's window is at risk, not merely behind the plan: the plan slips all day while the world stands still, and the window is the promise.

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
| `break_due` | watch | **the worked example, added live in demos**: ≥ 8h driving since last 30-min break | schedule_reset |

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

Zustand, one store: `{ fleet, scrubOffset, snoozes, corrections, events, lastAction, undoSnapshot, groupBy, devOpen }`. `events` remains the append-only shift log: every action appends `{ seq, at, kind, label, driverId }`. It is retained for future workflows but is not currently rendered in Lookout. Views subscribe to the derived layer, not the raw entities.

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

The product logo is an original line-built `D`: three nested route contours repeat inward like a fleet moving through the same dispatch system. It stands alone in navigation slate with no background tile, so it cannot be mistaken for the filled selected states beside it. The 29px mark is optically centered in a 64px cell, the collapsed route rail's width, directly over the route file's back arrow. A 17px title-case Sora wordmark follows as separate dark text on the white bar, pulled into a tighter lockup with the mark and with no effect on the Bricolage display face used by page and section headings. The bar's right inset matches the mark's left inset so the avatar sits symmetrically; the product bar casts one subtle 16px slate wash downward when it is the lowest layer of navigation; on a route file the Stops bar is the lowest layer and on the map the controls bar is, and that bar casts the same wash instead, so the shadow always sits under the last row of nav and never between two rows, and Lookout casts it leftward. Board and Map share a 192px segmented shell in the left-side navigation flow immediately after the brand lockup. Each half receives equal width; the outer keyline and single internal divider are the same slate ink as the selected fill, so the selected segment's edge is crisp. Each link reaches the shell edges, and the selected view fills its full segment with `nav-selected-ink` under white type—no inner padding, radius, ring, gap, or shadow. Route files remain within the Board workspace, so Board keeps that selected state and the route breadcrumb follows the control. The same shared state helper gives Chat and Artifacts the flat fill treatment without introducing another shadow language.

Two panes. The product bar reads **Dispatch**, then the active **Board** workspace, the shift clock, and the dev toggle; on a route file a breadcrumb continues with "Route Details · RT-01." The route, not its currently assigned driver, is the parent page identity. The bar ends with Lena's local portrait, which opens her settings page and reuses the same dispatcher record and avatar component as that page; her initials remain the image-failure fallback. There is no left nav: the board is the whole product for now. The Status/Region lens lives with the board controls. Main outlet. Lookout sidebar mounted once at app level, reading derived state directly; pages set it to the driver assigned to the focused route. Collapsed, it slides off to the right over 300ms on the gentle curve and gives its width back, staying mounted so the chat keeps its thread; an `Ask Lookout` pill at the right end of the product bar, wearing the act-now count and Lookout's avatar, brings it back.

| Route | View | Phase |
|---|---|---|
| `/` | Active Shift | 1 |
| `/routes/:driverId` | Route file | 1 |
| `/driver/:driverId` | Driver phone | 2 |
| `/map` | Map | 2 |
| `/settings` | Dispatcher settings | 1 |

The board groups by **Status** by default, Act now leftmost, because that is where Lena acts; Region is one click away.

---

**Board and Map are one segmented control** in the product bar. A route file is one level in from whichever of them it was opened from: the link into it carries that origin as router state (`app/origin.ts`), the origin's segment stays selected with the `Route Details · RT-01` crumb after it, the Map segment returns to the map with its pick intact, and the rail's back arrow reads "Back to the map" or "Back to the board" accordingly. A deep link or a reload defaults to the board.

Opening a board route card is progressive enhancement over that same client-side navigation. On a plain primary click, a supported browser snapshots only the selected card, names it `route-card-expand`, and morphs it into the route file's driver summary over 380ms; the rest of the route workspace enters 55ms later with a short fade and lift. The root snapshot does not crossfade, so the product bar and Lookout rail remain visually stationary. Modified clicks, new tabs, unsupported browsers, and reduced-motion users keep normal link behavior; unsupported motion-capable browsers receive only the route workspace's 280ms CSS entrance. This stays on `BrowserRouter` and adds no animation runtime.

## 9. Views

### Active Shift

The miniature card timeline uses shared route-completion endpoints, grading completed paths and markers from light sage at the route origin to dark clear-green at the current progress edge. A future map view should reuse these endpoints for its completed stops and route segment rather than introduce a second progress palette.

**Shift status band.** A compact metric instrument leads the page without promotional copy. An original wide photograph of a fictional Midwestern city and its road network is fully desaturated and contrast-shaped beneath one warm near-black overlay at 70% opacity. The image supplies neutral operational texture, clearly separating the shift overview from Lookout's near-white recommendation surface. The left side follows dispatcher priority — Act now (with the over-limit count attached), Watch, On break, Offline, then Clear — and mirrors the board lanes exactly; each is also a filter shortcut. Every status label, figure, detail, and dot uses the exact light wash behind its corresponding board-lane header, turning those surface colors into legible foregrounds on the dark hero. The right-side throughput metrics remain white and translucent white. It continues the same single-row metric grammar with five equally aligned facts: Trucks, Delivered, To deliver, Total stops, and Delivered percentage. It has no nested header, progress bar, or secondary footer.

**Board.** Columns are status bands by default (Act now, Watch, On break, Offline, Clear), switchable to regions. Every column can collapse to a 40px count rail; Offline and Clear start collapsed so intervention work gets the width. Open/closed per column lives in the store (`columnOpen`), so the Filters menu can set it and a dispatcher's picks survive a lens change. Offline sits after On break and starts collapsed because that band only holds dark-but-clear drivers (a dark driver near the limit is in Act now), and its count stays visible on the rail. Open tracks divide the remaining space by weight and resolve to pixels so collapse/expand animates smoothly. Cards never flex-shrink inside a lane; high-count columns scroll instead. The first control is the board-order dropdown: Lookout's rank is the default, with closest-to-limit, most-stops, and oldest-data alternatives that change sequence only. A single route-filter dropdown stacks the data-driven filters under a title row and a divider, Alert first (one option per rule, read from the rules array), then Status, Data, and Region; Status and Region rows are also the board's columns, so each carries an open/collapsed control, and choosing a row opens its column. Route search follows; the Status / Region / Metrics lens sits at the right edge.

**Metrics.** The third lens beside Status and Region. A compact top-level `Shift metrics` row names the lens and reports the filtered truck count with current shift time; the section titles below carry the explanatory hierarchy. It reads the same filtered, ordered cards the board would show and renders them as charts instead of columns, so a chart and a column never disagree: the fleet by status as a clickable stacked bar (each segment is the band filter), hours driven today as a per-hour histogram stacked by band with an explicit 11-hour threshold zone and Over bin, the closest to the limit as a ranked list with drive-time bars and countdowns, deliveries by region, time since the last break in two-hour bins with an explicit 8-hour due zone, and data freshness. “Who hits the limit when” is a full-width forecast table rather than an overlapping dot strip: only drivers projected to exhaust 11 driving hours before 6 PM receive a row on the shared Now-to-6 axis; over-limit drivers lead, every row names the route and projected clock time, and a separate driving-balance column shows the legal drive time remaining. Its copy states that the plotted clock time includes service time while the balance does not, and drivers outside the visible window collapse into one count. The lens is ordered into three titled groups on the board plane rather than nested containers: Hours of service first, Shift operations second, and Driver readiness last. Every section keeps its title alone at the left and places a larger live summary over its short definition at the right; regional delivery progress uses a full-width two-column list inside Shift operations. Under the title, on a divider, a chart chooser and a search box: pick one chart to see it alone at full width, or type to narrow the chips and the sections to the charts whose names match; the charts are one data list the chooser and the sections both read. Every figure is a pure function in `views/shift/metrics.ts`, tested against the seeded fleet; the view only draws. No chart library: bars are divs and positions are percentages. Band colors appear only where they mean status; every other quantity is neutral, delivered is the completion green, failed is red.

**Route card.** A shared title row leads with an overall-route status dot at the same compact scale as the board-lane header dots and the route id. Route-level operating exceptions such as Won't finish or Offline follow the id as plain semantic text, then a compact muted ping age; status remains fully visible while the lower-priority age may truncate in a narrow lane. The highest-priority badge—Over limit, Approaching limit, or Behind schedule—and countdown share the right edge, exactly as in Lookout recommendations. Over-limit cards use the same critical red border as the route alert card, while `limit_act_now` and `limit_watch` use a lighter red border; other alerts do not trigger either keyline. The full age wording remains in the title tooltip; Lookout omits this optional board metadata. The miniature route spine begins directly beneath that dot and occupies a narrow full-height strip beside the card rows, so the title indicator becomes the visual head of route progress. The first content row uses a four-unit grid: driver identity spans two, Stops one, and Up next one. Its 50% divider aligns exactly with the HOS fit / Route risk divider below. Both progress cells align their enlarged values and labels left with the same compact padding, and the row is tightened to return unused height to the board. Driver name stacks over the truck license identifier beside the avatar, matching the value-over-label rhythm of `14 / 16 Stops` and `#15 Up next`. Every stop remains a node in one evenly spaced scale presented in reverse route order: route-end and newly reassigned work is at the top, remaining stops lead, and completed history descends toward the origin. Successfully delivered stops use smaller 5px connective nodes; unresolved, failed, late, and post-HOS work uses a fixed 6px node. Nothing compresses or magnifies by progress percentage. Completed work grades from light sage to dark clear-green toward the unfinished boundary, viable undelivered work is gray, and failed, past-due, or post-HOS work is red. The route-file timeline keeps one literal labeled row per stop, with only delivered rows tightened. Secondary alert reasons render as plain text in the footer unless promoted to title metadata, and Lookout's first-pick marker follows only when present. Clear cards stay quiet but keep their full height and readable identity in narrow lanes. Click opens the route file. Nothing drags: a card's position is computed, not assigned.

**Empty states.** Nothing needs attention: "All clear. 46 drivers on shift, next check-in in 5s." A filter that matches nothing: say which filter, offer to clear it. A region with no trucks: the column says so.

### Route file (`/routes/:driverId`)

A page in the main pane; Lookout stays open and focuses on the driver currently assigned to this route. The route is the parent record. Its driver assignment can change, and each unresolved stop can move to another route (and therefore to that route's assigned driver) without changing the page's identity. The view has the shape of a case file: a **route rail** down the left, the content to its right.

The route rail shares the miniature timeline's reverse route order and completed-path gradient. The route end, newly reassigned stops, and remaining work appear first; completed history descends toward the route origin. Delivered rows tighten to 32px expanded and 20px collapsed so completed history gives more vertical room to remaining work; labels and click targets remain intact, failed history stays full-size and red, and every node still maps one-to-one to its receipt.

**Route rail.** Flush to the left edge of the route view and stretched beside the scrolling content, in the case-file navigation pattern: the whole-rail collapse toggle at the top (the back link lives in the Stops bar above), a compact completion summary, then the route timeline, which ends at its foot with the route's start time, the moment the truck rolled from the dock. The whole rail defaults collapsed so the driver header and stop grid receive the working width; its percentage, done/remaining count, and one-node-per-stop spine remain visible. Expanded, the completion summary becomes a flat two-cell grid and Route timeline opens to one continuous vertical reverse-route timeline with one distinct node for every stop shown in the main content area. Remaining with freshness, Schedule, and HOS fit live in the Stops bar above, where they stay visible while either the list or map is in use. The route end is at the top and its origin is at the bottom; this presentation does not mutate the ordered route data used by HOS and ETA calculations. The timeline does not use an inset card or dark background. Each expanded row leads with the marker, then shows time above stop number and customer name. A green check means delivered, a neutral gray circle means viable undelivered work, and red means failed, past due, or projected beyond HOS. The exact point where the route crosses the 11-hour limit is labeled on the spine. The node whose receipt is in view is highlighted and kept visible as the dispatcher scrolls, and clicking a node scrolls to its matching receipt.

Content, in reading order:

The route workspace stays in the board's cool slate family but uses a fixed viewport-height gradient: only 22% panel is mixed into `board` at the top, the middle takes 20% `offline-board`, and the bottom deepens past that token with 8% `offline-fill`. The route content scrolls over that stationary field, giving the long file stronger depth and a continuation cue while white cards remain the primary content plane and semantic route surfaces reuse the board-header wash tokens. The driver summary always carries a 3px semantic top rule—critical/Act now red, Watch amber, On break blue, Offline medium slate, and Clear dark navigation slate—so the file has a consistent status-bearing entry edge.

1. **Stops bar.** A single-row white Stops bar is the route file's secondary navigation: 52px tall, fixed directly under the product bar as part of the chrome rather than sticky inside the scroll, spanning the full main pane above the route rail, the assigned-driver summary, exception detail, and stop content, which all scroll beneath it. Its first column, 64px wide like the collapsed rail so the product bar's logo tile sits over it, is the back link to the board or map the route was opened from. The next cell names the route: a dot in the route's band color, then `RT-01` under a `Route` eyebrow, a hairline pipe, and the completion percentage at 18px, the bar's largest reading, from the same `routeCompletionPct` the rail uses. The cell after it puts a `Stops` eyebrow over the value-first `12/20 delivered` title; three narrower fixed-width cells carry Remaining with ping age, Schedule, and HOS fit at a smaller size; and the List/Map control, the same segmented shell as Board and Map, anchors the right. Soft vertical dividers and simple horizontal keylines make the status grid scannable without tint, top-rule decoration, radius, or shadow. No batch action occupies the resting bar; selecting at least one unresolved receipt reveals only `Reassign selected (n)` beside the mode control. Schedule-reset and notification actions remain available from the alert and Lookout flows where their reason is visible.
2. **Assigned-driver header card.** One two-layer card whose identity section begins with the avatar, name, band and drift chips, a scheduled-reset chip when one exists, plate, region, status, the large live countdown, and data age. Beneath it, five full-width equal grid cells carry Driving today, On duty, Break, Stops, and Driving left vs. limit. The metric grid runs edge to edge inside the card with one top rule, simple vertical dividers, consistent padding, and no surrounding inset or gap. When the live HOS countdown is at or below zero, a 3px Act now red keyline replaces the neutral left border across the card height.
3. **Alert card.** Only when alerts exist, directly beneath the assigned-driver card. One three-column horizontal row per firing rule: a semantic warning icon occupies a narrow first column, chip and explanation take the flexible middle, and that alert's no-wrap action group aligns to the far right. A card containing a critical alert gets a restrained Act now border. Multiple alerts use simple internal dividers, copy and actions still come from the rule object, and confirmations remain inline. New rules render here with no new UI.
4. **Stale banner.** If stale or offline, beneath the assigned-driver card and any active alerts: "Last ping 25 min ago. Figures are estimates."
5. **Stop receipts.** Receipts mirror the rail's reverse route order, putting route-end, reassigned, and remaining stops above completed history; each remains the scroll target of its rail node. A dedicated 2.75rem (44px) gutter outside the receipt cards carries the semantic markers and a one-pixel spine that bridges the gaps between receipts, using the rail's graded green completion history before continuing in gray for viable work or red for failed, late, and post-HOS work. That gutter matches the alert card's semantic-icon column, so every receipt starts on the same left edge as the alert's second content cell. Every card begins with the bare stop number in a compact first column, using a 20px sans-serif semibold treatment that remains larger than the rail sequence without dominating customer identity. The second column leads with the status chips (next, past the limit, past window, needs a driver), then customer and address; delivery instructions, the dispatcher note, and the notified stamp sit in a Notes strip along the bottom of the card, so identity stays legible; the third carries the small horizontal event track; and the remaining right side is a consistently padded, single-row grid of four facts. The shared marker renders delivered as a graded green check, viable undelivered as gray outline, late or post-HOS as red outline, failed as solid red, and unassigned as dashed. Completed stops read Arrived → Left → Signed and surface On-site, Outcome, Load, and Priority. Pending stops read Planned → Projected → Window and surface Projected ETA, Window, Load, and Priority. The Priority fact is the delivery-priority source of truth: priority work uses the watch-colored badge there, standard work stays plain text, and identity does not repeat it. Fact values are slightly larger than event metadata. A vertical ellipsis floats at the right edge without a cell or divider and opens the existing stop actions. Unresolved receipts use the entire card as a keyboard-focusable batch-selection target: click toggles one, Shift-click adds the contiguous visible range from the last anchor, and the selected card receives the shared slate wash without masking its operational border. The next stop is highlighted; stops past the limit carry a chip; notified stops show the stamp; unassigned stops show "needs a driver."
6. **Actions.** Route-level Reassign, schedule reset, and notify customer actions open their dialogs, preview, confirm, and commit. Reassign is the one button in act-now red wherever it appears (the alert strip, Lookout, the Stops bar, its dialog) because moving the stops is the intervention; the other actions stay neutral. Every receipt's ellipsis opens stop-level Reassign, Add/edit note, and Cancel. Reassign preselects only that unresolved stop. Notes persist with a reassigned stop. Cancel is confirmed, removes only pending or unassigned work from the active route, resequences the remainder, logs the event, and is undoable; completed and in-progress stops disable Reassign and Cancel with a reason. Position-dependent actions are disabled when data is stale or offline; schedule reset is disabled once one is scheduled.
7. **Driver's phone** button (Phase 2) renders `DriverPhoneView` in a phone frame overlay, so the dispatcher's action and the driver's screen are visible together.

**Stops title row.** The receipts sit under a section heading, `Stops` in the display face with the count beside it, that is also their filter: one chip per object in `views/route/stopFilters.ts`, each with its count. Issue chips (Past the limit, Near the limit, Past window, Failed, Needs a driver) carry a dot in their band color and appear only when they match something, so a clean route shows only All, Undelivered, and Delivered. The predicates are the ones the receipts and the rail already use: past the limit is `stopsPastLimit`, near the limit is the same walk with a 30-minute margin (`stopsNearLimit`), past window is the projected arrival against the delivery window. The pick lives in the URL as `?stops=past_limit`, like the map mode. The rail keeps its full spine; clicking a hidden stop's node clears the filter and scrolls to it.

**List | Map.** A segmented control at the right edge of the Stops band swaps the receipts for a map card that fills the content area; when receipt selection is active, `Reassign selected (n)` appears immediately to its left. The mode is remembered in the URL as `?view=map` so a route can be shared open on its map. The card's header is the rail's legend (delivered, undelivered, late / HOS, truck) plus "Live · 2:47 PM" or, for a stale driver, "Last known position · 25 min ago". The map is OpenStreetMap's tiles muted to paper gray by a CSS filter, so the route is the only color on it, with the legs and stops drawn in the rail's own states: delivered stops in the same light-to-dark completion gradient, undelivered outlined, late and past-limit stops in the act-now outline with their legs dashed red, unassigned stops dashed, the next stop larger. The truck is the pulsing fix from `geo/truckPosition.ts`, gliding along its leg between ticks; stale it turns watch-amber with the halo stopped, offline it is a dashed hollow marker with a permanent "last known" caption. The map fits the route once and never re-centers under the dispatcher; picking a stop on the rail or the map pans to it, and in map mode the rail's active node is that selection rather than the receipt being read. The board never loads Leaflet: the chunk and its stylesheet arrive the first time the toggle is used.

### Lookout rail

One bar, the height of the app header: the tabs on the left, and on the right the name over "AI Agent", Lookout's crisp spectrum-disc pixel face, and the collapse control. **Chat** is the first tab; its act-now count badge is red on the light tab and inverts to white with a red number on the dark selected one. A sticky "✦ Recommended by Lookout" bar sits over the conversation, expanded by default and collapsible to just the bar, carrying one line that reads the shift ("3 need you now. Start with Priya S.") and the top three ranked cards, one per driver with every reason and 2–3 actions, the same handlers as the route file; the rest sit behind "Show N more." Header and body share one continuous field made from the avatar's cyan, pink, orange, mint, cobalt, and violet, each mixed to 6–16% over white. Full recommendation cards reuse the board card's flat shell—route/status header, miniature stop spine, centered driver row, and edge-to-edge dividers—but replace its scan metrics with Lookout's evidence rows and action footer. Inside the colored Recommends panel they take a quieter compact form: a solid white surface, semantic one-pixel keyline, control radius, no shadow, and tighter group spacing. Critical and Act Now alerts use a 55% red keyline, Watch alerts use a 55% amber keyline, and info/quiet plans stay neutral. The shared header leads into one driver label and one short, action-oriented bullet per active alert; overlapping rules become complementary evidence and next-step lines instead of repeated title/body blocks. A lightly divided action footer follows. Chat replies use this same compact form, leaving the spine and expanded driver row to full-card contexts outside the conversational feed. When a route file or a fleet-map pick focuses one driver, the bar stops summarizing the fleet and leads with **plans** for that route (`lookout/plans.ts`): the driver's alerts become concrete, figure-backed recommendations, most urgent first, each opening its dialog already filled in. Reassign stops 14–15 to Ana L. (same region, this much drive time to spare after the move; Marcus keeps 13 and finishes with 12 min left) opens the picker with those stops and Ana pre-picked; Schedule a reset after stop 13 opens the reset dialog on that stop with the reset's end time; Notify 3 customers running late opens the notify dialog with exactly those stops; Call Dre W., no ping for 25 min, is the inline call, with the reassignment lined up but disabled until the truck reports in. A rule the planner does not know (one added live) still gets a plan in the alert's own words with its first action, and a quiet route gets its status: the next stop and time, drive time left, when the route finishes. Every figure comes from the same derivations the dialogs use, so a plan never disagrees with the dialog it opens; the module is pure and tested against the planted scenarios. "What should I do about Marcus?" in the chat answers with the same plans. Under the plans, **Everyone else** shows one card and "Show N more", so the route's own plans stay the point of the rail. The conversation runs underneath. Intent matching is a lookup, not a model (`lookout/intents.ts`): near the limit, offline, and reassign by first name; the no-match reply lists what Lookout can do as tappable examples, and replies render the same cards, so the bar and the thread can never disagree. **Artifacts** is the second tab and currently holds only an explicit empty state, reserving the space for durable Lookout output without implying a finished artifact model. The composer remains available; sending from Artifacts returns the user to Chat.

Lookout never has its own data. It reads `ranked` and nothing else.

### Driver phone (`/driver/:driverId`, Phase 2)

Mobile-first. Header collapses to the driver's avatar and their own countdown chip, the same number Lena sees. Full-bleed map with the route to the next stop. A bottom sheet peeks with the next stop's name, ETA, and window; swipe up reveals the work order: items, instructions, contact, and Arrived / Delivered buttons that write to the store. When Lena reassigns a stop, the phone's next stop changes. The architecture commits to this now: the store is shared, `Delivery` carries items and instructions from day one, positions are seeded from day one, and `StopReceipt` and the map component are shared between the route file and the phone.

### Map (`/map`)

The fleet on one map, a Map tab beside Board in the product bar. It reads the same ranked list as the board and takes the board's filters (status, data, region, search), so "37 of 50 trucks" means the same thing on both. The attention rule applies: clear and on-break trucks are small neutral dots, dark and unmistakable but colorless, with a hover tooltip; act-now, watch, and offline trucks carry their band color and a name-and-countdown pill ("Marcus R. · 0:12", "Dre W. · ~0:40 · last seen 25 min ago"); a dark truck is hollow and dashed whatever its band, because its fix is last known, not live. Every fix comes from `geo/truckPosition.ts`, so the trucks move with the same tick as everything else. Picking a truck (or arriving at `/map?driver=drv-01`) puts a small card over the map (name, route, plate, region, band, countdown, stops left, "Open route file"), draws that driver's whole route in the rail's states (delivered stops in the completion gradient, undelivered outlined, late and past-limit stops red with dashed legs, the next stop larger), frames the route, and focuses Lookout on that driver so its card and actions are one glance to the right. "Fit all" re-frames every visible truck. `geo/fleet.ts` turns views into markers and is tested against the seeded fleet, so the map view holds no logic. The route file's own map is the List | Map toggle described above.

---

### Settings

Lena's page, reached from her avatar at the end of the product bar, is a hybrid: a working settings view for her and the story of the build around her. A full-height sticky rail at the left walks Project, Lena, Problems, Solutions, Why, with the pick in the URL as `?section=`; Lena's compact operator card and the project author stay at its foot. The chapter content is centered in the remaining workspace at a readable 54rem maximum. Project opens with one dark case-study surface and three live mini-instruments derived from the same shift model as the board: fleet status distribution, delivery progress, and HOS exposure against the 11-hour line. Lena is the working settings view: who she is from `data/dispatcher.ts`, the desk today from derived state, the real-clock toggle calling the same store action as the shift panel, and the alert rules rendered straight from the rules array. Problems, Solutions, and Why remain narrative data in `views/settings/story.ts`, presented as numbered evidence rows and compact fact grids; the design decks from `data/designFiles.ts` stay linked where they belong, and a deck without an `href` shows as in progress. The page adds no second source of truth and no decorative fake metric.

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
| Offline driver on the map | Dashed hollow truck at its last known fix with a permanent "last known · N min ago" caption; legs and stops still draw | Route map |
| Late planted driver on the map | The truck holds at 96% of its leg instead of landing on a stop that is still pending | Route map |
| Map tiles unreachable | The basemap stays a blank canvas; legs, stops, the truck, and the attribution draw regardless | Route map |
| Fleet map filters hide every truck | The count reads 0 of 50 and Clear resets the filters; the map keeps its last framing | Fleet map |
| Selected truck on the fleet map is dark | Hollow dashed marker at the last known fix, the card says "last known position", and the whole route still draws around it | Fleet map |
| Two alerts, one driver | One card, two reasons | Rail, card badges |
| Acknowledge | Snoozed 10 min, de-emphasized, never hidden for critical/act now; snooze expiry restores emphasis | Rail |
| Reset mid-route | Stops after the reset point become unassigned; `stops_unassigned` fires; metrics show "need a driver" | Route file, metrics, rail |
| All stops done | "Finished, heading in"; no exposure; card goes quiet | Card, route file |
| Clock scrubbed far ahead | The generated fleet keeps completing stops; the planted scenarios hold still and accumulate | Simulated-shift panel |
| Clock scrubbed back | Receipts with a departure after the clock are pending again, duty hours count only up to the clock, and a driver who went dark at 2:22 is fresh at 2:00, because he was | Simulated-shift panel |
| Real time outside the day | Before 6:00 AM the shift has not started, after 6:00 PM it is over; the board reads that way and the panel says so, with 2:47 one click back | Simulated-shift panel |
| Empty filter, empty region, nothing to flag | Explicit empty states | Board |
| Undo | Last action reversible for 10s from the result toast, always from the simulated-shift panel | Toast, panel |

---

## 11. Visual system

Warm, dense, calm, and direct. This is operations software used mid-shift, expressed with paper neutrals, near-black type, and modest radii. Lookout's AI moments add a restrained ember-to-gold-to-rose-to-violet-to-blue spectrum; the gradient is never used for operational severity. The system rhymes with contemporary product software without borrowing a logo, branded asset, layout, or exact palette.

**Tokens** (Tailwind v4 `@theme`, all in `index.css`; components use tokens only, never raw hex):

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#f8f6f3` | Warm paper page ground |
| `--color-board` | `#f1f3f6` | Cool porcelain ground for the live board, with visible separation from white cards |
| `--color-panel` | `#ffffff` | Cards, rail |
| `--color-well` | `#f1ede9` | Inset grounds, column backgrounds |
| `--color-line` | `#e3ddd7` | Keylines |
| `--color-nav-selected` / `-ink` / `-line` | `#e2e7ef` / `#424c60` / `#c7d0dc` | Navigation slate. `-ink` is the darkest primary color: the selected workspace, board-lens, and Lookout item fill with it under white type, and the truck mark and Dispatch wordmark are set in it; the light value is the hover and the receipts' selection wash |
| `--color-ink` | `#211e1c` | Text, primary buttons |
| `--color-muted` | `#625d59` | Secondary text |
| `--color-label` | `#6d6661` | Micro-labels on panel only |
| `--color-lookout` / `-strong` / `-soft` | `#cf4620` / `#a93817` / `#fff0e9` | Accessible orange for Lookout |
| `--color-ai-warm` / `-gold` / `-rose` / `-violet` / `-cool` | `#f45b2b` / `#e9ad48` / `#d979aa` / `#8259d6` / `#4f7cdd` | Decorative AI rings and soft washes only |
| `--color-act-now` / `-fill` / `-soft` | `#9f1f3b` / `#cb3453` / `#fff0f3` | Act now and Over limit |
| `--color-watch` / `-fill` / `-soft` | `#755000` / `#c88708` / `#fff6df` | Watch |
| `--color-clear` / `-fill` / `-soft` | `#165d3f` / `#2f9164` / `#eaf8f0` | Clear (muted) |
| `--color-route-done-start` / `-end` | `#9bc5ae` / `#276548` | Completed route path from route origin to current progress edge; reusable by the future map |
| `--color-offline` / `-fill` / `-soft` | `#424c60` / `#738099` / `#eff2f6` | Offline, dashed/hollow |
| `--color-break` / `-fill` / `-soft` | `#28549a` / `#477bd0` / `#edf3ff` | On break |
| `--color-*-board` | `#f8d6df` / `#f5dfa7` / `#dce3ed` / `#d8e5fb` / `#d3eedf` | Vivid Act now → Clear lane washes, in board order |
| `--color-act-now-hero` / `--color-act-now-hero-text` | `#ff7a90` / `#ffb3c1` | The one saturated red on the dark shift instrument: the Act now dot and count, and a lighter companion for its 9px label (3:1 and 4.5:1 against the band's brightest patch) |
| `--color-on-accent` | `#ffffff` | Text on saturated grounds |

Over the limit is the one state that must never be missed: its chip is dark red with white text and a diagonal hazard stripe everywhere it appears. The texture belongs to the critical chip token rather than any individual surface, and does not extend to markers or red alert text. Text variants must pass AA on panel; fills are for bars and markers. The AI spectrum is decorative and never carries meaning or body copy. Validate the semantic pairs whenever tokens move. Watch's text color is deliberately darker than its fill so it clears AA while staying distinct from Lookout's orange.

**Type.** Bricolage Grotesque Variable for display: page titles, the large countdown, metric numbers. Inter Variable for the operational interface, `font-variant-numeric: tabular-nums` on every countdown and duration so rows never jitter. IBM Plex Mono distinguishes Lookout-authored language and agent chrome, while shared evidence cards and actions stay in the operational faces. Three faces, no serif.

**Shape and rhythm.** 10px radius on cards, 8px on controls, pill chips. Rows ~40px, cards compact, whitespace spent on grouping. Quiet keylines, one diffused shadow level. Phosphor duotone icons. Motion stays functional: countdown ticks, subtle band changes, and the selected board card expanding into its route summary; reduced motion disables spatial transitions. Light only.

**Illustration (Phase 2 polish).** A custom two-tone truck mark can replace the Phosphor glyph without touching layout. "Cards shaped like trucks with a trailer" is an experiment to try once the board works, kept only if it costs no scanability.

---

## 12. Testing

Vitest, `*.test.ts` beside the module. No UI snapshot tests; the derivation tests are the ones worth reading.

- `hos/compute.test.ts`: ongoing segment closes at now; break pauses accumulation; `segmentsKnownAt` hides post-ping segments; thresholds at exactly 30:00, 90:00, 0:00; staleness at 3 and 15; `limitHitAt` skips service time; drift sign.
- `alerts/rank.test.ts`: one card per driver; severity then time then staleness; stable order across two ticks; snooze demotes but never removes act now.
- `alerts/rules.test.ts`: each planted driver trips exactly the rules the table in §4 says.
- `bands.test.ts`: offline inside the watch window is act now; offline and clear is offline.
- `data/seed.test.ts`: same seed, same fleet; planted drivers present with the planted figures at the anchor.
- `derive.test.ts`: the one-source-of-truth test: the rail's order equals the board's within-column order for the same driver set.
- `geo/truckPosition.test.ts` and `.seed.test.ts`: the fix at the dock, mid-leg, before the first receipt, after the last, capped when a planted driver is late, skipping unassigned stops, and as of the ping; then every seeded truck inside the metro at 2:47, Dre's fix holding still while offline, and a fresh truck moving between ticks.
- `geo/fleet.test.ts`: one marker per seeded driver; Marcus and Priya carry act-now pills with their countdowns, Omar a watch pill, Elena and Lucia stay quiet, Dre is dark with "last seen 25 min ago"; Marcus's road ahead runs from his fix through stops 13–15.
- `lookout/plans.test.ts`: Marcus gets stops 14–15 handed to Ana L. and a reset after stop 13; Priya gets the call first and never the marginal Ravi P.; Dre gets the call and a reassignment held until his truck reports in; Tomas gets his unnotified late customers; complete, on-break, and clear routes get their status.

---

## 13. Phasing and budget

**Phase 1, the shippable product.** Shell, routing, tokens · data, seed, clock, pings · compute, rules, rank, bands, tests · store, actions, undo · Active Shift with metrics, board, cards, filters · Lookout rail · route file with header, alert strip, metrics, ribbon, duty timeline, receipts · the three action dialogs · staleness, copy, empty states · deploy, README, DECISIONS.

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

Minutes are focused build effort for a person directing tools; executed by an agent from the implementation plan, the wall-clock is shorter. The core was scoped with discipline, and the extras are labeled as extras in `DECISIONS.md` and the README.

If behind at the two-thirds mark: drop the notify dialog to a single confirm, collapse Clear cards to a count, keep the ribbon, the receipts, and the reassign flow.

**Phase 2, only after Phase 1 is deployed.** Driver phone view · map · chat intents · scrubber polish · illustration.

**Build order.** Thin vertical slice first: seed → compute → one rule → one card → route file header → one action. Then widen.

---

## 14. The live change

`rules.ts` is open. Append `break_due`: id, label, `watch`, `when: v => v.breakDueIn >= 480`, a message in Lookout's voice, `['schedule_reset']`. Save. Vite HMR. Sam K.'s card gains a badge on the board and a reason in the rail. Delete it, add it again, under two minutes, narrating. If they ask for a filter instead, `filters.ts` has the same one-object shape and nothing needs planting.
