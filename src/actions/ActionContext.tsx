import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// The three consequential actions open a dialog. Anything can request one; ActionDialogs
// renders them. Inline actions (acknowledge, call driver) never come through here.
export type DialogAction = 'reassign' | 'schedule_reset' | 'notify_customer'

export interface ActionRequest {
  action: DialogAction
  driverId: string
  stopIds?: string[]
  /** Reassign: the candidate to pre-pick. */
  toId?: string
  /** Schedule reset: the stop to reset after; null means reset now. */
  afterStopId?: string | null
}

export interface ActionOptions {
  stopIds?: string[]
  toId?: string
  afterStopId?: string | null
}

interface ActionState {
  request: ActionRequest | null
  open: (action: DialogAction, driverId: string, opts?: ActionOptions) => void
  close: () => void
}

const Ctx = createContext<ActionState | null>(null)

export function ActionProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ActionRequest | null>(null)
  const value = useMemo<ActionState>(
    () => ({ request, open: (action, driverId, opts) => setRequest({ action, driverId, stopIds: opts?.stopIds, toId: opts?.toId, afterStopId: opts?.afterStopId }), close: () => setRequest(null) }),
    [request],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useActions(): ActionState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useActions must be used inside <ActionProvider>')
  return v
}
