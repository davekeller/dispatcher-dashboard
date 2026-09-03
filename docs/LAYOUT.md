> **2026-09-03 —** `ARCHITECTURE.md` supersedes this file where they differ: the route file is a full page, the main view is a region-column board ranked by urgency (the list view is dropped), the co-pilot is **Lookout**, the clock is simulated at 2:47 PM with simulated pings, and the visual system moved to warm neutrals with Bricolage Grotesque + Inter.

# LAYOUT — Shell, views, co-pilot, persona

---

## 1. The user

**Lena Vasquez** — dispatcher, regional carrier, day shift (06:00–16:00). 41. Drove for six years before moving to the desk; still thinks like a driver. Runs ~50 trucks with one other dispatcher on shift. Two monitors, a headset, a phone that never stops. Interrupted every few minutes.

What she's accountable for: every stop delivered inside its window, no driver over the legal limit on her watch. An HOS violation is a fine for the company and a mark on the driver's record — she takes both personally.

What she actually does all day: not monitoring. **Intervening.** The dashboard exists to tell her *who* needs her *now*, *why*, and *what her options are* — then get out of the way.

What she distrusts: a number that looks confident when the truck hasn't pinged in twenty minutes.

---

## 2. Shell

Three panes. Fixed left nav, flexible main, collapsible right co-pilot.

```
┌──────┬────────────────────────────────────────┬──────────────────┐
│      │  Active Shift            [List][Board][Map] │  ● Alert bar     │
│ Nav  │──────────────────────────────────────────│  top 3, live     │
│      │  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐│──────────────────│
│ ▸Shift│  │ 46   ││  4   ││  3   ││  2   ││ 312  ││  Recommendations │
│  Drivers│ active││approach││ break ││offline││stops ││  ┌────────────┐ │
│  Routes│ └──────┘└──────┘└──────┘└──────┘└──────┘│  │ Marcus R.  │ │
│  Reports│                                        │  │ 18 min ·   │ │
│      │  Filters: [status ▾][data ▾][region ▾]    │  │ 3 stops    │ │
│      │──────────────────────────────────────────│  │ [Reassign] │ │
│      │  ACT NOW (4)                             │  │ [Reset]    │ │
│      │  ▌ Marcus R.   0:18  ▮▮▮▮▮▮▮▮▮▮░  3 left │  └────────────┘ │
│      │  ▌ Priya S.    0:31  ▮▮▮▮▮▮▮▮▮░░  5 left │  ┌────────────┐ │
│      │  ▌ Dre W.  ⚠ offline 25m  ~0:40 est.     │  │ Dre W.     │ │
│      │  WATCH (9)                               │  │ offline    │ │
│      │  ▌ ...                                   │  └────────────┘ │
│      │  CLEAR (33)                              │──────────────────│
│      │  ▸ collapsed                             │  Chat            │
│      │                                          │  > ask...        │
└──────┴────────────────────────────────────────┴──────────────────┘
```

### Left nav
Light. Enough to show this is one view inside a product, not the whole product. Items: **Active Shift** (selected), Drivers, Routes, Reports. Only Active Shift is built. Others render a placeholder. Collapsible to icons.

### Main pane
- **Header**: view title, view toggle (List / Board / Map), shift clock, dev time-scrubber (hidden behind a keyboard shortcut or a small "dev" toggle).
- **Metrics strip**: five cards. Active drivers · Approaching limit · On break · Offline · Stops remaining. Each is a filter shortcut — clicking "Approaching limit" filters the view.
- **Filters**: status band · data freshness · region. Config-driven (`src/filters.ts`).
- **View**: List (Phase 1), Board (Phase 2), Map (Phase 2).

### Right co-pilot pane
Named. Has its own identity — not the product's. Collapsible to a rail with a badge count.

- **Alert bar** (pinned top): the three most pressing alerts, one line each, color-banded, live countdowns. Click → drill-in.
- **Recommendations**: the full ranked alert list as cards. Each card: driver, why, countdown, data age, and 2–3 actions. Actions confirm inline.
- **Chat** (Phase 2): an input. Matched intents, not a model. Responses render as the same card components.

The co-pilot **never has its own data**. It reads the same `alerts` array the main view reads. If they ever disagree, that's a bug.

---

## 3. Views

### List (Phase 1)
Roster grouped into bands, sorted within band by time-to-limit ascending.

Row: band marker · name · truck · **time-to-limit** (live, monospace) · drive-time bar (11h scale) · route progress (`done/total`, next stop) · data age · actions on hover.

Bands, in order: **Act now** (≤30 min) · **Watch** (30–90 min) · **Offline** (no ping >15 min and last-known HOS clear — unknown is its own kind of urgent; offline *inside* the watch window sorts into Act now with a hollow marker) · **On break** · **Clear**. Clear collapses by default.

Offline rows show the last known time-to-limit as an estimate with age: `~0:40 est · 25m ago`.

### Board (Phase 2)
Columns = bands (same five). Cards = drivers. Card shows name, countdown, mini route progress bar, data age chip. Drag is **not** supported — a driver's band is computed, not assigned. Optional **group by region** switches columns to regions with band as card color, for the "where are my problems" question.

Adapt existing board components from prior work; restyle, don't rebuild.

### Map (Phase 2)
Leaflet + OpenStreetMap tiles. One metro. Fake positions generated along fake routes. Markers colored by band, offline markers hollow with a "last seen" tooltip. Click → drill-in. Lazy-loaded so it costs nothing if unused. A fallback message if tiles fail to load — the map is never on the critical path.

---

## 4. HOS drill-in

Opens as a full page in the main pane (`/routes/:driverId`); Lookout stays open and focuses on this driver. See `ARCHITECTURE.md` §9 for the route file, including the route ribbon and stop receipts.

- **Header**: driver, truck, region, band, live countdown large, data age
- **Duty timeline**: today's segments as a horizontal bar — driving / on-duty / break / off — with the 11h limit and 14h window marked
- **Route**: stops list with done / next / remaining; remaining ETA vs. time-to-limit (the number that matters)
- **Actions** (each confirms):
  - **Reassign remaining stops** → picker of drivers with capacity (sorted by proximity if map data exists, otherwise by available drive time) → confirm → route updates, alert clears
  - **Schedule reset** → picks the reset point (after stop N) → confirm → driver's segments gain a planned off-duty block, countdown reflects it
  - **Notify customer** → pre-filled message for affected stops → confirm → stops flagged as "notified"
- **Stale state**: if data is stale/offline, the header shows a banner ("Last ping 25 min ago — figures are estimates") and actions that depend on position are disabled with a reason.

---

## 5. Alert copy

Written like a competent colleague, not a system log.

| Situation | Copy |
|---|---|
| Approaching | **Marcus R. hits his limit in 18 min** with 3 stops left. |
| Violation | **Priya S. is over her limit** by 6 min. She needs to stop now. |
| Offline near limit | **Dre W. hasn't pinged in 25 min.** Last estimate: ~40 min to limit. |
| Break due | **Sam K. needs a 30-min break** before 2 more hours of driving. *(Phase 2 rule)* |
| Resolved | **Marcus's stops reassigned to Ana L.** Marcus can reset after stop 7. |

---

## 6. Visual system

Neutral, dense, calm. This is ops software used mid-shift.

- **Type**: one sans, tight scale. Countdowns in tabular/monospace figures so they don't jitter.
- **Color**: near-monochrome base. Bands carry the only saturated color: act-now (red), watch (amber), clear (green, muted), offline (slate, hollow/dashed), break (blue, muted). Color is always paired with a label or icon.
- **Density**: rows ~40px. Cards compact. Whitespace goes to grouping, not decoration.
- **Motion**: none beyond countdown ticks and a subtle band-change transition.
- **Dark mode**: not built. Light only.
