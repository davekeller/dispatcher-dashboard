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
| 30 | The generated fleet is a simulated day; `materialize` applies the clock each tick, and planted scenarios hold still | A frozen world made everyone late within an hour; now scrubbing an hour shows stops completing, and the heroes stay put for the walkthrough |
| 31 | No left nav; the product bar reads Dispatch | The board is the whole product for this exercise; a nav to placeholder pages was ceremony |
| 32 | Board groups by status by default, Act now leftmost | Lena acts on the left; region is one click away for "where are my problems" |
| 33 | Route file: one driver card, alerts, then stops on a vertical spine with the now and limit marks; the horizontal ribbon is gone | Attached to the stops, "where is he and can he make it" reads better than a proportional time axis |
| 34 | Filter bar is dropdowns on one row with search at the right | Chip rows wrapped beside the open rail |
| 35 | Route file gets a sticky left rail in the case-file pattern: a vertical, proportional duty timeline with the stops as nodes, now and limit marks, active node following scroll, click to jump; collapses to the bar and dots. Supersedes 33 | Dave's directive: a vertical combination of the Duty Today line and the stops line, in the same navigation pattern as the Meridian case file |
| 36 | Lookout has a face, a one-line read of the shift, and two tabs, Alerts and Chat; Alerts shows the top three with the rest behind a count | The rail felt like a lot; the top few is what Lena reads |
| 37 | Chat ships as three matched intents in Phase 1, not a model | The tab needed real content; the pattern is the point, and replies are the same cards |
| 38 | Over-limit chips are solid dark red with white text | The one state that must never be missed |
| 39 | Neutrals retinted from warm to blue-slate | The warm ramp read yellow; cool grays leave the coral and the bands as the only warmth |
| 40 | Neutrals settle on the bento key: faint violet-gray canvas, hairline borders, 16px cards | Dave: "more like the bento theme" |
| 41 | Route rail labels stack on two lines (customer, then stop and time); hour marks are ticks, not text | Horizontal room is short in the rail; vertical room is not |
| 42 | Illustrated placeholder avatars, deterministic per driver, gender from the first name | Faces read faster than initials; real photos replace one component |
| 43 | Lookout's tabs are Chat and Timeline, in the claim-rail pattern: recommendations as a sticky bar over the chat, expanded by default; the timeline is the store's append-only shift log; one composer on both tabs | Dave's directive; the route rail already owns the driver's timeline, so this one is the shift's |
| 44 | Route rail narrowed to 11rem | Horizontal room beside the open Lookout is short |
| 45 | Active Shift opens with an ink directive hero; its metrics are divided readings, not cards | Cards now mean routes everywhere on the board |
| 46 | Status columns collapse to animated 40px count rails; On break and Clear start closed | Intervention lanes get the room, while quiet work stays one click away |
| 47 | Board cards lead with route id; driver, truck, and region are assignment metadata | The object being opened and operated on is the route, even when its driver changes |
| 48 | The board control bar starts with Lookout ordering, then one combined route-filter menu, search, and the Status/Region lens | Matches the order → scope → find → view rhythm without importing another product's brand |
| 49 | The route rail leads with an independently collapsible light 2×2 status grid for Progress, Remaining, Schedule, and HOS fit, then an independently collapsible route-order stop spine with an explicit limit crossing. The whole rail still has its narrow collapsed state. Supersedes 35 | A dispatcher can read progress and risk in seconds or reclaim vertical and horizontal room without a heavy inset block competing with the timeline |
| 50 | Board cards use the same stop spine and HOS crossing as the route rail, reduced to a compact unlabeled instrument | The board becomes a true overview of route progress instead of switching to an unrelated horizontal drive-time bar |
| 51 | Route details always render one timeline node per main-content stop; the board uses that same spine as the full left edge of each card's content. Supersedes 49's collapsed completed history | The visual relationship stays literal at detail level and recognizable at overview level |
| 52 | Replace the active-shift directive hero with a compact metrics-only status band ordered Act now, Watch, Offline, On break, Clear, then On shift. Supersedes 45 | The dispatcher sees the board's exact operating state and highest-priority work first, without introductory copy |
| 53 | Detail timeline rows lead with the marker, then time above stop number and customer name; delivered is a green check, viable undelivered is gray, and failed/past-due/post-HOS is red. The board spine uses the same colors without labels | One visual language now answers progress and intervention risk at overview and detail scale |
| 54 | Reserve the board and Lookout card header badge for the highest-priority Over limit, Approaching limit, or Behind schedule state beside the countdown. Render ping age as muted top-right text in the driver row and secondary reasons as plain text | Severity remains prominent while freshness and supporting context stop competing with true priority states |
| 55 | Retune the visual system to warm paper neutrals, near-black type, accessible orange, and a decorative peach-to-rose-to-periwinkle AI spectrum. Reserve that spectrum for Lookout rings, input borders, and the metrics wash; status colors remain semantic. Supersedes 13, 39, and 40 | The take-home should feel native to modern hospitality software while retaining its own name, mark, layout, and accessible palette |
| 56 | Keep board-status counts on the left of the light shift instrument and continue the same row on the right with Delivered, To deliver, Total stops, and Delivered percentage. Remove the nested stop-volume header, progress bar, route count, and failed footer | Dispatchers can scan intervention load and throughput as one aligned metric row without returning to a heavy hero treatment |
| 57 | Make `docs/VISUAL_LANGUAGE.md` the visual-judgment guide and link it from the README; keep architecture authoritative for behavior | The warm operations foundation, semantic status rules, AI spectrum boundary, accessibility requirements, and extension checklist should be reviewable without reverse-engineering component classes |
| 58 | Apply the case-file split to stop receipts and board cards: identity plus a small event/route spine on the left and 2×2 scan facts on the right. On board cards, flatten those facts into a full-bleed divider grid rather than an inset panel. Remove redundant board-card headings and reduce miniature route nodes | Chronology reads vertically while comparable metrics scan as a grid, producing one consistent card grammar from board overview to route detail without adding another visual layer |
| 55 | Replace illustrated driver avatars with a deterministic pool of local fictional portraits; give Lookout a watchful asymmetrical eye and insight spark | Real faces make assignments scan faster without a network dependency, while the co-pilot remains visibly its own branded character |
| 59 | Reuse the board card's route header, miniature stop spine, centered driver row, and full-bleed divider grammar for Lookout recommendations; keep evidence and actions in place of the board metrics | The recommendation rail now belongs to the same operational system while preserving the explanatory content that makes an AI recommendation useful |
| 60 | Keep board facts in a 2×2 grid, but organize each vertically centered route stop receipt as three parts: stop number/name/address, a horizontal one-row event track, then one four-column fact row with slightly larger values | Identity leads from the left while chronology and facts each become a compact horizontal scan |
| 61 | Add a right-edge ellipsis to every stop receipt for one-stop reassignment, persistent dispatcher notes, and confirmed cancellation. Cancellation removes unresolved work, resequences the active route, logs the action, and supports Undo | Stop-level maintenance stays adjacent to the stop without crowding every receipt with permanent buttons or creating cosmetic-only actions |
| 62 | Give the live route board its own cool porcelain ground while keeping the app canvas and detail surfaces warm | The lighter, less-yellow field makes a dense set of white route cards feel crisper without flattening semantic status washes or changing the broader hospitality-adjacent palette |
| 63 | Turn the miniature card timeline into a subtle focus lens: compress six or more leading completed stops, then slightly enlarge and spread the next two stops. Keep short and completed routes uniform, and keep the detail rail literal | Dense completed history remains visible but recedes, while the work the dispatcher still has to manage receives a modest share of the card's limited vertical space |
| 64 | Grade completed miniature timeline paths and stops from soft sage at the route origin to dark clear-green at the current edge, with shared semantic endpoints available to the future map view | Progress reads as direction and accumulation instead of a flat green line, while timeline and map can later describe the same stop state with the same color language |
