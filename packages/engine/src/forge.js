// ------------------------------------------------------------
// THE FORGE'S CHAIRS — the Likeness Law's first half at the forge
// (Directive VI, Phase 6 groundwork), seated home with the parity cut.
//
// A face is accepted, not assigned. On the illuminated tier the
// hero's own bearing opens three chairs — one identity, three
// stagings, every brief carrying the identity verbatim — and the
// player blesses one, once, finally, exactly as a voice is blessed
// at the audition. NO SHEET BEFORE THE BLESSING: the six-view
// turnaround mints from the accepted anchor or it does not mint.
// Parchment is exempt; the Floor paints procedurally and owes no
// sitting. The law itself lives in ./sitting.js; these chairs only
// shape the hero the forge already holds. The hero door is named
// openHeroSitting at this seat — the table's compat shim serves it
// as openSitting — so the star-exported surface never seats two
// laws under one name.
// ------------------------------------------------------------
import { openSitting, blessCandidate, sheetBrief, requiresSitting } from './sitting.js';
import { canonicalTier } from './canonical.js';

// The identity block, in the forge's own words: bearing first, the
// background as fallback, the distinguishing mark carried along.
export function heroBearingText(hero) {
  const core = String(hero?.bearing || hero?.background || `${hero?.ancestry || ''} ${hero?.className || ''}`).trim();
  const marked = hero?.mark ? `${core} Marked: ${String(hero.mark).trim()}.` : core;
  return marked.slice(0, 300);
}

// Three chairs from one bearing — deterministic; the same hero is
// offered the same sitting every time.
export function openHeroSitting(hero, turn = 0) {
  return openSitting({ subject: hero?.name || 'the hero', kind: 'soul', bearingText: heroBearingText(hero), turn });
}

// The blessing: once, and final. The law refuses the rest.
export function blessSitting(sitting, candidateId, turn = 0) {
  return blessCandidate(sitting, candidateId, { turn });
}

// The turnaround brief — refused whole while the sitting stands
// unblessed. No sheet before the blessing.
export function sittingSheet(sitting, bearingText = '') {
  return sheetBrief(sitting, { bearingText });
}

// The Floor owes no sitting: only the illuminated tier binds (the
// old 'cinema' word canonicalises to illuminated).
export function sittingRequired(mediaTier) {
  return requiresSitting(canonicalTier(mediaTier));
}
