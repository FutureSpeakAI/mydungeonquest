// THE TEMPO LAW (Experience Directive XX, Law IV) — the pure court of the
// brush. The illuminated tier paints where the story turns, not where the
// clock ticks. This court answers ONE question — does this turn earn its
// scene plate? — from sealed evidence alone: the turn's validated dm_turn,
// the codex, the turn index, and the player's setting. No clock, no
// randomness, no model, and no reach backward or forward: every signal is
// read off the turn itself (a sealed patch IS the evidence — the court
// reads the turn, never the aftermath), so the same walk answers
// byte-for-byte forever. The court only refuses a seating; what paints,
// paints exactly as lawfully as ever — the Anchor, Slot, Warden, and
// plateroad attestation laws sit downstream, untouched.

export const TEMPO_SETTINGS = Object.freeze(['every', 'turning', 'sparse']);

// The lawful default: absence, and any word the law does not know, reads
// 'every' — a pre-tempo save keeps today's cadence untouched, and no
// player's ground ever moves silently.
export function tempoSetting(value) {
  return value === 'turning' || value === 'sparse' ? value : 'every';
}

const names = (list) => (Array.isArray(list) ? list : [])
  .map((soul) => (typeof soul?.name === 'string' ? soul.name : ''))
  .filter(Boolean);

// The turning points, in the fixed order the court speaks them. Each
// signal reads THIS turn's own evidence and, when it stands, names it —
// a reason always cites what rode the very turn it judges. The sparse
// cadence keeps only the marked three: genesis, the beat boundary, and
// an explicit image cue.
const SIGNALS = [
  { id: 'genesis', sparse: true,
    sits: ({ turnIndex }) => turnIndex === 0,
    word: () => 'genesis — the first word of the tale earns its plate' },
  { id: 'beat', sparse: true,
    sits: ({ dm }) => dm?.story?.beat_advance === true,
    word: () => 'the beat boundary crossed — the spine advanced on this very turn' },
  { id: 'cue', sparse: true,
    sits: ({ dm }) => !!dm?.image_cue,
    word: ({ dm }) => `an image cue rides this turn (${typeof dm.image_cue.kind === 'string' && dm.image_cue.kind ? dm.image_cue.kind : 'scene'})` },
  { id: 'introduction', sparse: false,
    sits: ({ dm }) => names(dm?.story?.cast_add).length > 0,
    word: ({ dm }) => `an introduction lands this turn — ${names(dm.story.cast_add).join(', ')} joins the tale` },
  { id: 'movement', sparse: false,
    sits: ({ dm }) => typeof dm?.story?.scene_set?.region === 'string' && dm.story.scene_set.region.length > 0,
    word: ({ dm }) => `the party moves — the scene is set to ${dm.story.scene_set.region} on this turn` },
  { id: 'combat', sparse: false,
    sits: ({ dm }) => dm?.combat?.op === 'start',
    word: () => 'combat opens its first round this turn — first blood earns the plate' },
  { id: 'cinematic', sparse: false,
    sits: ({ dm }) => !!dm?.cinematic,
    word: ({ dm }) => `a cinematic rides this turn (${typeof dm.cinematic.type === 'string' && dm.cinematic.type ? dm.cinematic.type : 'cinematic'})` },
];

/**
 * The court. Evidence in, verdict out: { paints, reason }. Deterministic,
 * turn-local, and honest — a held frame names why it holds, a painted
 * frame names the evidence that earned it. Malformed evidence proves
 * nothing (fail-closed reads, never a crash): an unreadable signal simply
 * does not sit.
 */
export function tempoCourt({ dm = null, codex = null, turnIndex = null, setting = 'every' } = {}) {
  const cadence = tempoSetting(setting);
  const evidence = { dm, codex, turnIndex };
  if (cadence === 'every') {
    return { paints: true, reason: 'the cadence is every turn — each turn earns its own plate, the standing law unchanged' };
  }
  for (const signal of SIGNALS) {
    if (cadence === 'sparse' && !signal.sparse) continue;
    if (signal.sits(evidence)) return { paints: true, reason: signal.word(evidence) };
  }
  return {
    paints: false,
    reason: cadence === 'sparse'
      ? 'a quiet turn under the sparse cadence — the standing plate holds, an honest held frame'
      : 'a quiet turn — no boundary, cue, meeting, movement, first blood, or cinematic rides it; the standing plate holds'
  };
}
