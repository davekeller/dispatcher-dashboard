import type { Derived } from '../store/derive'
import { routePlans } from './plans'
import { LOOKOUT } from './voice'

// Intent matching is a lookup, not a model. It exists to show the pattern: a small array of
// patterns and handlers, replies rendered as the same cards Lookout already shows.

export interface Reply {
  text: string
  driverIds?: string[]
  open?: { action: 'reassign'; driverId: string }
  examples?: string[]
}

export interface Intent {
  id: string
  example: string
  patterns: RegExp[]
  reply: (input: string, d: Derived) => Reply
}

export const INTENTS: Intent[] = [
  {
    id: 'near_limit',
    example: "Who's within 30 min of the limit?",
    patterns: [/limit/i, /\bnear\b/i, /close to/i, /approach/i, /\bhos\b/i, /running out/i],
    reply: (input, d) => {
      const m = input.match(/(\d+)\s*(min|minute|hour|hr|h)\b/i)
      const mins = m ? (/^h/i.test(m[2]) ? Number(m[1]) * 60 : Number(m[1])) : 90
      const ids = d.ranked.filter((c) => { const v = d.byId.get(c.driverId)!; return v.minutesUntilLimit <= mins && v.status !== 'off_duty' }).map((c) => c.driverId)
      return { text: ids.length > 0 ? `${ids.length} within ${mins} min of the limit, most urgent first.` : `No one is within ${mins} min of the limit.`, driverIds: ids }
    },
  },
  {
    id: 'offline',
    example: "Who's offline?",
    patterns: [/offline/i, /\bdark\b/i, /ping/i, /stale/i, /haven't heard/i, /lost/i],
    reply: (_input, d) => {
      const ids = d.ranked.filter((c) => d.byId.get(c.driverId)!.staleness !== 'fresh').map((c) => c.driverId)
      return { text: ids.length > 0 ? `${ids.length} not reporting fresh data.` : 'Every truck has pinged in the last three minutes.', driverIds: ids }
    },
  },
  {
    id: 'plan',
    example: 'What should I do about Marcus?',
    patterns: [/what should i do/i, /what do i do/i, /plan for/i, /how do i handle/i, /what about/i, /help with/i],
    reply: (input, d) => {
      const words = input.toLowerCase()
      const hit = d.views.find((v) => words.includes(v.driver.name.split(' ')[0].toLowerCase()))
      if (!hit) return { text: "About whom? Give me a driver's first name.", examples: ['What should I do about Marcus?'] }
      const card = d.cardById.get(hit.driver.id)
      const plans = card ? routePlans(hit, card, d) : []
      return { text: `For ${hit.driver.name}: ${plans.map((p) => p.title).join(' · ')}.`, driverIds: [hit.driver.id] }
    },
  },
  {
    id: 'reassign',
    example: "Reassign Marcus's stops",
    patterns: [/reassign/i, /move .*stops/i, /take .*stops/i, /hand off/i],
    reply: (input, d) => {
      const words = input.toLowerCase()
      const hit = d.views.find((v) => words.includes(v.driver.name.split(' ')[0].toLowerCase()))
      if (!hit) return { text: "Whose stops? Give me a driver's first name.", examples: ["Reassign Marcus's stops"] }
      return { text: `Opening the reassign picker for ${hit.driver.name}.`, open: { action: 'reassign', driverId: hit.driver.id } }
    },
  },
]

export function matchIntent(input: string, d: Derived): Reply {
  const intent = INTENTS.find((i) => i.patterns.some((p) => p.test(input)))
  if (intent) return intent.reply(input, d)
  return { text: LOOKOUT.noMatch, examples: INTENTS.map((i) => i.example) }
}
