import type { Dispatcher } from '../data/dispatcher'

/** The dispatcher's mark: her initials on the slate the nav uses for its selected state, so it
 *  reads as the person at the desk and never as an alert. Drivers get portraits; she gets the
 *  mark that opens her settings. */
export default function DispatcherAvatar({ dispatcher, size = 32, className = '' }: { dispatcher: Dispatcher; size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={dispatcher.name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-nav-selected font-display font-semibold tracking-tight text-nav-selected-ink ring-1 ring-inset ring-nav-selected-line ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      <span aria-hidden="true">{dispatcher.initials}</span>
    </span>
  )
}
