// ------------------------------------------------------------
// THE STORY SMITH (Directive XIX, Article I) — the compass unbinds,
// the ledger never does.
//
// One seat for the bespoke-spine law: the schema court every candidate
// passes before it seats, the tool schema the live seat MIRRORS from
// this same file (mirror law — one seat, two readers), the mock story
// smith that is the keyless floor and the eval bench's ground, and the
// mint law that seals one spine per volume, forever.
//
// The nine hand-built spines remain the shelf, the exemplars, and the
// calibration of this court: every fence below was measured against
// them, and the gate proves all nine pass this door untouched.
// ------------------------------------------------------------
import { SPINES } from './spines.js';
import { SMITH_TEMPERATURE, sweepCandidate, spineFromPromise } from './smith.js';

// The exemplars' own vocabulary is the law's one seat: a bespoke spine
// may only cast deadline roles the nine already cast. Derived, never
// restated — the shelf cannot drift from its own court.
export const SPINE_ROLES = Object.freeze(
  [...new Set(SPINES.flatMap((s) => s.deadlines.flatMap((d) => d.roles)))].sort()
);
export const SHELF_IDS = Object.freeze(SPINES.map((s) => s.id));
export const RUMOR_COUNT = 6;

// Fences, calibrated against the nine exemplars (measured: label ≤17,
// title 11..31, goal 39..72, key 3..14, beats 12..15, reveal 7..9,
// deadlines 4..5 rows ascending from byBeat 1). Bespoke headroom is
// generous; the exemplars sit well inside every fence.
export const SPINE_FENCES = Object.freeze({
  id: { min: 3, max: 40 },
  label: { min: 3, max: 60 },
  key: { min: 3, max: 40 },
  title: { min: 3, max: 80 },
  goal: { min: 10, max: 200 },
  villainDesign: { min: 20, max: 300 },
  rumor: { min: 12, max: 200 },
  beats: { min: 12, max: 15 },
  actFloor: 3,
  deadlines: { min: 3, max: 8 }
});

const SLUG = /^[a-z0-9-]+$/;
const isSlug = (value, { min, max }) =>
  typeof value === 'string' && value.length >= min && value.length <= max && SLUG.test(value);
const fenced = (value, { min, max }) =>
  typeof value === 'string' && value.trim().length >= min && value.length <= max;

// ------------------------------------------------------------
// THE SPINE SCHEMA COURT — exact keys, no strangers, fenced strings,
// act arithmetic, lawful roles, the reveal past the first act, and the
// sweeps (PG + poison) on every string a player will ever read. A
// failing candidate is DISCARDED and redrawn whole, never repaired.
// ------------------------------------------------------------
export function validateSpineCandidate(spine, { bespoke = true } = {}) {
  const errors = [];
  const refuse = (why) => errors.push(why);
  if (!spine || typeof spine !== 'object' || Array.isArray(spine)) {
    return { ok: false, errors: ['a spine candidate must be a plain object'] };
  }
  const allowed = new Set(['id', 'label', 'revealIdx', 'beats', 'deadlines', ...(bespoke ? ['villainDesign'] : [])]);
  for (const key of Object.keys(spine)) if (!allowed.has(key)) refuse(`the spine carries the stranger key "${key}"`);
  for (const key of ['id', 'label', 'revealIdx', 'beats', 'deadlines']) {
    if (!Object.hasOwn(spine, key)) refuse(`the spine is missing "${key}"`);
  }
  if (Object.hasOwn(spine, 'id') && !isSlug(spine.id, SPINE_FENCES.id)) {
    refuse(`spine.id must be a ${SPINE_FENCES.id.min}-${SPINE_FENCES.id.max} character slug of lowercase letters, digits, and hyphens`);
  }
  if (bespoke && typeof spine.id === 'string' && SHELF_IDS.includes(spine.id)) {
    refuse(`a bespoke spine may not claim the shelf id "${spine.id}"`);
  }
  if (Object.hasOwn(spine, 'label') && !fenced(spine.label, SPINE_FENCES.label)) {
    refuse(`spine.label must be ${SPINE_FENCES.label.min}-${SPINE_FENCES.label.max} characters`);
  }
  if (bespoke) {
    if (!fenced(spine.villainDesign, SPINE_FENCES.villainDesign)) {
      refuse(`a bespoke spine must carry villainDesign, ${SPINE_FENCES.villainDesign.min}-${SPINE_FENCES.villainDesign.max} characters`);
    }
  } else if (Object.hasOwn(spine, 'villainDesign')) {
    refuse('a shelf spine carries no villainDesign — the shelf is settled law');
  }

  const beats = spine.beats;
  if (!Array.isArray(beats) || beats.length < SPINE_FENCES.beats.min || beats.length > SPINE_FENCES.beats.max) {
    refuse(`spine.beats must be an array of ${SPINE_FENCES.beats.min} to ${SPINE_FENCES.beats.max} beats`);
  } else {
    const keys = new Set();
    const actCounts = { 1: 0, 2: 0, 3: 0 };
    let lastAct = 0;
    beats.forEach((beat, index) => {
      if (!beat || typeof beat !== 'object' || Array.isArray(beat)) { refuse(`beat ${index} must be a plain object`); return; }
      for (const key of Object.keys(beat)) if (!['act', 'key', 'title', 'goal'].includes(key)) refuse(`beat ${index} carries the stranger key "${key}"`);
      if (![1, 2, 3].includes(beat.act)) refuse(`beat ${index} must name act 1, 2, or 3`);
      else { actCounts[beat.act] += 1; if (beat.act < lastAct) refuse(`beat ${index} falls backward — acts must never descend`); lastAct = Math.max(lastAct, beat.act); }
      if (!isSlug(beat.key, SPINE_FENCES.key)) refuse(`beat ${index} key must be a ${SPINE_FENCES.key.min}-${SPINE_FENCES.key.max} character slug`);
      else if (keys.has(beat.key)) refuse(`beat key "${beat.key}" repeats — every key stands alone`);
      else keys.add(beat.key);
      if (!fenced(beat.title, SPINE_FENCES.title)) refuse(`beat ${index} title must be ${SPINE_FENCES.title.min}-${SPINE_FENCES.title.max} characters`);
      if (!fenced(beat.goal, SPINE_FENCES.goal)) refuse(`beat ${index} goal must be ${SPINE_FENCES.goal.min}-${SPINE_FENCES.goal.max} characters`);
    });
    for (const act of [1, 2, 3]) if (actCounts[act] < SPINE_FENCES.actFloor) refuse(`act ${act} holds ${actCounts[act]} beats — every act holds at least ${SPINE_FENCES.actFloor}`);
    if (Number.isInteger(spine.revealIdx) && spine.revealIdx >= 0 && spine.revealIdx < beats.length) {
      const seat = beats[spine.revealIdx];
      if (seat && seat.act === 1) refuse('the reveal must stand past the first act');
    } else {
      refuse('spine.revealIdx must be an integer index into beats');
    }
  }

  const deadlines = spine.deadlines;
  if (!Array.isArray(deadlines) || deadlines.length < SPINE_FENCES.deadlines.min || deadlines.length > SPINE_FENCES.deadlines.max) {
    refuse(`spine.deadlines must be an array of ${SPINE_FENCES.deadlines.min} to ${SPINE_FENCES.deadlines.max} rows`);
  } else {
    let lastBeat = 0;
    const beatCount = Array.isArray(beats) ? beats.length : SPINE_FENCES.beats.max;
    deadlines.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) { refuse(`deadline ${index} must be a plain object`); return; }
      for (const key of Object.keys(row)) if (!['byBeat', 'roles'].includes(key)) refuse(`deadline ${index} carries the stranger key "${key}"`);
      if (!Number.isInteger(row.byBeat) || row.byBeat < 1 || row.byBeat >= beatCount) refuse(`deadline ${index} byBeat must be an integer between 1 and ${beatCount - 1}`);
      else if (row.byBeat <= lastBeat) refuse(`deadline ${index} does not ascend — deadlines march strictly forward`);
      else lastBeat = row.byBeat;
      if (!Array.isArray(row.roles) || !row.roles.length || row.roles.length > SPINE_ROLES.length) refuse(`deadline ${index} must cast at least one role`);
      else {
        const seen = new Set();
        for (const role of row.roles) {
          if (!SPINE_ROLES.includes(role)) refuse(`deadline ${index} casts the unknown role "${role}"`);
          else if (seen.has(role)) refuse(`deadline ${index} casts "${role}" twice`);
          else seen.add(role);
        }
      }
    });
  }

  // THE SWEEPS — every player-facing string through the one sweep seat.
  const flat = {};
  if (typeof spine.label === 'string') flat.label = spine.label;
  if (typeof spine.villainDesign === 'string') flat.villainDesign = spine.villainDesign;
  if (Array.isArray(beats)) beats.forEach((beat, index) => {
    if (beat && typeof beat === 'object') {
      if (typeof beat.title === 'string') flat[`beat${index}Title`] = beat.title;
      if (typeof beat.goal === 'string') flat[`beat${index}Goal`] = beat.goal;
    }
  });
  for (const violation of sweepCandidate(flat)) refuse(`sweep refused ${violation}`);
  return { ok: errors.length === 0, errors };
}

// The rumor pool court — exactly RUMOR_COUNT swept, fenced, distinct
// lines. Rumors are horizon, never geography (Article VII); the chart
// marks them as rumor and the DM may open one into a cited thread.
export function validateRumorPool(rumors) {
  const errors = [];
  if (!Array.isArray(rumors) || rumors.length !== RUMOR_COUNT) {
    return { ok: false, errors: [`the rumor pool holds exactly ${RUMOR_COUNT} rumors`] };
  }
  const seen = new Set();
  const flat = {};
  rumors.forEach((rumor, index) => {
    if (!fenced(rumor, SPINE_FENCES.rumor)) errors.push(`rumor ${index} must be ${SPINE_FENCES.rumor.min}-${SPINE_FENCES.rumor.max} characters`);
    else if (seen.has(rumor.trim().toLowerCase())) errors.push(`rumor ${index} repeats another — every rumor stands alone`);
    else { seen.add(rumor.trim().toLowerCase()); flat[`rumor${index}`] = rumor; }
  });
  for (const violation of sweepCandidate(flat)) errors.push(`sweep refused ${violation}`);
  return { ok: errors.length === 0, errors };
}

// The whole smith answer: { spine, rumors } and nothing else.
export function validateStorySmithCandidate(candidate, { bespoke = true } = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['the smith answer must be a plain object'] };
  }
  const errors = [];
  for (const key of Object.keys(candidate)) if (!['spine', 'rumors'].includes(key)) errors.push(`the smith answer carries the stranger key "${key}"`);
  const spineVerdict = validateSpineCandidate(candidate.spine, { bespoke });
  const rumorVerdict = validateRumorPool(candidate.rumors);
  errors.push(...spineVerdict.errors, ...rumorVerdict.errors);
  return { ok: errors.length === 0, errors };
}

// ------------------------------------------------------------
// THE TOOL SCHEMA MIRROR — the live seat's declared law, mirrored from
// this court and from no other seat. Enums are real enums; every fence
// rides as minLength/maxLength AND as binding description, per the
// standing smith precedent (bounds proved advisory unless bound twice).
// ------------------------------------------------------------
export function storySpineToolSchema() {
  const f = SPINE_FENCES;
  return {
    type: 'object', additionalProperties: false, required: ['spine', 'rumors'],
    properties: {
      spine: {
        type: 'object', additionalProperties: false,
        required: ['id', 'label', 'revealIdx', 'beats', 'deadlines', 'villainDesign'],
        properties: {
          id: { type: 'string', minLength: f.id.min, maxLength: f.id.max, pattern: '^[a-z0-9-]+$', description: 'A fresh slug of lowercase letters, digits, and hyphens. Never a shelf id.' },
          label: { type: 'string', minLength: f.label.min, maxLength: f.label.max, description: 'The arc\u2019s short name as a player would read it.' },
          villainDesign: { type: 'string', minLength: f.villainDesign.min, maxLength: f.villainDesign.max, description: 'The villain\u2019s true design, fitted to the covenant and any carryover: who works against the hero, and to what patient end.' },
          revealIdx: { type: 'integer', minimum: 0, maximum: f.beats.max - 1, description: 'The beat index where the villain\u2019s design comes into the open — always past the first act.' },
          beats: {
            type: 'array', minItems: f.beats.min, maxItems: f.beats.max,
            description: 'The whole arc in order: three acts, never descending, each act at least three beats.',
            items: {
              type: 'object', additionalProperties: false, required: ['act', 'key', 'title', 'goal'],
              properties: {
                act: { type: 'integer', enum: [1, 2, 3] },
                key: { type: 'string', minLength: f.key.min, maxLength: f.key.max, pattern: '^[a-z0-9-]+$', description: 'A slug unique within the spine.' },
                title: { type: 'string', minLength: f.title.min, maxLength: f.title.max },
                goal: { type: 'string', minLength: f.goal.min, maxLength: f.goal.max, description: 'What the table plays toward in this beat.' }
              }
            }
          },
          deadlines: {
            type: 'array', minItems: f.deadlines.min, maxItems: f.deadlines.max,
            description: 'Casting deadlines with strictly ascending byBeat.',
            items: {
              type: 'object', additionalProperties: false, required: ['byBeat', 'roles'],
              properties: {
                byBeat: { type: 'integer', minimum: 1, maximum: f.beats.max - 1 },
                roles: { type: 'array', minItems: 1, maxItems: SPINE_ROLES.length, items: { type: 'string', enum: [...SPINE_ROLES] } }
              }
            }
          }
        }
      },
      rumors: {
        type: 'array', minItems: RUMOR_COUNT, maxItems: RUMOR_COUNT,
        description: 'The horizon pool: unresolved hooks beyond the arc, marked as rumor, never geography.',
        items: { type: 'string', minLength: f.rumor.min, maxLength: f.rumor.max }
      }
    }
  };
}

// ------------------------------------------------------------
// THE MOCK STORY SMITH — the keyless floor and the bench's ground.
// Deterministic in (seed, covenant, tone, carryover): the same ask
// deals the same spine, byte for byte. Built lawful by construction
// and courted before it leaves; if any weave ever trips the court, the
// floor falls back to the pure exemplar weave, which cannot fail.
// ------------------------------------------------------------
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return hash >>> 0;
};
const lcg = (state) => () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 0x100000000;
};

const WEAVE_WORDS = ['Vow', 'Ember', 'Tide', 'Lantern', 'Thorn', 'Crown', 'Hollow', 'Star'];
const RUMOR_MILL = [
  'Word travels that the old {W} road has gone quiet, and quiet roads are never empty',
  'A ferryman swears the {W} bell rings at dusk though no hand pulls it',
  'Merchants whisper of a buyer paying triple for maps nobody admits to drawing',
  'A shepherd found standing stones humming where the {W} pastures end',
  'Letters keep arriving for someone nobody in the valley has ever met',
  'The {W} well gives back coins older than the town that dug it',
  'A hunter followed lights past the treeline and came home three days younger, or so the story goes',
  'Somebody is buying up every song about the {W} war before it can be sung',
  'The border wardens have stopped asking questions, which is its own kind of answer',
  'An innkeep keeps a room made up for a guest who has not arrived in forty years'
];

function covenantWord(covenant) {
  const match = String(covenant || '').match(/[A-Za-z]{4,12}/g);
  if (!match) return null;
  const word = match.find((w) => w.length >= 4 && w.length <= 12);
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : null;
}

export function mockStorySmith({ covenant = '', tone = '', carryover = null, seed = 0 } = {}) {
  const carryBytes = carryover ? JSON.stringify(carryover) : '';
  const state = (fnv1a(`${covenant}|${tone}|${carryBytes}`) ^ (Number(seed) >>> 0)) >>> 0;
  const roll = lcg(state || 1);
  const baseId = spineFromPromise(`${covenant} ${tone}`);
  const base = SPINES.find((s) => s.id === baseId) || SPINES[0];
  const weave = WEAVE_WORDS[Math.floor(roll() * WEAVE_WORDS.length)];
  const word = covenantWord(covenant) || weave;
  const stamp = (fnv1a(`${state}`) % 997).toString(36);

  const build = (useWord) => {
    const spine = {
      id: `woven-${base.id}-${stamp}`,
      label: `The ${useWord} ${base.label.split(' ').slice(-1)[0]}`.slice(0, SPINE_FENCES.label.max),
      villainDesign: `Behind every turn of this road stands a patient hand: the ${useWord.toLowerCase()} was bait, the kindness was a ledger, and the debt comes due at the reveal.`,
      revealIdx: base.revealIdx,
      beats: base.beats.map((beat) => ({ ...beat })),
      deadlines: base.deadlines.map((row) => ({ byBeat: row.byBeat, roles: [...row.roles] }))
    };
    const openThreads = Array.isArray(carryover?.openThreads) ? carryover.openThreads : [];
    const rumors = [];
    const order = [...RUMOR_MILL.keys()].sort((a, b) => (roll() - 0.5));
    for (const index of order) {
      if (rumors.length >= RUMOR_COUNT) break;
      rumors.push(RUMOR_MILL[index].replaceAll('{W}', useWord.toLowerCase()));
    }
    if (openThreads.length && typeof openThreads[0]?.label === 'string') {
      const carried = `Nobody believes the matter of ${openThreads[0].label} is truly finished, whatever the record says`.slice(0, SPINE_FENCES.rumor.max);
      if (carried.length >= SPINE_FENCES.rumor.min) rumors[rumors.length - 1] = carried;
    }
    return { spine, rumors };
  };

  let candidate = build(word);
  if (!validateStorySmithCandidate(candidate, { bespoke: true }).ok) candidate = build(weave);
  return { ...candidate, provider: 'mock', model: null, temperature: SMITH_TEMPERATURE, seed: Number(seed) || 0 };
}

// ------------------------------------------------------------
// THE MINT LAW — one spine per volume, attested, cached forever. The
// mint door courts the goods even from the shelf (fail-closed), refuses
// a second mint by name, and seals source, seed, and provider so the
// record always knows which hand forged its world.
// ------------------------------------------------------------
export function sealSpineMint(existing, { spine, rumors, source, seed = 0, provider = null, model = null } = {}) {
  if (existing && typeof existing === 'object' && existing.spine) {
    const prior = existing.attestation?.source || 'sealed';
    return { ok: false, refusal: `the volume's spine is already minted (${prior}) — the mint stands forever` };
  }
  if (!['shelf', 'smith', 'mock'].includes(source)) {
    return { ok: false, refusal: 'the mint names its source: shelf, smith, or mock' };
  }
  if (source === 'shelf') {
    if (!spine || !SHELF_IDS.includes(spine.id)) return { ok: false, refusal: 'a shelf mint must seat one of the nine standing spines' };
    const shelf = SPINES.find((s) => s.id === spine.id);
    const verdict = validateSpineCandidate(shelf, { bespoke: false });
    if (!verdict.ok) return { ok: false, refusal: verdict.errors.join('; ') };
    const pool = validateRumorPool(rumors);
    if (!pool.ok) return { ok: false, refusal: pool.errors.join('; ') };
    return { ok: true, mint: { spine: shelf, rumors: [...rumors], attestation: { source, seed: Number(seed) || 0, provider, model } } };
  }
  const verdict = validateStorySmithCandidate({ spine, rumors }, { bespoke: true });
  if (!verdict.ok) return { ok: false, refusal: verdict.errors.join('; ') };
  return { ok: true, mint: { spine, rumors: [...rumors], attestation: { source, seed: Number(seed) || 0, provider, model } } };
}
