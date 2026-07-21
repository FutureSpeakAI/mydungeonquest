// ------------------------------------------------------------
// THE SMITH'S MESSENGER (Directive XIII §5) — every die in both forge
// doors rolls through here. The keyless floor (parchment tier) and the
// proving rig answer LOCALLY from the pools — deterministic, instant,
// free. The illuminated tier asks the live smith; any trouble on the road
// (network, refusal, unlawful goods) degrades to the same local floor.
// The messenger trusts nothing: a returned set is re-judged by the strict
// validator BEFORE it may touch the forge — a stranger key or a locked
// key in the parcel and the whole parcel is refused (fail-closed).
// ------------------------------------------------------------
import { mockSmith, validateCandidateSet } from 'fatescript/smith';
import { mockStorySmith, validateStorySmithCandidate } from 'fatescript/storySmith';
import { isProving } from './proving.js';

export async function smithSpin({ scope, field = null, locked = {}, seed = 0, tier = 'parchment' }) {
  const floor = () => mockSmith({ scope, field, locked, seed });
  if (tier !== 'illuminated' || isProving()) return floor();
  try {
    const res = await fetch('/api/smith', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, field, locked, seed })
    });
    if (!res.ok) return floor();
    const json = await res.json();
    const verdict = validateCandidateSet(scope, field, Array.isArray(json?.candidates) ? json.candidates : null, locked);
    return verdict.ok ? json : floor();
  } catch {
    return floor();
  }
}

// THE STORY SMITH'S PARCEL (Directive XIX, Article I) — the same
// messenger law for the bespoke spine: keyless and proving answer from
// the deterministic floor; the illuminated road re-judges the WHOLE
// parcel (spine schema court + sweeps) before it may touch the forge,
// and any trouble on the road degrades to the floor. The player's own
// hands always outrank whatever this returns.
export async function spineSpin({ covenant = '', tone = '', carryover = null, seed = 0, tier = 'parchment' } = {}) {
  const floor = () => mockStorySmith({ covenant, tone, carryover, seed });
  if (tier !== 'illuminated' || isProving()) return floor();
  try {
    const res = await fetch('/api/smith', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'spine', covenant, tone, carryover, seed })
    });
    if (!res.ok) return floor();
    const json = await res.json();
    const verdict = validateStorySmithCandidate({ spine: json?.spine, rumors: json?.rumors }, { bespoke: true });
    return verdict.ok ? json : floor();
  } catch {
    return floor();
  }
}
