export const NAV_ITEM_BASE = 'flex h-8 items-center gap-1.5 rounded-control px-3 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40'

/** Shared selected-state grammar for the workspace links and Lookout tabs. */
export function navigationItemState(selected: boolean): string {
  return selected
    ? 'bg-well text-ink ring-1 ring-inset ring-line shadow-sm'
    : 'text-muted hover:bg-well/70 hover:text-ink'
}
