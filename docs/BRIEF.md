> **2026-09-03 —** `ARCHITECTURE.md` supersedes this file where they differ: the route file is a full page, the main view is a region-column board ranked by urgency (the list view is dropped), the co-pilot is **Lookout**, the clock is simulated at 2:47 PM with simulated pings, and the visual system moved to warm neutrals with Bricolage Grotesque + Inter.

# BRIEF — Dispatcher's Dashboard

Source of truth for what we're building, why, and in what order.

---

## 1. The problem

**Context.** Fleet logistics & dispatching. The Dispatcher is the "brain" of fleet operations: ~50 heavy-duty trucks, 1,000+ deliveries daily. The goal is to keep the machine running despite traffic, equipment failure, and strict legal regulation.

**The product.** The primary **"Active Shift" Dashboard** — the view the dispatcher lives in. Phase 1 focuses on **one** variable: **HOS (Hours of Service)** — drivers have a legal 11-hour driving limit; the system must flag those nearing their mandatory reset. What a dispatcher needs at a glance is the design problem. How the information is organized and how edge cases are handled come before pixel polish.

**Phase 1 delivers.** Real running front-end code:
- The main Active Shift dashboard view
- One exception flow — the HOS alert: surfacing a driver nearing the 11-hour limit / mandatory reset, and the drill-in from that alert
- Driven by a real data model (drivers / trucks / deliveries with attributes), with working interactions
- Time-until-reset computed from the data, not hardcoded

**Not in Phase 1.** Every HOS constraint, the full fleet. Scaling and the other rules are covered in §4 and §6. The rules array is built so that a new alert type or filter is one object, small enough to add live in a demo.

---

## 2. Design principles

The answers the product is built around.

### Show exceptions, not the fleet

A dispatcher doesn't need to see 50 trucks. They need to see the four that are about to break. The primary surface is a **triage feed ranked by time-to-violation**, not a table of everything. Fleet-wide state lives in a compact metrics strip. Visual precedence is urgency × consequence, expressed through banding: **act now / watch / clear**, plus **offline** as its own band because unknown-and-high-stakes is a dispatcher's worst state.

### Predict, don't react

The HOS countdown is derived from duty segments against a live clock. The alert exists *before* the violation and carries its intervention options with it. An alert that fires after the fact is useless — the entire job is intervening in time.

### Treat stale data as a state

Every driver and truck carries `lastPingAt`. Staleness tiers — **fresh** (<3 min) / **stale** (3–15 min) / **offline** (>15 min) — are derived and visible. Projections on stale data are labeled as estimates with their age ("~22 min, as of 9 min ago"). Offline drivers near their limit sort *up*, not down. The system says "we don't know" rather than displaying a confident number it can't stand behind.

### Insight → action, with a confirm

Every alert card carries the actions a dispatcher would actually take: reassign remaining stops, schedule the reset, notify the customer. Every action confirms before it commits. The co-pilot and the main view read the same derived alerts — one source of truth, two presentations.

---

## 3. Interaction model

The dashboard borrows the pattern of a **proactive co-pilot** — the kind of assistant that surfaces what needs attention in a personalized feed, lets the operator act from the card, confirms before publishing, and is honest about the limits of its data. See `docs/LAYOUT.md` for the shell and `docs/FLOWS.md` for the flows.

| Pattern | Dashboard expression |
|---|---|
| Proactive, ranked feed | Co-pilot **alert bar** (top 3 most pressing) + **recommendation cards** |
| Insight → action in one step | Actions live on the card |
| Confirm before publishing | Every action has a confirm step |
| Plain-language copy | "Marcus hits his limit in 18 min with 3 stops left" |
| Honesty about uncertainty | Estimates labeled with data age; offline states surfaced |
| Conversational entry | Chat with a small set of matched intents (Phase 2) |

---

## 4. Domain notes — Hours of Service

FMCSA rules for property-carrying drivers, simplified. Phase 1 covers only the 11-hour limit and the mandatory reset; the rest inform scaling and are candidates for additional alert rules.

| Rule | Summary | In scope |
|---|---|---|
| **11-hour driving limit** | Max 11 hours driving after 10 consecutive hours off duty | **Core** |
| **10-hour reset** | 10 consecutive hours off duty before driving again | **Core** |
| 30-minute break | Required after 8 cumulative driving hours without a 30-min interruption | Next rule — one object in `rules.ts` |
| 14-hour window | No driving past the 14th consecutive hour on duty, regardless of breaks | Extension |
| 60/70-hour limit | Max on-duty hours over 7/8 consecutive days | Scaling discussion |

---

## 5. Data model

```ts
type DriverStatus = 'driving' | 'on_duty' | 'on_break' | 'off_duty'

interface DutySegment {
  status: DriverStatus
  startedAt: number          // epoch ms
  endedAt?: number           // undefined = ongoing
}

interface Driver {
  id: string
  name: string
  truckId: string
  routeId?: string
  shiftStartedAt: number
  segments: DutySegment[]    // source of truth for HOS math
  lastPingAt: number         // staleness derives from this
}

interface Truck {
  id: string
  plate: string
  region: string
  position?: { lat: number; lng: number }   // map view only
  lastPingAt: number
}

interface Route {
  id: string
  driverId: string
  stops: Stop[]              // ordered; remaining stops drive the reassign action
  windowEnd: number
}

interface Stop {
  id: string
  deliveryId: string
  address: string
  eta: number
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  priority: 'standard' | 'priority'
}
```

**Derived (pure, `src/hos/compute.ts`)**
- `drivingMinutes(driver, now)` — sum of `driving` segments; ongoing segment closed at `now`
- `minutesUntilLimit(driver, now)` — `660 − drivingMinutes`
- `hosStatus(driver, now)` — `'clear' | 'watch' | 'act_now' | 'violation'`, thresholds as constants
- `staleness(entity, now)` — `'fresh' | 'stale' | 'offline'`
- `routeProgress(route)` — done / total, next stop, remaining ETA

**Planted seed scenarios** (deterministic, so the demo is reliable)
- One driver ~12 min from limit with 3 stops left — the hero alert
- One driver just past the limit — violation state
- One driver offline 25 min while ~40 min from limit — unknown + high-stakes
- One driver on break — proves segments are understood
- Several comfortably clear — the feed isn't all red

**Dev control.** A time scrubber (+15m / +1h) so an alert can be triggered on demand.

---

## 6. Scope

### Phase 1 — core (shippable)
- Three-pane shell
- Metrics strip: active / approaching limit / on break / offline / stops remaining
- **List view**: roster sorted by time-to-limit, banded, filterable (status · staleness · region)
- **Co-pilot pane**: alert bar (top 3) + recommendation cards with actions
- **HOS drill-in**: driver, truck, live remaining time, data age, duty timeline, route progress, actions with confirm
- Staleness states throughout

### Phase 2 — after Phase 1 is deployed
- **Board view**: columns = HOS band (act now / watch / clear / on break / offline); cards = drivers with route progress. Optional group-by region.
- **Chat**: 3–4 matched intents ("who's within 30 min of limit?", "show offline drivers", "reassign Marcus's stops")
- **Map view**: Leaflet + OSM tiles, fake positions around one metro, markers colored by band. Lazy-loaded. Never required.

### Out
Routing, auth, real LLM, settings, mobile layouts, animation polish.

---

## 7. Time budget

| Block | Min | Output |
|---|---|---|
| Shell + nav + panes | 20 | Layout in place, empty |
| Seed + compute + planted scenarios | 30 | Numbers right |
| Rules engine → alerts array | 20 | One object per rule |
| Metrics strip + list view + filters | 40 | Main view |
| Co-pilot: alert bar + cards | 25 | Right pane |
| Drill-in + confirmed actions | 30 | Exception flow |
| Staleness + copy pass | 15 | Edge cases visible |
| Deploy + README + DECISIONS | 10 | Shippable |
| **Phase 1 total** | **~3h** | |
| Board view | 30 | Phase 2 |
| Chat intents | 30 | Phase 2 |
| Map | 30 | Phase 2 |

If behind at the 2-hour mark: reduce filters to one, collapse the roster to counts, keep the drill-in and the co-pilot cards.

---

## 8. Demo script (20 min)

**The user (2 min).** A dispatcher running a shift — see `docs/LAYOUT.md` for the persona. Hands full, interrupted constantly, legally exposed if a driver goes over. Her job is not monitoring; it's intervening in time.

**The jobs (3 min).**
1. Know who's about to break, before they break
2. Decide what to do about it in one motion
3. Trust the data — or know when not to

**Key decisions (12 min).**
1. Exceptions, not fleet — why the primary surface is a ranked feed
2. Predictive countdown — how time-to-limit is computed and why it's live
3. Stale data as a state — the tiers, the labeling, why offline sorts up
4. Insight → action with confirm — the co-pilot pattern
5. Rules as data — why alerts live in an array, and how the other HOS rules slot in

**What was cut and why (2 min).** Routing, the full fleet, the 14-hour window — each with a one-line reason.

**Extending the rules.** `rules.ts` open. Add the 30-minute break rule as one object; Sam K.'s card appears.

---

## 9. References

- FMCSA Hours of Service summary: https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations
- Leaflet: https://leafletjs.com · OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
