# DECISIONS

One line per meaningful choice or cut. Newest at the bottom.

| # | Decision | Why |
|---|---|---|
| 1 | Exceptions-first: primary surface is a ranked feed, not a fleet table | A dispatcher intervenes; she doesn't monitor |
| 2 | HOS derived from duty segments against a live clock | The brief requires computed, not hardcoded; segments generalize to other rules |
| 3 | Alerts and filters are config arrays | Adding a rule is one object; cheap to extend, easy to read |
| 4 | Staleness is a first-class state with its own band | Unknown + high-stakes is the worst state a dispatcher can be in |
| 5 | Co-pilot reads the same alerts array as the main view | One source of truth; two presentations |
| 6 | Every action confirms before it commits | Consequential actions should feel consequential |
| 7 | Board and map are Phase 2, behind a toggle, never on the critical path | Scope discipline; the list is the product |
| 8 | Simulated shift clock anchored at 12:47 PM, ticking live, with simulated pings for online drivers | Deterministic demo at any hour; scrubbing never blacks out the fleet |
| 9 | Route file is a full page, not a side sheet | Receipts and the ribbon need the room; Lookout stays open beside it |
| 10 | Main view is a region-column board ranked by urgency within columns; the list view is dropped | Top row = the worst problem in each region, which is how a dispatcher thinks about a fix |
| 11 | Offline inside the watch window fires at act-now severity | Making contact can't wait; every minute blind is lead time lost |
| 12 | `Delivery` is a named entity; stops carry arrival, departure, outcome | The brief asks for deliveries with attributes, and receipts need them |
| 13 | The co-pilot is Lookout; coral is its only color | Names the job; doesn't pretend to be a person; nothing else wears coral |
| 14 | Fresh scaffold; Meridian patterns ported by hand, not forked | Reviewers read package.json; no drag-and-drop, theme, or SDK baggage |
| 15 | Behind-schedule and won't-finish rules ship in Phase 1 | The ribbon and the rules share one math; five rules make the pattern obvious before the live change |
| 16 | Driver phone and map are Phase 2, but positions and work-order fields are seeded from day one | Cheap now, expensive later |
| 17 | Phase 1 deliberately exceeds the 2–3h guidance; the README states the real time spent | Core scoped with discipline; extras labeled as extras |
