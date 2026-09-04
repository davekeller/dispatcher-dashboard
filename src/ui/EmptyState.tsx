import type { ReactNode } from 'react'

export default function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line px-4 py-5">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[12px] text-muted">{body}</p>}
      {action}
    </div>
  )
}
