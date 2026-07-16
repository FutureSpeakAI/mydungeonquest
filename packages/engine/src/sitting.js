// ------------------------------------------------------------
// THE SITTING — the Likeness Law, first half (Directive VI).
//
// A face is accepted, not assigned. When a soul is forged — the hero
// above all — the Foundry paints THREE CANDIDATES from the same locked
// identity: the variation is staging (light, angle, hour), never the
// person. The player blesses one, exactly as a voice is blessed at the
// audition, and the blessing is final: the blessed portrait becomes the
// anchor every later render answers to. NO SHEET BEFORE THE BLESSING —
// the turnaround mints from the accepted face or it does not mint. The
// second half of the law, the Warden's likeness check on every render,
// is charted with the Foundry wiring.
//
// The Floor is exempt where it must be: parchment paints procedurally
// and owes no sitting; the law binds the illuminated tier, where a
// face is money and identity both.
// ------------------------------------------------------------

export const CANDIDATE_COUNT = 3;

// Three stagings of one identity — deterministic, so the same soul is
// offered the same three chairs every time.
const STAGINGS = [
  { id: 'hearthlight', note: 'three-quarter view by hearthlight, warm chiaroscuro, ember-rimmed' },
  { id: 'dawn', note: 'profile at dawn, cool grey light through mist, quiet and unguarded' },
  { id: 'candle', note: 'front-facing by candlelight, deep ink shadow, eyes catching the flame' }
];

export function requiresSitting(mediaTier = 'parchment') {
  return mediaTier === 'illuminated';
}

// Open a sitting: three candidate briefs from one bearing block. The
// identity travels verbatim into every brief; only the staging differs.
export function openSitting({ subject, kind = 'soul', bearingText = '', turn = 0 } = {}) {
  if (!subject) throw new Error('a sitting needs a subject');
  const identity = String(bearingText || '').trim();
  return {
    subject: String(subject), kind, turn,
    status: 'unblessed',
    blessed: null,
    candidates: STAGINGS.map((staging) => ({
      id: staging.id,
      brief: `${identity} ${kind === 'soul' ? 'Portrait study on a plain, neutral ground — identity isolated, nothing behind them.' : 'Establishing view in full context — the place in its own weather and light.'} Staging: ${staging.note}.`
    }))
  };
}

// The blessing: once, and final. Blessing twice or blessing a stranger
// is refused — the face is not renegotiated.
export function blessCandidate(sitting, candidateId, { turn = 0 } = {}) {
  if (sitting.status === 'blessed') return { ok: false, reason: 'already blessed — a face is accepted once', sitting };
  const candidate = sitting.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) return { ok: false, reason: 'no such candidate sat for this portrait', sitting };
  return {
    ok: true,
    sitting: { ...sitting, status: 'blessed', blessed: { id: candidate.id, turn } }
  };
}

// The turnaround views a sheet holds. Souls sit on a neutral ground so
// identity stays isolated; places keep their context, because the model
// reconstructs new angles from environmental clues.
const SOUL_VIEWS = [
  { id: 'front', view: 'full body, facing front, arms at rest' },
  { id: 'profile', view: 'full body, true profile facing left' },
  { id: 'back', view: 'full body, from behind' },
  { id: 'bust', view: 'three-quarter bust, close enough to read the eyes' },
  { id: 'calm', view: 'face close-up, expression calm and unguarded' },
  { id: 'stirred', view: 'face close-up, expression stirred — resolve or grief, as the tale has it' }
];
const PLACE_VIEWS = [
  { id: 'establishing', view: 'wide establishing view, the master shot' },
  { id: 'north-approach', view: 'seen from the northern approach' },
  { id: 'south-approach', view: 'seen from the southern approach' },
  { id: 'east-approach', view: 'seen from the eastern approach' },
  { id: 'interior', view: 'one interior or sheltered vantage within' }
];

// The sheet mints AFTER acceptance, never before: this is the law the
// forge flow calls, and it refuses the unblessed with an honest error.
export function sheetBrief(sitting, { bearingText = '' } = {}) {
  if (sitting.status !== 'blessed') {
    return { ok: false, reason: 'no sheet before the blessing — the face must be accepted first' };
  }
  const identity = String(bearingText || '').trim();
  const views = (sitting.kind === 'soul' ? SOUL_VIEWS : PLACE_VIEWS).map((entry) => ({
    id: entry.id,
    prompt: `Using the blessed portrait as the anchor reference — same ${sitting.kind === 'soul' ? 'person, exact facial features' : 'place, exact geography'} as the anchor. ${identity} ${entry.view}.${sitting.kind === 'soul' ? ' Plain, neutral ground.' : ''}`
  }));
  return {
    ok: true,
    sheet: {
      subject: sitting.subject, kind: sitting.kind,
      anchor: { candidateId: sitting.blessed.id, blessed_turn: sitting.blessed.turn },
      views,
      law: { background: sitting.kind === 'soul' ? 'neutral' : 'context', anchored: true, count: views.length }
    }
  };
}
