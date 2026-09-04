import { useId } from 'react'

/** Lookout's compact brand face: warm, watchful, and legible down to chat-avatar size. */
export default function LookoutAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="5" x2="29" y2="27" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: 'var(--color-ai-warm)' }} />
          <stop offset=".52" style={{ stopColor: 'var(--color-ai-rose)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-ai-cool)' }} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${gradientId})`} />
      <circle cx="16" cy="16" r="13.25" className="fill-lookout" />
      <path d="M6.4 10.8A10.8 10.8 0 0 1 16 5a10.7 10.7 0 0 1 8.2 3.8" className="stroke-on-accent" strokeWidth="1.35" strokeLinecap="round" fill="none" opacity=".28" />
      <circle cx="11.4" cy="14" r="1.8" className="fill-on-accent" />
      <circle cx="20.7" cy="14" r="3.2" className="stroke-on-accent" strokeWidth="1.45" fill="none" />
      <circle cx="20.7" cy="14" r="1.05" className="fill-on-accent" />
      <path d="M10.2 20c1.5 2 3.5 3 5.8 3s4.3-1 5.8-3" className="stroke-on-accent" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="m24.2 7.2.65 1.35 1.35.65-1.35.65-.65 1.35-.65-1.35-1.35-.65 1.35-.65Z" className="fill-on-accent" />
    </svg>
  )
}
