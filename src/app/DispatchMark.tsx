/** Dispatch's product mark: inbound routes feeding the spine of a forward-facing D. */
export default function DispatchMark({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" focusable="false" viewBox="0 0 32 32">
      <path d="M12 5.5v21h4.75c6.55 0 10.75-4.15 10.75-10.5S23.3 5.5 16.75 5.5H12Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.25" />
      <circle cx="4.25" cy="9" r="1.4" fill="currentColor" />
      <circle cx="4.25" cy="16" r="1.4" fill="currentColor" />
      <circle cx="4.25" cy="23" r="1.4" fill="currentColor" />
      <path d="M7 9h1.25A3.75 3.75 0 0 1 12 12.75M7 16h5M7 23h1.25A3.75 3.75 0 0 0 12 19.25" stroke="currentColor" strokeLinecap="round" strokeWidth="2.25" />
    </svg>
  )
}
