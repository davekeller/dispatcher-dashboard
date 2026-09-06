/** Return the next batch selection for the route's visible stop order.
 * A plain row click keeps checkbox-like toggle behavior; Shift-click adds the
 * inclusive range from the last plain-click anchor. */
export function nextStopSelection(
  current: readonly string[],
  orderedSelectableIds: readonly string[],
  stopId: string,
  anchorId: string | null,
  extendRange: boolean,
): string[] {
  if (extendRange && anchorId !== null) {
    const anchorIndex = orderedSelectableIds.indexOf(anchorId)
    const stopIndex = orderedSelectableIds.indexOf(stopId)
    if (anchorIndex >= 0 && stopIndex >= 0) {
      const start = Math.min(anchorIndex, stopIndex)
      const end = Math.max(anchorIndex, stopIndex)
      const selected = new Set([...current, ...orderedSelectableIds.slice(start, end + 1)])
      return orderedSelectableIds.filter((id) => selected.has(id))
    }
  }

  return current.includes(stopId)
    ? current.filter((id) => id !== stopId)
    : [...current, stopId]
}
