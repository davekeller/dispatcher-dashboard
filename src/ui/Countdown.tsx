import { hosStatusOf } from '../hos/compute'
import { fmtCountdown } from '../lib/format'
import { BAND_TONE } from './tones'

const SIZE = { xs: 'text-[12px]', sm: 'text-[13px]', md: 'text-lg', lg: 'font-display text-5xl leading-none tracking-tight' } as const

/** The number that matters. Tabular figures so it never jitters; tilde when it is an estimate. */
export default function Countdown({ minutes, stale, size = 'sm', className = '' }: { minutes: number; stale: boolean; size?: keyof typeof SIZE; className?: string }) {
  const hos = hosStatusOf(minutes)
  const color = hos === 'over' || hos === 'act_now' ? BAND_TONE.act_now.text : hos === 'watch' ? BAND_TONE.watch.text : 'text-ink'
  return (
    <span className={`tnum font-semibold ${SIZE[size]} ${color} ${className}`} title={stale ? 'Estimate: last ping is stale' : undefined}>
      {fmtCountdown(minutes, stale)}
    </span>
  )
}
