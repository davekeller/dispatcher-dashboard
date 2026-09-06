import { WifiSlash } from '@phosphor-icons/react'
import { fmtAge } from '../../lib/format'
import type { DriverView } from '../../store/view'

/** The system says "we don't know" instead of showing a confident number it can't stand behind. */
export default function StaleBanner({ view }: { view: DriverView }) {
  const offline = view.staleness === 'offline'
  const first = view.driver.name.split(' ')[0]
  return (
    <div role="status" className={`flex items-center gap-3 rounded-card border px-4 py-2.5 text-[12px] ${offline ? 'border-offline bg-offline-board text-offline' : 'border-watch bg-watch-board text-watch'}`}>
      <WifiSlash size={16} weight="duotone" />
      <span>
        <strong>Last ping {fmtAge(view.pingAgeMin)}.</strong> Figures are estimates that assume {first} kept doing what the truck last reported
        {view.status === 'driving' ? ', which was driving' : ''}. Position-dependent actions are disabled until it reports in.
      </span>
    </div>
  )
}
