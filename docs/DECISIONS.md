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
| 8 | Simulated shift clock anchored at 2:47 PM, ticking live, with simulated pings for online drivers | Deterministic demo at any hour; scrubbing never blacks out the fleet |
| 9 | Route file is a full page, not a side sheet | Receipts and the ribbon need the room; Lookout stays open beside it |
| 10 | Main view is a region-column board ranked by urgency within columns; the list view is dropped | Top row = the worst problem in each region, which is how a dispatcher thinks about a fix |
| 11 | Offline inside the watch window fires at act-now severity | Making contact can't wait; every minute blind is lead time lost |
| 12 | `Delivery` is a named entity; stops carry arrival, departure, outcome | The brief asks for deliveries with attributes, and receipts need them |
| 13 | The co-pilot is Lookout; coral is its only color | Names the job; doesn't pretend to be a person; nothing else wears coral |
| 14 | Fresh scaffold; Meridian patterns ported by hand, not forked | Reviewers read package.json; no drag-and-drop, theme, or SDK baggage |
| 15 | Behind-schedule and won't-finish rules ship in Phase 1 | The ribbon and the rules share one math; five rules make the pattern obvious before the live change |
| 16 | Driver phone and map are Phase 2, but positions and work-order fields are seeded from day one | Cheap now, expensive later |
| 17 | Phase 1 deliberately exceeds the 2–3h guidance; the README states the real time spent | Core scoped with discipline; extras labeled as extras |
| 18 | Scenario anchor moved from 12:47 PM to 2:47 PM | A driver near the 11-hour limit has been on duty ~12h; a 2:40 AM start reads as freight, a 12:40 AM start reads as a bug |
| 19 | Lookout reads derived state directly; pages set a focus driver through context, no per-page portal | Simpler to read on a shared screen; same behavior |
| 20 | Limit rules speak only for drivers who are driving or on duty and visible; the offline rules own dark drivers; a break pauses the alert | One card per driver with one story; found when the won't-finish rule doubled Dre's offline card |
| 21 | Rank sorts time-to-limit in whole minutes | Sub-minute differences between a driver at a dock and one on the road were swapping cards every tick |
| 22 | Generated drivers mostly run within a few minutes of plan; about one in twelve runs late | The first generator crowded the Watch band with a dozen behind-schedule drivers and diluted "exceptions first" |
| 23 | TICK_MS = 5000 with minute-precision countdowns | No false precision; seconds would jitter and mean nothing at a 5-second ping |
| 24 | All 18 text/ground token pairs pass AA (`node scripts/contrast.mjs`) | Watch text is darker than its fill on purpose so it clears AA and stays distinct from Lookout's coral |
| 25 | Planted days are built in one walk so segments and receipts agree | A reviewer found Marcus delivering five stops inside an unbroken driving segment |
| 26 | `scheduleReset` writes the planned legs and service as planned segments | With only an off-duty block, service time was charged as driving and the reset landed 11 min over |
| 27 | Every rule but the offline pair is gated on visibility | A dark driver was collecting three cards' worth of reasons |
| 28 | Late means a projected ETA past the delivery window, not past the plan | With the world frozen, plan drift made 40 of 50 drivers "behind" within an hour of demo time |
| 29 | Drive time left is a quantity; the limit's clock time is a projection. The header shows one, the ribbon the other | They are different questions, and labeling them as such is more honest than forcing one number |
