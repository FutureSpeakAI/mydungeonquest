// THE SMITH GATE — the candidate court (twin of the table's gate, the
// pure fraction — the whole of it, for this gate holds no game-only
// law). The strict validator refuses locked keys, stranger keys,
// missing keys, incoherent callings, and unswept text; the tool schema
// MIRRORS the validator (enums included) so the live smith cannot deal
// a valid-but-rejected set; the mock floor is lawful by construction
// across every scope, field, and lock; and the temperature is pinned.
import assert from 'node:assert/strict';
import {
  mockSmith, validateCandidate, validateCandidateSet, smithToolSchema, sweepCandidate,
  SMITH_TEMPERATURE, CANDIDATE_COUNT, SMITH_FIELDS, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS, spineFromPromise
} from '../src/smith.js';
import { CLASSES, BEARINGS, BACKGROUNDS } from '../src/forgeRolls.js';
import { SPINES } from '../src/spines.js';

assert.equal(SMITH_TEMPERATURE, 0.9, 'the smith runs at the pinned temperature');
assert.equal(CANDIDATE_COUNT, 3, 'a candidate set holds exactly three');

// —— The court refuses. ——
const lawful = mockSmith({ scope: 'world', seed: 1 }).candidates;
assert.ok(validateCandidateSet('world', null, lawful, {}).ok, 'a lawful set passes whole');
assert.ok(!validateCandidateSet('world', null, null, {}).ok, 'a missing set is refused');
assert.ok(!validateCandidateSet('world', null, lawful.slice(0, 2), {}).ok, 'a short set is refused');
assert.ok(!validateCandidateSet('world', null, [...lawful, lawful[0]], {}).ok, 'a long set is refused');
assert.ok(!validateCandidateSet('unknown', null, lawful, {}).ok, 'an unknown scope is refused by name');
assert.ok(!validateCandidateSet('field', 'voiceId', lawful, {}).ok, 'a field without a die is refused by name');

const locked = { covenant: 'The promise that stands.' };
const touching = mockSmith({ scope: 'world', seed: 2 }).candidates.map((c) => ({ ...c }));
assert.ok(!validateCandidateSet('world', null, touching, locked).ok, 'a candidate touching a locked key is refused');
const held = mockSmith({ scope: 'world', locked, seed: 2 }).candidates;
assert.ok(validateCandidateSet('world', null, held, locked).ok, 'the same deal conditioned on the lock passes');

const [base] = mockSmith({ scope: 'hero', seed: 3 }).candidates;
assert.ok(!validateCandidate('hero', null, { ...base, stranger: 'key' }, {}).ok, 'a stranger key is refused');
const { mark, ...missing } = base;
assert.ok(!validateCandidate('hero', null, missing, {}).ok, 'a missing key is refused — the smith answers the whole ask');
assert.ok(!validateCandidate('hero', null, { ...base, className: 'Warlockery' }, {}).ok, 'an unseatable calling is refused');
assert.ok(!validateCandidate('hero', null, { ...base, abilities: { ...base.abilities, STR: 25 } }, {}).ok, 'an ability beyond the fence is refused');
assert.ok(!validateCandidate('hero', null, { ...base, abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10 } }, {}).ok, 'five scores are not six');
assert.ok(!validateCandidate('hero', null, { ...base, skills: ['one', 'two'] }, {}).ok, 'two skills are not three');
assert.ok(!validateCandidate('hero', null, { ...base, presentation: 'regal' }, {}).ok, 'a presentation outside the law is refused');
const cls = CLASSES.find((c) => c.className === base.className);
const otherClass = CLASSES.find((c) => JSON.stringify(c.skills) !== JSON.stringify(cls.skills));
assert.ok(!validateCandidate('hero', null, { ...base, caster: cls.caster === 'none' ? 'full' : 'none' }, {}).ok, 'a caster contradicting the calling is refused');
assert.ok(!validateCandidate('hero', null, { ...base, skills: otherClass.skills }, {}).ok, 'skills contradicting the calling are refused');

// —— The governing calling may sit in the LOCK. ——
// A whole-hero deal under a locked className carries no className of
// its own — the court must read the lock, or a Wizard walks with a
// greatsword's die and the court says nothing.
const wizard = CLASSES.find((c) => c.className === 'Wizard');
const wizardLock = { className: 'Wizard' };
const lockedBase = { ...mockSmith({ scope: 'hero', locked: wizardLock, seed: 6 }).candidates[0] };
assert.ok(validateCandidate('hero', null, lockedBase, wizardLock).ok, 'the floor deals lawful under a locked calling');
for (const [key, bad] of [
  ['caster', wizard.caster === 'full' ? 'none' : 'full'],
  ['hitDie', wizard.hitDie === 6 ? 12 : 6],
  ['skills', ['Juggling', 'Whittling', 'Loitering']],
  ['bearing', 'A slouch no calling owns.'],
  ['background', 'A stranger tale that fits no calling.']
]) {
  const verdict = validateCandidate('hero', null, { ...lockedBase, [key]: bad }, wizardLock);
  assert.ok(!verdict.ok && verdict.errors.some((e) => e.includes('contradict')), `${key} contradicting the LOCKED calling is refused by name`);
}
// Background binds in hero scope too — the old exemption is dead.
const withClass = { ...mockSmith({ scope: 'hero', seed: 6 }).candidates[0] };
assert.ok(!validateCandidate('hero', null, { ...withClass, background: 'A stranger tale that fits no calling.' }, {}).ok, 'hero-scope background contradicting the dealt calling is refused');
// A rider respun alone under a locked calling still answers it; an
// unlocked lone rider answers no one.
assert.ok(!validateCandidate('field', 'bearing', { bearing: 'A slouch no calling owns.' }, wizardLock).ok, 'a lone bearing under a locked calling answers that calling');
assert.ok(validateCandidate('field', 'bearing', mockSmith({ scope: 'field', field: 'bearing', seed: 3 }).candidates[0], {}).ok, 'an unlocked lone bearing may be any calling\u2019s');
// The mirror carries the settled body: under a locked calling the schema
// deals every rider as enum-of-one from the same tables the court reads.
const lockedSchema = smithToolSchema('hero', null, wizardLock).properties.candidates.items.properties;
assert.deepEqual(lockedSchema.caster.enum, [wizard.caster], 'locked calling: caster rides as settled law');
assert.deepEqual(lockedSchema.hitDie.enum, [wizard.hitDie], 'locked calling: hitDie rides as settled law');
assert.deepEqual(lockedSchema.skills.enum, [wizard.skills], 'locked calling: skills ride as settled law');
assert.deepEqual(lockedSchema.bearing.enum, [BEARINGS.Wizard], 'locked calling: bearing rides as settled law');
assert.deepEqual(lockedSchema.background.enum, [BACKGROUNDS.Wizard], 'locked calling: background rides as settled law');

// —— The sweeps bite BEFORE the showing. ——
const poisoned = { ...mockSmith({ scope: 'world', seed: 4 }).candidates[0], covenant: 'A land whose banner is unmistakable at a glance.' };
assert.ok(sweepCandidate(poisoned).some((v) => v.startsWith('poison:')), 'the poison sweep names the demand');
assert.ok(!validateCandidate('world', null, poisoned, {}).ok, 'a poisoned candidate is refused whole');
const crude = { ...mockSmith({ scope: 'world', seed: 4 }).candidates[0], tone: 'Grim as shit and twice as loud.' };
assert.ok(sweepCandidate(crude).some((v) => v.startsWith('pg:')), 'the PG lexicon names the word');
assert.ok(!validateCandidate('world', null, crude, {}).ok, 'an unrated candidate is refused whole');
assert.equal(sweepCandidate(mockSmith({ scope: 'hero', seed: 5 }).candidates[0]).length, 0, 'the pools are clean by construction');

// —— The schema mirrors the court, enums included. ——
for (const [scope, field, lock] of [['world', null, {}], ['world', null, { tone: 'held' }], ['hero', null, {}], ['hero', null, { className: 'Wizard' }], ['field', 'className', { bearing: 'held' }], ['field', 'tone', {}]]) {
  const schema = smithToolSchema(scope, field, lock);
  assert.equal(schema.additionalProperties, false, 'the envelope refuses strangers');
  assert.equal(schema.properties.candidates.minItems, CANDIDATE_COUNT);
  assert.equal(schema.properties.candidates.maxItems, CANDIDATE_COUNT);
  const item = schema.properties.candidates.items;
  assert.equal(item.additionalProperties, false, 'a candidate refuses strangers');
  for (const key of Object.keys(lock)) { assert.ok(!(key in item.properties), `the schema never offers the locked key ${key}`); assert.ok(!item.required.includes(key)); }
  assert.deepEqual(Object.keys(item.properties).sort(), [...item.required].sort(), 'everything offered is required — the whole ask');
  if (item.properties.className) assert.deepEqual(item.properties.className.enum, CLASSES.map((c) => c.className), 'the callings ride as an enum, mirroring the validator');
  if (item.properties.presentation) assert.deepEqual(item.properties.presentation.enum, ['feminine', 'masculine', 'neutral'], 'the presentations ride as an enum');
  if (item.properties.abilities) assert.deepEqual(item.properties.abilities.required, ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], 'the six scores are demanded by name');
  // The fence rides twice from ONE seat: every offered free-text
  // string carries a finite maxLength AND a description naming that
  // same bound — bare maxLength proved advisory to the live model, and
  // a fence the model never reads is a fence only the redraw law enforces.
  for (const [key, prop] of Object.entries(item.properties)) {
    if (prop.type === 'string' && !prop.enum) {
      assert.ok(Number.isFinite(prop.maxLength) && prop.maxLength > 0, `${key} carries its fence as maxLength`);
      assert.ok(typeof prop.description === 'string' && prop.description.includes(String(prop.maxLength)), `${key} speaks its bound where the model reads`);
    }
  }
}

// —— Drift-pins: the fences themselves, by value, at the schema's mouth. ——
const worldFences = smithToolSchema('world', null, {}).properties.candidates.items.properties;
for (const [key, max] of [['title', 80], ['covenant', 2000], ['tone', 120], ['homeRegion', 60], ['styleBible', 300]]) assert.equal(worldFences[key].maxLength, max, `world ${key} fence pinned at ${max}`);
const heroFences = smithToolSchema('hero', null, {}).properties.candidates.items.properties;
for (const [key, max] of [['name', 60], ['ancestry', 40], ['bearing', 200], ['background', 300], ['pronouns', 30], ['mark', 80], ['keepsake', 60], ['sigil', 2]]) assert.equal(heroFences[key].maxLength, max, `hero ${key} fence pinned at ${max}`);

// —— The floor is lawful by construction: every scope, field, and lock. ——
for (let seed = 1; seed <= 7; seed += 1) {
  for (const [scope, field, lock] of [
    ['world', null, {}], ['world', null, { covenant: 'held', title: 'held' }],
    ['hero', null, {}], ['hero', null, { className: 'Wizard', name: 'Held' }],
    ...SMITH_FIELDS.map((f) => ['field', f, {}]),
    ['field', 'className', { bearing: 'my own bearing' }],
    ['field', 'bearing', { className: 'Wizard' }]
  ]) {
    const out = mockSmith({ scope, field, locked: lock, seed });
    const verdict = validateCandidateSet(scope, field, out.candidates, lock);
    assert.ok(verdict.ok, `the floor is lawful: ${scope}/${field ?? '—'} seed ${seed} lock ${JSON.stringify(lock)} — ${verdict.errors.join('; ')}`);
    assert.equal(out.provider, 'mock', 'the floor answers in its own name');
    assert.equal(out.temperature, SMITH_TEMPERATURE, 'one temperature everywhere');
  }
}
// Conditioned coherence: a locked calling shapes the whole dealt body.
for (const candidate of mockSmith({ scope: 'hero', locked: { className: 'Wizard' }, seed: 9 }).candidates) {
  const wizard = CLASSES.find((c) => c.className === 'Wizard');
  assert.deepEqual(candidate.skills, wizard.skills, 'a locked calling deals its own skills');
  assert.equal(candidate.bearing, BEARINGS.Wizard, 'a locked calling deals its own bearing');
}
// A world candidate never carries a spine; its promise still shapes one.
for (const candidate of mockSmith({ scope: 'world', seed: 10 }).candidates) {
  assert.ok(!('spineId' in candidate), 'the shape is derived, never dealt');
  assert.ok(SPINES.some((s) => s.id === spineFromPromise(candidate.covenant)), 'every dealt promise reads to a real spine');
}
// The world remainder law mirrors the hero's: single-field deals touch
// their field alone even under a full lock of the rest.
const fullLock = Object.fromEntries(WORLD_KEYS.filter((k) => k !== 'tone').map((k) => [k, 'held']));
for (const candidate of mockSmith({ scope: 'field', field: 'tone', locked: fullLock, seed: 11 }).candidates) assert.deepEqual(Object.keys(candidate), ['tone']);
assert.equal(HERO_KEYS.length, 14, 'the hero body is complete');
assert.equal(CALLING_RIDERS.length, 6, 'the calling rides with its six');

console.log('PASS — the smith gate (engine twin, pure fraction): the court refuses locked keys, strangers, gaps, incoherent callings and unswept text; the tool schema mirrors the court with its enums AND its fences (each bound spoken where the model reads); the mock floor deals lawful, conditioned, spineless-and-shaped sets at the pinned temperature across every scope, field, and lock.');
