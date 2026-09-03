import { CaretLeft, CaretRight, ChartBar, Path, SquaresFour, Users } from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink } from 'react-router'

const ITEMS = [
  { to: '/', label: 'Active Shift', Icon: SquaresFour, end: true },
  { to: '/drivers', label: 'Drivers', Icon: Users, end: false },
  { to: '/routes', label: 'Routes', Icon: Path, end: false },
  { to: '/reports', label: 'Reports', Icon: ChartBar, end: false },
]

/** Light. Enough to show this is one view inside a product. Only Active Shift is built. */
export default function LeftNav() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <nav className={`flex shrink-0 flex-col border-r border-line bg-panel transition-[width] ${collapsed ? 'w-14' : 'w-48'}`} aria-label="Primary">
      <div className={`flex h-14 items-center border-b border-line ${collapsed ? 'justify-center' : 'px-4'}`}>
        <span className="font-display text-[15px] font-semibold tracking-tight">{collapsed ? 'D' : 'Dispatch'}</span>
      </div>
      <ul className="flex flex-col gap-0.5 p-2">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13px] font-medium transition ${isActive ? 'bg-well text-ink' : 'text-muted hover:bg-well/60 hover:text-ink'} ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} weight="duotone" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="mt-auto flex h-10 items-center justify-center text-muted hover:text-ink" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
        {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
      </button>
    </nav>
  )
}
