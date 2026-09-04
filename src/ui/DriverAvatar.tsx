import { hashString } from '../data/prng'
import type { Driver } from '../data/types'

const PORTRAITS = {
  m: [
    '/avatars/driver-m-1.webp',
    '/avatars/driver-m-2.webp',
    '/avatars/driver-m-3.webp',
    '/avatars/driver-m-4.webp',
  ],
  f: [
    '/avatars/driver-f-1.webp',
    '/avatars/driver-f-2.webp',
    '/avatars/driver-f-3.webp',
    '/avatars/driver-f-4.webp',
  ],
} as const

/** Local fictional portraits keep every driver surface human without a network dependency. */
export default function DriverAvatar({ driver, size = 32, className = '' }: { driver: Driver; size?: number; className?: string }) {
  const choices = PORTRAITS[driver.gender]
  // Higher hash bits avoid the visible repeating pattern that FNV's low bits have on drv-01, drv-02, …
  const portraitIndex = (hashString(driver.id + driver.name) >>> 12) % choices.length
  const src = choices[portraitIndex]

  return (
    <span
      role="img"
      aria-label={driver.name}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-well text-[10px] font-semibold text-muted ring-1 ring-inset ring-ink/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <span aria-hidden="true">{driver.initials}</span>
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => { event.currentTarget.hidden = true }}
      />
    </span>
  )
}
