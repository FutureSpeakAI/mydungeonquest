// THE BESTIARY GATE (engine twin, pure fraction; Directive X, Laws I–II) —
// species canon seals once, like fixture canon: the door rules shape and
// the seal court refuses a rewrite by name; every instance derives from
// THE THREAT TABLE through the ONE expansion; the block carries
// bestiary_state; the easel rides up to three sealed visuals of the LIVING
// battle, most recently sealed first, byte-stable. Keyless, deterministic.
// The schema-mirror law (§VII — the model sees the law it is judged by,
// read off the table's server/dm.js tool schema) is a game-only seat and
// is judged at the table's own gate; the engine has no server to mirror.
import assert from 'node:assert/strict';
import { expandSpawn, makeEntropy, THREAT_TABLE, validateDmTurn } from '../src/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/story.js';
import { scenePrompt } from '../src/cinema/prompts.js';

// ---------------------------------------------------------------
// I. THE DOOR — creature_add shape, and the seal court.
// ---------------------------------------------------------------
const seated = { cast: [], bestiary: [{ species: 'Marsh Howler', threat: 2 }] };
const errorsOf = (payload, context) => (validateDmTurn(payload, [], context).errors || []);
const creatureErrors = (payload, context) => errorsOf(payload, context).filter((e) => e.includes('creature_add'));
const beast = (patch = {}) => ({ story: { creature_add: { species: 'Fen Strangler', visual: 'A rope of living reed and river-mud, jointed like a drowned spine.', nature: 'Ambusher of fords; patient, silent, strong.', threat: 3, ...patch } } });

assert.deepEqual(creatureErrors(beast(), seated), [], 'a lawful species seals at the door');
assert.ok(errorsOf({ story: { creature_add: [beast().story.creature_add] } }, seated).some((e) => e.includes('creature_add must be an object with exactly species, visual, nature, and threat')),
  'an array is refused — the seal is a single object');
assert.ok(errorsOf({ story: { creature_add: { ...beast().story.creature_add, extra: 1 } } }, seated).some((e) => e.includes('exactly species, visual, nature, and threat')),
  'an unknown key is refused');
assert.ok(creatureErrors(beast({ species: 'Xy' }), seated).some((e) => e.includes('species must be 3-60')), 'a two-letter species is refused');
assert.ok(creatureErrors(beast({ visual: 'Short.' }), seated).some((e) => e.includes('visual must be 8-160')), 'a seven-byte visual is refused');
assert.ok(creatureErrors(beast({ nature: 'Xy' }), seated).some((e) => e.includes('nature must be 3-90')), 'a two-letter nature is refused');
for (const threat of [0, 6, 2.5, '3', null]) {
  assert.ok(creatureErrors(beast({ threat }), seated).some((e) => e.includes('threat must be an integer between 1 and 5')),
    `threat ${JSON.stringify(threat)} is refused`);
}
assert.ok(creatureErrors(beast({ species: 'marsh HOWLER' }), seated).some((e) => e.includes('creature_add duplicates a sealed species')),
  'the seal refuses a rewrite by canon name, case-blind');
assert.deepEqual(creatureErrors(beast({ species: 'marsh HOWLER' }), { cast: [] }), [],
  'bare context: shape rules alone, the seal court stays out of session');

// ---------------------------------------------------------------
// II. THE TABLE — five ranks, fixed in law, never model-supplied.
// ---------------------------------------------------------------
assert.deepEqual(THREAT_TABLE, { 1: { hp: 4, ac: 10 }, 2: { hp: 9, ac: 11 }, 3: { hp: 16, ac: 12 }, 4: { hp: 30, ac: 14 }, 5: { hp: 55, ac: 16 } },
  'the threat table is fixed law — five ranks, no more');

// ---------------------------------------------------------------
// III. THE ONE EXPANSION — deterministic letters, table-born stats.
// ---------------------------------------------------------------
const shelf = [{ species: 'Marsh Howler', visual: 'x', nature: 'y', threat: 2, since: 9 }];
const pack = expandSpawn({ species: 'Marsh Howler', count: 2, names: null, zone: 'near' }, shelf);
assert.deepEqual(pack.map((i) => i.id), ['marsh-howler-a', 'marsh-howler-b'], 'ids slug-letter deterministically');
assert.deepEqual(pack.map((i) => i.name), ['Marsh Howler A', 'Marsh Howler B'], 'the unnamed take letters');
assert.ok(pack.every((i) => i.hp === 9 && i.maxHp === 9 && i.ac === 11 && i.zone === 'near' && i.species === 'Marsh Howler'),
  'every instance derives from the sealed threat — never from the model');
const named = expandSpawn({ species: 'marsh howler', count: 2, names: ['Old Reed', null], zone: 'far' }, shelf);
assert.deepEqual(named.map((i) => i.name), ['Old Reed', 'Marsh Howler B'], 'a given name overrides its letter; species matching is case-blind');
assert.equal(named[0].zone, 'far', 'the spawn zone rides every instance');
assert.deepEqual(expandSpawn({ species: 'Unsealed Thing', count: 3, names: null, zone: 'near' }, shelf), [],
  'an unsealed species expands to NOTHING — fail closed, never invent');
assert.equal(expandSpawn({ species: 'Marsh Howler', count: 99, names: null, zone: 'near' }, shelf).length, 6, 'count clamps at six letters');
assert.equal(expandSpawn({ species: 'Marsh Howler', count: 1, names: null, zone: 'nowhere' }, shelf)[0].zone, 'near', 'an unlawful zone falls to near');

// ---------------------------------------------------------------
// IV. SPAWN AT THE DOOR — sealed, or sealed in this same breath.
// ---------------------------------------------------------------
const pool = makeEntropy(() => .42);
const openWith = (spawnPatch = {}, extra = {}) => ({
  combat: {
    op: 'start', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: [],
    spawn: { species: 'Marsh Howler', count: 2, names: null, zone: 'near', ...spawnPatch },
    initiative: { device: ['Maren'], entropy: [{ group: spawnPatch.species || 'Marsh Howler', index: 0 }] }
  },
  entropy_use: [{ index: 0, die: 'd20', purpose: 'Initiative draw' }],
  ...extra
});
const spawnErrors = (payload, context) => (validateDmTurn(payload, pool, context).errors || []).filter((e) => e.includes('spawn'));
assert.deepEqual(spawnErrors(openWith(), seated), [], 'a sealed species spawns lawfully at the opening');
assert.ok(spawnErrors(openWith({ species: 'Unsealed Thing' }), seated).some((e) => e.includes('names a species the record has not sealed: Unsealed Thing')),
  'an unsealed species is refused by name');
assert.deepEqual(spawnErrors(openWith({ species: 'Fen Strangler' }, beast()), seated), [],
  'a species sealed in this same breath spawns lawfully');
assert.deepEqual(spawnErrors(openWith({ species: 'Unsealed Thing' }), { cast: [] }), [],
  'bare context: the spawn seal court stays out of session');
assert.ok(spawnErrors(openWith({ extra: 1 }), seated).some((e) => e.includes('spawn must be an object with exactly species, count, names, and zone')),
  'an unknown spawn key is refused');
assert.ok(spawnErrors(openWith({ count: 7 }), seated).some((e) => e.includes('count must be an integer between 1 and 6')), 'a seventh instance is refused');
assert.ok(spawnErrors(openWith({ names: ['One', 'Two', 'Three'] }), seated).some((e) => e.includes('at most one per instance')),
  'more names than instances is refused');

// ---------------------------------------------------------------
// V. THE FOLD — seal once, note refusals, ride the block, backfill.
// ---------------------------------------------------------------
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { creature_add: { species: 'Marsh Howler', visual: 'Reed-green bog-wolf, fen-light eyes.', nature: 'Pack hunter of drowned roads.', threat: 2 } }, { turn: 9 });
assert.equal(codex.bestiary.length, 1, 'the species seals into the shelf');
assert.equal(codex.bestiary[0].since, 9, 'the seal carries its turn stamp');
codex = applyStoryUpdates(codex, { creature_add: { species: 'MARSH howler', visual: 'A different lie entirely.', nature: 'Restat attempt.', threat: 5 } }, { turn: 10 });
assert.equal(codex.bestiary.length, 1, 'species canon seals once');
assert.equal(codex.bestiary[0].threat, 2, 'the first truth stands — never rewritten');
assert.ok(codex.notes.some((n) => n.includes('Species canon sealed once')), 'the refused rewrite is a note');
codex = applyStoryUpdates(codex, { creature_add: { species: 'Bog Idol', visual: 'A leaning stone with a wet mouth.', nature: 'Waits at crossings.', threat: 9 } }, { turn: 11 });
assert.equal(codex.bestiary.length, 1, 'a lawless threat rating does not seal');
assert.ok(codex.notes.some((n) => n.includes('no honest threat rating')), 'the lawless threat is a note');
codex = applyStoryUpdates(codex, { creature_add: { species: 'Gore Crow', visual: 'A crow too large, wearing road-dust like a cloak.', nature: 'Scavenger that follows battles.', threat: 1 } }, { turn: 12, tick: true });
assert.equal(codex.bestiary.length, 2, 'the offscreen tick MAY seal a species — the elsewhere breeds, it never moves souls');
assert.deepEqual(storyBlock(codex).bestiary_state, [{ species: 'Marsh Howler', threat: 2 }, { species: 'Gore Crow', threat: 1 }],
  'bestiary_state rides the block — species and threat, the seal\u2019s evidence');
const oldCodex = initCodex('classic-epic');
delete oldCodex.bestiary;
const backfilled = applyStoryUpdates(oldCodex, { beat_advance: false }, { turn: 0 });
assert.deepEqual(backfilled.bestiary, [], 'an old codex backfills an empty shelf');

// ---------------------------------------------------------------
// VI. THE EASEL RIDER — living battle only, three at most, verbatim.
// ---------------------------------------------------------------
let riderCodex = initCodex('classic-epic');
riderCodex = applyStoryUpdates(riderCodex, { world: { region_add: { name: 'The Wayhouse Ridge', visual: 'a wind-bent grass ridge stitched with dim gold lights' } } }, { turn: 0 });
const sealBeast = (turn, species, visual) => { riderCodex = applyStoryUpdates(riderCodex, { creature_add: { species, visual, nature: 'Nature enough.', threat: 2 } }, { turn }); };
sealBeast(1, 'Marsh Howler', 'a lean bog-wolf sheathed in reed-green weed');
sealBeast(2, 'Dusk Crow', 'a crow too large, wearing road-dust like a cloak');
sealBeast(3, 'Fen Strangler', 'a rope of living reed and river-mud');
sealBeast(4, 'Bog Idol', 'a leaning stone with a wet mouth');
const standing = (species) => ({ id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-a`, name: `${species} A`, species, hp: 9, maxHp: 9, ac: 11, zone: 'near' });
const riderCampaign = { hero: { name: 'Maren' }, styleBible: 'BIBLE', codex: riderCodex, logs: [], combat: { active: true, round: 1, enemies: [standing('Marsh Howler'), standing('Dusk Crow'), standing('Fen Strangler'), standing('Bog Idol')], order: [] } };
const battlePlate = scenePrompt(riderCampaign, { subjects: [], region: 'The Wayhouse Ridge', mood: 'dusk menace' });
assert.ok(battlePlate.includes('Bestiary canon, sealed each: Bog Idol — a leaning stone with a wet mouth; Fen Strangler — a rope of living reed and river-mud; Dusk Crow — a crow too large, wearing road-dust like a cloak.'),
  'three at most, most recently sealed first, each visual clause verbatim');
assert.ok(!battlePlate.includes('Marsh Howler — a lean bog-wolf'), 'the fourth-oldest species yields the plate');
assert.equal(battlePlate, scenePrompt(riderCampaign, { subjects: [], region: 'The Wayhouse Ridge', mood: 'dusk menace' }), 'same record, same bytes');
assert.ok(!scenePrompt({ ...riderCampaign, combat: null }, { subjects: [], region: 'The Wayhouse Ridge', mood: 'dusk menace' }).includes('Bestiary canon'),
  'no standing battle, no rider — an honest absence');
const downedCampaign = { ...riderCampaign, combat: { active: true, round: 2, enemies: riderCampaign.combat.enemies.map((e) => ({ ...e, hp: 0 })), order: [] } };
assert.ok(!scenePrompt(downedCampaign, { subjects: [], region: 'The Wayhouse Ridge', mood: 'dusk menace' }).includes('Bestiary canon'),
  'the downed do not ride the easel');

console.log('PASS — bestiary law (engine twin, pure fraction): the seal, the threat table, the one expansion, the block, and the painted rider hold; the schema-mirror is judged at the table\u2019s own gate.');
