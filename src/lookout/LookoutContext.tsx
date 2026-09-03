import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface LookoutState {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  focusDriverId: string | null
  setFocus: (id: string | null) => void
}

const Ctx = createContext<LookoutState | null>(null)

export function LookoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [focusDriverId, setFocus] = useState<string | null>(null)
  const value = useMemo(() => ({ collapsed, setCollapsed, focusDriverId, setFocus }), [collapsed, focusDriverId])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLookout(): LookoutState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLookout must be used inside <LookoutProvider>')
  return v
}
