# VISUAL LANGUAGE — Dispatch

This guide defines how Dispatch should look and feel as it grows. `ARCHITECTURE.md` remains the source of truth for product behavior and implementation; this file is the source of truth for visual judgment.

The interface is a dense technical dashboard for a dispatcher in the middle of a shift. It should feel warm and approachable without becoming decorative, and intelligent without making the AI layer look magical or unaccountable.

---

## 1. The visual idea

**Warm operations. Trusted intervention.**

Dispatch combines three layers:

1. **A warm, quiet foundation.** Paper-like neutrals and near-black type make a high-density workspace feel human and legible.
2. **Strict operational color.** Red, amber, green, slate, and blue describe route state. These colors carry meaning and never become decoration.
3. **A distinct AI signature.** Lookout owns accessible orange plus a restrained ember → gold → rose → violet → blue spectrum. The spectrum identifies AI entry points and focus, never risk.

The product bar adds one industrial counterweight to those lighter surfaces: an original navigation-slate line mark forms a `D` from three nested route contours, echoing one fleet moving through one dispatch system. It stands alone without a tile, preserving filled backgrounds for selected navigation states only. A compact 17px title-case Dispatch wordmark in Sora follows on white with firm weight and tight tracking; the wordmark is tucked close enough to read with the mark as one lockup and sits one optical pixel below the flex center to balance Sora's cap height against the mark. Sora is reserved for this identity while Bricolage remains the display face everywhere else. The bar itself and every control embedded in it are shadowless. Board and Map form one 192px edge-to-edge segmented control in the left navigation flow immediately after the brand; equal-width halves give the primary workspace switch more visual prominence without detaching it from the product identity. The outer keyline defines the control, a single divider separates the views, and the selected slate fill occupies its entire segment without an inset card, ring, gap, or shadow. A driver/route detail is a child of Board, so Board remains selected while its route breadcrumb follows the workspace control. Lookout's Chat and Activity tabs reuse the same flat selected fill instead of a separate underline language. Activity keeps color as attention: her actions are ink nodes and neutral cards, a marker's node is hollow in the state it announced, and each card wears the board's own badge for what was true when she acted.

The result should read as product software, not a marketing page placed around a dashboard.

The Settings project file uses that same discipline for a case-study surface. A full-height white rail stays fixed at the left of the scrolling view while a centered column of up to 80rem carries the active chapter, sized so the slides fill most of the content area. The default Project chapter begins with one deep-slate cover panel over three edge-to-edge live instruments—fleet status, delivery progress, and HOS exposure—using the same derived figures and semantic colors as the board. Subsequent evidence is organized in white sections with quiet tinted headers, gapless fact grids, and numbered rows rather than nested promotional cards. Chapter changes use one short four-pixel fade-and-rise on the shared motion curve and disappear entirely under reduced motion. Each chapter leads with the design file's own pages, framed as 16:9 cards on the case-study ground with a small caption row, so the deck and the product share one surface.

### Identity boundary

The product intentionally avoids third-party logos, names, illustrations, exact colors, and page compositions. The influence is expressed through general qualities—warmth, plain language, confident typography, friendly geometry, and a chromatic AI accent—while Dispatch keeps its own mark, information architecture, and interaction patterns.

---

## 2. Hierarchy before decoration

Every screen should answer questions in this order:

1. What requires action now?
2. Why does it require action?
3. How much time or capacity remains?
4. What can the dispatcher do?
5. What supporting detail proves the recommendation?

Size, placement, and contrast establish this hierarchy. Color reinforces it but must not be the only signal.

- Large tabular numbers are reserved for countdowns, board totals, and stop throughput.
- Uppercase micro-labels identify instruments; they do not carry instructions.
- Saturated colors are small and local: status dots, critical chips, timeline nodes, and primary AI accents.
- Long explanations belong in Lookout or the route file, not the board card.

---

## 3. Color system

All reusable colors are Tailwind theme tokens in `src/index.css`. Components use tokens rather than raw hex values.

### Foundation

| Token | Value | Role |
|---|---:|---|
| `canvas` | `#f8f6f3` | Warm page ground |
| `board` | `#f1f3f6` | Cool porcelain ground behind the live route board; dark enough to separate white cards |
| `panel` | `#ffffff` | Cards, rails, menus, inputs |
| `well` | `#f1ede9` | Selected controls and inset areas |
| `line` | `#e3ddd7` | Hairline separation |
| `ink` | `#211e1c` | Primary text and black actions |
| `muted` | `#625d59` | Secondary text |
| `label` | `#6d6661` | Micro-labels |

The overall foundation should look warm white, not beige. The live board deliberately shifts to a cooler, nearly white porcelain so a dense field of cards feels crisp rather than creamy; keep warmer paper tones for the surrounding app and detail surfaces. Avoid large gray slabs and avoid pure black except where a compact action needs maximum contrast.

### Operational status

| State | Strong / fill / soft | Meaning |
|---|---|---|
| Act now | `#9f1f3b` / `#cb3453` / `#fff0f3` | Violation, immediate intervention, failed or past-due stop |
| Watch | `#755000` / `#c88708` / `#fff6df` | Approaching a threshold or behind schedule |
| Clear | `#165d3f` / `#2f9164` / `#eaf8f0` | Healthy, delivered, complete |
| Route progress | `#9bc5ae` → `#276548` | Completed route path, light at the start and dark at the current edge |
| Offline | `#424c60` / `#738099` / `#eff2f6` | Unknown or stale telemetry |
| On break | `#28549a` / `#477bd0` / `#edf3ff` | Paused HOS accumulation |

Operational color always appears with a label, number, icon, or shape. Red is never used as a general brand accent.

The board uses one intentionally vivid wash per status lane—Act now `#f8d6df`, Watch `#f5dfa7`, Offline `#dce3ed`, On break `#d8e5fb`, and Clear `#d3eedf`. These board-only grounds make column structure legible at a glance while the softer fills above remain available for inline alerts and receipts. The shift totals mirror the lane order; each label, dot, and value uses an accessible light counterpart of its status hue on the darker hero rather than turning neutral. The throughput group remains on the same row but receives wider, evenly padded columns so its four values scan as a distinct block.

### Lookout and the AI spectrum

| Token | Value | Role |
|---|---:|---|
| `lookout` | `#cf4620` | Accessible orange accent and AI action fill |
| `lookout-strong` | `#a93817` | Reserved; Lookout's type is ink, so red stays with alerts |
| `lookout-soft` | `#fff0e9` | Warm AI wash |
| `ai-warm` | `#f45b2b` | Decorative gradient start |
| `ai-gold` | `#e9ad48` | Warm bridge |
| `ai-rose` | `#d979aa` | Decorative gradient midpoint |
| `ai-violet` | `#8259d6` | Cool bridge |
| `ai-cool` | `#4f7cdd` | Decorative gradient end |

Lookout's circular agent mark may deliberately escape these shared tokens. Its crisp spectrum disc maps electric cyan, cobalt, violet, hot pink, orange, and acid green beneath a simple white pixel face. That broader range belongs at full strength only inside the avatar, where it makes the agent feel alive without recoloring surrounding product chrome. The Recommends field may echo the same mapped colors at roughly 6–16% strength as separate radial washes over white; this is a quiet identity backdrop, not a second full-strength brand surface.

The shift instrument is deliberately outside the AI spectrum. It uses a fully desaturated city photograph beneath a single 70%-opacity warm-black overlay. The five status readings reuse their board-header wash colors as high-contrast foregrounds; throughput remains white and translucent white. Each reading is a cell that runs the full height of the instrument, edge to edge, and it is the filter for its lane: on hover and focus it washes in its own band color at 15%, selected it holds that wash at 25% under a 2px underline in the same color. This keeps the hero neutral and distinct from Lookout's decorative branding while preserving the board-to-hero status mapping. Act now is the one exception: its dot and count wear `act-now-hero` (`#ff7a90`), the only saturated red on the instrument, and its label and detail a lighter companion (`act-now-hero-text`, `#ffb3c1`) that still clears 4.5:1 against the photograph's brightest patch; the other four readings keep their pale washes.

The spectrum may appear in:

- Lookout’s spectrum-disc avatar field;
- the AI ordering control and composer outline;
- the thin active-tab indicator and softly washed recommendation header;
- the border of a pinned Lookout recommendation.

Do not use it for status, charts, full card fills, body text, or routine controls. It should act like a signature, not wallpaper.

---

## 4. Typography

**Inter Variable** is the interface face. It carries labels, names, explanations, controls, and receipts.

**Bricolage Grotesque Variable** is the display face. Use it selectively for:

- fleet and stop totals;
- large HOS countdowns;
- route-detail metric values;
- compact product identity.

**IBM Plex Mono** is Lookout's agent voice. Use it for Lookout-authored recommendations and chat replies, the agent header and tabs, timeline entries, composer text, and branded entry points such as Lookout ordering and pick labels. Shared route cards, evidence values, and action buttons remain in Inter/Bricolage so the underlying operations layer stays consistent.

Rules:

- Apply antialiased font smoothing and optimized legibility at the document root so Inter, Bricolage, IBM Plex Mono, and their fallbacks render consistently throughout the app.
- Every duration and operational count uses tabular numerals (`.tnum`).
- Body copy generally sits between 11px and 13px in this desktop-only prototype.
- Micro-labels use 8–10px, semibold, uppercase, and modest tracking.
- Avoid display type for paragraphs or dense card labels.
- Keep route IDs monospace so they scan as identifiers.

---

## 5. Shape, borders, and depth

- Cards: 10px radius.
- Controls: 8px radius.
- Chips and status badges: pill radius.
- Standard border: one-pixel `line` token.
- Standard shadow: one diffused, low-opacity level (`shadow-card`).
- Menus and modals may use a stronger version of the same neutral shadow, never a colored glow.

Cards should be defined primarily by white surface and a hairline border. Shadows clarify overlap; they should not make the board look like floating tiles.

---

## 6. Key surfaces

### Product bar

The truck mark sits in a near-black tile with white foreground. Everything else remains white and near-black so the bar feels like product chrome rather than a banner.

Selected workspace, board-lens, and Lookout tab controls use one slate treatment: the slate-ink fill under white type, inside a keyline of the same slate ink, so the selected segment's edge is crisp; the pale slate stays for hover and for the receipts' selection wash. The state is deliberately darker than the surface so the current view reads at a glance.

### Shift instrument

The hero is not a hero in the marketing sense. It is a compact, two-sided instrument:

- **Left:** Act now, Watch, On break, Offline, and Clear—ordered by dispatch priority and matched exactly to the board lanes.
- **Right:** Trucks, Delivered, To deliver, Total stops, and Delivered percentage as five equally aligned facts in the same row.

An original, brand-free photograph of a fictional Midwestern skyline and road network gives the instrument operational atmosphere. The photograph is completely desaturated before a warm near-black layer is applied at 70% opacity. Each status label, value, detail, and dot uses the same light color as its board-lane header background; the four throughput metrics remain white. Status figures remain interactive filter shortcuts.

### Board lanes

Lane headers use the status soft color as a wash. Cards remain white and use a restrained 1.5px neutral keyline so they separate from the cool board ground without becoming outlined boxes. Act now receives width and position before extra saturation. Clear and On break may collapse because quiet work should consume less space than exceptions.

### Route cards

Completed paths and markers share one semantic progress gradient, moving from soft sage at the route start to dark clear-green at the current edge. These same endpoints are reserved for a future stop-map counterpart.

Route cards use the same distinct title row as Lookout recommendations. A compact overall-route status dot, matched to the board-lane header dots, leads the route id. Plain semantic text for route-level exceptions such as Won't finish or Offline follows the id, with the compact muted refresh age after it; exception text wins space over freshness at narrow widths. The highest-priority badge—Over limit, Approaching limit, or Behind schedule—and countdown share the right edge. Lookout omits the optional refresh age and board-only exception metadata from its form of the shared row. Directly below the dot, the stop spine continues down the left of the content rows, turning the overall status marker into the visual head of route progress. Driver name stacks over the license identifier beside the avatar:

- green node: delivered;
- gray circle: undelivered and still viable;
- red circle: failed, past due, or beyond projected HOS;
- red cross-tick: the HOS boundary.

The spine stays narrow and every stop keeps one evenly spaced position on a single route scale, so a 15–20-stop route remains a literal sequence. It reads in reverse route order: the route end—including stops appended by reassignment—is at the top, unresolved work leads, and completed history descends to the route origin. Successfully completed deliveries recede into 5px green connective nodes; pending, failed, late, and post-HOS nodes use one fixed 6px size. The completed gradient becomes darker toward the unfinished boundary and lighter toward older history. There is no history compression, percentage-based allocation, or progressive magnification. Emphasis comes only from the small completed-versus-open size step and semantic color. The remainder of the card is one flat structure. Its first row follows a strict four-unit grid: driver assignment spans two units, Stops one, and Up next one. The primary 50% divider therefore continues through the second row's equal HOS fit and Route risk columns, while the additional 75% divider belongs only to the two compact progress readings. Stops and Up next use slightly larger 13px values, align left with compact equal 4px cell padding, tighten the value-to-label gap to 2px, and omit spaces around the stop-count slash so two-digit values remain distinct at the narrowest lane width. The truck license identifier moves beneath the driver name in the same micro-label style as Stops and Up next, eliminating the loose inline gap. Ping age remains quiet gray title metadata, never a badge; it compacts to `Now`, `1m ago`, or `25m ago` at board width while the tooltip uses full wording. Over-limit cards use the same critical red keyline as the route-detail alert card; approaching-limit cards use a lighter red mix. Other reasons retain the neutral border even when they share an Act Now or Watch lane. Both rows use only the card's own dividers—no inset box, extra background, or padded wrapper. Repetitive headings such as "Assigned driver" and "Route progress" are omitted. Lookout’s pick adds one chip at the footer’s right edge, washed in the same spectrum ring as the Ordered-by-Lookout button and set in the agent face; it must not recolor the card, and it is the card’s only footer element that opens something other than the route file.

### Route file

The route is the parent record: one driver is assigned to it, and its stops can move to another route without turning either the driver or stop into the page identity. The product breadcrumb therefore reads `Route Details · RT-15`, not `RT-15 · Jonah H.`. The sticky Stops/status band leads the route file as route-scoped navigation and remains pinned while the rest of the route scrolls beneath it. The top-level driver header follows, explicitly labels its identity `Assigned driver`, and keeps two layers inside one card: its padded identity and live-countdown section above a full-width five-column grid for Driving today, On duty, Break, Stops, and Driving left vs. limit. The grid touches the card edges, uses one horizontal boundary plus simple vertical dividers, and gives every cell the same padding and vertical centering—no nested metric cards or gutters. A 3px top rule always anchors this card: deep red when over limit, brighter red for other Act now routes, amber for Watch, blue for On break, medium slate for Offline, and the palette's darker navigation slate for Clear. Active alerts use a separate card immediately after the driver summary; the stop list or map begins after those exceptions. Every alert is one horizontal row with an icon in a narrow first column, status and explanation in the flexible middle, and a no-wrap action group aligned to the right; multiple alerts share the card and divide into rows. Critical alert cards receive a restrained red keyline around the full card.

The Stops bar is the route workspace's secondary navigation: a viewport-wide, single-row white band, 52px tall, fixed directly beneath the product bar as chrome rather than a sticky element in the scroll. Its first column is the back arrow, 64px wide like the collapsed rail so the product bar's logo tile sits over it; the route rail carries no arrow of its own. A dot in the route's band color leads a `Route` cell reading `RT-15`, a hairline pipe, then the completion percentage; the cell after it puts a `Stops` eyebrow over the value-first `12/20 delivered` title; Remaining, Schedule, and HOS fit follow in three narrower fixed-width cells; and List/Map mode anchors the right edge. Soft standard vertical dividers separate these zones without nested cards, tinted metric panels, or decorative top rules. The mode control is the same segmented shell as Board and Map: a slate-ink keyline with the selected segment filled flush, no track. Completion percentage sits after the delivered count and again in the route rail, both from one helper. The delivered count reads at 16px; the completion percentage, at 18px, is the bar's largest reading and sits beside the route id; secondary route readings step down to 13px, and because the bar sits above the rail its width no longer depends on the rail state. Semantic meaning stays concentrated in each status value and its dot. Time and schedule language uses forms such as `1h8m late` and `43m spare`, keeping the complete operational status visible without wrapping the band. These readings belong here rather than in the expanded route rail: the bar keeps them visible in either list or map mode, while the rail stays focused on stop navigation. The band has square edges, simple horizontal keylines, and no outer shadow, so it reads as section structure rather than another card. It never scrolls: the route rail, the assigned-driver summary, alerts, and route-owned receipts scroll beneath it in that order while route state, selection, and mode controls stay put. At rest it shows no batch actions. Selecting one or more unresolved receipts reveals only `Reassign selected (n)` beside List/Map; schedule-reset and customer-notification actions stay in their route-alert and Lookout contexts.

Route details use a slightly deeper fixed slate gradient derived from `board`, `offline-board`, and a small amount of `offline-fill`, with white cards as the foreground plane. Neutral controls and receipt fact bands use translucent board gray instead of the warmer page `canvas`; route alerts, stale banners, and late rail rows use the same stronger `*-board` status washes as the board lane headers. Chips retain their softer fills so compact labels remain distinct from structural surfaces.

The expanded detail rail uses the same reverse-route ordering and completed-path gradient as the mini timeline. Remaining and reassigned stops lead at the top; completed rows continue below and tighten from 40px to 32px, but retain their time, stop number, name, full click target, and one-to-one receipt mapping; failed stops remain full-size and red.

Charts on the Metrics lens keep the board's color law. Band fills mean status and nothing else; delivered is the completion green, failed is red, remaining is the pale nav slate, and every other quantity (hours, bins, bars) is slate ink on a board-colored track. The page begins with one compact 22px display-face `Shift metrics` row and the filtered truck count with current shift time; it does not repeat a scope sentence already expressed by the section headings. Panels are plain white cards with a compact display-face title, one-line definition, and an optional summary reading at the right. Histograms share quiet horizontal guides, a visible baseline, tabular counts, and a softly tinted dashed threshold zone; legends remain no more than a square and a word. The full-width HOS forecast uses one row per at-risk driver on a shared Now-to-6 PM axis, separates projected clock time from legal driving balance, and never plots the post-shift fleet as a stack at the right edge. Section titles sit alone on the left of their divider row; a 13px live summary leads the right-aligned block with the 10px section definition directly beneath it. This keeps Hours of service, Shift operations, and Driver readiness ordered without repeating explanatory copy under every heading or adding another layer of boxes. The clickable Fleet by status chips stay neutral at rest; the selected chip fills with its deep semantic status color and light type, making the active filter explicit without borrowing the slate lens-selected state.

The left rail and the receipt list are literal counterparts: one timeline node per receipt, both presented route-end-first. The rail sits flush against the left edge of the route view and defaults collapsed, preserving a compact percentage plus done/remaining count above the full stop spine while giving the detail grid the working width. Expanded, that summary becomes two flat divider cells before the labeled timeline detail. Remaining with freshness, Schedule, and HOS Fit stay in the Stops bar above. Neither rail state introduces an inset card or dark header block. Behind the file, one fixed vertical field moves from an open near-white slate at the top to the deeper offline-slate family at the bottom. Receipts scroll over that stationary gradient, adding depth and a quiet cue that more route work continues below without tinting the white operational surfaces.

Above the receipts, a quiet title row doubles as the stop filter: a `Stops` heading in the display face at 17px with the count beside it on the left, small pill chips on the right, one per filter with its count. The selected chip is solid ink. Issue chips carry a 6px dot in the band color of what they find (act-now red for past the limit, past window, and failed; watch amber for near the limit; slate for needs a driver) and are absent when they match nothing, so color appears only when there is something to act on. The row is text and chips, not a card, so the receipts stay the first surfaces on the page.

Each stop receipt applies the same case-file grammar as four clear columns:

- a dedicated 44px (2.75rem) gutter outside the cards carries the shared semantic markers and a continuous one-pixel spine across card gaps, grading completed history green before continuing gray or red with the same semantics as the route rail; the gutter matches the alert card's semantic-icon column so receipt cards begin on the alert's second-cell alignment;
- the card itself begins with a compact bare-number column, using a 20px sans-serif number with the rail sequence's semibold weight;
- the second column stacks the status chips (next, past the limit, past window, needs a driver) above the stop name and address; delivery instructions, the dispatcher note, and the notified stamp sit in their own Notes strip along the bottom of the card;
- the third column is a compact horizontal event track with equal lanes for each label and time or result;
- completed event spines read Arrived → Left → Signed;
- pending event spines read Planned → Projected → Window;
- the remaining right side is a compact, single-row grid of four scan metrics rather than a sentence of metadata;
- a vertical ellipsis floats at the far right without a cell or divider and opens stop-level Reassign, Add/edit note, and Cancel actions;
- unresolved receipts are directly selectable across the full card surface; hover uses a very light slate wash and selected uses only a slightly stronger version, with a stable 2px interaction keyline in both states. The keyline retains blue for Next and red for late or post-HOS work instead of obscuring operational meaning. A plain click toggles one receipt and Shift-click adds the contiguous visible range, while the ellipsis remains an independent target;
- operational status chips remain beside identity; the delivery-priority badge appears only in the dedicated Priority metric cell.

All receipt sections center vertically across the row. Dispatcher notes are neutral supporting text, not alert red. This keeps identity easy to read, chronology left-to-right, and measurements comparable in one scan.

### Lookout

Lookout is visually related to the main product but clearly has a separate role. Beneath the product bar, the full sidebar sits on an explicit foreground plane and casts one restrained, cool-slate shadow leftward across the workspace boundary. The shadow begins with the chat content instead of appearing across the product navigation, so the assistant remains separated from dense operational content for the full scrollable height without appearing detached. Its original mark maps six vivid color regions into a clean clipped circle with no outline, behind a small white pixel face:

- orange active tab and name;
- cyan-to-lime spectrum-disc avatar with a centered, friendly white pixel face;
- softly washed recommendation header;
- one pill-shaped composer with the mark inset left, a five-stop gradient outline, and a dark circular send action;
- gradient outline around a pinned recommendation and a thin spectral active-tab underline;
- translucent white recommendation rows with restrained keylines and normal operational severity inside them;
- the same flat route-card shell: route/status header, miniature stop spine, centered driver row, full-width explanation rows, and a divided action footer.

Recommendation cards preserve the decision and actions instead of repeating the board's four scan metrics. The Recommends header and body share one continuous, muted version of the avatar's mapped spectrum: cyan and pink near the upper edges, orange and mint lower down, and a faint cobalt-violet base. Compact recommendations sit above it on solid white with one semantic keyline, a control-sized radius, and no shadow, so their evidence and actions remain the strongest surfaces. Critical and Act Now cards use a restrained red border, Watch cards use amber, and informational or quiet plans remain neutral; color stays on the one-pixel boundary rather than filling the card. Tighter gaps keep the group reading as a recommendation list rather than a stack of dashboard cards. The driver appears once, followed by one short action-oriented bullet per active alert; overlapping rules become distinct evidence and next-step lines rather than repeated title/body paragraphs. Chat replies reuse this same compact summary instead of expanding back into the full board-card shell. A lightly divided action row follows, using reduced button height, padding, and compact verb labels—Reassign, Reset, Notify, Call, Snooze—so three contextual actions remain on one line at sidebar width. They retain the same priority badge and plain-text freshness rules as board cards. Lookout never replaces status color with its own gradient and never hides the operational decision.

---

## 7. Components and interaction states

### Buttons

- **Primary:** near-black fill for decisive operational actions.
- **Secondary:** white with a neutral border.
- **Danger:** dark red fill.
- **Lookout:** accessible orange fill.
- **Ghost:** no fill until hover.

Disabled controls keep their label visible and use reduced opacity. Every position-dependent disabled action includes a reason.

### Chips

Chips label state; they do not behave like buttons unless explicitly wired as filters. Critical Over limit chips use dark red with white text and a diagonal hazard stripe, 2px white lines at a quarter strength on a 6px period, to separate the hard limit from other red statuses. Other status chips use strong text on their matching soft ground.

### Inputs and focus

Routine inputs use a neutral border. The Lookout composer and AI ordering control may use the gradient outline. Keyboard focus always adds a visible ring beyond the resting border.

### Motion

Motion is functional and brief. It uses two curves and a short scale of durations, all tokens in `index.css`:

- `--ease-gentle`, `cubic-bezier(0.6, 0.2, 0.1, 1)`, for layout the dispatcher asked for: Lookout sliding in and out, the route rail widening, lanes opening. It eases in softly and lands softly; nothing snaps or bounces.
- `--ease-out-soft`, `cubic-bezier(0.22, 1, 0.36, 1)`, for entrances: the route workspace fading up, the selected card expanding into it.
- 150ms for hover and press feedback, 200ms for small state changes, 300ms for panels and rails, 380ms for the one shared-element route expansion.

Where it appears:

- Lookout closes by sliding off to the right over 300ms on the gentle curve while the workspace regains its width; it stays mounted, so a reopened chat keeps its thread. Reduced motion cuts the slide;
- 200ms lane expand/collapse and content entry, 300ms for the route rail;
- a route-card press compresses to 98.5%, then the selected card expands into the route's driver summary over 380ms while the workspace fades up behind it and its parts arrive in order on the entrance curve: the Stops bar drops in over 240ms, the rail slides in from the left over 300ms starting 40ms later, the alerts rise over 240ms from 90ms, the stops over 320ms from 120ms; the back arrow leaves the same way in reverse, the workspace and its parts settling down and out over 200ms on the gentle curve while the board returns;
- the result toast sits at the bottom center: it rises in from 16px below over 300ms on the entrance curve and settles back down over 200ms on the gentle one when its ten seconds are up or the undo is taken;
- live countdown updates without layout shift;
- timeline selection follows the receipt in view;
- no ambient gradient motion, bounce, or decorative shimmer.

The shared-element route transition uses the native View Transitions API when available. Unsupported browsers run the same choreography as element animations over a 280ms route-workspace fade and lift; `prefers-reduced-motion` removes both paths and leaves ordinary client-side navigation.

---

## 8. Accessibility

- Text/ground token pairs must meet WCAG AA; validate with `node scripts/contrast.mjs` whenever tokens change.
- Do not put text directly on the decorative three-color gradient.
- Pair color with labels, icons, fill styles, or dashed borders.
- Controls require visible hover, focus, selected, and disabled states.
- Interactive metrics expose complete accessible names, including their secondary detail.
- Timeline buttons expose stop number, customer, time, and state even when the compact visual omits words.

---

## 9. Do / do not

| Do | Do not |
|---|---|
| Use warm white space to group dense information | Add promotional headlines to an operations screen |
| Reserve orange/gradient treatments for product and AI identity | Use the AI gradient as severity or chart data |
| Let position, number size, and grouping carry hierarchy | Solve every priority problem with more saturation |
| Keep board cards terse and route details explicit | Repeat the same alert label in several places on a card |
| Show uncertainty with a tilde, age, and dashed treatment | Present stale projections as precise facts |
| Keep the product mark and layout original | Import another company’s logo, illustrations, exact palette, or page composition |

---

## 10. Implementation map

| Concern | Source |
|---|---|
| Theme tokens, gradients, radii, shadows | `src/index.css` |
| Semantic tone mapping | `src/ui/tones.ts` |
| Product bar | `src/app/Header.tsx` |
| Shift instrument | `src/views/shift/ShiftHero.tsx` |
| Board and route cards | `src/views/shift/Board.tsx`, `RouteCard.tsx`, `RouteTimelineMini.tsx` |
| Shift city photograph | `public/images/dispatch-city-hero.webp` |
| Detail timeline | `src/views/route/RouteRail.tsx` |
| AI rail and focus treatments | `src/lookout/*` |
| Contrast validation | `scripts/contrast.mjs` |

---

## 11. Review checklist

Before shipping a visual change, check:

- Can the most urgent route be found in under three seconds?
- Does red still mean intervention rather than brand?
- Is the AI spectrum confined to AI/product identity?
- Do board counts and the shift instrument agree?
- Are all times and counts tabular?
- Does the change work in the narrowest expanded board lane?
- Are stale/offline states still explicit?
- Does keyboard focus remain visible?
- Does `npm run build`, `npm run lint`, `npm test`, and `node scripts/contrast.mjs` pass?
