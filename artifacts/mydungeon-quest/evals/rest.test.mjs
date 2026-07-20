// THE REST GATE (Experience Directive XVIII, Article III) — restoration
// exact by table, the once-per-calendar-day door, the clock provably
// unmoved by rest alone, and prompt/schema lockstep. Keyless, pure node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyStateUpdates, createHero } from 'fatescript/rules';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { calendarOf } from 'fatescript/calendar';
import { buildSystemPrompt } from '../src/lib/systemPrompt.js';

// --- 1. The fold: restoration exact, the day stamped ---
const hero = createHero({ name: 'Probe', className: 'wizard', abilities: { STR: 10, DEX: 10, CON: 14, INT: 16, WIS: 10, CHA: 10 } });
assert.equal(hero.lastRestDay, null, 'heroes are born unrested — null, never zero');
const wounded = structuredClone(hero);
wounded.hp = 1;
wounded.spellSlots['1'].current = 0;
const rested = applyStateUpdates(wounded, { rest: 'long' }, { day: 4 });
assert.equal(rested.hp, rested.maxHp, 'a long rest restores hit points to the table maximum');
assert.ok(Object.values(rested.spellSlots).every((slot) => slot.current === slot.max), 'every spell slot refills at the fold');
assert.equal(rested.lastRestDay, 4, 'the rest stamps the calendar day it blessed');
const unstamped = applyStateUpdates(wounded, { rest: 'long' });
assert.equal(unstamped.lastRestDay, null, 'an unstamped fold keeps the standing mark — it never invents a day');

// --- 2. The ac_set lane is retired: the fold ignores it whole ---
const acProbe = applyStateUpdates(structuredClone(hero), { ac_set: 25 });
assert.equal(acProbe.ac, hero.ac, 'ac_set folds to nothing — AC is derived truth, never an op opinion');

// --- 3. The door: long alone, once per calendar day ---
const turnWith = (updates) => ({ ...safeFallbackTurn('', 3), state_updates: updates });
const ctx = (day, lastRestDay) => ({ cast: [], day, lastRestDay });
assert.equal(validateDmTurn(turnWith({ rest: 'long' }), [], ctx(3, null)).ok, true, 'a never-rested hero rests free');
assert.equal(validateDmTurn(turnWith({ rest: 'long' }), [], ctx(3, 2)).ok, true, "yesterday's rest does not bar today");
assert.equal(validateDmTurn(turnWith({ rest: 'long' }), [], ctx(3, 3)).ok, false, 'the door refuses a second rest the same day');
assert.equal(validateDmTurn(turnWith({ rest: 'short' }), [], ctx(3, null)).ok, false, 'short rests are flavor, not mechanics — refused by value');
assert.equal(validateDmTurn(turnWith({ rest: 'long' }), [], { cast: [] }).ok, true, 'a bare context leaves the court out of session, never falsely in');
assert.equal(validateDmTurn(turnWith({ hp_delta: -2 }), [], ctx(3, 3)).ok, true, 'restless updates pass the rest court untouched');
const rolling = {
  ...safeFallbackTurn('', 3),
  roll_request: { id: 'r1', label: 'Hold the line', kind: 'check', die: 'd20', ability: 'DEX', skill: null, proficient: false, dc: 10, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null },
  state_updates: { rest: 'long' }
};
assert.equal(validateDmTurn(rolling, [], ctx(3, null)).ok, false, 'rest never rides an unresolved roll — the standing law holds');

// --- 4. The clock: rest itself moves nothing ---
const restedLog = [{ dm: { state_updates: { rest: 'long' }, time_advance: null } }];
assert.equal(calendarOf(restedLog).day, 1, 'a rest without time_advance moves no clock — the tick-exclusion law holds');
const sleptLog = [{ dm: { time_advance: { unit: 'hours', n: 8 } } }];
assert.deepEqual(calendarOf(sleptLog), { day: 1, hours: 8 }, 'only time_advance moves the calendar');

// --- 5. Lockstep: prompt and schema carry the law (the toolschema lesson) ---
const prompt = buildSystemPrompt({ campaign: {}, hero: createHero({ name: 'P' }), spine: null });
assert.ok(prompt.includes('47. THE LONG REST'), 'the rest law rides the prompt');
assert.ok(prompt.includes("state_updates.rest = 'long'"), 'the prompt names the exact lane');
const dmSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
assert.ok(/enum: \['long'\]/.test(dmSource), 'the tool schema declares the rest enum the validator enforces');
assert.ok(dmSource.includes('calendar_state'), 'the server court seats the calendar evidence the briefing carries');

console.log('PASS: the rest law holds — table restoration, one rest per calendar day at the door, the clock unmoved');
