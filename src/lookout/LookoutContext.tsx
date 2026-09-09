import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface LookoutState {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  focusDriverId: string | null
  setFocus: (id: string | null) => void
  /** Bumped by anything outside the rail that wants the chat composer: the rail opens, switches to Chat, and focuses it. */
  composeRequest: number
  requestCompose: () => void
}

const Ctx = createContext<LookoutState | null>(null)

export function LookoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [focusDriverId, setFocus] = useState<string | null>(null)
  const [composeRequest, setComposeRequest] = useState(0)
  const requestCompose = useCallback(() => {
    setCollapsed(false)
    setComposeRequest((n) => n + 1)
  }, [])
  const value = useMemo(() => ({ collapsed, setCollapsed, focusDriverId, setFocus, composeRequest, requestCompose }), [collapsed, focusDriverId, composeRequest, requestCompose])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLookout(): LookoutState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLookout must be used inside <LookoutProvider>')
  return v
}
