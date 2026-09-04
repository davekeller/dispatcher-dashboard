import { CaretRight, SquaresFour, TruckTrailer, Wrench } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { fmtClock } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'

/** The product bar. Dispatch is the product; the board is its home; a route file is one level in. */
export default function Header() {
  const { pathname } = useLocation()
  const { now, byId } = useDerived()
  const toggleDev = useStore((s) => s.toggleDev)
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined

  return (
    <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-line bg-panel px-5">
      <Link to="/" aria-label="Open the Dispatch board" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-lookout/35 bg-lookout-soft text-lookout-strong transition hover:bg-lookout hover:text-on-accent">
        <TruckTrailer size={18} weight="fill" />
      </Link>
      <Link to="/" className="ml-2 whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">Dispatch</Link>
      <span aria-hidden="true" className="ml-5 mr-3 h-5 w-px shrink-0 bg-line" />
      <nav aria-label="Workspace navigation" className="flex h-full items-stretch">
        <Link to="/" aria-current="page" className="flex items-center gap-1.5 border-t-[3px] border-lookout px-3 text-[13px] font-semibold text-ink">
          <SquaresFour size={15} weight="fill" /> Board
        </Link>
      </nav>
      {focused && (
        <div className="ml-1 flex min-w-0 items-center gap-2 text-[12px] text-muted">
          <CaretRight size={13} className="shrink-0" />
          <span className="truncate font-semibold text-ink">{focused.route.id.toUpperCase()} · {focused.driver.name}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="tnum text-[13px] text-muted" title="Simulated shift clock; it ticks in real time">
          <span className="font-semibold text-ink">{fmtClock(now)}</span> · simulated shift
        </span>
        <button type="button" onClick={toggleDev} title="Dev controls (⌘.)" className="rounded-control p-1.5 text-muted hover:bg-well hover:text-ink" aria-label="Toggle dev controls">
          <Wrench size={16} weight="duotone" />
        </button>
      </div>
    </header>
  )
}
