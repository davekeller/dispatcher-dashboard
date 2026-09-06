import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import { derive } from '../store/derive'
import { ANCHOR } from '../time/clock'
import { matchIntent } from './intents'
import { routePlans, seqRange } from './plans'

describe('routePlans', () => {
  const fleet = materialize(makeFleet(ANCHOR), ANCHOR)
  const d = derive(fleet, ANCHOR, {})
  const plansFor = (id: string) => routePlans(d.byId.get(id)!, d.cardById.get(id)!, d)

  it('hands Marcus the two stops past his limit to Ana L., then a reset after the last stop he can reach', () => {
    const plans = plansFor('drv-01')
    expect(plans[0].kind).toBe('reassign')
    expect(plans[0].title).toMatch(/^Reassign stops 14–15 to Ana L\./)
    expect(plans[0].action).toMatchObject({ action: 'reassign', toId: 'drv-08' })
    expect(plans[0].action?.stopIds).toHaveLength(2)
    expect(plans[0].body).toMatch(/drive time to spare/)
    expect(plans[1].kind).toBe('reset')
    expect(plans[1].title).toMatch(/after stop 13/)
    expect(plans[1].action).toMatchObject({ action: 'schedule_reset', afterStopId: d.byId.get('drv-01')!.remaining[0].id })
  })

  it('tells Lena to call Priya first, then who takes her stops, never the marginal Ravi P.', () => {
    const plans = plansFor('drv-02')
    expect(plans[0].kind).toBe('call')
    expect(plans[0].title).toBe('Call Priya S. now')
    const reassign = plans.find((p) => p.kind === 'reassign')!
    expect(reassign.action?.toId).toBeDefined()
    expect(reassign.action?.toId).not.toBe('drv-09')
    expect(plans.find((p) => p.kind === 'reset')?.action).toMatchObject({ afterStopId: null })
  })

  it('leads with the call for Dre and holds the reassignment until his truck reports in', () => {
    const plans = plansFor('drv-03')
    expect(plans[0].kind).toBe('call')
    expect(plans[0].title).toBe('Call Dre W.: no ping for 25 min')
    const reassign = plans.find((p) => p.kind === 'reassign')
    expect(reassign?.positionDependent).toBe(true)
    expect(reassign?.title).toMatch(/once the truck reports in/)
  })

  it('lists the late customers Tomas has not told yet', () => {
    const view = d.byId.get('drv-07')!
    const notify = plansFor('drv-07').find((p) => p.kind === 'notify')!
    expect(view.unnotifiedLateStops.length).toBeGreaterThan(0)
    expect(notify.action?.stopIds).toEqual(view.unnotifiedLateStops.map((s) => s.id))
    expect(notify.title).toMatch(/^Notify \d+ customers running late$/)
  })

  it('gives a quiet route its status instead of nothing', () => {
    expect(plansFor('drv-11')).toMatchObject([{ kind: 'status', title: 'Route complete' }])
    expect(plansFor('drv-04')[0]).toMatchObject({ kind: 'status', title: 'Elena is on break' })
    const ana = plansFor('drv-08')[0]
    expect(ana.kind).toBe('status')
    expect(ana.title).toBe("Nothing needs you on Ana's route")
    expect(ana.body).toMatch(/^Next: stop \d+/)
  })

  it('formats stop ranges the way the rail reads them', () => {
    const stop = (seq: number) => ({ seq }) as never
    expect(seqRange([stop(14), stop(15)])).toBe('stops 14–15')
    expect(seqRange([stop(9), stop(3), stop(7)])).toBe('stops 3, 7 and 9')
    expect(seqRange([stop(4)])).toBe('stop 4')
  })

  it('answers "what should I do about Marcus" in the chat with the same plans', () => {
    const reply = matchIntent('What should I do about Marcus?', d)
    expect(reply.text).toMatch(/^For Marcus R\.: Reassign stops 14–15 to Ana L\./)
    expect(reply.driverIds).toEqual(['drv-01'])
    expect(matchIntent('What should I do?', d).examples).toEqual(['What should I do about Marcus?'])
  })
})
