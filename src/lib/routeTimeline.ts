export type MiniTimelineLayout = {
  positions: number[]
}

/** One literal overview scale: every route stop receives an equal slot from top to bottom.
 * Visual focus comes from node size and status color, never positional magnification. */
export function miniTimelineLayout(statuses: readonly string[]): MiniTimelineLayout {
  if (statuses.length === 0) return { positions: [] }
  if (statuses.length === 1) return { positions: [50] }
  return { positions: statuses.map((_, index) => 5 + (index / (statuses.length - 1)) * 90) }
}

/** Percentage of the light endpoint to use for a completed stop. The route origin
 * starts light and the last completed stop resolves to the dark progress edge. */
export function completedStopLightWeight(index: number, lastCompleteIndex: number): number {
  if (lastCompleteIndex <= 0) return 50
  const depth = Math.max(0, Math.min(1, index / lastCompleteIndex))
  return Math.round((1 - depth) * 100)
}
