/** Dispatch's product mark: three route origins converging into one forward move. */
export default function DispatchMark({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" focusable="false" viewBox="0 0 32 32">
      <circle cx="6.75" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="6.75" cy="16" r="1.5" fill="currentColor" />
      <circle cx="6.75" cy="23.5" r="1.5" fill="currentColor" />
      <path d="M10 8.5h3.25c3.3 0 4.25 2.05 5.8 4.25C20.25 14.4 21.65 16 24.5 16M10 16h14.5M10 23.5h3.25c3.3 0 4.25-2.05 5.8-4.25C20.25 17.6 21.65 16 24.5 16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="m21.5 12.75 3.75 3.25-3.75 3.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}
