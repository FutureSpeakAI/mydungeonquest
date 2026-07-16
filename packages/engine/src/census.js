// ------------------------------------------------------------
// THE CENSUS — the court against op decay (Directive VI).
//
// The playtest failure this answers: a dozen turns in, the model gets
// lazy and introduces souls in PROSE ONLY — no cast_add, so the
// reducers never see them, so the codex, the cards, the casting, and
// the canon lock are all blind to a character the player is talking
// to. Prompting harder decays with context; a court does not.
//
// The hard, deterministic signal is the speaker line: a narration
// block attributed to a name the record does not know is an
// UNRECORDED SOUL, and the turn goes back through the one-repair door
// with the census note — add the cast_add (voice_card and all), or
// remove the attribution. A soul added THIS turn may speak this turn;
// the census counts the turn's own ops before it counts anyone
// missing. The softer signal — prose-named souls who never speak — is
// the Character Scribe's charge and a standing prompt rule; the
// census is the tripwire that cannot decay.
// ------------------------------------------------------------

const canon = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// Names the record knows this turn: the standing cast, the hero, the
// narrator's empty chair, and every soul the turn itself adds.
function knownNames(dm, cast = [], { hero = null } = {}) {
  const known = new Set(['', 'narrator']);
  for (const soul of cast) known.add(canon(soul.name));
  if (hero?.name) known.add(canon(hero.name));
  for (const soul of dm?.story?.cast_add || []) known.add(canon(soul.name));
  return known;
}

// The court: every attributed speaker this turn who is not counted.
// Order preserved, duplicates collapsed.
export function unrecordedSouls(dm, cast = [], options = {}) {
  const known = knownNames(dm, cast, options);
  const missing = [];
  for (const block of dm?.narration_blocks || []) {
    const speaker = canon(block?.speaker);
    if (!speaker || known.has(speaker)) continue;
    if (!missing.some((name) => canon(name) === speaker)) missing.push(String(block.speaker).trim());
  }
  return missing;
}

// The repair note that rides the one-retry door.
export function censusNote(names = []) {
  return `The record has no soul named ${names.join(', ')}. Add a cast_add (with a full voice_card) for each, or remove the attribution — the codex only knows what the ops declare.`;
}

// The court, spoken as a verdict.
export function assertCensus(dm, cast = [], options = {}) {
  const missing = unrecordedSouls(dm, cast, options);
  return { ok: missing.length === 0, missing, note: missing.length ? censusNote(missing) : '' };
}
