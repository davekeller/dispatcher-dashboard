import type { Band } from '../bands'
import type { DriverView } from '../store/view'

export type Severity = 'critical' | 'act_now' | 'watch' | 'info'
export type ActionId = 'reassign' | 'schedule_reset' | 'notify_customer' | 'call_driver' | 'acknowledge'

/** One object per rule. Fixed severity and a `when` predicate keep the shape
 *  copy-pasteable in a live demo; a rule that needs two severities is two objects. */
export interface Rule {
  id: string
  label: string
  severity: Severity
  when: (v: DriverView) => boolean
  message: (v: DriverView) => { title: string; body: string }
  actions: ActionId[]
}

export interface Alert {
  id: string // `${ruleId}:${driverId}`
  ruleId: string
  driverId: string
  severity: Severity
  label: string
  title: string
  body: string
  actions: ActionId[]
}

/** One card per driver, every firing reason on it. The board, the route file, and
 *  Lookout all render from this and nothing else. */
export interface DriverCard {
  driverId: string
  severity: Severity | 'none'
  alerts: Alert[]
  snoozed: boolean
  band: Band
}
