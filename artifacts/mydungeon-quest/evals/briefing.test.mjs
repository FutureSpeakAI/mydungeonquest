// THE BRIEFING GATE — the DM is told one deterministic object each turn:
// the calendar line first, the scene-first pack (open threads riding
// inside the block), stated allegiances last and trimmed first. Same
// campaign, same bytes; the budget is a hard cap; the floors never trim.
import assert from 'node:assert/strict';
import { buildBriefing } from '../src/lib/graph.js';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';

let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, {
  cast_add: [
    { name: 'Corin Voss', role: 'envoy of the Duchy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } },
    { name: 'Edda', role: 'family', visual: 'a grey shawl', goal: 'hold the ferry-house', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } }
  ],
  thread_add: [{ label: 'Find the sunken bell', kind: 'mystery', holder: 'Maren' }],
  world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards', blurb: 'orchards' } }
});
const campaign = { hero: { name: 'Maren' }, codex, logs: [
  { id: 't1', dm: { time_advance: { unit: 'days', n: 2 }, narration_blocks: [{ speaker: 'Corin Voss', text: 'The river keeps its own ledger.' }], story: null } }
] };

const briefing = buildBriefing(campaign);
assert.equal(briefing.calendar, 'It is Day 3 of the tale.');
assert.ok(JSON.stringify(briefing).startsWith('{"calendar":"It is Day'), 'the calendar line lands first');
assert.ok(briefing.open_threads.some((line) => line.includes('Find the sunken bell (mystery')), 'the tale\u2019s debts ride to the DM');
assert.ok(briefing.stated_allegiances.some((line) => line.includes('Corin Voss') && line.includes('the Duchy')), 'stated allegiances ride, provenance worn');
assert.equal(JSON.stringify(briefing), JSON.stringify(buildBriefing(campaign)), 'same campaign, same bytes');
assert.ok(JSON.stringify(briefing).length <= 7800, 'the budget is a hard cap');

const tiny = buildBriefing(campaign, { budget: 120 });
assert.equal(tiny.stated_allegiances.length, 0, 'allegiances trim first under pressure');
assert.ok(tiny.calendar && tiny.beat, 'the calendar and the beat never trim');
assert.ok(tiny.open_threads.length >= 1, 'open threads never trim');
console.log('PASS — the briefing gate: calendar first, threads and allegiances ride, deterministic bytes, a hard budget, and floors that never trim.');
