// THE HOOKED-WORLD GATE — the capstone. Six laws, one sealed record, no
// contradictions: the same operations that move the codex are the ones
// the calendar folds, the atlas cites, the thread ledger replays, the
// briefing carries, and the visual bible paints. If any two derivations
// disagree about the record, this gate fails.
import assert from 'node:assert/strict';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';
import { buildBriefing } from '../src/lib/graph.js';
import { calendarOf } from '../src/lib/calendar.js';
import { threadsOf, openThreadsOf } from '../src/lib/threads.js';
import { placesOf, allegiancesOf } from '../src/lib/atlas.js';
import { scenePrompt, identityClause } from '../src/lib/cinema/prompts.js';

let codex = initCodex('classic-epic');
const op1 = { cast_add: [{ name: 'Corin Voss', role: 'envoy of the Duchy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } }], thread_add: [{ label: 'The Whitespan treaty must be read', kind: 'goal', holder: 'Maren' }], world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards under chalk' } } };
const op2 = { thread_resolve: [{ label: 'the whitespan treaty must be read', outcome: 'kept' }], thread_add: [{ label: 'Corin owes Edda restitution', kind: 'debt', holder: 'Corin Voss' }] };
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

// One atlas. The place cites its sealing turn; the sworn edge rides the briefing.
assert.equal(placesOf(campaign)[0].discoveredTurn, 0);
assert.equal(allegiancesOf(codex.cast)[0].of, 'the Duchy');
assert.ok(briefing.stated_allegiances[0].includes('sworn of the Duchy (stated)'));

// One face. The scene paints the card the codex sealed.
const soul = codex.cast.find((entry) => entry.name === 'Corin Voss');
const scene = scenePrompt({ ...campaign, styleBible: 'BIBLE' }, { subjects: ['Corin Voss'], region: 'Larkspur Vale', mood: 'dusk' });
assert.ok(scene.includes(identityClause(soul)), 'the prompt carries the exact clause of the sealed card');
assert.ok(scene.includes('a man;') && scene.includes('clipped grey coat'));
console.log('PASS — the hooked-world gate: one record, six laws, no contradictions between the calendar, the ledger, the atlas, the briefing, and the paint.');
