// THE WORLD SHAPE GATE (Experience Directive XIX, Article VIII) — the
// architect's finding C, cured at the door and proven here: every world
// payload is judged for shape, bounds, and strangers BY NAME under the
// presence discipline; lawful payloads pass untouched (the whole
// standing chain is the fixture proof — this gate walks the door
// directly); and the fold's silent bend retires to a standing note in
// the record. Keyless, pure.
import assert from 'node:assert/strict';
import { validateDmTurn } from 'fatescript/protocol';
import { REGION_STATES, applyStoryUpdates, initCodex } from 'fatescript/story';

const worldErrors = (world) => validateDmTurn({ story: { world } }, [], {}).errors.filter((e) => e.includes('world'));

// --- 1. Presence discipline: absence owes nothing ---
assert.deepEqual(validateDmTurn({ story: {} }, [], {}).errors.filter((e) => e.includes('world')), [], 'no world key, no world court');
assert.deepEqual(worldErrors(null), [], 'a null world stands unchanged and unjudged');
assert.deepEqual(worldErrors(undefined), [], 'an undefined world owes nothing');

// --- 2. The refusal matrix, by name ---
assert.ok(worldErrors([]).some((e) => e.includes('plain object')), 'an array world refused');
assert.ok(worldErrors('blighted').some((e) => e.includes('plain object')), 'a string world refused');
assert.ok(worldErrors({ weather: 'rain' }).some((e) => e.includes('stranger key "weather"')), 'a stranger key refused by name');
for (const delta of [9, -6, 1.5, '2', true]) {
  assert.ok(worldErrors({ blight_delta: delta }).some((e) => e.includes('blight_delta')), `blight_delta ${JSON.stringify(delta)} refused`);
}
assert.ok(worldErrors({ region_add: [] }).some((e) => e.includes('region_add')), 'an array region_add refused');
assert.ok(worldErrors({ region_add: { name: 'ab', visual: 'a lawful visual clause for the new ground' } }).some((e) => e.includes('region_add.name')), 'a short region name refused');
assert.ok(worldErrors({ region_add: { name: 'Larkspur Deep', visual: 'short' } }).some((e) => e.includes('region_add.visual')), 'a thin visual refused');
assert.ok(worldErrors({ region_add: { name: 'Larkspur Deep', visual: 'mist-wrapped pines over black water, lanterns on poles', id: 'x' } }).some((e) => e.includes('stranger key "id"')), 'region_add strangers refused — the schema\u2019s own promise enforced');
assert.ok(worldErrors({ region_update: { name: 'Larkspur Vale', state: 'glorious' } }).some((e) => e.includes('standing states')), 'an unknown state refused against the one-seat enum');
assert.ok(worldErrors({ region_update: { name: 'Larkspur Vale', state: 'troubled', mood: 'grim' } }).some((e) => e.includes('stranger key "mood"')), 'region_update strangers refused');
assert.ok(worldErrors({ region_update: { name: '', state: 'troubled' } }).some((e) => e.includes('region_update.name')), 'an empty update name refused');

// --- 3. Lawful payloads pass the door untouched ---
for (const world of [
  {},
  { blight_delta: -5 },
  { blight_delta: 5 },
  { blight_delta: 0 },
  { blight_delta: null },
  { region_add: { name: 'Larkspur Deep', visual: 'mist-wrapped pines over black water, lanterns on poles' } },
  { region_add: null },
  { region_update: { name: 'Larkspur Vale', state: 'troubled' } },
  { region_update: null },
  { blight_delta: 2, region_add: { name: 'The Sunken Stair', visual: 'drowned marble steps descending into green light' }, region_update: { name: 'Larkspur Vale', state: 'healed' } }
]) {
  assert.deepEqual(worldErrors(world), [], `lawful payload passes untouched: ${JSON.stringify(world)}`);
}
for (const state of REGION_STATES) {
  assert.deepEqual(worldErrors({ region_update: { name: 'Larkspur Vale', state } }), [], `every standing state is lawful: ${state}`);
}

// --- 4. The fold speaks where it once bent silently ---
const codex = initCodex('classic-epic');
assert.equal(codex.blight, 0, 'the tale begins unblighted');
{
  const bent = applyStoryUpdates(codex, { world: { blight_delta: -3 } });
  assert.equal(bent.blight, 0, 'the belt still holds the floor');
  assert.ok(bent.notes.some((n) => n.includes('The blight cannot leave 0..5')), 'the hold is a standing note, never a silent bend');
}
{
  const clean = applyStoryUpdates(codex, { world: { blight_delta: 3 } });
  assert.equal(clean.blight, 3, 'a lawful move lands whole');
  assert.ok(!clean.notes.some((n) => n.includes('blight')), 'no note where nothing bent');
  const capped = applyStoryUpdates(clean, { world: { blight_delta: 4 } });
  assert.equal(capped.blight, 5, 'the ceiling holds');
  assert.ok(capped.notes.some((n) => n.includes('held at 5 (stood 3, asked +4)')), 'the note names the arithmetic');
}
{
  const grown = applyStoryUpdates(codex, { world: { region_add: { name: 'Larkspur Deep', visual: 'mist-wrapped pines over black water, lanterns on poles' } } });
  assert.equal(grown.regions.length, 1, 'new ground seats');
  const doubled = applyStoryUpdates(grown, { world: { region_add: { name: 'larkspur deep', visual: 'the same ground asked twice' } } });
  assert.equal(doubled.regions.length, 1, 'the record holds one Larkspur Deep');
  assert.ok(doubled.notes.some((n) => n.includes('already stands — the add folded away')), 'the dedupe speaks');
  const missed = applyStoryUpdates(grown, { world: { region_update: { name: 'Nowhere Fen', state: 'troubled' } } });
  assert.ok(missed.notes.some((n) => n.includes('holds no such ground')), 'an update on unknown ground speaks');
  const lawless = applyStoryUpdates(grown, { world: { region_update: { name: 'Larkspur Deep', state: 'glorious' } } });
  assert.equal(lawless.regions[0].state, 'thriving', 'the belt refuses the unknown state');
  assert.ok(lawless.notes.some((n) => n.includes('unknown state')), 'and it says so');
  const turned = applyStoryUpdates(grown, { world: { region_update: { name: 'Larkspur Deep', state: 'ruined' } } });
  assert.equal(turned.regions[0].state, 'ruined', 'a lawful turn lands');
  assert.ok(!turned.notes.some((n) => n.includes('folded away')), 'no note where nothing folded');
}

console.log('PASS: the world shape court holds — strangers and bounds refused at the door, lawful payloads untouched, and the fold speaks where it once bent silently.');
