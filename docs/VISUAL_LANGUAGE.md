# VISUAL LANGUAGE — Dispatch

This guide defines how Dispatch should look and feel as it grows. `ARCHITECTURE.md` remains the source of truth for product behavior and implementation; this file is the source of truth for visual judgment.

The interface is a dense technical dashboard for a dispatcher in the middle of a shift. It should feel warm and approachable without becoming decorative, and intelligent without making the AI layer look magical or unaccountable.

---

## 1. The visual idea

**Warm operations. Trusted intervention.**

Dispatch combines three layers:

1. **A warm, quiet foundation.** Paper-like neutrals and near-black type make a high-density workspace feel human and legible.
2. **Strict operational color.** Red, amber, green, slate, and blue describe route state. These colors carry meaning and never become decoration.
3. **A distinct AI signature.** Lookout owns accessible orange plus a restrained peach → rose → periwinkle spectrum. The spectrum identifies AI entry points and focus, never risk.

The result should read as hospitality-adjacent product software, not a marketing page placed around a dashboard.

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
| `board` | `#f7f8fa` | Cool porcelain ground behind the live route board |
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
| Act now | `#942b38` / `#b63846` / `#fdf0f1` | Violation, immediate intervention, failed or past-due stop |
| Watch | `#6f4a00` / `#ad7c1c` / `#fff7e7` | Approaching a threshold or behind schedule |
| Clear | `#1f593e` / `#4b8769` / `#edf7f1` | Healthy, delivered, complete |
| Route progress | `#9bc5ae` → `#276548` | Completed route path, light at the start and dark at the current edge |
| Offline | `#484d54` / `#7f858d` / `#f2f1f0` | Unknown or stale telemetry |
| On break | `#2e518d` / `#5f82c1` / `#eef2fb` | Paused HOS accumulation |

Operational color always appears with a label, number, icon, or shape. Red is never used as a general brand accent.

The board uses one intentionally deeper wash per status lane—Act now `#f6dfe3`, Watch `#f4e6c2`, Offline `#e7e8eb`, On break `#e2e8f5`, and Clear `#dfeee5`. These board-only grounds make column structure legible at a glance while the softer fills above remain available for inline alerts and receipts. The shift totals mirror the lane order and use the corresponding strong text hue for every value, not only urgent states.

### Lookout and the AI spectrum

| Token | Value | Role |
|---|---:|---|
| `lookout` | `#cf4620` | Accessible orange accent and AI action fill |
| `lookout-strong` | `#a93817` | Orange text on light surfaces |
| `lookout-soft` | `#fff0e9` | Warm AI wash |
| `ai-warm` | `#f45b2b` | Decorative gradient start |
| `ai-rose` | `#d979aa` | Decorative gradient midpoint |
| `ai-cool` | `#6669ea` | Decorative gradient end |

The spectrum may appear in:

- the light shift-metrics wash;
- Lookout’s avatar ring;
- the AI ordering control and composer outline;
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

Rules:

- Every duration and operational count uses tabular numerals (`.tnum`).
- Body copy generally sits between 11px and 13px in this desktop-only prototype.
- Micro-labels use 8–10px, semibold, uppercase, and modest tracking.
- Avoid display type for paragraphs or dense card labels.
- Keep route IDs monospace so they scan as identifiers.

---

## 5. Shape, borders, and depth

- Cards: 14px radius.
- Controls: 8px radius.
- Chips and status badges: pill radius.
- Standard border: one-pixel `line` token.
- Standard shadow: one diffused, low-opacity level (`shadow-card`).
- Menus and modals may use a stronger version of the same neutral shadow, never a colored glow.

Cards should be defined primarily by white surface and a hairline border. Shadows clarify overlap; they should not make the board look like floating tiles.

---

## 6. Key surfaces

### Product bar

The original truck mark sits in a soft-orange outlined tile. Orange also marks the active workspace. Everything else remains white and near-black so the bar feels like product chrome rather than a banner.

### Shift instrument

The hero is not a hero in the marketing sense. It is a light, two-sided instrument:

- **Left:** Act now, Watch, Offline, On break, and Clear—ordered by dispatch priority and matched exactly to the board lanes.
- **Right:** Delivered, To deliver, Total stops, and Delivered percentage as four equally aligned facts in the same row.

The soft warm-to-cool wash separates this instrument from the board without the visual weight of a dark block. Status figures remain interactive filter shortcuts.

### Board lanes

Lane headers use the status soft color as a wash. Cards remain white. Act now receives width and position before extra saturation. Clear and On break may collapse because quiet work should consume less space than exceptions.

### Route cards

Completed paths and markers share one semantic progress gradient, moving from soft sage at the route start to dark clear-green at the current edge. These same endpoints are reserved for a future stop-map counterpart.

The card header pairs its highest-priority badge—Over limit, Approaching limit, or Behind schedule—with the countdown. The full-height stop spine runs down the left of the content area:

- green node: delivered;
- gray circle: undelivered and still viable;
- red circle: failed, past due, or beyond projected HOS;
- red cross-tick: the HOS boundary.

The spine stays narrow and its dots stay deliberately small so a 15–20-stop route reads as a sequence rather than a column of badges. Only when completed work already represents at least two-thirds of the route do its markers tighten, and then they still occupy roughly the first two-thirds of the usable timeline while remaining stops use the final third. Remaining markers are a uniform 1% larger—barely perceptible emphasis, not a fisheye. Routes below that completion threshold and fully completed routes remain evenly distributed. The remainder of the card is one flat structure: a vertically centered driver row followed by a full-bleed 2×2 grid for Stops, Next, HOS fit, and Route risk. The top row is deliberately terse and value-first: `12 / 15` over `Stops`, then `#13` over `Next`; it does not repeat completion percentage or “up next.” Ping age is quiet gray text at the top right of the driver row, never a badge. The grid uses only the card's own dividers—no inset box, extra background, or padded wrapper. Repetitive headings such as "Assigned driver" and "Route progress" are omitted. Lookout’s pick may add a small orange chip; it must not recolor the card.

### Route file

The expanded detail rail uses the same light-to-dark completed-path gradient and subtle next-stop marker emphasis as the mini timeline. Completed rows tighten from 40px to 32px, but retain their time, stop number, name, full click target, and one-to-one receipt mapping; failed stops remain full-size and red.

The left rail and the receipt list are literal counterparts: one timeline node per receipt. Timeline entries read marker → time → stop number and name. The rail uses the same light, flat grid grammar as the rest of the product: Route status expands to a 2×2 divider grid for Progress, Remaining, Schedule, and HOS fit; Route timeline expands beneath it. Each section collapses independently, and neither introduces an inset card or dark header block.

Each stop receipt applies the same case-file grammar as three clear columns:

- the first column starts with a large `#N`, then stacks the stop name, address, status, and instructions;
- the second column is a compact horizontal event track with equal lanes for each label and time or result;
- completed event spines read Arrived → Left → Signed;
- pending event spines read Planned → Projected → Window;
- the remaining right side is a compact, single-row grid of four scan metrics rather than a sentence of metadata;
- a narrow final cell holds the ellipsis menu for stop-level Reassign, Add/edit note, and Cancel actions;
- status chips remain beside identity, not inside the metric cells.

All receipt sections center vertically across the row. Dispatcher notes are neutral supporting text, not alert red. This keeps identity easy to read, chronology left-to-right, and measurements comparable in one scan.

### Lookout

Lookout is visually related to the main product but clearly has a separate role:

- orange active tab and name;
- gradient-ring avatar;
- softly washed recommendation header;
- gradient outline around the prompt and pinned recommendation;
- white recommendation cards with normal operational severity inside them;
- the same flat route-card shell: route/status header, miniature stop spine, centered driver row, full-width explanation rows, and a divided action footer.

Recommendation cards preserve their explanation and actions instead of repeating the board's four scan metrics. They follow the same priority-badge and plain-text freshness rules as board cards; secondary reason labels are text, not chips. Lookout never replaces status color with its own gradient and never hides the underlying evidence.

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

Chips label state; they do not behave like buttons unless explicitly wired as filters. Critical Over limit chips use dark red with white text. Other status chips use strong text on their matching soft ground.

### Inputs and focus

Routine inputs use a neutral border. The Lookout composer and AI ordering control may use the gradient outline. Keyboard focus always adds a visible ring beyond the resting border.

### Motion

Motion is functional and brief:

- 180–200ms lane expand/collapse and content entry;
- live countdown updates without layout shift;
- timeline selection follows the receipt in view;
- no ambient gradient motion, bounce, or decorative shimmer.

Honor `prefers-reduced-motion`.

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
