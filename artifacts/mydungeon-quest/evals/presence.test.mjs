// THE PRESENCE GATE (Directive VII) — the scene as sealed record, keyless.
// One file, four rooms: the door (validateScene's three courts), the fold
// (the reducer's three answers), the block (scene_state rides to the
// server court), and the replay (presenceOf/visitorsOf, pure from the
// journal). The tick op set is proved closed on the way through.
import assert from 'node:assert/strict';
import { validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { presenceOf, visitorsOf } from '../src/lib/presence.js';
import { tickUpdates } from 'fatescript/livingWorld';

const S = (story, time_advance = null) => ({ story, time_advance });
const sceneErr = (payload, context) => (validateDmTurn(payload, [], context).errors || [])
  .filter((error) => error.includes('scene_set') || error.includes('travel costs time'));

// --- The door, room one: shape law binds ALWAYS, even on a bare context.
const bare = { cast: [] };
assert.ok(sceneErr(S({ scene_set: ['Larkspur Vale'] }), bare).some((e) => e.includes('not an array')), 'an array stage is refused');
assert.ok(sceneErr(S({ scene_set: 'Larkspur Vale' }), bare).some((e) => e.includes('exactly region')), 'a bare string is refused');
assert.ok(sceneErr(S({ scene_set: { region: 'Larkspur Vale', mood: 'dusk' } }), bare).some((e) => e.includes('exactly region')), 'an extra key is refused');
assert.ok(sceneErr(S({ scene_set: { region: 'ab' } }), bare).some((e) => e.includes('3-100')), 'a two-letter region is refused');
assert.equal(sceneErr(S({ scene_set: null }), bare).length, 0, 'null is an honest absence');
assert.equal(sceneErr(S({}), bare).length, 0, 'an absent key is an honest absence');
assert.equal(sceneErr(S({ scene_set: { region: 'Nowhere Named' } }), bare).length, 0, 'a bare context judges shape only — the run.mjs cast-only contexts stay lawful');

// --- Room two: the atlas court seats iff context.regions IS an array.
assert.ok(sceneErr(S({ scene_set: { region: 'The Duchy' } }), { regions: [] }).some((e) => e.includes('does not hold')), 'attested-empty refuses an unrecorded stage by name');
assert.equal(sceneErr(S({ scene_set: { region: 'The Duchy' } }), { regions: [{ name: 'The Duchy' }] }).length, 0, 'a held region seats the scene');
assert.equal(sceneErr(S({ scene_set: { region: '  the duchy ' } }), { regions: [{ name: 'The Duchy' }] }).length, 0, 'canon match is trim- and case-blind');
assert.equal(sceneErr(S({ scene_set: { region: 'The Duchy' }, world: { region_add: { name: 'The Duchy' } } }), { regions: [] }).length, 0, 'the stage may be built and stood upon in one breath');

// --- Room three: the travel court seats iff the context CARRIES the scene key.
const seated = { regions: [{ name: 'Larkspur Vale' }, { name: 'The Duchy' }], scene: { region: 'Larkspur Vale' } };
assert.ok(sceneErr(S({ scene_set: { region: 'The Duchy' } }), seated).some((e) => e.includes('travel costs time')), 'free teleportation is refused by name');
assert.equal(sceneErr(S({ scene_set: { region: 'The Duchy' } }, { unit: 'days', n: 1 }), seated).length, 0, 'travel paid in time is lawful');
assert.equal(sceneErr(S({ scene_set: { region: 'larkspur vale' } }), seated).length, 0, 'restating the standing region is lawful and free');
assert.equal(sceneErr(S({ scene_set: { region: 'The Duchy' } }), { regions: [{ name: 'The Duchy' }], scene: null }).length, 0, 'scene: null attests no scene stands — genesis is free');
assert.equal(sceneErr(S({ scene_set: { region: 'The Duchy' } }), { regions: [{ name: 'The Duchy' }] }).length, 0, 'a context not carrying the scene key leaves the travel court unseated');

// --- The fold: after the world, three answers, and the backfill.
let codex = initCodex('classic-epic');
assert.equal(codex.scene, null, 'a new codex has no standing scene');
codex = applyStoryUpdates(codex, { world: { region_add: { name: 'Larkspur Vale', visual: 'chalk terraces' } }, scene_set: { region: 'Larkspur Vale' } }, { turn: 0 });
assert.equal(codex.scene.region, 'Larkspur Vale', 'the ground folds AFTER the world — built and stood upon in one breath');
assert.equal(codex.scene.sinceTurn, 0, 'sinceTurn is the turn-number stamp');
codex = applyStoryUpdates(codex, { scene_set: { region: 'The Sunken Court' } }, { turn: 1 });
assert.equal(codex.scene.region, 'Larkspur Vale', 'an unknown region cannot seat the scene');
assert.ok(codex.notes.some((note) => note.includes('Unlawful scene_set blocked')), 'the refusal is a note, never silence');
codex = applyStoryUpdates(codex, { scene_set: { region: '  larkspur vale ' } }, { turn: 2 });
assert.equal(codex.scene.sinceTurn, 0, 'restating the standing region no-ops — sinceTurn holds');
codex = applyStoryUpdates(codex, { world: { region_add: { name: 'The Duchy', visual: 'slate banners' } }, scene_set: { region: 'The Duchy' } }, { turn: 3 });
assert.equal(codex.scene.region, 'The Duchy', 'lawful travel moves the ground');
assert.equal(codex.scene.sinceTurn, 3, 'and restamps it');
codex = applyStoryUpdates(codex, { scene_set: { region: 'Larkspur Vale' } }, { turn: 4, tick: true });
assert.equal(codex.scene.region, 'The Duchy', 'the offscreen world may not move the stage');
assert.ok(codex.notes.some((note) => note.includes('may not move the stage')), 'the tick refusal is a note by name');
const legacy = initCodex('classic-epic');
delete legacy.scene;
assert.equal(applyStoryUpdates(legacy, {}, { turn: 0 }).scene, null, 'old codexes backfill scene: null on any fold');

// --- The block: the standing ground rides to the server court.
assert.deepEqual(storyBlock(codex).scene_state, { region: 'The Duchy', sinceTurn: 3 }, 'scene_state carries region and stamp');
assert.equal(storyBlock(initCodex('classic-epic')).scene_state, null, 'no scene, an honest null');

// --- The closed tick op set: the offscreen world cannot even SAY scene_set.
const tickOps = tickUpdates({ cast: [{ name: 'Edda', status: 'active', role: 'mentor', goal: 'keep the fires lit', bond: 2 }] }, 7);
assert.deepEqual(Object.keys(tickOps), ['cast_update'], 'the tick op set is closed');

// --- The replay: sightings, strikes, ticks, the hero law, and the cites.
const camp = { hero: { name: 'Maren Kest' }, logs: [
  { player: 'I arrive.', dm: { narration_blocks: [{ speaker: null, text: 'Dawn.' }], story: { cast_add: [{ name: 'Edda Thornwake' }, { name: 'Corin Voss' }], world: { region_add: { name: 'Larkspur Vale' } }, scene_set: { region: 'Larkspur Vale' } } } },
  { player: 'X-carded.', redacted: true, dm: { narration_blocks: [{ speaker: 'Corin Voss', text: 'Never happened.' }], story: { world: { region_add: { name: 'The Sunken Court' } }, scene_set: { region: 'The Sunken Court' } } } },
  { kind: 'tick', dm: { narration_blocks: [], story: { cast_update: [{ name: 'Edda Thornwake', fact_add: 'Offscreen.', last_seen: 'On the road' }] } } },
  { player: 'I pay the toll.', dm: { narration_blocks: [{ speaker: 'Edda', text: 'Coin is coin.' }], story: { purse: [{ holder: 'Corin Voss', delta: 3, reason: 'toll' }] } } },
  { player: 'We ride.', dm: { narration_blocks: [{ speaker: null, text: 'Road.' }], dialogue_cue: { speaker: 'Edda Thornwake', line: 'North.' }, story: { world: { region_add: { name: 'The Duchy' } }, scene_set: { region: 'The Duchy' }, item_transfer: [{ name: 'the ledger', from: 'Corin Voss', to: 'Maren Kest' }] } } }
] };
const ground = presenceOf(camp);
const edda = ground.find((soul) => soul.name === 'Edda Thornwake');
assert.equal(edda.ground, 'The Duchy', 'a dialogue_cue speaker is a sighting');
assert.equal(edda.cite, 4, 'cites are journal row indices');
const corin = ground.find((soul) => soul.name === 'Corin Voss');
assert.equal(corin.ground, 'The Duchy', 'a named hand in a transfer is a sighting');
const maren = ground.find((soul) => soul.name === 'Maren Kest');
assert.equal(maren.cite, 4, 'the hero is sighted by every non-struck player row');
assert.ok(!ground.some((soul) => soul.ground === 'The Sunken Court'), 'a struck scene_set never stands and struck sightings vanish whole');
const vale = visitorsOf(camp, 'Larkspur Vale');
assert.deepEqual(vale.standing, [], 'everyone has moved on from the vale');
assert.ok(vale.former.some((soul) => soul.name === 'Edda Thornwake' && soul.cite === 3), 'the unique bare first name reached its soul, cited to the row that staged it — and the tick row at index 2 sighted nobody');
assert.deepEqual(visitorsOf(camp, 'The Duchy').standing.map((soul) => soul.name), ['Corin Voss', 'Edda Thornwake', 'Maren Kest'], 'the standing list is deterministic — cite, then name');
const early = { hero: { name: 'Ire' }, logs: [{ player: 'I wake.', dm: { narration_blocks: [{ speaker: null, text: 'Dark.' }], story: null } }] };
assert.equal(presenceOf(early)[0].ground, null, 'a sighting before any scene stands lands on no ground');
const twins = { hero: { name: 'Odd' }, logs: [{ player: 'Go.', dm: { narration_blocks: [{ speaker: 'Vex', text: 'Which of us?' }], story: { cast_add: [{ name: 'Vex Marrow' }, { name: 'Vex Hollow' }], world: { region_add: { name: 'The Fen' } }, scene_set: { region: 'The Fen' } } } }] };
assert.ok(visitorsOf(twins, 'The Fen').standing.some((soul) => soul.name === 'Vex'), 'an ambiguous bare name keeps its own written form — canon is never guessed');
const rogue = { hero: { name: 'Nel' }, logs: [{ player: 'Step.', dm: { narration_blocks: [], story: { scene_set: { region: 'Uncharted Deep' } } } }] };
assert.equal(presenceOf(rogue).find((soul) => soul.name === 'Nel').ground, null, 'the replay refuses an unrecorded stage exactly as the fold refuses it');

// --- FAIL-CLOSED (the architect's cut): malformed shapes prove nothing and
// never throw. A list that is not an array, a name that is not a string, a
// story that is a string, a row that is null — the replay skips them whole
// and answers, deterministically, with what the record lawfully proves.
const mangled = { hero: { name: 'Maren Kest' }, logs: [
  { player: 'I arrive.', dm: { narration_blocks: [{ speaker: null, text: 'Dawn.' }], story: { cast_add: [{ name: 'Edda Thornwake' }], world: { region_add: { name: 'Larkspur Vale' } }, scene_set: { region: 'Larkspur Vale' } } } },
  { player: 'Bad row.', dm: { narration_blocks: { speaker: 'Ghost' }, dialogue_cue: { speaker: 7 }, story: { cast_add: { name: 'Intruder' }, cast_update: 'nonsense', item_add: 42, item_transfer: { from: 'A', to: 'B' }, item_remove: null, purse: { holder: 'C' }, scene_set: { region: { name: 'Objectville' } }, world: { region_add: { name: 9 } } } } },
  { player: 'String story.', dm: { narration_blocks: [], story: 'gibberish' } },
  null,
  { player: 'Named number.', dm: { narration_blocks: [{ speaker: 12, text: 'Hm.' }], story: { cast_add: [{ name: 4 }, { name: '  ' }, 'bare'] } } }
] };
let mangledAnswer = null;
assert.doesNotThrow(() => { mangledAnswer = presenceOf(mangled); }, 'a malformed record never throws the replay');
assert.deepEqual(mangledAnswer, [
  { name: 'Edda Thornwake', ground: 'Larkspur Vale', cite: 0 },
  { name: 'Maren Kest', ground: 'Larkspur Vale', cite: 4 }
], 'malformed substructures are skipped whole, lawful rows in the same record still count — no Ghost, no Intruder, no [object Object] — and a null row proves nothing, not even the hero');
let mangledVisitors = null;
assert.doesNotThrow(() => { mangledVisitors = visitorsOf(mangled, 'Larkspur Vale'); }, 'visitorsOf never throws on a malformed record');
assert.deepEqual(mangledVisitors.standing.map((soul) => soul.name), ['Edda Thornwake', 'Maren Kest'], 'the standing answer holds under mangling');
assert.equal(JSON.stringify(presenceOf(mangled)), JSON.stringify(mangledAnswer), 'the mangled replay is deterministic — byte-equal on a second pass');
assert.deepEqual(visitorsOf({ hero: null, logs: { length: 2 } }, 'Anywhere'), { standing: [], former: [] }, 'logs that are not an array prove nothing — an empty, honest answer');
assert.doesNotThrow(() => presenceOf(null), 'even a null campaign answers');
assert.deepEqual(presenceOf(null), [], 'with the empty truth');

console.log('PASS — the presence gate: the door\'s three scene courts, the fold\'s three answers, scene_state on the block, the closed tick op set, the pure replay with journal-row cites, and the fail-closed answer to a mangled record.');
