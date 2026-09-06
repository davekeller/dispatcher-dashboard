import { useId } from 'react'

/** Lookout's compact agent mark: a crisp spectrum disc with a friendly pixel face. */
export default function LookoutAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  const baseId = `${id}-base`
  const cyanId = `${id}-cyan`
  const pinkId = `${id}-pink`
  const orangeId = `${id}-orange`
  const limeId = `${id}-lime`
  const clipId = `${id}-clip`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`block ${className}`} aria-hidden="true" focusable="false">
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
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="15" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="1" y="1" width="30" height="30" fill={`url(#${baseId})`} />
        <rect x="1" y="1" width="30" height="30" fill={`url(#${cyanId})`} />
        <rect x="1" y="1" width="30" height="30" fill={`url(#${pinkId})`} />
        <rect x="1" y="1" width="30" height="30" fill={`url(#${orangeId})`} />
        <rect x="1" y="1" width="30" height="30" fill={`url(#${limeId})`} />
      </g>
      <g className="fill-on-accent" shapeRendering="crispEdges">
        <rect x="9" y="10" width="4" height="4" />
        <rect x="19" y="10" width="4" height="4" />
        <rect x="9" y="18" width="3" height="3" />
        <rect x="12" y="21" width="8" height="3" />
        <rect x="20" y="18" width="3" height="3" />
      </g>
    </svg>
  )
}
