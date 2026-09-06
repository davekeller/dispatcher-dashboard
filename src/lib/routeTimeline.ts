export type MiniTimelineLayout = {
  positions: number[]
}

/** One literal overview scale in reverse route order: every route stop receives an equal
 * slot, with the route end at the top and its origin at the bottom. Visual focus comes
 * from node size and status color, never positional magnification. */
export function miniTimelineLayout(statuses: readonly string[]): MiniTimelineLayout {
  if (statuses.length === 0) return { positions: [] }
  if (statuses.length === 1) return { positions: [50] }
  return { positions: statuses.map((_, index) => 95 - (index / (statuses.length - 1)) * 90) }
}

/** Percentage of the light endpoint to use for a completed stop. The route origin
 * starts dark and the most recently completed stop resolves to the light progress edge. */
export function completedStopLightWeight(index: number, lastCompleteIndex: number): number {
  if (lastCompleteIndex <= 0) return 50
  const depth = Math.max(0, Math.min(1, index / lastCompleteIndex))
  return Math.round(depth * 100)
}
