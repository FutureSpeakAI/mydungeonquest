// THE HOOKED-WORLD GATE (engine twin, pure fraction) — the capstone.
// Eight laws, one sealed record, no contradictions: the same operations
// that move the codex are the ones the calendar folds, the atlas cites,
// the thread ledger replays, the briefing carries, the presence replay
// stands upon, and the visual bible paints. If any two derivations
// disagree about the record, this gate fails.
import assert from 'node:assert/strict';
import { applyStoryUpdates, initCodex } from '../src/story.js';
import { buildBriefing } from '../src/graph.js';
import { calendarOf, watchOf } from '../src/calendar.js';
import { threadsOf, openThreadsOf } from '../src/threads.js';
import { placesOf, allegiancesOf } from '../src/atlas.js';
import { scenePrompt, identityClause } from '../src/cinema/prompts.js';
import { troveOf, purseOf } from '../src/trove.js';
import { presenceOf, visitorsOf, partyOf, elsewhereOf } from '../src/presence.js';

let codex = initCodex('classic-epic');
const op1 = { cast_add: [{ name: 'Corin Voss', role: 'envoy of the Duchy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } }], thread_add: [{ label: 'The Whitespan treaty must be read', kind: 'goal', holder: 'Maren' }], world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards under chalk' } }, scene_set: { region: 'Larkspur Vale' }, item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Maren' }], purse: [{ holder: 'Maren', delta: 30, reason: 'Back pay counted at the waystation' }] };
const op2 = { thread_resolve: [{ label: 'the whitespan treaty must be read', outcome: 'kept' }], thread_add: [{ label: 'Corin owes Edda restitution', kind: 'debt', holder: 'Corin Voss' }], item_transfer: [{ name: 'the ferry ledger', from: 'Maren', to: 'Edda' }], purse: [{ holder: 'Maren', delta: -12, reason: 'Paid the road toll' }] };
// Task 56B (Directive VIII): the tale grows a third turn — the scene rides
// to a new region, the envoy joins the party, and the gate seals a fixture
// — so the party, the elsewhere, the watch, and the fixture rider are
// proven against the same one record as everything else.
const op3 = { world: { region_add: { name: 'The Duchy', visual: 'slate towers and counting-houses over paved toll roads' } }, scene_set: { region: 'The Duchy' }, party_join: { name: 'Corin Voss' }, fixture_add: { place: 'The Duchy', name: 'The Brass Toll-Scale', visual: 'a man-high brass toll-scale at the gate, its pans worn to mirrors by a century of counted crossings' } };
codex = applyStoryUpdates(codex, op1);
codex = applyStoryUpdates(codex, op2);
codex = applyStoryUpdates(codex, op3, { turn: 2, heroName: 'Maren' });
const campaign = { hero: { name: 'Maren' }, codex, logs: [
  { id: 't1', player: 'I ride for the vale.', dm: { time_advance: { unit: 'days', n: 1 }, narration_blocks: [{ speaker: 'Corin Voss', text: 'The river keeps its own ledger.' }], story: op1 } },
  { id: 't2', player: 'I read the stone aloud.', dm: { time_advance: { unit: 'hours', n: 26 }, narration_blocks: [], story: op2 } },
  { id: 't3', player: 'Ride with me, envoy.', dm: { time_advance: { unit: 'hours', n: 2 }, narration_blocks: [], story: op3 } }
] };

// One clock. The briefing's day is the calendar's day — and the line
// wears the watch the hours prove (Task 56B, assert RE-AIMED to the
// grown bytes: one day ridden, twenty-eight hours read → Day 3, dawn).
const briefing = buildBriefing(campaign);
assert.equal(briefing.calendar, `It is Day ${calendarOf(campaign.logs).day} of the tale, in the ${watchOf(calendarOf(campaign.logs).hours)} watch.`);
assert.equal(briefing.calendar, 'It is Day 3 of the tale, in the dawn watch.', 'byte-exact: the third dawn');
assert.equal(calendarOf(campaign.logs).day, 3, 'one day ridden, twenty-eight hours read');

// One ledger. The codex's open threads are the replay's open threads are the briefing's.
const open = openThreadsOf(campaign);
assert.equal(open.length, 1);
assert.equal(open[0].label, 'Corin owes Edda restitution');
assert.equal(codex.threads.filter((t) => t.status === 'open').length, 1);
assert.ok(briefing.open_threads[0].includes('Corin owes Edda restitution (debt, held by Corin Voss)'));
assert.equal(threadsOf(campaign).find((t) => t.status === 'kept').closedTurn, 1, 'the kept promise cites its closing turn');

// One trove. The codex's fold, the journal's replay, and the briefing's
// wealth line agree on the same coin and the same hands.
const items = troveOf(campaign);
assert.equal(items.length, 1);
assert.equal(items[0].holder, 'Edda');
assert.deepEqual(items[0].chain.map((hand) => hand.holder), ['Maren', 'Edda'], 'the chain remembers both hands');
assert.equal(codex.trove[0].holder, 'Edda', 'fold and replay agree on the hand');
assert.equal(purseOf(campaign, 'Maren').coin, 18);
assert.equal(codex.purses.find((entry) => entry.holder === 'Maren').coin, 18, 'fold and replay agree on the coin');
assert.equal(briefing.hero_wealth, 'Maren carries 18 coin.', 'the briefing speaks the same purse, empty-handed after the gift');

// One atlas. The place cites its sealing turn; the sworn edge rides the briefing.
assert.equal(placesOf(campaign)[0].discoveredTurn, 0);
assert.equal(allegiancesOf(codex.cast)[0].of, 'the Duchy');
assert.ok(briefing.stated_allegiances[0].includes('sworn of the Duchy (stated)'));

// One ground (Directive VII). The fold's standing scene, the briefing's
// ground line, and the presence replay stand on the same region. Task 56B
// RE-AIMED: the third turn moved the scene to the Duchy — the party rode
// with the hero, and Edda stayed exactly where the record stood her.
assert.equal(codex.scene.region, 'The Duchy', 'the fold seats the scene the third turn set');
assert.equal(briefing.scene_ground, 'The scene stands in The Duchy — slate towers and counting-houses over paved toll roads', 'the briefing names the same ground byte-exact');
assert.equal(Object.keys(briefing)[1], 'scene_ground', 'and names it second, right after the calendar');
assert.deepEqual(visitorsOf(campaign, 'Larkspur Vale').standing.map((soul) => soul.name), ['Edda'], 'only the one who stayed still stands in the vale');
assert.deepEqual(visitorsOf(campaign, 'Larkspur Vale').former.map((soul) => soul.name), ['Corin Voss', 'Maren'], 'the riders are its former visitors, cited');
assert.deepEqual(visitorsOf(campaign, 'The Duchy').standing.map((soul) => soul.name), ['Corin Voss', 'Maren'], 'the party stands together on the new ground');

// One party (Directive VIII). The fold's roster, the replay's roster, and
// the briefing's traveling_with line agree; the elsewhere names the one
// soul the tale left behind, and the plate rides the sealed fixture under
// the watch of the day.
assert.deepEqual(codex.party, [{ name: 'Corin Voss', joinedTurn: 2 }], 'the fold seats the envoy with his joining turn');
assert.deepEqual(partyOf(campaign).map((member) => member.name), ['Corin Voss'], 'the replay proves the same roster');
assert.deepEqual(briefing.traveling_with, ['Corin Voss — joined turn 2'], 'the briefing speaks the same roster');
assert.deepEqual(elsewhereOf(campaign).map((entry) => `${entry.name}@${entry.ground}`), ['Edda@Larkspur Vale'], 'the elsewhere holds the one who stayed');
assert.deepEqual(briefing.elsewhere, ['Edda — in Larkspur Vale'], 'and the briefing names her honestly, no since-clause without a turn');
assert.deepEqual(codex.fixtures, [{ place: 'The Duchy', name: 'The Brass Toll-Scale', visual: 'a man-high brass toll-scale at the gate, its pans worn to mirrors by a century of counted crossings', since: 2 }], 'the fixture sealed with its turn');
const duchyPlate = scenePrompt({ ...campaign, styleBible: 'BIBLE' }, { subjects: [], region: 'The Duchy', mood: 'dusk' });
assert.ok(duchyPlate.includes('The Brass Toll-Scale — a man-high brass toll-scale at the gate'), 'the plate rides the sealed fixture');
assert.ok(duchyPlate.includes('The watch of the day is dawn.'), 'the plate rides the watch the calendar proves');

// One face. The scene paints the card the codex sealed.
const soul = codex.cast.find((entry) => entry.name === 'Corin Voss');
const scene = scenePrompt({ ...campaign, styleBible: 'BIBLE' }, { subjects: ['Corin Voss'], region: 'Larkspur Vale', mood: 'dusk' });
assert.ok(scene.includes(identityClause(soul)), 'the prompt carries the exact clause of the sealed card');
assert.ok(scene.includes('a man;') && scene.includes('clipped grey coat'));

// (presenceOf is imported to prove the seat resolves; visitorsOf/partyOf/
// elsewhereOf above already exercise the replay it heads.)
assert.ok(typeof presenceOf === 'function', 'the presence replay seat resolves');
console.log('PASS — the hooked-world gate (engine twin, pure fraction): one record, eight laws, no contradictions between the calendar, the ledger, the atlas, the briefing, the ground, the party, and the paint.');
