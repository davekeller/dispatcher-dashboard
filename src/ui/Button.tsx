import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'lookout' | 'ghost'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-on-accent hover:bg-ink/90',
  secondary: 'bg-panel text-ink border border-line hover:bg-well',
  danger: 'bg-act-now text-on-accent hover:bg-act-now/90',
  lookout: 'bg-nav-selected-ink text-on-accent hover:bg-ink',
  ghost: 'bg-transparent text-muted hover:bg-well hover:text-ink',
}
const SIZE: Record<Size, string> = { sm: 'h-7 px-2.5 text-[12px]', md: 'h-9 px-3.5 text-[13px]' }

export default function Button({ variant = 'secondary', size = 'md', iconOnly = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; iconOnly?: boolean }) {
  const sizing = iconOnly ? (size === 'sm' ? 'h-7 w-7 p-0' : 'h-9 w-9 p-0') : SIZE[size]
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-control font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${sizing} ${className}`}
      {...props}
    />
  )
}
