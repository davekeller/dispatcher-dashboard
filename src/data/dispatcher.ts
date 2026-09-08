import { DAY_START, DAY_START_HOUR, MIN } from '../time/clock'

/** The dispatcher this product is built around: one person, as data, so the product bar's
 *  avatar and her settings page read the same record instead of each spelling her out. */
export interface Dispatcher {
  id: string
  name: string
  initials: string
  role: string
  carrier: string
  /** Her desk shift as hours of the day; the simulated day runs on past it into the evening. */
  shift: { startHour: number; endHour: number }
  desk: string
  background: string
}

export const DISPATCHER: Dispatcher = {
  id: 'dsp-01',
  name: 'Lena Vasquez',
  initials: 'LV',
  role: 'Dispatcher',
  carrier: 'Regional carrier',
  shift: { startHour: 6, endHour: 16 },
  desk: 'Day shift, one other dispatcher on',
  background: 'Drove for six years before moving to the desk, and still thinks like a driver.',
}

/** Her shift as clock times on the simulated day, so it formats with the same fmtClock as everything else. */
export function shiftWindow(d: Dispatcher, dayStart: number = DAY_START): { start: number; end: number } {
  const hour = 60 * MIN
  return { start: dayStart + (d.shift.startHour - DAY_START_HOUR) * hour, end: dayStart + (d.shift.endHour - DAY_START_HOUR) * hour }
}
