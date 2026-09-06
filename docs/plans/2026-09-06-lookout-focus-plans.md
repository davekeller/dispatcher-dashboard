# Lookout focus plans

**Ask (Dave, 2026-09-06):** Lookout's recommendations were the same fleet-level list on every view. On a route file they should be specific to that route: what to do about this driver, with the figures.

**Design.** One pure module, `src/lookout/plans.ts`, turns a focused driver's `DriverView` and `DriverCard` into an ordered list of plans, using the same helpers the dialogs use (`stopsPastLimit`, `reassignCandidates`, `suggestResetStop`, `projectedDepartureAt`), so a plan's numbers always match the dialog it opens:

| Situation | Plan | Opens |
|---|---|---|
| Dark truck | Call the driver; the estimate and the stops at risk | inline call |
| Over the limit, still driving | Call now | inline call |
| Stops past the limit | Reassign those stops to the top candidate, with their spare time and what the driver keeps | reassign dialog, stops and candidate pre-picked |
| Stops past the limit | Reset after the last reachable stop, with the reset's start and end | reset dialog on that stop |
| Over the limit | Reset now | reset dialog, reset now |
| Late, untold customers | Notify them, named, with their windows | notify dialog with those stops |
| Unassigned stops | Find a driver, naming the top candidate | reassign dialog |
| Any other rule (a live-added one) | The alert's own words and first action | that action |
| Nothing firing | The route's status: next stop, drive time left, finish | none |

**Where it shows.** `LookoutSidebar` renders `PlanCard`s under "What I see on …" whenever `focusDriverId` is set (the route file and a fleet-map pick set it). The chat intent "What should I do about Marcus?" answers with the same plan titles and the driver's card.

**Plumbing.** `Derived` now carries `deliveryById`; `ActionContext.open` accepts `toId` and `afterStopId` alongside `stopIds`, and the three dialogs take them as initial state.

**Tests.** `src/lookout/plans.test.ts` against the seeded fleet at 2:47: Marcus, Priya, Dre, Tomas, Lucia, Elena, Ana.
