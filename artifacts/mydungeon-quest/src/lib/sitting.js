// ------------------------------------------------------------
// THE SITTING at the forge — the Likeness Law's first half
// (Directive VI, Phase 6 groundwork).
//
// A face is accepted, not assigned. On the illuminated tier the
// hero's own bearing opens three chairs — one identity, three
// stagings, every brief carrying the identity verbatim — and the
// player blesses one, once, finally, exactly as a voice is blessed
// at the audition. NO SHEET BEFORE THE BLESSING: the six-view
// turnaround mints from the accepted anchor or it does not mint.
// Parchment is exempt; the Floor paints procedurally and owes no
// sitting. All of it is the engine's law (fatescript/sitting);
// this seat only shapes the hero the forge already holds.
// ------------------------------------------------------------
import { openSitting as engineOpenSitting, blessCandidate, sheetBrief, requiresSitting, CANDIDATE_COUNT } from 'fatescript/sitting';
import { canonicalTier } from './seal.js';

export { blessCandidate, CANDIDATE_COUNT };

// The identity block, in the forge's own words: bearing first, the
// background as fallback, the distinguishing mark carried along.
export function heroBearingText(hero) {
  const core = String(hero?.bearing || hero?.background || `${hero?.ancestry || ''} ${hero?.className || ''}`).trim();
  const marked = hero?.mark ? `${core} Marked: ${String(hero.mark).trim()}.` : core;
  return marked.slice(0, 300);
}

// Three chairs from one bearing — deterministic; the same hero is
// offered the same sitting every time.
export function openSitting(hero, turn = 0) {
  return engineOpenSitting({ subject: hero?.name || 'the hero', kind: 'soul', bearingText: heroBearingText(hero), turn });
}

// The blessing: once, and final. The engine refuses the rest.
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
