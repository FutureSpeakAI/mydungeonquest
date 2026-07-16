// ------------------------------------------------------------
// THE BEARING — Bearing, Signature & Roster (Directive VI).
//
// The card IS the prompt. A soul's bearing is the deterministic paint
// block derived from its card and the world clock: the locked visual
// canon verbatim (consistent terminology is consistency), the SIGNATURE
// — one high-contrast, trackable item the model can hold better than a
// face — the age band the clock has walked it into, the wounds the
// record says show, and what it carries now per the ledger. Give a
// signature away and the paint follows the ledger: the books and the
// paintings agree, by construction.
//
// Two hard laws live here. THE DEAD DO NOT AGE: a dead soul's band
// froze the turn it fell, and its bearing speaks only in the past.
// And the ROSTER: at most three painted subjects per plate — speaker
// first, then the villain if present, then bond — chosen the same way
// every time, because the model is stable at two or three and the
// watchtower is stable at none-of-your-nonsense.
// ------------------------------------------------------------
import { agedBand } from './clock.js';

export const ROSTER_CAP = 3;
const clean = (value, cap = 120) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);

// The signature: the soul's mark, or an explicit signature field, or
// nothing — and nothing is a court matter for new souls.
export function signatureOf(soul = {}) {
  return clean(soul.signature || soul.mark || '', 80) || null;
}

// The court for the Signature Law: every soul introduced under
// Directive VI carries one trackable item in its canon.
export function assertSignature(soul = {}) {
  const signature = signatureOf(soul);
  return signature
    ? { ok: true, errors: [] }
    : { ok: false, errors: [`${soul.name || 'a soul'} enters without a signature — give the paint something to hold`] };
}

const WOUND_WORDS = /scar|wound|burn|limp|lost (an?|his|her|their)|missing (an?|his|her|their)|mark of/i;

// The bearing: everything the Foundry needs to paint this soul NOW,
// derived and deterministic. `carried` comes from the ledger's
// projection; `yearsSince` from the world clock against the soul's
// introduction.
export function bearingFor(card, { yearsSince = 0, carried = [] } = {}) {
  const identity = card.identity || {};
  const state = card.state || {};
  const dead = state.status === 'dead';
  const band = dead ? (identity.age_band || 'adult') : agedBand(identity.age_band || 'adult', yearsSince);
  const wounds = (card.chronicle || []).map((line) => line.gloss).filter((gloss) => WOUND_WORDS.test(gloss)).slice(-3);
  const carriedNames = carried.map((line) => clean(line.item, 60));
  const signature = signatureOf(identity);
  const signatureCarried = signature && (carriedNames.some((item) => item.toLowerCase() === signature.toLowerCase()) || carried.length === 0);
  return {
    name: identity.name,
    band, dead,
    aged: !dead && band !== (identity.age_band || 'adult'),
    visual: clean(identity.canon?.visual || '', 360), // locked canon, verbatim — never paraphrased
    signature: signatureCarried ? signature : null,
    signatureNote: signature && !signatureCarried ? `no longer carries ${signature}` : null,
    wounds,
    carried: carriedNames.slice(0, 3)
  };
}

// The block the prompt actually receives: one string, same words every
// render, identity first, then what time and the record have added.
export function bearingBlock(bearing) {
  const parts = [
    `${bearing.name} — ${bearing.band}${bearing.dead ? ', at rest' : ''}.`,
    bearing.visual ? `${bearing.visual}.` : '',
    bearing.signature ? `Signature: ${bearing.signature} — always visible.` : '',
    bearing.signatureNote ? `(${bearing.signatureNote}.)` : '',
    bearing.wounds.length ? `Bears: ${bearing.wounds.join('; ')}.` : '',
    !bearing.dead && bearing.carried.length ? `Carries: ${bearing.carried.join(', ')}.` : '',
    bearing.aged ? `Aged forward — same person, years on; the face holds, the years show.` : ''
  ].filter(Boolean);
  return parts.join(' ');
}

// The roster: who gets painted when the scene is crowded. Deterministic
// in its inputs — speaker, then villain, then bond, then the quiet
// fallback of names — capped at three; everyone else is staged in prose.
export function paintRoster({ present = [], speaker = null, cards = {} } = {}, cap = ROSTER_CAP) {
  const canonKey = (name) => clean(name).toLowerCase();
  const cardOf = (name) => cards[canonKey(name)] || cards[name] || null;
  const scored = present.map((name) => {
    const card = cardOf(name);
    return {
      name,
      speaker: speaker && canonKey(name) === canonKey(speaker) ? 1 : 0,
      villain: card?.identity?.role === 'villain' ? 1 : 0,
      bond: card?.state?.bond ?? 0
    };
  });
  scored.sort((a, b) => b.speaker - a.speaker || b.villain - a.villain || b.bond - a.bond || a.name.localeCompare(b.name));
  const painted = scored.slice(0, cap).map((entry, index) => ({ name: entry.name, slot: index + 1 }));
  return { painted, staged: scored.slice(cap).map((entry) => entry.name) };
}
