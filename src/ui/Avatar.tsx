const SIZE = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[12px]', lg: 'h-12 w-12 text-base' } as const

export default function Avatar({ initials, size = 'md', className = '' }: { initials: string; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-well font-semibold text-muted ${SIZE[size]} ${className}`} aria-hidden="true">
      {initials}
    </span>
  )
}
