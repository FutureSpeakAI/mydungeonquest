// THE PARTY GATE (Directive VIII) — who travels with the hero, and who
// is elsewhere. Four courts at the door (membership, the living, the
// ground, the hero-root) plus the nobody-teleports law on speakers; the
// fold with its tick refusals; the pure replay with partyOf/elsewhereOf
// (travel moves members together, a leave pins the departed, a farewell
// in the leaving turn un-pins nobody); the briefing's traveling_with that
// never trims and an elsewhere that trims FIRST. Bare contexts get shape
// law only — presence-based seating, never false attestation. Keyless,
// deterministic, fail-closed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { partyOf, elsewhereOf, presenceOf } from '../src/lib/presence.js';
import { buildBriefing } from '../src/lib/graph.js';
import { judgeTurn } from '../server/dm.js';

// ---------------------------------------------------------------
// I. THE DOOR — the four courts, seated as the landing seats them.
// ---------------------------------------------------------------
const seated = {
  cast: [
    { name: 'Corin Voss', status: 'active' },
    { name: 'Vessarine', status: 'active' },
    { name: 'Mara Senn', status: 'active' },
    { name: 'Old Bran', status: 'dead' }
  ],
  regions: [{ name: 'Larkspur Vale' }, { name: 'The Duchy' }],
  scene: { region: 'The Duchy' },
  presence: [
    { name: 'Corin Voss', ground: 'The Duchy' },
    { name: 'Vessarine', ground: 'Larkspur Vale' },
    { name: 'Old Bran', ground: 'The Duchy' }
  ],
  party: [],
  hero: 'Maren'
};
const errorsOf = (payload, context) => (validateDmTurn(payload, [], context).errors || []);
const partyErrors = (payload, context) => errorsOf(payload, context).filter((e) => e.includes('party_') || e.includes('elsewhere does not speak'));
const join = (name) => ({ story: { party_join: { name } } });
const leave = (name, remains_at) => ({ story: { party_leave: remains_at === undefined ? { name } : { name, remains_at } } });

// A soul standing at the scene joins lawfully.
assert.deepEqual(partyErrors(join('Corin Voss'), seated), [], 'a soul standing at the scene joins lawfully');
// The elsewhere is refused BY NAME AND GROUND.
assert.ok(partyErrors(join('Vessarine'), seated).some((e) => e.includes('Vessarine last stood in Larkspur Vale')),
  'a join from elsewhere is refused naming the soul and its actual ground');
// Unknown whereabouts cannot be seated.
assert.ok(partyErrors(join('Mara Senn'), seated).some((e) => e.includes('whereabouts unknown')),
  'a join with no lawful sighting is refused as unknown whereabouts');
// The dead do not travel.
assert.ok(errorsOf(join('Old Bran'), seated).some((e) => e.includes('Old Bran is dead and cannot travel')),
  'the dead are refused by name even when they stand at the scene');
// The hero is the root.
assert.ok(errorsOf(join('Maren'), seated).some((e) => e.includes("party's permanent root and is never joined")),
  'joining the hero is refused: the root is not a member');
// Duplicates are refused, alias-aware.
assert.ok(errorsOf(join('Corin'), { ...seated, party: ['Corin Voss'] }).some((e) => e.includes('duplicates a standing member')),
  'a bare first name reaches its standing member and is refused as a duplicate');
// A soul introduced by this same turn's cast_add is exempt from the ground court.
assert.deepEqual(partyErrors({ story: { cast_add: [{ name: 'Sella Ru' }], party_join: { name: 'Sella Ru' } } }, seated).filter((e) => e.includes('party_join')), [],
  'a same-turn walk-on joins without a prior sighting');
// Shape law.
assert.ok(errorsOf({ story: { party_join: ['Corin Voss'] } }, seated).some((e) => e.includes('party_join must be an object with exactly name')), 'an array is refused');
assert.ok(errorsOf({ story: { party_join: { name: 'Corin Voss', extra: 1 } } }, seated).some((e) => e.includes('exactly name')), 'an unknown key is refused');
assert.ok(errorsOf({ story: { party_join: { name: 'Q' } } }, seated).some((e) => e.includes('2-80')), 'a one-letter name is refused');
// Leaving: membership, root, and the remains_at atlas.
const withParty = { ...seated, party: ['Corin Voss'] };
assert.deepEqual(partyErrors(leave('Corin Voss'), withParty), [], 'a member leaves lawfully');
assert.deepEqual(partyErrors(leave('Corin Voss', 'Larkspur Vale'), withParty), [], 'a member leaves pinned to a held region');
assert.ok(errorsOf(leave('Vessarine'), withParty).some((e) => e.includes('names a soul outside the party')), 'leaving a non-member is refused');
assert.ok(errorsOf(leave('Maren'), withParty).some((e) => e.includes('never left')), 'leaving the hero is refused');
assert.ok(errorsOf(leave('Corin Voss', 'The Sunken Court'), withParty).some((e) => e.includes('a region the record does not hold: The Sunken Court')),
  'an unrecorded remains_at is refused by name');
assert.deepEqual(
  partyErrors({ story: { world: { region_add: { name: 'The Sunken Court' } }, party_leave: { name: 'Corin Voss', remains_at: 'The Sunken Court' } } }, withParty), [],
  'a remains_at built by this same turn\u2019s region_add is lawful');
assert.ok(errorsOf({ story: { party_leave: { name: 'Corin Voss', remains_at: 'X' } } }, withParty).some((e) => e.includes('3-100')), 'a two-letter remains_at is refused');

// THE BARE CONTEXT — shape law only, no false attestation.
assert.deepEqual(partyErrors(join('Anyone At All'), { cast: [] }), [], 'an unseated court is silent: no membership, ground, or root findings');
assert.deepEqual(partyErrors(leave('Anyone At All'), { cast: [] }), [], 'an unseated leave court is silent');

// ---------------------------------------------------------------
// II. NOBODY TELEPORTS — the speaker court.
// ---------------------------------------------------------------
const speak = (speaker) => ({ narration_blocks: [{ speaker, text: 'A word.' }], story: null });
assert.ok(errorsOf(speak('Vessarine'), seated).some((e) => e.includes('narration_blocks[0]: the elsewhere does not speak — Vessarine last stood in Larkspur Vale, not The Duchy')),
  'an elsewhere speaker is rejected naming the soul, its ground, and the scene');
assert.deepEqual(partyErrors(speak('Corin Voss'), seated), [], 'a speaker standing at the scene is lawful');
assert.deepEqual(partyErrors(speak('Vessarine'), { ...seated, party: ['Vessarine'] }), [], 'a party member speaks wherever the party stands');
assert.deepEqual(partyErrors(speak('Maren'), seated), [], 'the hero speaks: the root travels with the scene');
assert.deepEqual(partyErrors({ narration_blocks: [{ speaker: 'Sella Ru', text: 'A word.' }], story: { cast_add: [{ name: 'Sella Ru' }] } }, seated), [],
  'a same-turn walk-on speaks without a prior sighting');
assert.ok(errorsOf({ narration_blocks: [], dialogue_cue: { speaker: 'Vessarine', line: 'Pay.' }, story: null }, seated)
  .some((e) => e.includes('dialogue_cue: the elsewhere does not speak')), 'the dialogue cue stands in the same court');
assert.deepEqual(partyErrors(speak('Vessarine'), { cast: seated.cast, regions: seated.regions, scene: seated.scene }), [],
  'without presence AND party arrays the court never seats');
assert.deepEqual(partyErrors(speak('Wren'), { ...seated, presence: [...seated.presence, { name: 'Wren' }] }), [],
  'a soul with unknown ground is never rejected — the law binds only where the record testifies');

// The server door seats these courts from the briefing itself.
const serverInput = {
  entropy: [],
  hero: { name: 'Maren' },
  story: {
    cast: seated.cast, threads_state: [], trove_state: [], purse_state: [],
    regions: seated.regions, scene_state: { region: 'The Duchy', sinceTurn: 1 },
    party_state: [], presence_state: seated.presence, fixture_state: []
  }
};
const judged = judgeTurn(speak('Vessarine'), serverInput);
assert.ok(!judged.ok && judged.errors.some((e) => e.includes('the elsewhere does not speak — Vessarine')),
  'judgeTurn seats the teleport court from party_state/presence_state');
const oldInput = { ...serverInput, story: { ...serverInput.story } };
delete oldInput.story.party_state; delete oldInput.story.presence_state; delete oldInput.story.fixture_state;
assert.ok(judgeTurn(speak('Vessarine'), oldInput).errors.every((e) => !e.includes('elsewhere does not speak')),
  'an older sealed input without the arrays leaves the court unseated');

// ---------------------------------------------------------------
// III. THE FOLD — notes, tick refusals, the root, the remains atlas.
// ---------------------------------------------------------------
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, {
  cast_add: [
    { name: 'Corin Voss', role: 'envoy', visual: 'a clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } },
    { name: 'Edda', role: 'family', visual: 'a grey shawl', goal: 'hold the ferry-house', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } }
  ],
  world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards' } },
  scene_set: { region: 'Larkspur Vale' }
}, { turn: 0, heroName: 'Maren' });
codex = applyStoryUpdates(codex, { party_join: { name: 'Nobody Known' } }, { turn: 1, heroName: 'Maren' });
assert.equal(codex.party.length, 0);
assert.ok(codex.notes.some((n) => n.includes('Nobody Known is not a soul the record knows')), 'an unknown join is a note, never a member');
codex = applyStoryUpdates(codex, { party_join: { name: 'Maren' } }, { turn: 1, heroName: 'Maren' });
assert.ok(codex.notes.some((n) => n.includes("The hero is the party's root")), 'the fold refuses the hero by note');
codex = applyStoryUpdates(codex, { party_join: { name: 'Corin Voss' } }, { turn: 1, heroName: 'Maren' });
assert.deepEqual(codex.party, [{ name: 'Corin Voss', joinedTurn: 1 }], 'a lawful join seats the sealed name with its turn');
codex = applyStoryUpdates(codex, { party_join: { name: 'Corin' } }, { turn: 2, heroName: 'Maren' });
assert.ok(codex.notes.some((n) => n.includes('Duplicate party_join blocked: Corin Voss')), 'the alias reaches the member and is refused as a duplicate');
codex = applyStoryUpdates(codex, { party_join: { name: 'Edda' } }, { turn: 3, tick: true, heroName: 'Maren' });
assert.equal(codex.party.length, 1);
assert.ok(codex.notes.some((n) => n.includes('party_join refused on a tick')), 'the offscreen world may not move the party');
codex = applyStoryUpdates(codex, { party_leave: { name: 'Corin Voss' } }, { turn: 3, tick: true, heroName: 'Maren' });
assert.equal(codex.party.length, 1, 'a tick leave moves nobody');
codex = applyStoryUpdates(codex, { party_leave: { name: 'Edda' } }, { turn: 4, heroName: 'Maren' });
assert.ok(codex.notes.some((n) => n.includes('Edda does not travel with the party')), 'leaving a non-member is a note');
codex = applyStoryUpdates(codex, { party_leave: { name: 'Corin Voss', remains_at: 'The Sunken Court' } }, { turn: 4, heroName: 'Maren' });
assert.equal(codex.party.length, 1, 'an unrecorded remains_at refuses the whole leave — the member stays');
assert.ok(codex.notes.some((n) => n.includes('The Sunken Court is not a region the record knows')));
codex = applyStoryUpdates(codex, { party_leave: { name: 'Corin Voss' } }, { turn: 5, heroName: 'Maren' });
assert.deepEqual(codex.party, [], 'a lawful leave releases the member');
const block = storyBlock(codex);
assert.deepEqual(block.party_state, [], 'party_state rides the block');
assert.ok(Array.isArray(block.fixture_state), 'fixture_state rides the block');

// ---------------------------------------------------------------
// IV. THE REPLAY — partyOf, elsewhereOf, travel, and the pin.
// ---------------------------------------------------------------
const mk = (story, dmExtra = {}) => ({ player: 'x', dm: { narration_blocks: [], story, time_advance: null, ...dmExtra } });
const walkLogs = [
  mk({ cast_add: [{ name: 'Corin Voss' }, { name: 'Edda' }, { name: 'Vessarine' }], world: { region_add: { name: 'Larkspur Vale' } }, scene_set: { region: 'Larkspur Vale' } }),
  mk({ world: { region_add: { name: 'The Duchy' } }, party_join: { name: 'Corin Voss' } }),
  mk({ scene_set: { region: 'The Duchy' } }),
  mk({ party_leave: { name: 'Corin', remains_at: 'Larkspur Vale' } }, { narration_blocks: [{ speaker: 'Corin Voss', text: 'Farewell.' }] })
];
const walk = (n) => ({ hero: { name: 'Maren' }, logs: walkLogs.slice(0, n) });
assert.deepEqual(partyOf(walk(2)), [{ name: 'Corin Voss', cite: 1 }], 'the join row seats the member with its cite');
const traveled = presenceOf(walk(3));
assert.equal(traveled.find((s) => s.name === 'Corin Voss')?.ground, 'The Duchy', 'travel moves the member with the hero');
assert.equal(traveled.find((s) => s.name === 'Corin Voss')?.cite, 2, 'cited to the travel row');
assert.equal(traveled.find((s) => s.name === 'Edda')?.ground, 'Larkspur Vale', 'a non-member stays exactly where the record stood her');
const pinned = presenceOf(walk(4));
assert.equal(pinned.find((s) => s.name === 'Corin Voss')?.ground, 'Larkspur Vale',
  'the leave pins remains_at — a farewell spoken in the leaving turn un-pins nobody');
assert.deepEqual(partyOf(walk(4)), [], 'the roster is empty after the leave');
// Default pin: no remains_at — the departed soul remains at the standing ground.
const defaultLeave = { hero: { name: 'Maren' }, logs: [walkLogs[0], walkLogs[1], walkLogs[2], mk({ party_leave: { name: 'Corin Voss' } })] };
assert.equal(presenceOf(defaultLeave).find((s) => s.name === 'Corin Voss')?.ground, 'The Duchy', 'an omitted remains_at pins the standing ground');
// The elsewhere: not the hero, not the party, known ground, not the scene.
const elsewhere = elsewhereOf(walk(4));
assert.deepEqual(elsewhere.map((e) => `${e.name}@${e.ground}`), ['Corin Voss@Larkspur Vale', 'Edda@Larkspur Vale', 'Vessarine@Larkspur Vale'],
  'most recently cited first, then by name');
assert.equal(elsewhere[0].cite, 3, 'the pin row is the cite');
assert.ok(elsewhereOf(walk(3)).every((e) => e.name !== 'Corin Voss'), 'a party member is never elsewhere');
assert.deepEqual(elsewhereOf({ hero: { name: 'Maren' }, logs: [mk({ cast_add: [{ name: 'Edda' }] })] }), [], 'nobody is elsewhere of nowhere');
// The strike outranks the party.
const struckJoin = { hero: { name: 'Maren' }, logs: [walkLogs[0], { ...walkLogs[1], redacted: true }, walkLogs[2]] };
assert.deepEqual(partyOf(struckJoin), [], 'a struck join row proves no membership');
assert.equal(presenceOf(struckJoin).find((s) => s.name === 'Corin Voss')?.ground, 'Larkspur Vale', 'and the un-joined soul does not travel');
// Fail-closed: mangled shapes prove nothing and never throw.
for (const bad of [7, ['x'], { name: 7 }, {}, { name: '' }]) {
  const mangled = { hero: { name: 'Maren' }, logs: [walkLogs[0], mk({ party_join: bad }), mk({ party_leave: bad })] };
  assert.deepEqual(partyOf(mangled), [], `a mangled party op proves nothing: ${JSON.stringify(bad)}`);
}
assert.deepEqual(partyOf({ hero: { name: 'Maren' }, logs: 'not-an-array' }), [], 'a record without rows answers empty');
assert.deepEqual(elsewhereOf({}), [], 'an empty record answers empty');
assert.equal(JSON.stringify(partyOf(walk(4))), JSON.stringify(partyOf(walk(4))), 'deterministic roster');
assert.equal(JSON.stringify(elsewhereOf(walk(4))), JSON.stringify(elsewhereOf(walk(4))), 'deterministic elsewhere');

// ---------------------------------------------------------------
// V. THE BRIEFING — traveling_with never trims; the elsewhere falls first.
// ---------------------------------------------------------------
let briefCodex = initCodex('classic-epic');
briefCodex = applyStoryUpdates(briefCodex, {
  cast_add: [
    { name: 'Corin Voss', role: 'envoy of the Duchy', visual: 'a clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } },
    { name: 'Edda', role: 'family', visual: 'a grey shawl', goal: 'hold the ferry-house', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } },
    { name: 'Vessarine', role: 'villain', visual: 'a crown of iron pins', goal: 'call in every debt', voice_card: { gender: 'feminine', age: 'adult', timbre: 'cold' } }
  ],
  world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards' } },
  scene_set: { region: 'Larkspur Vale' }
}, { turn: 0, heroName: 'Maren' });
briefCodex = applyStoryUpdates(briefCodex, { world: { region_add: { name: 'The Duchy', visual: 'slate towers' } }, scene_set: { region: 'The Duchy' }, party_join: { name: 'Corin Voss' } }, { turn: 1, heroName: 'Maren' });
const briefCampaign = { hero: { name: 'Maren' }, codex: briefCodex, logs: [
  mk({ cast_add: [{ name: 'Corin Voss' }, { name: 'Edda' }, { name: 'Vessarine' }], world: { region_add: { name: 'Larkspur Vale' } }, scene_set: { region: 'Larkspur Vale' } }),
  { player: 'x', dm: { narration_blocks: [], story: { world: { region_add: { name: 'The Duchy' } }, scene_set: { region: 'The Duchy' }, party_join: { name: 'Corin Voss' } }, time_advance: { unit: 'days', n: 1 } } }
] };
const fullBrief = buildBriefing(briefCampaign);
assert.deepEqual(fullBrief.traveling_with, ['Corin Voss — joined turn 1'], 'the roster line carries the joining turn');
assert.deepEqual(fullBrief.elsewhere, ['Edda — in Larkspur Vale', 'Vessarine — in Larkspur Vale'], 'the elsewhere names the absent and their ground');
assert.ok(Array.isArray(fullBrief.presence_state) && fullBrief.presence_state.some((e) => e.name === 'Edda' && e.ground === 'Larkspur Vale'),
  'presence_state rides the pack in full');
assert.deepEqual(buildBriefing(briefCampaign), fullBrief, 'same campaign, same bytes');
// Famine: one byte under full size drops exactly one elsewhere entry FIRST.
const fullSize = JSON.stringify(fullBrief).length;
const starved = buildBriefing(briefCampaign, { budget: fullSize - 1 });
assert.equal(starved.elsewhere.length, fullBrief.elsewhere.length - 1, 'the elsewhere falls first, entry by entry');
assert.deepEqual(starved.stated_allegiances, fullBrief.stated_allegiances, 'the allegiances stand while the elsewhere still falls');
assert.deepEqual(starved.traveling_with, fullBrief.traveling_with, 'the roster does not fall');
const famine = buildBriefing(briefCampaign, { budget: 10 });
assert.ok(Array.isArray(famine.traveling_with), 'traveling_with survives total famine');
assert.equal(famine.elsewhere, undefined, 'a starved elsewhere is honestly absent, never empty-stringed');
// An empty roster is an honest empty list, always present.
const aloneBrief = buildBriefing({ hero: { name: 'Maren' }, codex: initCodex('classic-epic'), logs: [] });
assert.deepEqual(aloneBrief.traveling_with, [], 'the hero walks alone, said plainly');

// ---------------------------------------------------------------
// VI. THE SCHEMA MIRROR — the model sees the law it is judged by.
// ---------------------------------------------------------------
const serverSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
for (const needle of ["party_join", "party_leave", "remains_at", "minLength: 2, maxLength: 80", "The hero is never joined", "The hero is never left"]) {
  assert.ok(serverSource.includes(needle), `the tool schema mirrors the door: ${needle}`);
}

console.log('PASS — the party gate: four courts at the door, nobody teleports, the fold refuses ticks, the replay pins the departed, the roster never trims, and the elsewhere falls first.');
