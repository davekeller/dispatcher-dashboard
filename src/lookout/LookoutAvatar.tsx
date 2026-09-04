import { useId } from 'react'

/** Lookout's compact brand mark: a radial spectral field with two white insight sparkles. */
export default function LookoutAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  const gradientId = useId()
  const goldId = `${gradientId}-gold`
  const warmId = `${gradientId}-warm`
  const roseId = `${gradientId}-rose`
  const coolId = `${gradientId}-cool`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={goldId} cx="22%" cy="18%" r="72%">
          <stop offset="0" style={{ stopColor: 'var(--color-ai-gold)' }} />
          <stop offset=".48" style={{ stopColor: 'var(--color-ai-gold)', stopOpacity: .86 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-ai-gold)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={warmId} cx="18%" cy="84%" r="72%">
          <stop offset="0" style={{ stopColor: 'var(--color-ai-warm)' }} />
          <stop offset=".44" style={{ stopColor: 'var(--color-ai-warm)', stopOpacity: .9 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-ai-warm)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={roseId} cx="84%" cy="18%" r="70%">
          <stop offset="0" style={{ stopColor: 'var(--color-ai-rose)' }} />
          <stop offset=".46" style={{ stopColor: 'var(--color-ai-rose)', stopOpacity: .88 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-ai-rose)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={coolId} cx="82%" cy="84%" r="74%">
          <stop offset="0" style={{ stopColor: 'var(--color-ai-cool)' }} />
          <stop offset=".48" style={{ stopColor: 'var(--color-ai-cool)', stopOpacity: .88 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-ai-cool)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" style={{ fill: 'var(--color-ai-violet)' }} />
      <circle cx="16" cy="16" r="15" fill={`url(#${goldId})`} />
      <circle cx="16" cy="16" r="15" fill={`url(#${roseId})`} />
      <circle cx="16" cy="16" r="15" fill={`url(#${warmId})`} />
      <circle cx="16" cy="16" r="15" fill={`url(#${coolId})`} />
      <circle cx="16" cy="16" r="14.2" fill="none" className="stroke-on-accent" strokeWidth=".7" opacity=".28" />
      <path
        d="M16.7 9.1c.7 4.05 3.25 6.6 7.3 7.3-4.05.7-6.6 3.25-7.3 7.3-.7-4.05-3.25-6.6-7.3-7.3 4.05-.7 6.6-3.25 7.3-7.3Z"
        fill="none"
        className="stroke-on-accent"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.6 7.3c.22 1.45 1 2.23 2.45 2.45-1.45.22-2.23 1-2.45 2.45-.22-1.45-1-2.23-2.45-2.45 1.45-.22 2.23-1 2.45-2.45Z" fill="none" className="stroke-on-accent" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
