# Activity: the shift's record

**Ask (Dave, 2026-09-09):** Replace Lookout's reserved Artifacts tab with Activity: a timeline of what Lena did this shift (reassigned routes, calls, resets, notes) so she can see her day and go back to review a decision. Simple filters at the top, card objects on a timeline. Her actions, plus quiet context markers for what the shift did around her.

**Design.** Two sources, one array.

1. **Her actions** come from the store's append-only `events` log, which every action already writes. Each event gains a typed `detail` (what she did: the stops, from → to, the candidate's spare time, the reset's start and end, the ping age, the note, the rule snoozed) and a `context` snapshot of the driver at that moment (HOS status, staleness, minutes to the limit, the alerts firing). Both are captured **before** the mutation, from the same `derive()` the views use, so a card shows exactly what the board and Lookout showed when she clicked. Every figure is the dialog's own number from the same helper (`reassignCandidates`, `projectedDepartureAt`, `projectedEta`).
2. **Context markers** are derived, never logged, on the same principle as alerts: *entered Act now* and *went over the limit* sit where the driver's known driving minutes crossed 630 and 660 (`drivingReachedAt` in `hos/compute.ts`, reading `segmentsKnownAt` like everything else); *stopped pinging* sits at an offline driver's last ping. Driving minutes only grow, so limit markers persist all shift; a dark marker resolves when the truck reports in, and the reconnect card keeps how long it was dark.

`src/activity/derive.ts` — `activityFeed(events, derived)` merges the two, newest first, folds each undo onto the card it reversed (`Undone at 2:44`; the undo is not its own card), and groups by hour. It is the one array the panel reads.

| Event | Card says |
|---|---|
| Reassign | Stops 14–15 (customers) · Marcus R. → Ana L. · Ana's spare drive time after the move |
| Schedule reset | After stop 13 (or now) · off duty 3:02–1:02 AM · N stops need a driver |
| Notify customers | Each stop, projected ETA and window end |
| Call driver | Ping age at the time |
| Note / Cancel | The stop, the note (and what it replaced) |
| Snooze | The rule, until when |
| Back online | Dark for N min · the countdown correction |
| Arrived / Left | The stop and outcome |

Every card carries the context chips (Act now · 12 min left · Offline 25 min) and a link into the route file.

**Filters are data.** `src/activity/filters.ts` mirrors `src/filters.ts`: a `family` multi filter (Routing: reassign, reset, cancel · Contact: call, notify · Notes · Snoozes · Shift: markers, reconnect, start) rendered as chips, and a text search over driver names, stop numbers and customers.

**Where it shows.** The rail's second tab is **Activity**. Sticky filter row (search, then the family chips), then the timeline: hour headings, a time column, one node per item on a spine, cards for her actions and one quiet line for a marker. Undone cards dim and wear an Undone chip. The composer stays; sending returns to Chat, as before. Empty state names what will land here; filtered-to-empty offers Clear.

**Clock.** Markers derive against `now`, so a scrub before one hides it. Logged events always show: the clock is a lens on the world, the log is what she did in this session.

**Plumbing.** `ShiftEvent` gains optional `detail` and `context`; `commit` takes a detail builder and captures context. `notifyCustomer` events now carry the driver so the card can link. `LookoutSidebar` swaps the tab; `ArtifactsPanel` is deleted. `fmtHour` joins `lib/format.ts`.

**Tests.** `store.test.ts` (details and context on the planted drivers; undo's target), `hos/compute.test.ts` (`drivingReachedAt`), `activity/markers.test.ts` (Marcus, Priya, Dre at 2:47; nothing before the crossing), `activity/derive.test.ts` (fold, order, hours), `activity/filters.test.ts`, `activity/copy.test.ts` (range phrasing, one title per action).
