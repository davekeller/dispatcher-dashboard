import type { ReactNode } from 'react'

/** The route file's section heading (Assigned driver, Stops): the display face in sentence case,
 *  with an optional muted detail after it. A heading, not a label, so the page reads as sections. */
export default function SectionHeading({ children, detail }: { children: ReactNode; detail?: string }) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2 px-1 font-display text-[17px] font-semibold leading-none tracking-tight text-ink">
      {children}
      {detail && <span className="tnum font-sans text-[12px] font-medium tracking-normal text-muted">· {detail}</span>}
    </h3>
  )
}
