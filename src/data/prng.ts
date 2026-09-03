// mulberry32: tiny, seedable, deterministic. Same seed → same fleet in every
// browser and on the deployed build. Never Math.random() in this repo.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rng {
  next(): number
  int(min: number, max: number): number // inclusive
  pick<T>(items: readonly T[]): T
  chance(p: number): boolean
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed)
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  }
}

/** FNV-1a. Used to derive per-driver jitter without touching the fleet RNG. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
