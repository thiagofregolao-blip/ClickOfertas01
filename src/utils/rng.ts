// src/utils/rng.ts — PRNG determinístico (Mulberry32)
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function pickWithRng<T>(arr: T[], rng: RNG): T {
  const idx = Math.floor(rng() * arr.length);
  return arr[Math.min(arr.length - 1, Math.max(0, idx))];
}