// Lookout's name and shared phrases. The co-pilot is a feature of this product with its
// own voice: a competent colleague who says what she sees and what Lena can do about it.
export const LOOKOUT = {
  name: 'Lookout',
  tagline: 'Watching the shift',
  allClear: (onShift: number) => `All clear. ${onShift} drivers on shift, nothing needs you right now.`,
  focusIntro: (name: string) => `What I see on ${name}`,
  snoozed: (until: string) => `Snoozed until ${until}`,
  called: (at: string) => `Called at ${at}`,
} as const
