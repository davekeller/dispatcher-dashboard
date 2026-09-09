import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import type { NavigateFunction } from 'react-router'

/** Client-side navigation wrapped in a native View Transition when the browser can and the user allows.
 *  Plain primary clicks only: modified clicks, new tabs, unsupported browsers, and reduced motion keep the
 *  ordinary link, and the caller lets it proceed when this returns false. `before` runs synchronously ahead
 *  of the old-state snapshot, for a component that wants to name itself as the shared element. */
export function navigateWithTransition(event: MouseEvent<HTMLAnchorElement>, navigate: NavigateFunction, to: string, before?: () => void): boolean {
  const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  if (event.defaultPrevented || modified || event.currentTarget.target === '_blank' || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  event.preventDefault()
  if (before) flushSync(before)
  const transition = document.startViewTransition(() => flushSync(() => navigate(to)))
  // A hidden tab skips the transition and rejects `ready`; the navigation still happened, so that is not an error worth surfacing.
  transition.ready.catch(() => {})
  return true
}
