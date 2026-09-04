export type MiniTimelineLayout = {
  positions: number[]
  firstRemainingIndex: number
  historyCompressed: boolean
}

const isHistory = (status: string) => status === 'done' || status === 'failed'

/** A restrained overview layout: only routes whose completed prefix fills at least
 * two-thirds of the work compress, reserving the final third for remaining stops. */
export function miniTimelineLayout(statuses: readonly string[]): MiniTimelineLayout {
  if (statuses.length === 0) return { positions: [], firstRemainingIndex: -1, historyCompressed: false }
  if (statuses.length === 1) return { positions: [50], firstRemainingIndex: isHistory(statuses[0]) ? -1 : 0, historyCompressed: false }

  const unresolvedIndex = statuses.findIndex((status) => !isHistory(status))
  const completedPrefixCount = unresolvedIndex < 0 ? statuses.length : unresolvedIndex
  const historyCompressed = completedPrefixCount >= 6 && completedPrefixCount / statuses.length >= 2 / 3 && completedPrefixCount < statuses.length

  if (!historyCompressed) {
    return {
      positions: statuses.map((_, index) => 5 + (index / (statuses.length - 1)) * 90),
      firstRemainingIndex: unresolvedIndex,
      historyCompressed,
    }
  }

  const remainingCount = statuses.length - completedPrefixCount
  const positions = statuses.map((_, index) => {
    if (index < completedPrefixCount) {
      return completedPrefixCount === 1 ? 33.5 : 5 + (index / (completedPrefixCount - 1)) * 57
    }
    if (remainingCount === 1) return 80
    return 66 + ((index - completedPrefixCount) / (remainingCount - 1)) * 29
  })

  return { positions, firstRemainingIndex: unresolvedIndex, historyCompressed }
}

/** Percentage of the light endpoint to use for a completed stop. The route origin
 * starts light and the last completed stop resolves to the dark progress edge. */
export function completedStopLightWeight(index: number, lastCompleteIndex: number): number {
  if (lastCompleteIndex <= 0) return 50
  const depth = Math.max(0, Math.min(1, index / lastCompleteIndex))
  return Math.round((1 - depth) * 100)
}
