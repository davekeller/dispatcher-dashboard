import type { Dispatcher } from '../data/dispatcher'

/** Lena's portrait is shared by the product bar and settings. Her initials remain beneath it
 *  as a resilient fallback if the local image cannot load. */
export default function DispatcherAvatar({ dispatcher, size = 32, className = '' }: { dispatcher: Dispatcher; size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={dispatcher.name}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-nav-selected font-display font-semibold tracking-tight text-nav-selected-ink ring-1 ring-inset ring-ink/10 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      <span aria-hidden="true">{dispatcher.initials}</span>
      <img
        src={dispatcher.portraitSrc}
        alt=""
        width={size}
        height={size}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => { event.currentTarget.hidden = true }}
      />
    </span>
  )
}
