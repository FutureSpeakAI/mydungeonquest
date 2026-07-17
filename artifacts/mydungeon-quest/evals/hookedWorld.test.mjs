// THE HOOKED-WORLD GATE — the capstone. Seven laws, one sealed record, no
// contradictions: the same operations that move the codex are the ones
// the calendar folds, the atlas cites, the thread ledger replays, the
// briefing carries, the presence replay stands upon, and the visual bible
// paints. If any two derivations disagree about the record, this gate
// fails.
import assert from 'node:assert/strict';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';
import { buildBriefing } from '../src/lib/graph.js';
import { calendarOf } from '../src/lib/calendar.js';
import { threadsOf, openThreadsOf } from '../src/lib/threads.js';
import { placesOf, allegiancesOf } from '../src/lib/atlas.js';
import { scenePrompt, identityClause } from '../src/lib/cinema/prompts.js';
import { troveOf, purseOf } from '../src/lib/trove.js';
import { presenceOf, visitorsOf } from '../src/lib/presence.js';

let codex = initCodex('classic-epic');
const op1 = { cast_add: [{ name: 'Corin Voss', role: 'envoy of the Duchy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } }], thread_add: [{ label: 'The Whitespan treaty must be read', kind: 'goal', holder: 'Maren' }], world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards under chalk' } }, scene_set: { region: 'Larkspur Vale' }, item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Maren' }], purse: [{ holder: 'Maren', delta: 30, reason: 'Back pay counted at the waystation' }] };
const op2 = { thread_resolve: [{ label: 'the whitespan treaty must be read', outcome: 'kept' }], thread_add: [{ label: 'Corin owes Edda restitution', kind: 'debt', holder: 'Corin Voss' }], item_transfer: [{ name: 'the ferry ledger', from: 'Maren', to: 'Edda' }], purse: [{ holder: 'Maren', delta: -12, reason: 'Paid the road toll' }] };
codex = applyStoryUpdates(codex, op1);
codex = applyStoryUpdates(codex, op2);
const campaign = { hero: { name: 'Maren' }, codex, logs: [
  { id: 't1', player: 'I ride for the vale.', dm: { time_advance: { unit: 'days', n: 1 }, narration_blocks: [{ speaker: 'Corin Voss', text: 'The river keeps its own ledger.' }], story: op1 } },
  { id: 't2', player: 'I read the stone aloud.', dm: { time_advance: { unit: 'hours', n: 26 }, narration_blocks: [], story: op2 } }
] };

// One clock. The briefing's day is the calendar's day.
const briefing = buildBriefing(campaign);
assert.equal(briefing.calendar, `It is Day ${calendarOf(campaign.logs).day} of the tale.`);
assert.equal(calendarOf(campaign.logs).day, 3, 'one day ridden, twenty-six hours read');

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
// ground line, and the presence replay stand on the same region.
assert.equal(codex.scene.region, 'Larkspur Vale', 'the fold seats the scene the genesis op set');
assert.equal(briefing.scene_ground, 'The scene stands in Larkspur Vale — terraced orchards under chalk', 'the briefing names the same ground byte-exact');
assert.equal(Object.keys(briefing)[1], 'scene_ground', 'and names it second, right after the calendar');
assert.deepEqual(visitorsOf(campaign, 'Larkspur Vale').standing.map((soul) => soul.name), ['Corin Voss', 'Edda', 'Maren'], 'the replay stands the whole table on the sealed ground');
assert.ok(presenceOf(campaign).every((soul) => soul.ground === 'Larkspur Vale'), 'nobody has left the vale');

// One face. The scene paints the card the codex sealed.
const soul = codex.cast.find((entry) => entry.name === 'Corin Voss');
const scene = scenePrompt({ ...campaign, styleBible: 'BIBLE' }, { subjects: ['Corin Voss'], region: 'Larkspur Vale', mood: 'dusk' });
assert.ok(scene.includes(identityClause(soul)), 'the prompt carries the exact clause of the sealed card');
assert.ok(scene.includes('a man;') && scene.includes('clipped grey coat'));
console.log('PASS — the hooked-world gate: one record, seven laws, no contradictions between the calendar, the ledger, the atlas, the briefing, the ground, and the paint.');
