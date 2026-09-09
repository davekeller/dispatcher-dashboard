// Lookout's name and shared phrases. The co-pilot is a feature of this product with its
// own voice: a competent colleague who says what she sees and what Lena can do about it.
export const LOOKOUT = {
  name: 'Lookout',
  role: 'AI Agent',
  tagline: 'Watching the shift',
  allClear: (onShift: number) => `All clear. ${onShift} drivers on shift, nothing needs you right now.`,
  /** The one line under the name: what needs Lena right now, and where to start. */
  summary: (urgent: number, first?: string) =>
    urgent === 0 ? 'Nothing needs you right now.' : urgent === 1 ? (first ? `One needs you now: ${first}` : 'One needs you now.') : `${urgent} need you now.${first ? ` Start with ${first}` : ''}`,
  focusIntro: (name: string) => `What I see on ${name}`,
  snoozed: (until: string) => `Snoozed until ${until}`,
  called: (at: string) => `Called at ${at}`,
  chatIntro: "Ask me who's near the limit, who's offline, or to reassign someone's stops.",
  /** The introduction, posted when Lena clicks the name or asks: who this is, what it watches, how it orders. */
  aboutIntro: (trucks: number, tick: number, urgent: number, watch: number) =>
    `I'm Lookout, the shift co-pilot. Every ${tick} seconds I re-read all ${trucks} trucks against the clock, from the same ranked list the board draws. Right now ${urgent === 0 ? 'nobody needs you' : urgent === 1 ? 'one needs you' : `${urgent} need you`}, ${watch === 0 ? 'nothing' : watch === 1 ? 'one' : String(watch)} to watch.`,
  aboutWatching: (labels: string[]) => `Watching for: ${labels.join(' · ')}.`,
  aboutOrder: 'How I order: whoever breaks first comes first. Over the limit, then act now, then watch; inside a band, the least drive time left. A quiet truck near the limit sorts up, not down. Snoozed cards drop but never vanish, and ties never reorder on a tick.',
  aboutTrust: "Every figure is the route file's own math, so the board and I cannot disagree. Ask me anything below.",
  noMatch: "I didn't catch that. Here's what I can do:",
} as const
