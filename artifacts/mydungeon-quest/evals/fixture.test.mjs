// THE FIXTURE GATE (Directive VIII.6–7) — place-bound canon, sealed once
// like region canon. The door rules shape and atlas; the fold seals with
// a turn stamp (and, unlike the party, the offscreen tick MAY seal — the
// elsewhere builds, it never moves souls); the block carries
// fixture_state; the easel rides up to three fixtures of the painted
// place, most recently sealed first, byte-stable. Keyless, deterministic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { scenePrompt } from '../src/lib/cinema/prompts.js';

// ---------------------------------------------------------------
// I. THE DOOR — shape, atlas, and the seal.
// ---------------------------------------------------------------
const seated = {
  cast: [],
  regions: [{ name: 'Larkspur Vale' }, { name: 'The Duchy' }],
  fixtures: [{ place: 'The Duchy', name: 'The Brass Toll-Scale' }]
};
const errorsOf = (payload, context) => (validateDmTurn(payload, [], context).errors || []);
const fixtureErrors = (payload, context) => errorsOf(payload, context).filter((e) => e.includes('fixture_add'));
const fx = (place, name, visual) => ({ story: { fixture_add: { place, name, visual } } });

assert.deepEqual(fixtureErrors(fx('Larkspur Vale', 'The Waystation Bell', 'A bronze bell above the waystation door.'), seated), [],
  'a lawful fixture passes the door');
assert.ok(errorsOf({ story: { fixture_add: ['x'] } }, seated).some((e) => e.includes('fixture_add must be an object with exactly place, name, and visual')),
  'an array is refused');
assert.ok(errorsOf({ story: { fixture_add: { place: 'The Duchy', name: 'The Gate', visual: 'A tall gate of oak and iron.', extra: 1 } } }, seated)
  .some((e) => e.includes('exactly place, name, and visual')), 'an unknown key is refused');
assert.ok(fixtureErrors(fx('Xy', 'The Gate', 'A tall gate of oak and iron.'), seated).some((e) => e.includes('place must be 3-100')), 'a two-letter place is refused');
assert.ok(fixtureErrors(fx('The Duchy', 'Xy', 'A tall gate of oak and iron.'), seated).some((e) => e.includes('name must be 3-60')), 'a two-letter name is refused');
assert.ok(fixtureErrors(fx('The Duchy', 'The Gate', 'Short.'), seated).some((e) => e.includes('visual must be 8-160')), 'a seven-byte visual is refused');
assert.ok(fixtureErrors(fx('The Sunken Court', 'The Gate', 'A tall gate of oak and iron.'), seated)
  .some((e) => e.includes('a place the record does not hold: The Sunken Court')), 'an unrecorded place is refused by name');
assert.deepEqual(fixtureErrors({ story: { world: { region_add: { name: 'The Sunken Court' } }, fixture_add: { place: 'The Sunken Court', name: 'The Gate', visual: 'A tall gate of oak and iron.' } } }, seated), [],
  'a place built by this same turn\u2019s region_add is lawful');
assert.ok(fixtureErrors(fx('The Duchy', 'The Brass Toll-Scale', 'A man-high brass scale at the gate arch.'), seated)
  .some((e) => e.includes('duplicates a sealed fixture: The Brass Toll-Scale already stands in The Duchy')), 'the seal refuses a rewrite by name');
assert.deepEqual(fixtureErrors(fx('Larkspur Vale', 'The Brass Toll-Scale', 'A man-high brass scale at the ferry.'), seated), [],
  'the same name in another place is its own fixture');
assert.deepEqual(fixtureErrors(fx('Anywhere At All', 'The Gate', 'A tall gate of oak and iron.'), { cast: [] }), [],
  'a bare context gets shape law only — no atlas, no seal, no false attestation');

// ---------------------------------------------------------------
// II. THE FOLD — seal once, stamp the turn, ticks MAY seal.
// ---------------------------------------------------------------
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { world: { region_add: { name: 'The Duchy', visual: 'slate towers' } } }, { turn: 0 });
codex = applyStoryUpdates(codex, { fixture_add: { place: 'the duchy', name: 'The Brass Toll-Scale', visual: 'A man-high brass scale at the gate arch, pans worn to mirrors.' } }, { turn: 3 });
assert.deepEqual(codex.fixtures, [{ place: 'The Duchy', name: 'The Brass Toll-Scale', visual: 'A man-high brass scale at the gate arch, pans worn to mirrors.', since: 3 }],
  'the fold seals the SEALED region name with the sealing turn');
codex = applyStoryUpdates(codex, { fixture_add: { place: 'The Duchy', name: 'the brass toll-scale', visual: 'Rewritten words that must not land.' } }, { turn: 4 });
assert.equal(codex.fixtures.length, 1, 'fixture canon seals once');
assert.ok(codex.notes.some((n) => n.includes('Fixture canon sealed once: the brass toll-scale already stands in The Duchy')), 'the rewrite is a note');
codex = applyStoryUpdates(codex, { fixture_add: { place: 'Nowhere Known', name: 'The Gate', visual: 'A tall gate of oak and iron.' } }, { turn: 5 });
assert.equal(codex.fixtures.length, 1);
assert.ok(codex.notes.some((n) => n.includes('Nowhere Known is not a region the record knows')), 'an unrecorded place is a note');
codex = applyStoryUpdates(codex, { fixture_add: { place: 'The Duchy', name: 'The Gallows Clock', visual: '' } }, { turn: 5 });
assert.ok(codex.notes.some((n) => n.includes('a fixture needs its name and its visual truth')), 'a blank visual is a note');
codex = applyStoryUpdates(codex, { fixture_add: { place: 'The Duchy', name: 'The Night Market Stalls', visual: 'Shuttered stalls under oiled canvas, lanterns cold by day.' } }, { turn: 6, tick: true });
assert.equal(codex.fixtures.length, 2, 'the offscreen tick MAY seal a fixture — the elsewhere builds, it never moves souls');
assert.equal(codex.fixtures[1].since, 6);
assert.deepEqual(storyBlock(codex).fixture_state,
  [{ place: 'The Duchy', name: 'The Brass Toll-Scale' }, { place: 'The Duchy', name: 'The Night Market Stalls' }],
  'fixture_state rides the block, names only');
// An old codex without the shelf backfills empty.
const oldCodex = initCodex('classic-epic');
delete oldCodex.fixtures;
const backfilled = applyStoryUpdates(oldCodex, { world: { region_add: { name: 'The Duchy', visual: 'slate' } } }, { turn: 0 });
assert.deepEqual(backfilled.fixtures, [], 'an old codex backfills an empty shelf');

// ---------------------------------------------------------------
// III. THE EASEL RIDER — three at most, most recent first, byte-stable.
// ---------------------------------------------------------------
let riderCodex = initCodex('classic-epic');
riderCodex = applyStoryUpdates(riderCodex, { world: { region_add: { name: 'The Duchy', visual: 'slate towers over paved toll roads' } } }, { turn: 0 });
riderCodex = applyStoryUpdates(riderCodex, { world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards' } } }, { turn: 0 });
const seal = (turn, name, visual, place = 'The Duchy') => { riderCodex = applyStoryUpdates(riderCodex, { fixture_add: { place, name, visual } }, { turn }); };
seal(1, 'The Brass Toll-Scale', 'a man-high brass scale at the gate arch');
seal(2, 'The Gallows Clock', 'a black iron clock that strikes only debts');
seal(3, 'The Night Market Stalls', 'shuttered stalls under oiled canvas');
seal(4, 'The Ledger Arch', 'an arch of mortared ledger-stones, each carved with a paid name');
seal(5, 'The Ferry Bell', 'a green bronze bell at the crossing', 'Larkspur Vale');
const riderCampaign = { hero: { name: 'Maren' }, styleBible: 'BIBLE', codex: riderCodex, logs: [] };
const duchyPlate = scenePrompt(riderCampaign, { subjects: [], region: 'The Duchy', mood: 'dusk' });
assert.ok(duchyPlate.includes('Standing fixtures of The Duchy, sealed canon each: The Ledger Arch — an arch of mortared ledger-stones, each carved with a paid name; The Night Market Stalls — shuttered stalls under oiled canvas; The Gallows Clock — a black iron clock that strikes only debts.'),
  'three at most, most recently sealed first, each visual clause verbatim');
assert.ok(!duchyPlate.includes('The Brass Toll-Scale'), 'the fourth-oldest fixture yields the plate');
assert.ok(!duchyPlate.includes('The Ferry Bell'), 'another place\u2019s fixture never rides');
assert.equal(duchyPlate, scenePrompt(riderCampaign, { subjects: [], region: 'The Duchy', mood: 'dusk' }), 'same record, same bytes');
const valePlate = scenePrompt(riderCampaign, { subjects: [], region: 'Larkspur Vale', mood: 'dusk' });
assert.ok(valePlate.includes('The Ferry Bell — a green bronze bell at the crossing'), 'the painted place rides its own fixtures');
const bareCampaign = { hero: { name: 'Maren' }, styleBible: 'BIBLE', codex: initCodex('classic-epic'), logs: [] };
assert.ok(!scenePrompt(bareCampaign, { subjects: [], region: 'The Duchy', mood: 'dusk' }).includes('Standing fixtures'),
  'no fixtures, no rider — an honest absence');

// ---------------------------------------------------------------
// IV. THE SCHEMA MIRROR — the model sees the law it is judged by.
// ---------------------------------------------------------------
const serverSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
for (const needle of ["fixture_add", "minLength: 8, maxLength: 160", "Fixture canon seals once"]) {
  assert.ok(serverSource.includes(needle), `the tool schema mirrors the door: ${needle}`);
}

console.log('PASS — the fixture gate: the door rules shape and atlas, the seal refuses rewrites, ticks may build the elsewhere, and the easel rides three sealed fixtures byte-stable.');
