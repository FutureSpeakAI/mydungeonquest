// THE WATCH GATE (Directive VIII.8) — the day divides into six named
// watches, four hours each, and the one calendar line wears the watch the
// sealed hours prove. The briefing carries it (and famine never starves
// it); the plate rides it beneath the beat and the mood; the keyless mock
// walks the clock through four watches of the first day. Deterministic,
// fail-closed on hours that are not lawful integers.
import assert from 'node:assert/strict';
import { WATCHES, watchOf, calendarOf, calendarLine } from '../src/lib/calendar.js';
import { buildBriefing } from '../src/lib/graph.js';
import { scenePrompt } from '../src/lib/cinema/prompts.js';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';
import { makeEntropy } from '../src/lib/protocol.js';
import { mockDmTurn } from 'fatescript/mockDm';
import { createHero } from 'fatescript/rules';

// ---------------------------------------------------------------
// I. THE TABLE — all twenty-four hours, all six watches, no gaps.
// ---------------------------------------------------------------
const expected = [
  'deep night', 'deep night', 'deep night', 'deep night',
  'dawn', 'dawn', 'dawn', 'dawn',
  'morning', 'morning', 'morning', 'morning',
  'afternoon', 'afternoon', 'afternoon', 'afternoon',
  'dusk', 'dusk', 'dusk', 'dusk',
  'night', 'night', 'night', 'night'
];
for (let h = 0; h < 24; h += 1) assert.equal(watchOf(h), expected[h], `hour ${h} stands in the ${expected[h]} watch`);
assert.ok(Array.isArray(WATCHES) && WATCHES.length === 6, 'six watches stand the day');
assert.equal(new Set(expected).size, 6, 'and the table walks all six');
// The boundaries hold exactly.
assert.equal(watchOf(3), 'deep night'); assert.equal(watchOf(4), 'dawn');
assert.equal(watchOf(19), 'dusk'); assert.equal(watchOf(20), 'night');
assert.equal(watchOf(23), 'night');
// The clock wraps and refuses nonsense honestly.
assert.equal(watchOf(24), 'deep night', 'hour 24 wraps to the deep night');
assert.equal(watchOf(27), 'deep night', 'the wrap is mod-24');
assert.equal(watchOf(1.5), 'deep night', 'a fractional hour fails closed to the deep night');
assert.equal(watchOf('midnightish'), 'deep night', 'a non-number fails closed to the deep night');

// ---------------------------------------------------------------
// II. THE LINE — one sentence, day and watch together.
// ---------------------------------------------------------------
const t = (advance) => ({ dm: { time_advance: advance } });
assert.equal(calendarLine([]), 'It is Day 1 of the tale, in the deep night watch.', 'the tale opens in the deep night');
assert.equal(calendarLine([t({ unit: 'hours', n: 17 })]), 'It is Day 1 of the tale, in the dusk watch.');
assert.equal(calendarLine([t({ unit: 'days', n: 2 }), t({ unit: 'hours', n: 9 })]), 'It is Day 3 of the tale, in the morning watch.', 'days ride, hours place the watch');

// ---------------------------------------------------------------
// III. THE BRIEFING — the first key wears the watch; famine never eats it.
// ---------------------------------------------------------------
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards' } }, scene_set: { region: 'Larkspur Vale' } }, { turn: 0 });
const campaign = { hero: { name: 'Maren' }, codex, logs: [t({ unit: 'hours', n: 21 })] };
const briefing = buildBriefing(campaign);
assert.equal(briefing.calendar, 'It is Day 1 of the tale, in the night watch.');
assert.ok(JSON.stringify(briefing).startsWith('{"calendar":"It is Day 1 of the tale, in the night watch.'), 'the watch rides the briefing\u2019s first key');
assert.equal(buildBriefing(campaign, { budget: 10 }).calendar, 'It is Day 1 of the tale, in the night watch.', 'total famine never starves the calendar');

// ---------------------------------------------------------------
// IV. THE PLATE — the watch rides the paint, and the hours change it.
// ---------------------------------------------------------------
const plateCampaign = (hours) => ({ hero: { name: 'Maren' }, styleBible: 'BIBLE', codex, logs: [t({ unit: 'hours', n: hours })] });
const dawnPlate = scenePrompt(plateCampaign(5), { subjects: [], region: 'Larkspur Vale', mood: 'a ride at first light' });
assert.ok(dawnPlate.includes('The watch of the day is dawn.'), 'the plate rides the watch');
const duskPlate = scenePrompt(plateCampaign(17), { subjects: [], region: 'Larkspur Vale', mood: 'a ride at first light' });
assert.ok(duskPlate.includes('The watch of the day is dusk.'), 'seventeen hours later the plate rides dusk');
assert.notEqual(dawnPlate, duskPlate, 'the hours alone change the plate');
assert.equal(dawnPlate, scenePrompt(plateCampaign(5), { subjects: [], region: 'Larkspur Vale', mood: 'a ride at first light' }), 'same hours, same bytes');

// ---------------------------------------------------------------
// V. THE MOCK WALKS — four advances, four watches, one first day.
// ---------------------------------------------------------------
const hero = createHero({});
const entropy = makeEntropy(() => 0.5);
const advances = [];
for (let turn = 0; turn <= 7; turn += 1) {
  const dm = mockDmTurn({ campaign: { title: 'x', homeRegion: 'Larkspur Vale' }, hero, story: { beat: { title: 'x' }, regions: [] }, player: 'walk', entropy, resolution: null, turn });
  if (turn === 0) assert.equal(dm.story.fixture_add?.name, 'The Waystation Bell', 'the genesis turn seals the waystation bell');
  else assert.equal(dm.story?.fixture_add ?? null, null, 'later mock turns seal nothing');
  if (dm.time_advance) advances.push(dm.time_advance);
}
assert.deepEqual(advances, [
  { unit: 'hours', n: 1 }, { unit: 'hours', n: 5 }, { unit: 'hours', n: 2 }, { unit: 'hours', n: 6 }
], 'the script rides exactly four sealed advances');
const acc = []; const walk = [];
for (const advance of advances) { acc.push(t(advance)); walk.push(watchOf(calendarOf(acc).hours)); }
assert.deepEqual(walk, ['deep night', 'dawn', 'morning', 'afternoon'], 'the keyless table walks four watches');
assert.equal(calendarOf(acc).day, 1, 'and never leaves the first day');

console.log('PASS — the watch gate: six watches stand the day, the line and the briefing wear them, the plate rides them, and the keyless mock walks four before dusk.');
