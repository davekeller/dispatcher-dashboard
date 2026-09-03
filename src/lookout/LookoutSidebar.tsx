import { useLookout } from './LookoutContext'
import { LOOKOUT } from './voice'

/** Stub; Task 10 replaces it entirely. */
export default function LookoutSidebar() {
  const { collapsed, setCollapsed } = useLookout()
  return (
    <aside className={`flex shrink-0 flex-col border-l border-line bg-panel transition-[width] ${collapsed ? 'w-14' : 'w-[26rem]'}`} aria-label={`${LOOKOUT.name}, the shift co-pilot`}>
      <button type="button" onClick={() => setCollapsed(!collapsed)} className="h-14 border-b border-line px-4 text-left font-display text-[15px] font-semibold text-lookout-strong">
        {collapsed ? 'L' : LOOKOUT.name}
      </button>
    </aside>
  )
}
