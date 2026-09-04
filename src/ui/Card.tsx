import type { HTMLAttributes } from 'react'

export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-panel shadow-card ${className}`} {...props} />
}
