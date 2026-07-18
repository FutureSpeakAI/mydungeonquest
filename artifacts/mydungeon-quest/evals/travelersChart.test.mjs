// ---- THE TRAVELER'S CHART (Task 58C — Directive XIV, the Chart Law) ----
//
// The chart is testimony, not decoration. Medallions stand only for
// regions the sealed record itself added, cited to their discovery
// rows. Roads exist ONLY where the record proves the party lawfully
// changed ground — struck rows, unknown regions, and restatements of
// the standing scene prove nothing. Every crossing is costed by the
// calendar fold alone; identical costs on one road are spoken once.
// The layout is deterministic: the same tale always draws the same
// chart, byte for byte. Beyond the known regions the vellum stays
// blank. Pure fold, zero tokens, keyless — nothing here commissions
// paint.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chartOf, chartRegions, dayLabel, travelsOf } from 'fatescript/chart';

const regionAdd = (turn, name) => ({ turn, redacted: false, player: `learn of ${name}`, dm: { story: { world: { region_add: { name } } } } });
const sceneSet = (turn, name, extra = {}) => ({ turn, redacted: false, player: `walk to ${name}`, dm: { story: { scene_set: { region: name } } }, ...extra });
const dayRide = (turn, n = 1) => ({ turn, redacted: false, player: 'ride on', dm: { story: {}, time_advance: { unit: 'days', n } } });
const twoRegions = [{ id: 'a', name: 'Larkspur Vale', state: 'unmapped', visual: 'A river vale in the north' }, { id: 'b', name: 'The Duchy', state: 'unmapped', visual: 'A walled seat in the east' }];
const campaignOf = (logs, regions = twoRegions) => ({ hero: { name: 'Maren' }, codex: { regions }, logs });

// ---- 1. A cost, spoken ----
assert.equal(dayLabel(0), 'within the day', 'a same-day crossing says so plainly');
assert.equal(dayLabel(1), '1 day', 'one day is singular');
assert.equal(dayLabel(3), '3 days', 'many days are plural');
assert.equal(dayLabel(NaN), 'within the day', 'a nonsense delta is never spoken as a number');

// ---- 2. Refusals: the record's silence is the chart's silence ----
{
  // A struck crossing proves nothing.
  const struck = travelsOf(campaignOf([regionAdd(0, 'Larkspur Vale'), regionAdd(1, 'The Duchy'), sceneSet(2, 'Larkspur Vale'), { ...sceneSet(3, 'The Duchy'), redacted: true }]));
  assert.equal(struck.ground, 'Larkspur Vale', 'the ground ignores the struck ride');
  assert.deepEqual(struck.roads, [], 'a struck scene builds no road');
  assert.equal(struck.route.length, 1, 'the route holds only the lawful stand');

  // A scene on a region the record does not hold is refused.
  const unknown = travelsOf(campaignOf([regionAdd(0, 'Larkspur Vale'), sceneSet(1, 'Larkspur Vale'), sceneSet(2, 'The Mirelands')]));
  assert.equal(unknown.ground, 'Larkspur Vale', 'an unknown region cannot take the ground');
  assert.deepEqual(unknown.roads, [], 'an unknown region builds no road');

  // A restatement of the standing ground moves nobody and draws nothing.
  const restated = travelsOf(campaignOf([regionAdd(0, 'Larkspur Vale'), sceneSet(1, 'Larkspur Vale'), sceneSet(2, 'Larkspur Vale')]));
  assert.deepEqual(restated.roads, [], 'a restatement is not a journey');
  assert.equal(restated.route.length, 1, 'the route records one stand, not two');
}

// ---- 3. Costs: the calendar fold alone, identical costs spoken once ----
{
  // The house idiom: one turn carries its narration, its time, and its
  // scene together — the crossing's cost is the time that passed ON the
  // arrival row. Time spent camped BEFORE a ride belongs to the camp,
  // not the road (court 3b below).
  const rideSet = (turn, name, n) => ({ turn, redacted: false, player: `ride to ${name}`, dm: { story: { scene_set: { region: name } }, time_advance: { unit: 'days', n } } });
  const logs = [regionAdd(0, 'Larkspur Vale'), regionAdd(1, 'The Duchy'), sceneSet(2, 'Larkspur Vale'),
    sceneSet(3, 'The Duchy'), // same-day crossing
    rideSet(4, 'Larkspur Vale', 2), // two-day return
    rideSet(5, 'The Duchy', 1), rideSet(6, 'Larkspur Vale', 1)]; // 1 day out, 1 day home
  const { roads } = travelsOf(campaignOf(logs));
  assert.equal(roads.length, 1, 'one undirected road carries every crossing between the pair');
  assert.equal(roads[0].crossings.length, 4, 'four crossings sealed');
  assert.deepEqual(roads[0].crossings.map((crossing) => crossing.days), [0, 2, 1, 1], 'each crossing costed by the calendar fold alone');
  assert.equal(roads[0].label, 'within the day · 2 days · 1 day', 'costs spoken in crossing order, identical costs spoken once');
}

// ---- 4. Blank vellum: known regions, no journeys ----
{
  const chart = chartOf(campaignOf([regionAdd(0, 'Larkspur Vale'), regionAdd(1, 'The Duchy')]));
  assert.equal(chart.medallions.length, 2, 'both known regions stand as medallions');
  assert.deepEqual(chart.roads, [], 'no journey, no roads — the vellum does not guess');
  assert.deepEqual(chart.route, [], 'no stand, no route');
  assert.equal(chart.ground, null, 'no scene has stood');
  assert.equal(new Set(chart.medallions.map((m) => `${m.x}:${m.y}`)).size, 2, 'the atlas fold seats each medallion on its own ground');
}

// ---- 5. The one seat of placement ----
{
  const placed = chartRegions({ codex: { regions: [{ id: 'a', name: 'A', place: 'north of the river', visual: 'gibberish beyond parsing' }, { id: 'b', name: 'B', place: '', visual: 'gibberish beyond parsing' }] } });
  assert.equal(placed[0].place, 'north of the river', 'a card\'s own place phrase is honored first');
  assert.equal(placed[1].place, '', 'an unparseable visual places nothing — no guessing');
  assert.equal(placed[0].name, 'A', 'the card rides whole through the fold');
}

// ---- 6. The fixture court: the proving campaign's own truths ----
{
  const fx = JSON.parse(readFileSync(new URL('../tests/e2e/fixtures/proving-campaign.json', import.meta.url), 'utf8'));
  const logs = fx.turns.map((turn, i) => ({ ...turn, redacted: !!turn.struck, turn: i }));
  const regions = [];
  for (const turn of fx.turns) {
    const add = turn.dm?.story?.world?.region_add;
    if (add?.name) regions.push({ id: add.name, name: add.name, state: add.state || 'unmapped', visual: add.visual || '' });
  }
  const campaign = { hero: { name: fx.hero.name }, codex: { regions }, logs };
  const travels = travelsOf(campaign);
  assert.equal(travels.ground, 'Larkspur Vale', 'the record ends on the homecoming ground');
  assert.deepEqual(travels.route.map((stand) => stand.ground), ['Larkspur Vale', 'The Duchy', 'Larkspur Vale'], 'the route is the played order');
  assert.deepEqual(travels.route.map((stand) => stand.index), [0, 5, 7], 'each stand cites its sealed row');
  assert.equal(travels.roads.length, 1, 'one road: the Vale and the Duchy');
  assert.deepEqual(travels.roads[0].crossings.map((crossing) => crossing.days), [1, 1], 'both crossings cost one day');
  assert.equal(travels.roads[0].label, '1 day', 'identical costs are spoken once');

  const chart = chartOf(campaign);
  assert.equal(chart.medallions.length, 2, 'two medallions, no inventions');
  assert.deepEqual(chart.medallions.map((m) => m.discoveredTurn), [0, 1], 'each medallion cites its discovery row');
  assert.deepEqual(chart.medallions.filter((m) => m.current).map((m) => m.name), ['Larkspur Vale'], 'the current ground wears the mark');
  assert.equal(chart.roads.length, 1, 'the drawn road matches the sealed one');
  assert.equal(chart.roads[0].label, '1 day', 'the drawn road speaks the sealed cost');
  assert.equal(JSON.stringify(chartOf(JSON.parse(JSON.stringify(campaign)))), JSON.stringify(chart), 'the chart is byte-deterministic across folds');
}

console.log('PASS — the traveler\'s chart: roads only from lawful crossings, costs from the calendar alone, refusals hold, the vellum never guesses');
