// ------------------------------------------------------------
// THE THREE SPARKS — onboarding as law, seated home with the parity
// cut. The distance from opening the app to hearing the first
// sentence of YOUR OWN world is three choices or fewer: a spark, a
// voice, begin. Sparks are dealt deterministically from the forge's
// own pools, so the gate can prove the deal.
// ------------------------------------------------------------
import { TITLES, COVENANTS, TONES, REGION_NAMES } from './forgeRolls.js';

// Small, seedable, dependency-free PRNG (mulberry32).
export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three distinct ready worlds. Same seed, same deal.
export function sparks(seed = 1) {
  const roll = mulberry32(seed);
  const deal = (pool, taken) => {
    let pick = pool[Math.floor(roll() * pool.length)];
    while (taken.has(pick)) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    taken.add(pick);
    return pick;
  };
  const titles = new Set(); const covenants = new Set(); const tones = new Set(); const regions = new Set();
  return [0, 1, 2].map(() => ({
    title: deal(TITLES, titles),
    covenant: deal(COVENANTS, covenants),
    tone: deal(TONES, tones),
    region: deal(REGION_NAMES, regions)
  }));
}

// The quickstart route, as a pure and gated fact.
export function quickstartPlan() {
  return { taps: 3, steps: ['choose a spark', 'bless a voice', 'begin the tale'] };
}
