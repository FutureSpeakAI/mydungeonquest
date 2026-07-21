// ------------------------------------------------------------
// THE WRITER'S ROOM — Directive XI, the law fraction, seated home
// with the parity cut.
//
// The Director sits once per beat and hands down `beat_intent`
// (intent, secrets, threads, forbidden repeats, and the measure);
// the Voice tells the turn under that word; the sealed result leaves
// whole — the curtain (Law I) guarantees no seat's deliberation is
// ever seen from the table. This seat holds everything about the
// room that is LAW: the bands, the courts, the deterministic floors,
// and the pinned rubric. The convene itself — provider seats, keys,
// and the door's orchestration — remains at the table's server,
// which imports these laws and adds only wiring.
//
// The cliche lexicon is pinned FIXTURE DATA (instrument matter, not
// prompt law — LISTLESS LEGISLATION stands): the engine carries no
// list of its own, and every court that needs one is handed it at
// the door. A lexicon-less call judges against nothing and flags
// nothing — honest, since absence of instrument is absence of
// evidence, never a conviction.
// ------------------------------------------------------------

export const MEASURES = ['lean', 'standard', 'rich'];
// LAW V — the bands, in numbers. A paragraph is one narration block.
export const MEASURE_BANDS = { lean: [1, 2], standard: [3, 5], rich: [6, 8] };

// The thread ledger as the briefing carries it — rows with names, or
// bare strings. No rows at all leaves the thread court out of session.
export function threadNames(story) {
  const rows = Array.isArray(story?.open_threads) ? story.open_threads
    : Array.isArray(story?.threads) ? story.threads : null;
  if (!rows) return null;
  return rows
    .map((row) => (typeof row === 'string' ? row : (row && typeof row.name === 'string' ? row.name : null)))
    .filter((name) => typeof name === 'string' && name.length);
}

// The open ambitions as the briefing carries them — open_ambitions rides
// BARE ledger texts (no citation suffix), so the served-name court and
// the mock's seat match verbatim. No rows at all, court out of session.
export function ambitionNames(story) {
  const rows = Array.isArray(story?.open_ambitions) ? story.open_ambitions : null;
  if (!rows) return null;
  return rows.filter((text) => typeof text === 'string' && text.length);
}

// The Director's word faces its own strict court — exactly these keys,
// these lengths, this measure. A live seat that cannot speak lawfully
// is replaced by the deterministic floor, never argued with.
export function validateBeatIntent(intent, { threads = null, ambitions = null } = {}) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    return { ok: false, errors: ['beat_intent must be a single object'] };
  }
  const errors = [];
  const lawful = ['ambitions_served', 'beat_index', 'forbidden_repeats', 'intent', 'measure', 'secrets_held', 'threads_to_touch'];
  for (const key of Object.keys(intent)) {
    if (!lawful.includes(key)) errors.push(`unlawful key: ${key}`);
  }
  if (typeof intent.intent !== 'string' || intent.intent.length < 12 || intent.intent.length > 200) {
    errors.push('intent must be one sentence of 12-200 characters');
  }
  const arrays = [['secrets_held', 4], ['threads_to_touch', 3], ['forbidden_repeats', 5]];
  for (const [key, cap] of arrays) {
    const rows = intent[key];
    if (!Array.isArray(rows) || rows.length > cap || rows.some((row) => typeof row !== 'string' || !row.length || row.length > 120)) {
      errors.push(`${key} must be an array of at most ${cap} short strings`);
    }
  }
  if (!MEASURES.includes(intent.measure)) errors.push('measure must be lean, standard, or rich');
  if (!Number.isInteger(intent.beat_index) || intent.beat_index < 0) errors.push('beat_index must seat the intent');
  // Threads named must be threads the ledger holds — judged only when
  // the briefing actually carries a ledger (absent evidence, out of session).
  if (Array.isArray(threads) && Array.isArray(intent.threads_to_touch)) {
    const held = new Set(threads);
    for (const name of intent.threads_to_touch) {
      if (typeof name === 'string' && !held.has(name)) errors.push(`threads_to_touch names no ledger thread: ${name}`);
    }
  }
  // THE AMBITIONS SERVED (XIX, Article IV) — the one lawful bump of the
  // Director's protocol. The key's SHAPE is optional-backward (an elder
  // intent carries no key and stays lawful when nothing stands), but the
  // OBLIGATION is presence-lawed through the briefing's own evidence:
  // when open ambitions ride, the intent must serve at least one, by its
  // exact ledger text; when the briefing attests none stand, a served
  // name is refused. Bare evidence (null): court out of session.
  if (intent.ambitions_served !== undefined) {
    const rows = intent.ambitions_served;
    if (!Array.isArray(rows) || rows.length > 3 || rows.some((row) => typeof row !== 'string' || !row.length || row.length > 200)) {
      errors.push('ambitions_served must be an array of at most 3 short strings');
    }
  }
  if (Array.isArray(ambitions)) {
    const served = Array.isArray(intent.ambitions_served) ? intent.ambitions_served.filter((row) => typeof row === 'string') : [];
    if (ambitions.length) {
      const open = new Set(ambitions.map((text) => String(text).trim().toLowerCase()));
      if (!served.length) errors.push('ambitions stand open — ambitions_served must name at least one');
      for (const name of served) {
        if (!open.has(String(name).trim().toLowerCase())) errors.push(`ambitions_served names no open ambition: ${name}`);
      }
    } else if (served.length) {
      errors.push('ambitions_served without open ambitions — the briefing attests none stand');
    }
  }
  return { ok: !errors.length, errors };
}

// LAW IV/V — the measure mapping, stated as one deterministic law:
// arrivals (beat 0), act turns, and the final revelation run rich; the
// quiet connective stride runs lean; most beats run standard. Rhythm
// follows by construction: two rich beats may only touch across an
// act turn — the named exception.
export function measureForBeat(beats, index) {
  const rows = Array.isArray(beats) ? beats : [];
  if (!rows.length) return 'standard';
  const at = Math.min(Math.max(index, 0), rows.length - 1);
  const actTurnAt = (i) => i > 0 && (rows[i]?.act || 1) !== (rows[i - 1]?.act || 1);
  const richAt = (i) => i === 0 || i === rows.length - 1 || actTurnAt(i);
  if (richAt(at)) {
    // THE RHYTHM (Law V): two rich pages may touch only across an act
    // turn — a rich seat whose neighbor ran rich without one steps down.
    if (at > 0 && richAt(at - 1) && !actTurnAt(at)) return 'standard';
    return 'rich';
  }
  if (at % 3 === 2) return 'lean';
  return 'standard';
}

// The deterministic Director — the mock tier's seat, and the floor the
// live seat degrades to. Seeded entirely by the briefing: beat index,
// spine, and the thread ledger. Byte-stable across sittings.
export function mockDirector(input, beatIndex) {
  const beats = input?.spine?.beats || [];
  const at = Number.isInteger(beatIndex) ? beatIndex : 0;
  const beat = beats[at] || beats[beats.length - 1] || {};
  const title = typeof beat.title === 'string' && beat.title ? beat.title : 'the road ahead';
  const goal = typeof beat.goal === 'string' && beat.goal ? beat.goal : 'carry the tale forward';
  let line = `Advance "${title}" toward its goal: ${goal}`;
  if (line.length > 200) line = `${line.slice(0, 199)}…`.slice(0, 200);
  if (line.length < 12) line = 'Advance the standing chapter toward its goal.';
  const threads = threadNames(input?.story) || [];
  // XIX Article IV: when the briefing carries open ambitions, the floor
  // serves the first — deterministic, and lawful under its own court.
  const ambitions = ambitionNames(input?.story) || [];
  return {
    intent: line,
    secrets_held: [],
    threads_to_touch: threads.slice(0, 2),
    ambitions_served: ambitions.slice(0, 1),
    forbidden_repeats: [],
    measure: measureForBeat(beats, at),
    beat_index: at
  };
}

// The standing beat index as the briefing carries it. Absent evidence
// yields null: the Director sits fresh (honestly counted) and the
// cache never falsely matches.
export function beatIndexOf(input) {
  const at = input?.story?.beat?.index;
  return Number.isInteger(at) && at >= 0 ? at : null;
}

// ------------------------------------------------------------
// THE EDITOR — Directive XI, Laws VI–VIII. The second seat.
// A deterministic pre-pass judges every draft for free; the judged
// pass sits only on a flag or at the sampling law; one revision
// maximum; a twice-refused draft SHIPS, attested. All of it behind
// the curtain — the player never witnesses the room arguing.
// ------------------------------------------------------------

// Fold for the Editor's ear: case down, punctuation and hyphens to
// spaces, one space between words — "fen-light" and "fen light" are
// one sound in this court.
export function foldProse(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const narrationOf = (turn) => (Array.isArray(turn?.narration_blocks)
  ? turn.narration_blocks.map((block) => (block && typeof block.text === 'string' ? block.text : '')).join(' ')
  : '');

// LAW VI — THE ECHO CHECK. Any 8-word folded run shared verbatim with
// the narration of the last 20 sealed pages flags. ONE shared run is
// the pinned threshold.
export function echoCheck(draftText, priorPages = []) {
  const words = foldProse(draftText).split(' ').filter(Boolean);
  if (words.length < 8) return false;
  const seen = new Set();
  for (const page of (Array.isArray(priorPages) ? priorPages : []).slice(-20)) {
    const prior = foldProse(page).split(' ').filter(Boolean);
    for (let i = 0; i + 8 <= prior.length; i += 1) seen.add(prior.slice(i, i + 8).join(' '));
  }
  if (!seen.size) return false;
  for (let i = 0; i + 8 <= words.length; i += 1) {
    if (seen.has(words.slice(i, i + 8).join(' '))) return true;
  }
  return false;
}

// LAW VI — THE CLICHE CHECK. The lexicon is pinned fixture data,
// handed in at the door (instrument matter, not prompt law — the
// engine carries no list of its own). More than 2 hits per 1,000
// narration characters flags. Matches are whole-word runs in the
// folded prose.
const NO_LEXICON = Object.freeze([]);
export function clicheCheck(draftText, lexicon = NO_LEXICON) {
  const chars = String(draftText || '').length;
  if (!chars) return { flagged: false, hits: 0 };
  const bed = ` ${foldProse(draftText)} `;
  let hits = 0;
  for (const phrase of lexicon) {
    const needle = ` ${phrase} `;
    let at = bed.indexOf(needle);
    while (at !== -1) { hits += 1; at = bed.indexOf(needle, at + phrase.length + 1); }
  }
  return { flagged: hits > (chars / 1000) * 2, hits };
}

// LAW VI — THE SUGGESTION-SAMENESS CHECK. Token-set Jaccard ≥ 0.80
// between any two roads of the draft, or between any draft road and
// any road of the prior turn, flags.
export function jaccard(a, b) {
  const setA = new Set(foldProse(a).split(' ').filter(Boolean));
  const setB = new Set(foldProse(b).split(' ').filter(Boolean));
  if (!setA.size && !setB.size) return 1;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}
export function samenessCheck(suggestions = [], priorSuggestions = []) {
  const rows = (Array.isArray(suggestions) ? suggestions : []).filter((s) => typeof s === 'string' && s.trim());
  const prior = (Array.isArray(priorSuggestions) ? priorSuggestions : []).filter((s) => typeof s === 'string' && s.trim());
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) if (jaccard(rows[i], rows[j]) >= 0.8) return true;
    for (const old of prior) if (jaccard(rows[i], old) >= 0.8) return true;
  }
  return false;
}

// LAW VI — THE MEASURE CHECK. Outside the assigned band flags
// `measure`; below a rich band it is named `under-measure`.
export function measureCheck(blockCount, measure) {
  const band = MEASURE_BANDS[measure];
  if (!band) return null;
  const [floor, ceiling] = band;
  if (blockCount >= floor && blockCount <= ceiling) return null;
  if (measure === 'rich' && blockCount < floor) return 'under-measure';
  return 'measure';
}

// The docket — evidence drawn from what the briefing already carries:
// assistant history rows ARE the prior sealed narration; the prior
// turn's roads ride story.prior_suggestions additively (older clients
// simply leave that court out of session).
export function editorEvidence(input) {
  const priorPages = (Array.isArray(input?.history) ? input.history : [])
    .filter((m) => m && m.role === 'assistant' && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => m.content);
  const rows = input?.story?.prior_suggestions;
  const priorSuggestions = Array.isArray(rows) ? rows.filter((s) => typeof s === 'string') : [];
  return { priorPages, priorSuggestions };
}

// LAW VI — the pre-pass whole: deterministic, free, every draft.
// Flag order is pinned: echo, cliche, sameness, measure.
export function editorPrePass(turn, { intent = null, priorPages = [], priorSuggestions = [], lexicon = NO_LEXICON } = {}) {
  const flags = [];
  const prose = narrationOf(turn);
  if (echoCheck(prose, priorPages)) flags.push('echo');
  if (clicheCheck(prose, lexicon).flagged) flags.push('cliche');
  if (samenessCheck(turn?.suggestions, priorSuggestions)) flags.push('sameness');
  const measured = intent && MEASURES.includes(intent.measure)
    ? measureCheck(Array.isArray(turn?.narration_blocks) ? turn.narration_blocks.length : 0, intent.measure)
    : null;
  if (measured) flags.push(measured);
  return flags;
}

// LAW VII — the rubric, pinned byte-stable. The proving loop's
// calibration probe judges THIS text; it may not drift.
export const EDITOR_RUBRIC = 'You are the Editor of a living campaign. Judge the drafted page against the room: voice held steady per the cards; stakes true to the beat_intent; freshness against the recent pages and roads; fullness against the assigned measure. Verdict ship only when all four hold. Verdict revise otherwise, naming each failure as one reason with quoted evidence.';

const REASON_LINES = {
  echo: 'echo: an eight-word run repeats a recent page verbatim',
  cliche: 'cliche: stock phrasing crowds the page past the pinned density',
  sameness: 'sameness: two roads offered are nearly the same road',
  measure: 'measure: the page lands outside its assigned band',
  'under-measure': 'under-measure: thin prose on a beat assigned rich'
};

// The deterministic Editor — the mock tier's judge and the floor the
// live judge degrades to. Flags in, verdict out, byte-stable.
export function mockEditor(flags = []) {
  if (!flags.length) return { verdict: 'ship', reasons: [] };
  return { verdict: 'revise', reasons: flags.map((flag) => REASON_LINES[flag] || `flagged: ${flag}`) };
}
