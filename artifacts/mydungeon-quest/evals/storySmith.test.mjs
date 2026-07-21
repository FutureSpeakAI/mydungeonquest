// THE STORY SMITH GATE (Experience Directive XIX, Article I) — the
// compass unbinds, the ledger never does. The bespoke-spine court is
// calibrated on the nine hand-built exemplars (all pass as shelf, all
// refuse as bespoke), the refusal matrix lands by name, the sweeps
// guard every player-facing string, the keyless floor is deterministic
// and lawful, the mint seals once per volume forever, and the live tool
// schema MIRRORS the court from the one seat. Keyless, pure.
import assert from 'node:assert/strict';
import { SPINES } from 'fatescript/spines';
import { SMITH_TEMPERATURE, PG_LEXICON, POISON_DEMANDS } from 'fatescript/smith';
import {
  RUMOR_COUNT, SHELF_IDS, SPINE_FENCES, SPINE_ROLES,
  mockStorySmith, sealSpineMint, storySpineToolSchema,
  validateRumorPool, validateSpineCandidate, validateStorySmithCandidate
} from 'fatescript/storySmith';

// --- 1. The nine exemplars calibrate the court ---
assert.equal(SPINES.length, 9, 'nine spines stand on the shelf');
for (const spine of SPINES) {
  const shelf = validateSpineCandidate(spine, { bespoke: false });
  assert.ok(shelf.ok, `exemplar ${spine.id} passes the shelf court: ${shelf.errors.join('; ')}`);
  const asBespoke = validateSpineCandidate(spine, { bespoke: true });
  assert.ok(!asBespoke.ok, `exemplar ${spine.id} must REFUSE as bespoke (shelf id, no villainDesign)`);
  assert.ok(asBespoke.errors.some((e) => e.includes('shelf id')), 'the shelf-id claim is named');
  assert.ok(asBespoke.errors.some((e) => e.includes('villainDesign')), 'the missing villainDesign is named');
}
assert.equal(SPINE_ROLES.length, 8, 'the exemplars cast exactly eight roles');
assert.deepEqual([...SHELF_IDS].sort(), SPINES.map((s) => s.id).sort(), 'the shelf ids are the nine, derived never restated');

// --- 2. The refusal matrix, by name ---
const floor = mockStorySmith({ covenant: 'Protect the valley from the iron tide', tone: 'hopeful', seed: 7 });
const lawful = floor.spine;
assert.ok(validateSpineCandidate(lawful, { bespoke: true }).ok, 'the floor deals a lawful bespoke spine');
const refuse = (patch, needle, note) => {
  const verdict = validateSpineCandidate({ ...structuredClone(lawful), ...patch }, { bespoke: true });
  assert.ok(!verdict.ok, `${note} must refuse`);
  assert.ok(verdict.errors.some((e) => e.includes(needle)), `${note} is refused BY NAME (${needle}): got ${verdict.errors.join('; ')}`);
};
assert.ok(!validateSpineCandidate(null, { bespoke: true }).ok, 'null refused');
assert.ok(!validateSpineCandidate([], { bespoke: true }).ok, 'an array refused');
refuse({ stranger: 1 }, 'stranger key', 'a stranger key');
refuse({ id: 'classic-epic' }, 'shelf id', 'a bespoke spine claiming the shelf');
refuse({ id: 'Bad Slug!' }, 'slug', 'a lawless id');
refuse({ label: 'ab' }, 'label', 'a short label');
refuse({ villainDesign: 'too short' }, 'villainDesign', 'a thin villain design');
refuse({ beats: lawful.beats.slice(0, 11) }, 'beats', 'eleven beats');
refuse({ beats: [...lawful.beats, ...lawful.beats.slice(0, 2).map((b) => ({ ...b, key: `${b.key}-x` }))] }, 'beats', 'seventeen beats');
{
  const beats = structuredClone(lawful.beats); beats[6] = { ...beats[6], act: 1 };
  refuse({ beats }, 'descend', 'acts falling backward');
}
{
  const beats = structuredClone(lawful.beats); beats[3] = { ...beats[3], key: beats[2].key };
  refuse({ beats }, 'repeats', 'a duplicated beat key');
}
{
  const beats = structuredClone(lawful.beats); beats[1] = { ...beats[1], goal: 'too thin' };
  refuse({ beats }, 'goal', 'a goal under the fence');
}
{
  const beats = structuredClone(lawful.beats); beats[1] = { ...beats[1], omen: 'x' };
  refuse({ beats }, 'stranger key', 'a beat stranger key');
}
refuse({ revealIdx: 0 }, 'past the first act', 'a reveal in act one');
refuse({ revealIdx: 99 }, 'revealIdx', 'a reveal off the page');
refuse({ deadlines: [] }, 'deadlines', 'an empty deadline table');
refuse({ deadlines: [{ byBeat: 4, roles: ['villain'] }, { byBeat: 2, roles: ['ally'] }, { byBeat: 6, roles: ['mentor'] }] }, 'ascend', 'deadlines out of order');
refuse({ deadlines: [{ byBeat: 2, roles: ['dragon'] }, { byBeat: 4, roles: ['ally'] }, { byBeat: 6, roles: ['mentor'] }] }, 'unknown role', 'a role outside the vocabulary');
refuse({ deadlines: [{ byBeat: 2, roles: ['ally', 'ally'] }, { byBeat: 4, roles: ['mentor'] }, { byBeat: 6, roles: ['villain'] }] }, 'twice', 'a role cast twice in one row');
refuse({ deadlines: [{ byBeat: 2, roles: ['ally'], omen: 1 }, { byBeat: 4, roles: ['mentor'] }, { byBeat: 6, roles: ['villain'] }] }, 'stranger key', 'a deadline stranger key');

// --- 3. The sweeps guard every string ---
const poisonLine = 'The villain\u2019s mark must stay clearly visible on every banner';
assert.ok(POISON_DEMANDS.some((d) => d.pattern.test(poisonLine)), 'the probe line trips the poison seat itself');
refuse({ villainDesign: poisonLine }, 'sweep refused poison', 'a poison demand in the design');
const goreLine = 'A road of entrails and patient cruelty, mapped one favor at a time';
assert.ok(PG_LEXICON.some((d) => d.pattern.test(goreLine)), 'the probe line trips the PG seat itself');
refuse({ villainDesign: goreLine }, 'sweep refused pg', 'a PG breach in the design');
{
  const rumors = [...floor.rumors]; rumors[2] = poisonLine;
  const verdict = validateRumorPool(rumors);
  assert.ok(!verdict.ok && verdict.errors.some((e) => e.includes('sweep refused poison')), 'a poisoned rumor is swept by name');
}

// --- 4. The rumor pool court ---
assert.ok(validateRumorPool(floor.rumors).ok, 'the floor pool is lawful');
assert.ok(!validateRumorPool(floor.rumors.slice(0, 4)).ok, `a pool under ${RUMOR_COUNT} refused`);
assert.ok(!validateRumorPool([...floor.rumors.slice(0, 5), 'too short']).ok, 'a rumor under the fence refused');
assert.ok(!validateRumorPool([...floor.rumors.slice(0, 5), floor.rumors[0]]).ok, 'a repeated rumor refused');
{
  const verdict = validateStorySmithCandidate({ spine: lawful, rumors: floor.rumors, extra: 1 });
  assert.ok(!verdict.ok && verdict.errors.some((e) => e.includes('stranger key')), 'the whole answer refuses strangers');
}

// --- 5. The keyless floor is deterministic and covenant-woven ---
const again = mockStorySmith({ covenant: 'Protect the valley from the iron tide', tone: 'hopeful', seed: 7 });
assert.equal(JSON.stringify(floor), JSON.stringify(again), 'the same ask deals the same spine, byte for byte');
const other = mockStorySmith({ covenant: 'Protect the valley from the iron tide', tone: 'hopeful', seed: 8 });
assert.notEqual(JSON.stringify(floor.spine), JSON.stringify(other.spine), 'a new seed deals a new spine');
assert.equal(floor.provider, 'mock', 'the floor is honest about its hand');
assert.equal(floor.temperature, SMITH_TEMPERATURE, 'the floor declares the pinned dial');
assert.ok(!SHELF_IDS.includes(floor.spine.id), 'a bespoke id never claims the shelf');
const carried = mockStorySmith({ covenant: 'Protect the valley', seed: 7, carryover: { openThreads: [{ label: 'the unpaid ferry debt', kind: 'debt' }], openAmbitions: [], standings: [] } });
assert.ok(carried.rumors.some((r) => r.includes('the unpaid ferry debt')), 'the carryover\u2019s unpaid thread reaches the horizon pool');
assert.ok(validateStorySmithCandidate({ spine: carried.spine, rumors: carried.rumors }, { bespoke: true }).ok, 'the carried deal is lawful whole');

// --- 6. The mint stands forever ---
const first = sealSpineMint(null, { spine: floor.spine, rumors: floor.rumors, source: 'mock', seed: 7 });
assert.ok(first.ok, `the first mint seats: ${first.refusal || ''}`);
assert.deepEqual(first.mint.attestation, { source: 'mock', seed: 7, provider: null, model: null }, 'the attestation names its hand');
const second = sealSpineMint(first.mint, { spine: other.spine, rumors: other.rumors, source: 'mock', seed: 8 });
assert.ok(!second.ok && second.refusal.includes('already minted'), 'a second mint is refused by name — cached forever');
const shelf = sealSpineMint(null, { spine: { id: 'classic-epic' }, rumors: floor.rumors, source: 'shelf', seed: 3 });
assert.ok(shelf.ok, `a shelf mint seats: ${shelf.refusal || ''}`);
assert.equal(shelf.mint.spine.beats.length, SPINES.find((s) => s.id === 'classic-epic').beats.length, 'the shelf mint seats the WHOLE standing spine');
assert.ok(!sealSpineMint(null, { spine: { id: 'no-such-arc' }, rumors: floor.rumors, source: 'shelf' }).ok, 'a shelf mint must name the shelf');
assert.ok(!sealSpineMint(null, { spine: floor.spine, rumors: floor.rumors, source: 'stranger' }).ok, 'the mint names its source or nothing');
assert.ok(!sealSpineMint(null, { spine: { ...floor.spine, id: 'classic-epic' }, rumors: floor.rumors, source: 'mock' }).ok, 'a bespoke mint under a shelf id is refused');

// --- 7. The tool schema mirrors the court, one seat ---
const schema = storySpineToolSchema();
assert.equal(schema.additionalProperties, false, 'the envelope refuses strangers');
assert.deepEqual(schema.required.sort(), ['rumors', 'spine'], 'the whole ask is required');
const spineSchema = schema.properties.spine;
assert.equal(spineSchema.additionalProperties, false, 'the spine refuses strangers');
assert.ok(spineSchema.required.includes('villainDesign'), 'the villain design is required law');
assert.deepEqual(spineSchema.properties.deadlines.items.properties.roles.items.enum, [...SPINE_ROLES], 'roles ride as a REAL enum from the one seat');
assert.equal(spineSchema.properties.beats.minItems, SPINE_FENCES.beats.min, 'beat floor mirrors the fence');
assert.equal(spineSchema.properties.beats.maxItems, SPINE_FENCES.beats.max, 'beat ceiling mirrors the fence');
assert.equal(spineSchema.properties.beats.items.additionalProperties, false, 'beats refuse strangers');
assert.equal(spineSchema.properties.villainDesign.minLength, SPINE_FENCES.villainDesign.min, 'design floor mirrors the fence');
assert.equal(schema.properties.rumors.minItems, RUMOR_COUNT, 'the pool count is schema law');
assert.equal(schema.properties.rumors.maxItems, RUMOR_COUNT, 'the pool count is exact');
assert.equal(schema.properties.rumors.items.maxLength, SPINE_FENCES.rumor.max, 'rumor fences mirror the court');

console.log('PASS: the story smith law holds — nine exemplars calibrate the court, refusals land by name, the floor is deterministic, and the mint stands forever.');
