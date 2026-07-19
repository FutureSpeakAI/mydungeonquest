// ---- THE TABLE LAW (engine twin, the pure fraction) ----
//
// The play surface carries EXACTLY FOUR chips, a closed set folded pure
// from the sealed record: the day and its watch, the standing ground,
// the party's faces, the hero's health. AC, gold, XP, and blight copy
// leave the table — the book keeps them. The initiative tracker's
// presence is bound to the sealed combat state's own flag and nothing
// else. Every chip refuses to guess: no scene means the chip says so,
// absent vitals are unmeasured (never 0/0), an empty party is spoken
// plainly. Pure fold, zero tokens, keyless. The rendered chip row is
// React and is judged at the table's own gate.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHIP_ORDER, tableOf } from '../src/table.js';

const FIXTURE_URL = new URL('./fixtures/proving-campaign.json', import.meta.url);

const IDS = ['calendar', 'ground', 'party', 'health'];

const dayRide = (turn, n = 1) => ({ turn, redacted: false, player: 'ride on', dm: { story: {}, time_advance: { unit: 'days', n } } });
const regionAdd = (turn, name) => ({ turn, redacted: false, player: `learn of ${name}`, dm: { story: { world: { region_add: { name } } } } });
const sceneSet = (turn, name) => ({ turn, redacted: false, player: `walk to ${name}`, dm: { story: { scene_set: { region: name } } } });

// ---- 1. The closed set itself ----
assert.deepEqual(CHIP_ORDER, IDS, 'the chip order is the directive\'s own: calendar, ground, party, health');

// ---- 2. The empty tale: four chips, honest words, no tracker ----
{
  const table = tableOf({ hero: { name: 'Maren' }, codex: { regions: [] }, logs: [] });
  assert.deepEqual(table.chips.map((chip) => chip.id), IDS, 'four chips stand on an empty tale');
  assert.equal(table.chips.length, 4, 'exactly four — a fifth chip requires amending the directive');
  assert.equal(table.chips[0].words, 'Day 1 · deep night', 'the calendar opens on Day 1, deep night');
  assert.equal(table.chips[1].words, 'The tale has not yet set a scene', 'the ground refuses to guess before a scene stands');
  assert.equal(table.chips[1].name, null, 'no ground is named');
  assert.equal(table.chips[2].words, 'The hero travels alone', 'the empty party is spoken plainly');
  assert.equal(table.chips[3].words, 'unmeasured', 'absent vitals are unmeasured — never 0/0');
  assert.equal(table.tracker, false, 'no battle, no tracker');
}

// ---- 3. Vitals: measured means both numbers are numbers ----
{
  const at = (hero) => tableOf({ hero, codex: { regions: [] }, logs: [] }).chips[3];
  assert.equal(at({ name: 'M', hp: 7, maxHp: 11 }).words, '7/11', 'measured vitals speak as hp/maxHp');
  assert.equal(at({ name: 'M', hp: 0, maxHp: 11 }).words, '0/11', 'a measured zero is spoken, not hidden');
  assert.equal(at({ name: 'M', hp: '7', maxHp: 11 }).words, 'unmeasured', 'a string hp proves nothing');
  assert.equal(at({ name: 'M', hp: 7 }).words, 'unmeasured', 'hp without maxHp proves nothing');
}

// ---- 4. The tracker is bound to the flag alone ----
{
  const base = { hero: { name: 'M' }, codex: { regions: [] }, logs: [] };
  assert.equal(tableOf({ ...base, combat: { active: true, round: 1 } }).tracker, true, 'an active battle seats the tracker');
  assert.equal(tableOf({ ...base, combat: { active: false, round: 3, order: ['a'] } }).tracker, false, 'a closed battle unseats it — rounds and order prove nothing');
  assert.equal(tableOf({ ...base, combat: null }).tracker, false, 'no combat block, no tracker');
  const battle = tableOf({ ...base, combat: { active: true } });
  assert.deepEqual(battle.chips.map((chip) => chip.id), IDS, 'the battle changes the tracker, never the chips');
}

// ---- 5. The ground chip follows the travel record ----
{
  const regions = [{ id: 'a', name: 'Larkspur Vale', state: 'haunted', visual: '' }, { id: 'b', name: 'The Duchy', state: 'unmapped', visual: '' }];
  const walked = tableOf({ hero: { name: 'M' }, codex: { regions }, logs: [regionAdd(0, 'Larkspur Vale'), regionAdd(1, 'The Duchy'), sceneSet(2, 'Larkspur Vale'), sceneSet(3, 'The Duchy')] });
  assert.equal(walked.chips[1].words, 'The Duchy', 'the chip stands on the LATEST lawful ground');
  assert.equal(walked.chips[1].state, 'unmapped', 'the state is the region card\'s own');
  const struck = tableOf({ hero: { name: 'M' }, codex: { regions }, logs: [regionAdd(0, 'Larkspur Vale'), { ...sceneSet(1, 'Larkspur Vale'), redacted: true }] });
  assert.equal(struck.chips[1].words, 'The tale has not yet set a scene', 'a struck scene proves nothing — the chip refuses');
  const unknown = tableOf({ hero: { name: 'M' }, codex: { regions }, logs: [sceneSet(0, 'The Mirelands')] });
  assert.equal(unknown.chips[1].words, 'The tale has not yet set a scene', 'a scene on a region the record does not hold is refused');
}

// ---- 6. The calendar chip skips struck days ----
{
  const table = tableOf({ hero: { name: 'M' }, codex: { regions: [] }, logs: [dayRide(0, 2), { ...dayRide(1, 5), redacted: true }] });
  assert.equal(table.chips[0].words, 'Day 3 · deep night', 'struck advances never reach the chip');
}

// ---- 7. The fixture court: the proving campaign's own truths ----
{
  const fx = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
  const logs = fx.turns.map((turn, i) => ({ ...turn, redacted: !!turn.struck, turn: i }));
  const regions = [];
  for (const turn of fx.turns) {
    const add = turn.dm?.story?.world?.region_add;
    if (add?.name) regions.push({ id: add.name, name: add.name, state: add.state || 'unmapped', visual: add.visual || '' });
  }
  const table = tableOf({ hero: { name: fx.hero.name }, codex: { regions }, logs });
  assert.equal(table.chips[0].words, 'Day 5 · deep night', 'the sealed record reads Day 5, deep night');
  assert.equal(table.chips[1].words, 'Larkspur Vale', 'the homecoming stands the hero in the Vale');
  assert.equal(table.chips[2].words, 'Edda', 'Edda alone rides at the end of the record');
  assert.equal(table.chips[3].words, 'unmeasured', 'the raw fixture hero carries no vitals — the fold refuses to mint them');
  assert.equal(table.tracker, false, 'the proving campaign seals no battle');
  assert.equal(JSON.stringify(tableOf({ hero: { name: fx.hero.name }, codex: { regions }, logs })), JSON.stringify(table), 'the fold is byte-deterministic');
}

console.log('PASS — the table law gate (engine twin, pure fraction): four chips, a closed set, honest words, the tracker bound to the flag alone; the rendered chip row is judged at the table\'s own gate');
