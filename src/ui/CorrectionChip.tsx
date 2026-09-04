import { fmtHm } from '../lib/format'
import { useStore } from '../store/store'
import Chip from './Chip'
import { LOOKOUT_TONE } from './tones'

const SHOW_MS = 30_000

/** When a ping comes back the estimate may jump. Show the correction briefly rather than
 *  silently replacing it. Cheap, and it is the honest thing. */
export default function CorrectionChip({ driverId }: { driverId: string }) {
  const c = useStore((s) => s.corrections[driverId])
  if (!c || Date.now() - c.at > SHOW_MS) return null
  return (
    <Chip tone={LOOKOUT_TONE} title="The truck reported in; the estimate was replaced by what actually happened">
      updated · was ~{fmtHm(c.was)}, now {fmtHm(c.now)}
    </Chip>
  )
}
