import { hashString } from '../data/prng'
import type { Driver } from '../data/types'

// Illustrated placeholder avatars, deterministic per driver, gender from the name. These are
// illustration colors, not theme tokens, so they are the one place raw hex is allowed in a
// component. Real photos replace this component without touching its callers.
const SKIN = ['#f1c9a5', '#e0ac7d', '#c68642', '#8d5524', '#5c3a21', '#f8d9c0']
const HAIR = ['#2b2118', '#4a2f1b', '#7a4b2a', '#b5651d', '#111111', '#d9c5a0', '#5a5a5a']
const SHIRT = ['#3262a8', '#266b4c', '#63636c', '#8f5f0e', '#5b6472', '#7a4b2a']

export default function DriverAvatar({ driver, size = 32, className = '' }: { driver: Driver; size?: number; className?: string }) {
  const h = hashString(driver.id)
  const skin = SKIN[h % SKIN.length]
  const hair = HAIR[(h >> 3) % HAIR.length]
  const shirt = SHIRT[(h >> 6) % SHIRT.length]
  const fem = driver.gender === 'f'
  const beard = !fem && (h >> 9) % 3 === 0
  const glasses = (h >> 11) % 5 === 0
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 rounded-full ${className}`} role="img" aria-label={driver.name}>
      <circle cx="20" cy="20" r="20" fill="#e3e3ea" />
      {fem && <path d="M9.5 21c0-9 4.5-14.5 10.5-14.5S30.5 12 30.5 21v13h-21z" fill={hair} />}
      <path d="M5 40c1-8 7.5-11.5 15-11.5S34 32 35 40z" fill={shirt} />
      <circle cx="20" cy="18" r="9" fill={skin} />
      {!fem && <path d="M11 17.5c0-6.5 4-10 9-10s9 3.5 9 10c-2-3-5-4.5-9-4.5s-7 1.5-9 4.5z" fill={hair} />}
      {fem && <path d="M11 16.5c0-5.5 4-9 9-9s9 3.5 9 9c-2-2.5-5-3.5-9-3.5s-7 1-9 3.5z" fill={hair} />}
      <circle cx="16.6" cy="18.6" r="1.15" fill="#2b2118" />
      <circle cx="23.4" cy="18.6" r="1.15" fill="#2b2118" />
      {glasses && <path d="M13.5 18.6h3.6m2.6 0h3.6M13.5 18.6a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0zm7.8 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0z" stroke="#2b2118" strokeWidth="0.9" fill="none" />}
      <path d="M17 22.6c1 1 2 1.4 3 1.4s2-.4 3-1.4" stroke="#2b2118" strokeWidth="1" strokeLinecap="round" fill="none" />
      {beard && <path d="M12.5 20.5c1 5.5 4 8 7.5 8s6.5-2.5 7.5-8c-2 2.2-4.5 3.3-7.5 3.3s-5.5-1.1-7.5-3.3z" fill={hair} opacity="0.9" />}
    </svg>
  )
}
