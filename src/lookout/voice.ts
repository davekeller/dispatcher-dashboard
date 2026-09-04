// Lookout's name and shared phrases. The co-pilot is a feature of this product with its
// own voice: a competent colleague who says what she sees and what Lena can do about it.
export const LOOKOUT = {
  name: 'Lookout',
  tagline: 'Watching the shift',
  allClear: (onShift: number) => `All clear. ${onShift} drivers on shift, nothing needs you right now.`,
  /** The one line under the name: what needs Lena right now, and where to start. */
  summary: (urgent: number, first?: string) =>
    urgent === 0 ? 'Nothing needs you right now.' : urgent === 1 ? (first ? `One needs you now: ${first}` : 'One needs you now.') : `${urgent} need you now.${first ? ` Start with ${first}` : ''}`,
  focusIntro: (name: string) => `What I see on ${name}`,
  snoozed: (until: string) => `Snoozed until ${until}`,
  called: (at: string) => `Called at ${at}`,
  chatIntro: "Ask me who's near the limit, who's offline, or to reassign someone's stops.",
  noMatch: "I didn't catch that. Here's what I can do:",
} as const
