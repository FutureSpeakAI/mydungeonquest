// ------------------------------------------------------------
// THE SMITH (Directive XIII, 0.9.1) — the one seat of the two-hands forge.
// Holds the plain-speech FIELD MAP (Law I: every asked question names the
// surface where its answer lands), the spine-from-promise rule, the pools
// that remain as the keyless floor, the deterministic MOCK SMITH, and the
// strict candidate-set validator the live smith must mirror exactly.
// Pure, dependency-free beyond the engine's own tables, safe for the
// headless bench. No candidate ever contains a locked key (Law II).
// ------------------------------------------------------------
import { SPINES } from './spines.js';
import {
  TITLES, COVENANTS, TONES, REGION_NAMES, MARKS, FIRST_NAMES, LAST_NAMES,
  ANCESTRIES, CLASSES, SIGILS, BEARINGS, BACKGROUNDS, ORACLE_HERO,
  rollAbilities, rollName
} from './forgeRolls.js';

const hash = (s) => { let h = 0; const str = String(s ?? ''); for (let i = 0; i < str.length; i += 1) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h); };
const pick = (pool, seed, salt = '') => pool[hash(`${seed}:${salt}`) % pool.length];
const stableJson = (value) => JSON.stringify(value, value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : undefined);

// THE MEASURE OF THE SMITH — one temperature, pinned. The live call may not
// run hotter or colder; the gate reads this constant, not a config.
export const SMITH_TEMPERATURE = 0.9;

// ------------------------------------------------------------
// §3 THE PLAIN-SPEECH FIELD MAP — the ONE seat of every asked question.
// Both forge doors render from this map; the questions gate pins the copy
// byte-for-byte; no component carries private copy for a mapped field.
// door: 'fast' (the plain path) | 'deep' (behind the deep door) |
//       'derived' (read, never asked).
// ------------------------------------------------------------
export const FIELD_MAP = {
  world: [
    { key: 'spark', ask: 'The three sparks', hint: 'Three ready worlds — a tap adopts one whole.', door: 'fast', hands: 'tap', surface: 'the world card fills at once; the same words open Chapter One' },
    { key: 'covenant', ask: 'Tell the game your world', hint: 'One sentence is enough — this is the promise of this world, and Chapter One opens inside it.', door: 'fast', hands: 'die+pen', surface: 'the world card; the shape line re-reads it live; the first pour and the key art obey it' },
    { key: 'tone', ask: 'How it feels', hint: '', door: 'fast', hands: 'die+pen', surface: 'the card\u2019s italic feel line; the teller keeps this weather from the first sentence' },
    { key: 'shape', ask: 'The shape of the promise', hint: 'Read from the promise\u2019s own words — never asked.', door: 'derived', hands: 'none', surface: 'the card\u2019s shape line; the chapters walk that spine' },
    { key: 'title', ask: 'Chronicle title', hint: '', door: 'deep', hands: 'die+pen', surface: 'the mast and the shelf card' },
    { key: 'spineId', ask: 'Story spine', hint: '', door: 'deep', hands: 'pen', surface: 'the chapters walk it; touched, it outranks the promise\u2019s shape' },
    { key: 'homeRegion', ask: 'Home region', hint: '', door: 'deep', hands: 'die+pen', surface: 'the card\u2019s home line; the atlas opens there' },
    { key: 'linesText', ask: 'Lines — never appear', hint: '', door: 'deep', hands: 'pen', surface: 'the teller never crosses them' },
    { key: 'veilsText', ask: 'Veils — fade to black', hint: '', door: 'deep', hands: 'pen', surface: 'the scene turns away at each' },
    { key: 'styleBible', ask: 'The world\u2019s look', hint: '', door: 'deep', hands: 'die+pen', surface: 'every painting obeys it' }
  ],
  hero: [
    { key: 'name', ask: 'Their name', hint: '', door: 'fast', hands: 'die+pen', surface: 'the portrait speaks it below the face; the mast and the tale carry it' },
    { key: 'ancestry', ask: 'Where they come from', hint: '', door: 'fast', hands: 'die+pen', surface: 'the hero card\u2019s own line' },
    { key: 'className', ask: 'Their calling', hint: '', door: 'fast', hands: 'die+choice', surface: 'the sheet seats itself — bearing, background, abilities, skills — and the table\u2019s dice obey it' },
    { key: 'presentation', ask: 'How they present', hint: '', door: 'fast', hands: 'die+choice', surface: 'the audition re-deals to match on the spot' },
    { key: 'pronouns', ask: 'What words fit them', hint: '', door: 'fast', hands: 'die+pen', surface: 'the tale speaks of them in those words' },
    { key: 'mark', ask: 'The mark that sets them apart', hint: '', door: 'fast', hands: 'die+pen', surface: 'the live portrait — inscribed beneath the face, painted into the bust when the easel is lit' },
    { key: 'keepsake', ask: 'What they carry from home', hint: '', door: 'fast', hands: 'die+pen', surface: 'sealed into the trove at turn zero; shown at the ceremony' },
    { key: 'voice', ask: 'Which voice is theirs', hint: '', door: 'fast', hands: 'die+choice', surface: 'the tale is read in it; keyless, the blessing seals silently for a keyed table' },
    { key: 'sigil', ask: 'Sigil', hint: '', door: 'deep', hands: 'die+pen', surface: 'the glyph on a face not yet painted' },
    { key: 'bearing', ask: 'Bearing — how the world sees them', hint: '', door: 'deep', hands: 'die+pen', surface: 'the hero card and the sitting read it' },
    { key: 'background', ask: 'Background', hint: '', door: 'deep', hands: 'die+pen', surface: 'the teller knows where they have been' }
  ]
};

export const XCARD_COPY = 'Tap the X-card at any table and the scene turns away, no questions asked. Lines and veils live behind the Deep Forge door.';

export const fastFields = (scope) => FIELD_MAP[scope].filter((f) => f.door === 'fast');
export const deepFields = (scope) => FIELD_MAP[scope].filter((f) => f.door === 'deep');
export const fieldEntry = (scope, key) => FIELD_MAP[scope].find((f) => f.key === key) || null;

// ------------------------------------------------------------
// THE SPINE-FROM-PROMISE RULE (Law I) — the fast path never asks the spine;
// it reads the promise's stated shape. Same sentence, same spine, every
// time. Priority is pinned: mystery, then heist, then horror-survival,
// then the classic epic. The deep door's picker, once touched, outranks it.
// ------------------------------------------------------------
const SPINE_SHAPES = [
  { id: 'mystery', words: ['secret', 'missing', 'vanish', 'stolen', 'riddle', 'unknown', 'forgotten', 'buried', 'clue', 'disappear', 'mask', 'mystery', 'no one knows', 'lying', 'locked door'] },
  { id: 'heist', words: ['steal', 'vault', 'prize', 'price', 'heist', 'guild', 'cargo', 'sold', 'debt', 'score', 'smuggl', 'ransom', 'treasure', 'tender', 'coin', 'market', 'renting', 'rent'] },
  { id: 'horror-survival', words: ['fog', 'dark', 'hunger', 'dread', 'teeth', 'haunt', 'hollow', 'sleeping', 'wakes', 'fear', 'shadow', 'grave', 'bone', 'housed', 'learning the songs'] }
];
export function spineFromPromise(promise) {
  const p = String(promise || '').toLowerCase();
  for (const shape of SPINE_SHAPES) if (shape.words.some((w) => p.includes(w))) return shape.id;
  return 'classic-epic';
}
export const spineLabel = (id) => (SPINES.find((s) => s.id === id) || SPINES[0]).label;

// A typed promise names its own tale when the title stands untouched.
export function titleFromPromise(promise) {
  const words = String(promise || '').replace(/[^\p{L}\p{N}\s'-]/gu, '').split(/\s+/).filter((w) => w.length >= 4);
  if (words.length < 2) return 'The Unwritten Road';
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  return `The Tale of ${cap(words[words.length - 2])} ${cap(words[words.length - 1])}`;
}

// ------------------------------------------------------------
// THE POOLS THAT REMAIN (Law II floor) — every field's die has a table.
// ------------------------------------------------------------
export const PRONOUN_WORDS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'];
export const PRESENTATIONS = ['feminine', 'masculine', 'neutral'];
// THE LOOK TABLE — moved to the one seat (it fed src/lib/forgeRolls.js
// alone before 0.9.1); the compat seat re-exports it, arithmetic unchanged.
export const LOOKS = [
  'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.',
  'Woodcut-and-watercolor storybook: heavy ink outlines, muted earth pigments, candlelit interiors, weather always about to turn.',
  'High-clarity fresco style — sun-bleached plaster tones, long shadows, heroic silhouettes, dust hanging in cathedral light.',
  'Smoky charcoal-and-ember palette: soot blacks, forge oranges, faces lit from below, edges that fray into darkness.',
  'Tapestry-woven epic: flattened perspective, jewel-tone thread colors, borders of vine and rune, every scene a panel.',
  'Moonlit gouache — silver-blue nights, lantern golds, soft edges, mist pooling in valleys, stars sharp as needles.'
];
export function rollLook(seed) {
  const at = Math.abs(Math.trunc(Number(seed) || 0)) % LOOKS.length;
  return LOOKS[at];
}

// ------------------------------------------------------------
// THE SWEEPS — a candidate is judged before it is shown (Directive XIII §5).
// The PG lexicon holds the rating; the poison demands keep recognition-bake
// out of text that will one day reach the painter. Pinned fixture data.
// ------------------------------------------------------------
export const PG_LEXICON = [
  { name: 'profanity', pattern: /\b(?:fuck\w*|shit\w*|cunt|cocks?\b|bitch\w*)\b/i },
  { name: 'explicit-sex', pattern: /\b(?:erotic|orgasm\w*|nipples?|genital\w*|aroused|naked\s+bod)/i },
  { name: 'sexual-violence', pattern: /\b(?:rape\w*|molest\w*)\b/i },
  { name: 'graphic-gore', pattern: /\b(?:disembowel\w*|entrails|decapitat\w*|beheading|dismember\w*|viscera)\b/i }
];
export const POISON_DEMANDS = [
  { name: 'unmistakable', pattern: /unmistakab/i },
  { name: 'at-a-glance', pattern: /at\s+a\s+glance/i },
  { name: 'recognize', pattern: /recogni[sz]/i },
  { name: 'legible', pattern: /legib/i },
  { name: 'label', pattern: /\blabell?(?:ed|ing|s)?\b/i },
  { name: 'adverb-visibility', pattern: /(?:clearly|plainly|unmistakably|obviously|distinctly|prominently)\s+(?:visible|marked|readable|identifiable|present|in\s+frame|in\s+the\s+foreground)/i },
  { name: 'show-plainly', pattern: /show\s+(?:plainly|clearly)/i }
];
export function sweepCandidate(candidate) {
  const violations = [];
  for (const [key, value] of Object.entries(candidate || {})) {
    if (typeof value !== 'string') continue;
    for (const { name, pattern } of PG_LEXICON) if (pattern.test(value)) violations.push(`pg:${name}:${key}`);
    for (const { name, pattern } of POISON_DEMANDS) if (pattern.test(value)) violations.push(`poison:${name}:${key}`);
  }
  return violations;
}

// ------------------------------------------------------------
// THE CANDIDATE LAW — shapes, fences, riders, and the locked-key refusal.
// ------------------------------------------------------------
export const CANDIDATE_COUNT = 3;
export const WORLD_KEYS = ['title', 'covenant', 'tone', 'homeRegion', 'styleBible'];
export const HERO_KEYS = ['name', 'sigil', 'ancestry', 'className', 'caster', 'hitDie', 'skills', 'abilities', 'bearing', 'background', 'presentation', 'pronouns', 'mark', 'keepsake'];
// The calling is one body (§5, the rider clause) — its riders move with it.
export const CALLING_RIDERS = ['caster', 'hitDie', 'skills', 'abilities', 'bearing', 'background'];
export const SMITH_FIELDS = ['title', 'covenant', 'tone', 'homeRegion', 'styleBible', 'name', 'ancestry', 'className', 'presentation', 'pronouns', 'mark', 'keepsake', 'sigil', 'bearing', 'background'];

const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const CLASS_NAMES = CLASSES.map((c) => c.className);
const FENCES = {
  title: { max: 80 }, covenant: { max: 2000 }, tone: { max: 120 }, homeRegion: { max: 60 }, styleBible: { max: 300 },
  name: { max: 60 }, ancestry: { max: 40 }, bearing: { max: 200 }, background: { max: 300 },
  pronouns: { max: 30, mayBeEmpty: true }, mark: { max: 80 }, keepsake: { max: 60 }, sigil: { max: 2 }
};

function checkString(key, value, errors) {
  const fence = FENCES[key];
  if (typeof value !== 'string') { errors.push(`${key} must be a string`); return; }
  if (!fence.mayBeEmpty && !value.trim()) errors.push(`${key} must not be empty`);
  if (value.length > fence.max) errors.push(`${key} exceeds ${fence.max} characters`);
}

function allowedKeys(scope, field, locked) {
  const lockedKeys = Object.keys(locked || {});
  let keys;
  if (scope === 'world') keys = WORLD_KEYS;
  else if (scope === 'hero') keys = HERO_KEYS;
  else keys = field === 'className' ? ['className', ...CALLING_RIDERS] : [field];
  return keys.filter((k) => !lockedKeys.includes(k));
}

export function validateCandidate(scope, field, candidate, locked = {}) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { ok: false, errors: ['candidate must be an object'] };
  const allowed = allowedKeys(scope, field, locked);
  const lockedKeys = Object.keys(locked || {});
  for (const key of Object.keys(candidate)) {
    if (lockedKeys.includes(key)) errors.push(`candidate touches the locked key ${key}`);
    else if (!allowed.includes(key)) errors.push(`candidate carries the stranger key ${key}`);
  }
  // Every unlocked key of the scope must be present — completion fills only
  // what is empty, and a smith answers the whole ask.
  for (const key of allowed) if (!(key in candidate)) errors.push(`candidate is missing ${key}`);
  for (const [key, value] of Object.entries(candidate)) {
    if (key in FENCES) checkString(key, value, errors);
    else if (key === 'className') { if (!CLASS_NAMES.includes(value)) errors.push(`className ${String(value)} is not a seatable calling`); }
    else if (key === 'caster') { if (!['none', 'full', 'half', 'energy'].includes(value)) errors.push('caster is unlawful'); }
    else if (key === 'hitDie') { if (![6, 8, 10, 12].includes(value)) errors.push('hitDie is unlawful'); }
    else if (key === 'presentation') { if (!PRESENTATIONS.includes(value)) errors.push('presentation is unlawful'); }
    else if (key === 'skills') { if (!Array.isArray(value) || value.length !== 3 || value.some((s) => typeof s !== 'string' || !s.trim() || s.length > 40)) errors.push('skills must be three named skills'); }
    else if (key === 'abilities') {
      const keys = value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : null;
      if (!keys || keys.length !== 6 || ABILITY_KEYS.some((k) => !keys.includes(k)) || ABILITY_KEYS.some((k) => !Number.isInteger(value[k]) || value[k] < 3 || value[k] > 20)) errors.push('abilities must carry exactly the six scores, each 3..20');
    }
  }
  // The calling moves as one body where its riders are unlocked — and
  // (58B review) the governing calling may sit in the LOCK: a whole-hero
  // deal under a locked className must still answer that calling with
  // every rider it carries, or the court seats a Wizard with a
  // greatsword's die. Background binds UNIFORMLY: the floor deals
  // canonical backgrounds in every scope, and the court holds the
  // floor's own line (the old hero-scope exemption is dead). A calling
  // the tables do not know (the pen is sovereign) governs nothing.
  const governingName = 'className' in candidate ? candidate.className : (locked || {}).className;
  if (governingName !== undefined) {
    const cls = CLASSES.find((c) => c.className === governingName);
    if (cls) {
      if ('caster' in candidate && candidate.caster !== cls.caster) errors.push('caster contradicts the calling');
      if ('hitDie' in candidate && candidate.hitDie !== cls.hitDie) errors.push('hitDie contradicts the calling');
      if ('skills' in candidate && JSON.stringify(candidate.skills) !== JSON.stringify(cls.skills)) errors.push('skills contradict the calling');
      if ('bearing' in candidate && candidate.bearing !== BEARINGS[cls.className]) errors.push('bearing contradicts the calling');
      if ('background' in candidate && candidate.background !== BACKGROUNDS[cls.className]) errors.push('background contradicts the calling');
    }
  }
  const swept = sweepCandidate(candidate);
  for (const violation of swept) errors.push(`sweep refused ${violation}`);
  return { ok: errors.length === 0, errors };
}

export function validateCandidateSet(scope, field, set, locked = {}) {
  const errors = [];
  if (!['world', 'hero', 'field'].includes(scope)) return { ok: false, errors: [`unknown scope ${String(scope)}`] };
  if (scope === 'field' && !SMITH_FIELDS.includes(field)) return { ok: false, errors: [`unknown field ${String(field)}`] };
  if (!Array.isArray(set)) return { ok: false, errors: ['candidate set must be an array'] };
  if (set.length !== CANDIDATE_COUNT) errors.push(`a candidate set holds exactly ${CANDIDATE_COUNT}, saw ${set.length}`);
  set.forEach((candidate, i) => {
    const verdict = validateCandidate(scope, field, candidate, locked);
    for (const error of verdict.errors) errors.push(`candidate ${i}: ${error}`);
  });
  return { ok: errors.length === 0, errors };
}

// The tool schema MIRRORS the validator exactly — enums included — so the
// live smith cannot emit a valid-but-rejected set (the standing schema law).
export function smithToolSchema(scope, field, locked = {}) {
  const allowed = allowedKeys(scope, field, locked);
  // (58B review) When the calling is settled in the LOCK, its riders are
  // settled law too — the schema deals them as enum-of-one from the same
  // tables the court reads, so the live smith CAN deal a lawful set (the
  // mirror law: a bound the model cannot see is a bound only the redraw
  // law enforces). An unknown locked calling settles nothing.
  const lockedClass = CLASSES.find((c) => c.className === (locked || {}).className) || null;
  const properties = {};
  for (const key of allowed) {
    if (lockedClass && key === 'caster') properties[key] = { type: 'string', enum: [lockedClass.caster] };
    else if (lockedClass && key === 'hitDie') properties[key] = { type: 'integer', enum: [lockedClass.hitDie] };
    else if (lockedClass && key === 'skills') properties[key] = { type: 'array', enum: [lockedClass.skills] };
    else if (lockedClass && key === 'bearing') properties[key] = { type: 'string', enum: [BEARINGS[lockedClass.className]] };
    else if (lockedClass && key === 'background') properties[key] = { type: 'string', enum: [BACKGROUNDS[lockedClass.className]] };
    // (58B.3) The fence rides twice from ONE seat: as maxLength (the
    // contract) and in the description (where the model actually reads —
    // bare maxLength proved advisory: six over-fence deals in one probe).
    else if (key in FENCES) properties[key] = { type: 'string', maxLength: FENCES[key].max, description: `At most ${FENCES[key].max} characters.` };
    else if (key === 'className') properties[key] = { type: 'string', enum: CLASS_NAMES };
    else if (key === 'caster') properties[key] = { type: 'string', enum: ['none', 'full', 'half', 'energy'] };
    else if (key === 'hitDie') properties[key] = { type: 'integer', enum: [6, 8, 10, 12] };
    else if (key === 'presentation') properties[key] = { type: 'string', enum: PRESENTATIONS };
    else if (key === 'skills') properties[key] = { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 40 } };
    else if (key === 'abilities') properties[key] = { type: 'object', properties: Object.fromEntries(ABILITY_KEYS.map((k) => [k, { type: 'integer', minimum: 3, maximum: 20 }])), required: ABILITY_KEYS, additionalProperties: false };
  }
  const candidate = { type: 'object', properties, required: allowed, additionalProperties: false };
  return {
    type: 'object',
    properties: { candidates: { type: 'array', minItems: CANDIDATE_COUNT, maxItems: CANDIDATE_COUNT, items: candidate } },
    required: ['candidates'], additionalProperties: false
  };
}

// ------------------------------------------------------------
// THE MOCK SMITH — the keyless floor, same contract as the live smith.
// Deterministic in (seed, scope, field, locked): the locked remainder is
// folded into the seed, so the same table conditioned the same way deals
// the same three candidates, and a changed condition deals a new hand.
// ------------------------------------------------------------
function drawWorld(salt, locked) {
  const candidate = {
    title: pick(TITLES, salt, 'title'),
    covenant: pick(COVENANTS, salt, 'covenant'),
    tone: pick(TONES, salt, 'tone'),
    homeRegion: pick(REGION_NAMES, salt, 'region'),
    styleBible: LOOKS[hash(`${salt}:look`) % LOOKS.length]
  };
  for (const key of Object.keys(locked)) delete candidate[key];
  return candidate;
}

function drawHero(salt, locked) {
  const cls = locked.className ? (CLASSES.find((c) => c.className === locked.className) || CLASSES[0]) : pick(CLASSES, salt, 'class');
  const candidate = {
    name: rollName(salt),
    sigil: pick(SIGILS, salt, 'sigil'),
    ancestry: pick(ANCESTRIES, salt, 'ancestry'),
    className: cls.className, caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills,
    abilities: rollAbilities(cls.className, hash(`${salt}:abilities`)),
    bearing: BEARINGS[cls.className],
    background: BACKGROUNDS[cls.className],
    presentation: pick(PRESENTATIONS, salt, 'presentation'),
    pronouns: pick(PRONOUN_WORDS, salt, 'pronouns'),
    mark: pick(MARKS, salt, 'mark'),
    keepsake: pick(ORACLE_HERO.keepsakes, salt, 'keepsake')
  };
  for (const key of Object.keys(locked)) delete candidate[key];
  return candidate;
}

function drawField(field, salt, locked) {
  if (field === 'className') {
    const cls = pick(CLASSES, salt, 'class');
    const candidate = {
      className: cls.className, caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills,
      abilities: rollAbilities(cls.className, hash(`${salt}:abilities`)),
      bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className]
    };
    for (const key of Object.keys(locked)) delete candidate[key];
    return candidate;
  }
  const cls = locked.className ? CLASSES.find((c) => c.className === locked.className) : null;
  const value = {
    title: () => pick(TITLES, salt, 'title'),
    covenant: () => pick(COVENANTS, salt, 'covenant'),
    tone: () => pick(TONES, salt, 'tone'),
    homeRegion: () => pick(REGION_NAMES, salt, 'region'),
    styleBible: () => LOOKS[hash(`${salt}:look`) % LOOKS.length],
    name: () => rollName(salt),
    ancestry: () => pick(ANCESTRIES, salt, 'ancestry'),
    presentation: () => pick(PRESENTATIONS, salt, 'presentation'),
    pronouns: () => pick(PRONOUN_WORDS, salt, 'pronouns'),
    mark: () => pick(MARKS, salt, 'mark'),
    keepsake: () => pick(ORACLE_HERO.keepsakes, salt, 'keepsake'),
    sigil: () => pick(SIGILS, salt, 'sigil'),
    bearing: () => (cls ? BEARINGS[cls.className] : pick(Object.values(BEARINGS), salt, 'bearing')),
    background: () => (cls ? BACKGROUNDS[cls.className] : pick(Object.values(BACKGROUNDS), salt, 'background'))
  }[field]();
  return { [field]: value };
}

export function mockSmith({ scope, field = null, locked = {}, seed = 0 } = {}) {
  const condSeed = hash(`${seed}:${scope}:${field || ''}:${stableJson(locked || {})}`);
  const candidates = [];
  for (let i = 0; i < CANDIDATE_COUNT; i += 1) {
    const salt = `${condSeed}:c${i}`;
    if (scope === 'world') candidates.push(drawWorld(salt, locked || {}));
    else if (scope === 'hero') candidates.push(drawHero(salt, locked || {}));
    else candidates.push(drawField(field, salt, locked || {}));
  }
  return { scope, field, seed, provider: 'mock', temperature: SMITH_TEMPERATURE, candidates };
}
