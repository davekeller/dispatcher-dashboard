import { useId } from 'react'

/** Lookout's compact agent mark: a warped mesh field with two white insight sparkles. */
export default function LookoutAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  const baseId = `${id}-base`
  const cyanId = `${id}-cyan`
  const pinkId = `${id}-pink`
  const orangeId = `${id}-orange`
  const limeId = `${id}-lime`
  const sheenId = `${id}-sheen`
  const clipId = `${id}-clip`
  const warpId = `${id}-warp`
  const glowId = `${id}-glow`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={baseId} x1="8%" y1="4%" x2="92%" y2="96%">
          <stop offset="0" stopColor="#122b73" />
          <stop offset=".42" stopColor="#5a25cf" />
          <stop offset=".72" stopColor="#be218d" />
          <stop offset="1" stopColor="#ff5b2d" />
        </linearGradient>
        <radialGradient id={cyanId} cx="12%" cy="12%" r="76%">
          <stop offset="0" stopColor="#38f6ff" />
          <stop offset=".38" stopColor="#18baff" stopOpacity=".96" />
          <stop offset="1" stopColor="#18baff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={pinkId} cx="96%" cy="20%" r="78%">
          <stop offset="0" stopColor="#ff65e6" />
          <stop offset=".42" stopColor="#ed2fbb" stopOpacity=".94" />
          <stop offset="1" stopColor="#ed2fbb" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={orangeId} cx="8%" cy="96%" r="74%">
          <stop offset="0" stopColor="#ffcf40" />
          <stop offset=".4" stopColor="#ff6a24" stopOpacity=".96" />
          <stop offset="1" stopColor="#ff6a24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={limeId} cx="94%" cy="98%" r="72%">
          <stop offset="0" stopColor="#d9ff51" />
          <stop offset=".34" stopColor="#50e9a1" stopOpacity=".9" />
          <stop offset="1" stopColor="#50e9a1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={sheenId} cx="35%" cy="24%" r="72%">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".38" />
          <stop offset=".28" stopColor="#ffffff" stopOpacity=".08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="15" />
        </clipPath>
        <filter id={warpId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="11" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="4.5" xChannelSelector="R" yChannelSelector="B" />
        </filter>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation=".65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g filter={`url(#${warpId})`}>
          <circle cx="16" cy="16" r="17" fill={`url(#${baseId})`} />
          <circle cx="16" cy="16" r="17" fill={`url(#${cyanId})`} />
          <circle cx="16" cy="16" r="17" fill={`url(#${pinkId})`} />
          <circle cx="16" cy="16" r="17" fill={`url(#${orangeId})`} />
          <circle cx="16" cy="16" r="17" fill={`url(#${limeId})`} />
        </g>
        <circle cx="16" cy="16" r="15" fill={`url(#${sheenId})`} />
      </g>
      <circle cx="16" cy="16" r="14.45" fill="none" className="stroke-on-accent" strokeWidth=".55" opacity=".45" />
      <g filter={`url(#${glowId})`}>
        <path
          d="M16.7 9.1c.7 4.05 3.25 6.6 7.3 7.3-4.05.7-6.6 3.25-7.3 7.3-.7-4.05-3.25-6.6-7.3-7.3 4.05-.7 6.6-3.25 7.3-7.3Z"
          fill="none"
          className="stroke-on-accent"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8.6 7.3c.22 1.45 1 2.23 2.45 2.45-1.45.22-2.23 1-2.45 2.45-.22-1.45-1-2.23-2.45-2.45 1.45-.22 2.23-1 2.45-2.45Z" fill="none" className="stroke-on-accent" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
