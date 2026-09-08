/** The story of this build, as data for the settings page: the project, the problems, what was built,
 *  and why. Copy lives here so the page only lays it out; the decks it points at live in `data/designFiles.ts`. */

export type SettingsSection = 'project' | 'lena' | 'problems' | 'solutions' | 'why'

export const SECTIONS: { id: SettingsSection; label: string; eyebrow: string }[] = [
  { id: 'project', label: 'Project', eyebrow: 'What this is' },
  { id: 'lena', label: 'Lena', eyebrow: 'Who it is for' },
  { id: 'problems', label: 'Problems', eyebrow: 'What her shift asks' },
  { id: 'solutions', label: 'Solutions', eyebrow: 'What was built' },
  { id: 'why', label: 'Why', eyebrow: 'The reasons behind it' },
]

export function isSettingsSection(value: string | null): value is SettingsSection {
  return value !== null && SECTIONS.some((s) => s.id === value)
}

export const PROJECT = {
  name: 'Dispatch',
  line: 'An Active Shift board for a fleet dispatcher running about fifty heavy-duty trucks and a thousand deliveries a day. Her job is not monitoring; it is intervening in time. The board is built around one exception: the 11-hour Hours of Service driving limit.',
  facts: [
    ['Fleet', '50 trucks · 4 regions · ~1,000 stops a day'],
    ['The one exception', 'Eleven hours of driving, then a mandatory reset'],
    ['What is real', 'A deterministic seeded fleet, one clock, pure derivation. Time to the limit is computed against the clock, never typed in.'],
    ['Stack', 'Vite · React 19 · TypeScript · Tailwind v4 · Zustand · react-router · Leaflet, lazy'],
  ] as [string, string][],
  links: [
    { label: 'Live', href: 'https://dispatch.kidastro.com' },
    { label: 'Source', href: 'https://github.com/davekeller/dispatcher-dashboard' },
  ],
}

export const PROBLEMS = {
  jobs: [
    'Know who is about to break, before they break.',
    'Decide what to do about it in one motion.',
    'Trust the data, or know when not to.',
  ],
  problems: [
    { title: 'Fifty trucks, one legal line', body: 'Eleven hours of driving and the driver has to stop. A violation is a fine for the company and a mark on the driver\'s record, and Lena takes both personally.' },
    { title: 'The number that matters moves', body: 'Time to the limit is a projection from duty segments against a live clock. A truck that has not pinged in twenty minutes can make a confident number a lie.' },
    { title: 'A thousand stops a day', body: 'When a driver cannot finish, the stops have to go somewhere with capacity, and the customers have to hear about it before their window closes.' },
  ],
}

export const SOLUTIONS = [
  { title: 'Exceptions, not the fleet', body: 'The board ranks routes by urgency into bands: Act now, Watch, On break, Offline, Clear. Only what needs attention carries color. Region and Metrics lenses are one click away.' },
  { title: 'Lookout, the co-pilot', body: 'A rail that reads the same ranked list as the board and never has its own data. Cards carry the actions; on a route file it turns into plans for that driver.' },
  { title: 'The route file', body: 'One driver\'s day: the limit marked on the stop timeline, receipts in route order, and actions that preview, confirm, commit, and undo.' },
  { title: 'Stale data as a state', body: 'Every figure knows how old its ping is. Estimates wear a tilde and an age, and actions that depend on position wait for the truck to report in.' },
  { title: 'A simulated shift', body: 'The clock is pinned to 2:47 PM so everyone sees the same scenario, and it ticks. Scrub the day, or play it against the real clock.' },
]

export const WHY = {
  decisions: [
    { title: 'Exceptions, not fleet', body: 'A dispatcher does not need to see fifty trucks. She needs to see the four that are about to break.' },
    { title: 'Predict, do not react', body: 'The countdown is derived from duty segments against the clock, so the alert exists before the violation, with its options attached.' },
    { title: 'Stale data is a state', body: 'Fresh, stale, and offline are derived and visible. Offline drivers near the limit sort up, not down.' },
    { title: 'Insight to action, with a confirm', body: 'Every card carries the actions a dispatcher would actually take, and every action confirms before it commits.' },
    { title: 'Rules are data', body: 'Each alert is one object in one array. Adding a rule is appending one, small enough to do live.' },
  ],
  cuts: 'Routing, the full rulebook, and the 14-hour window were cut on purpose, each for a one-line reason in the decision log.',
  logHref: 'https://github.com/davekeller/dispatcher-dashboard/blob/main/docs/DECISIONS.md',
}
