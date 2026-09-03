import { Wrench } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { GROUPINGS } from '../groupBy'
import { fmtClock } from '../lib/format'
import { useDerived } from '../store/hooks'
import { useStore } from '../store/store'

export default function Header() {
  const { pathname } = useLocation()
  const { now, byId } = useDerived()
  const groupBy = useStore((s) => s.groupBy)
  const setGroupBy = useStore((s) => s.setGroupBy)
  const toggleDev = useStore((s) => s.toggleDev)
  const routeMatch = pathname.match(/^\/routes\/(drv-\d+)$/)
  const focused = routeMatch ? byId.get(routeMatch[1]) : undefined

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-panel px-5">
      <h1 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
        {focused ? (
          <>
            <Link to="/" className="text-muted hover:text-ink">Active Shift</Link>
            <span className="text-muted">/</span>
            <span>{focused.driver.name}</span>
          </>
        ) : (
          'Active Shift'
        )}
      </h1>
      {!focused && (
        <div className="ml-2 flex items-center gap-1 rounded-control border border-line p-0.5" role="group" aria-label="Group columns by">
          {GROUPINGS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupBy(g.id)}
              className={`rounded-[6px] px-2.5 py-1 text-[12px] font-semibold ${groupBy === g.id ? 'bg-ink text-on-accent' : 'text-muted hover:text-ink'}`}
            >
              {g.label}
            </button>
          ))}
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
