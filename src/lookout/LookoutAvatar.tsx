/** A placeholder face for Lookout: a coral circle, two eyes, a small smile. Dave will draw the real one. */
export default function LookoutAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
      <circle cx="14" cy="14" r="14" className="fill-lookout" />
      <circle cx="10" cy="12" r="1.8" className="fill-on-accent" />
      <circle cx="18" cy="12" r="1.8" className="fill-on-accent" />
      <path d="M9.5 17.5c1.2 1.6 2.7 2.4 4.5 2.4s3.3-.8 4.5-2.4" className="stroke-on-accent" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}
