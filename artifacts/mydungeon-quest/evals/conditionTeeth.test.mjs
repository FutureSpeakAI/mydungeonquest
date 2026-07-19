// THE CONDITION-TEETH GATE (Directive XII §II, §VII.1) — wounds with
// teeth, one table, one roll engine, two lawful actors. Eight conditions;
// poisoned/frightened bite every d20, restrained bites DEX saves AND
// attacks, blinded/prone bite attacks, paralyzed/stunned/unconscious
// auto-fail STR and DEX saves. Advantage folds against a tooth to
// normal. Death saves stay the plain die. Conditions land on companions
// only through story.sheet_condition — courted at the door, folded by
// the reducer, refused whole on a tick. The die names its mode and its
// cause. Keyless, deterministic, no browser.
import assert from 'node:assert/strict';
import { CONDITIONS, companionRoll, createHero, heroRoll, sheetFor } from 'fatescript/rules';
import { applyStoryUpdates, initCodex, storyBlock } from 'fatescript/story';
import { validateDmTurn } from '../src/lib/protocol.js';

let courts = 0;
const court = (name, fn) => { fn(); courts += 1; console.log(`  ✓ ${name}`); };

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const HIGH = 0.7; // d20 -> 15
const LOW = 0.2;  // d20 -> 5
const hero = (conditions = []) => {
  const h = createHero({ className: 'Fighter', hitDie: 10, abilities: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 8 } });
  h.conditions = conditions;
  return h;
};

court('the eight conditions, a closed set', () => {
  assert.deepEqual(new Set(Object.keys(CONDITIONS)),
    new Set(['poisoned', 'frightened', 'restrained', 'stunned', 'paralyzed', 'unconscious', 'blinded', 'prone']));
});

// ---------------------------------------------------------------
// I. THE TEETH TABLE at the hero's die.
// ---------------------------------------------------------------
court('a clean die rolls single and normal', () => {
  const roll = heroRoll(hero(), { id: 'r1', kind: 'check', ability: 'DEX', dc: 10 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'normal');
  assert.deepEqual(roll.rawDice, [15]);
  assert.equal(roll.cause, null, 'nothing bit; nothing is named');
});

court('poisoned and frightened bite every d20 the sheet rolls', () => {
  for (const tooth of ['poisoned', 'frightened']) {
    for (const kind of ['check', 'save', 'attack']) {
      const roll = heroRoll(hero([tooth]), { id: 'r', kind, ability: 'WIS', dc: 10 }, seq(HIGH, LOW));
      assert.equal(roll.mode, 'disadvantage', `${tooth} bites a ${kind}`);
      assert.equal(roll.selectedDie, 5, 'the lower die is kept');
      assert.equal(roll.cause, tooth, 'the tooth is named where the die falls');
    }
  }
});

court('restrained bites DEX saves and attacks, and nothing else', () => {
  const dexSave = heroRoll(hero(['restrained']), { id: 'r', kind: 'save', ability: 'DEX', dc: 10 }, seq(HIGH, LOW));
  assert.equal(dexSave.mode, 'disadvantage', 'the standing DEX-save tooth');
  assert.equal(dexSave.cause, 'restrained');
  const attack = heroRoll(hero(['restrained']), { id: 'r', kind: 'attack', ability: 'STR', dc: 12 }, seq(HIGH, LOW));
  assert.equal(attack.mode, 'disadvantage', 'the new attack tooth');
  const wisSave = heroRoll(hero(['restrained']), { id: 'r', kind: 'save', ability: 'WIS', dc: 10 }, seq(HIGH, LOW));
  assert.equal(wisSave.mode, 'normal', 'a WIS save walks free');
  const check = heroRoll(hero(['restrained']), { id: 'r', kind: 'check', ability: 'DEX', dc: 10 }, seq(HIGH, LOW));
  assert.equal(check.mode, 'normal', 'a plain check walks free');
});

court('blinded and prone bite attack rolls only', () => {
  for (const tooth of ['blinded', 'prone']) {
    const attack = heroRoll(hero([tooth]), { id: 'r', kind: 'attack', ability: 'STR', dc: 12 }, seq(HIGH, LOW));
    assert.equal(attack.mode, 'disadvantage', `${tooth} bites the swing`);
    assert.equal(attack.cause, tooth);
    const check = heroRoll(hero([tooth]), { id: 'r', kind: 'check', ability: 'STR', dc: 12 }, seq(HIGH, LOW));
    assert.equal(check.mode, 'normal', `${tooth} spares the check`);
    const save = heroRoll(hero([tooth]), { id: 'r', kind: 'save', ability: 'DEX', dc: 12 }, seq(HIGH, LOW));
    assert.equal(save.mode, 'normal', `${tooth} spares the save`);
  }
});

court('two teeth in the same swing are both named', () => {
  const roll = heroRoll(hero(['blinded', 'prone']), { id: 'r', kind: 'attack', ability: 'STR', dc: 12 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'disadvantage');
  assert.equal(roll.cause, 'blinded & prone');
});

court('paralyzed, stunned, unconscious: automatic failure on STR and DEX saves alone', () => {
  for (const doom of ['paralyzed', 'stunned', 'unconscious']) {
    for (const ability of ['STR', 'DEX']) {
      const roll = heroRoll(hero([doom]), { id: 'r', kind: 'save', ability, dc: 5 }, seq(HIGH));
      assert.equal(roll.total, 0, `${doom} fails the ${ability} save outright`);
      assert.equal(roll.outcome, 'failure');
      assert.equal(roll.cause, doom, 'the doom is named');
    }
    const cha = heroRoll(hero([doom]), { id: 'r', kind: 'save', ability: 'CHA', dc: 10 }, seq(HIGH));
    assert.notEqual(cha.total, 0, `${doom} leaves a CHA save its die`);
    const check = heroRoll(hero([doom]), { id: 'r', kind: 'check', ability: 'STR', dc: 10 }, seq(HIGH));
    assert.notEqual(check.total, 0, `${doom} leaves a plain check its die`);
  }
});

court('an advantage riding the ask folds against a tooth to normal, and the crossing is spoken', () => {
  const roll = heroRoll(hero(['poisoned']), { id: 'r', kind: 'check', ability: 'DEX', advantage: 'advantage', dc: 10 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'normal', 'advantage and the tooth cancel');
  assert.deepEqual(roll.rawDice, [15], 'one die: the fold is normal, not two-dice-keep-either');
  assert.equal(roll.cause, 'advantage crossed by poisoned');
});

court('a DM-granted swing with no tooth speaks as the DM\u2019s word', () => {
  const roll = heroRoll(hero(), { id: 'r', kind: 'check', ability: 'DEX', advantage: 'disadvantage', dc: 10 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'disadvantage');
  assert.equal(roll.cause, 'the DM\u2019s word');
});

court('death saves stay the plain die: no mods, target 10 — though poison still bites the d20', () => {
  const clean = heroRoll(hero(), { id: 'r', kind: 'death_save' }, seq(HIGH));
  assert.deepEqual(clean.modifiers, [], 'no ability, no proficiency');
  assert.equal(clean.dcOrAc, 10, 'a d20 against 10, the dark keeping score');
  assert.equal(clean.total, 15);
  const poisoned = heroRoll(hero(['poisoned']), { id: 'r', kind: 'death_save' }, seq(HIGH, LOW));
  assert.deepEqual(poisoned.modifiers, [], 'still the plain die');
  assert.equal(poisoned.mode, 'disadvantage', 'the standing every-d20 law still stands at the deathbed');
});

// ---------------------------------------------------------------
// II. ONE ENGINE, TWO LAWFUL ACTORS — the companion's die folds
// identically, and carries its owner's name.
// ---------------------------------------------------------------
court('the sheeted companion\u2019s die is the hero\u2019s die in every field but the name', () => {
  const sheet = { ...sheetFor('skirmisher', 2), conditions: ['poisoned'] };
  const mirror = hero(['poisoned']);
  mirror.abilities = sheet.abilities;
  mirror.level = sheet.level;
  const request = { id: 'r-twin', kind: 'save', ability: 'DEX', dc: 12 };
  const ofHero = heroRoll(mirror, request, seq(HIGH, LOW));
  const ofSheet = companionRoll('Karsa', sheet, request, seq(HIGH, LOW));
  assert.equal(ofSheet.actorId, 'Karsa', 'the result carries its owner\u2019s name');
  assert.equal(ofHero.actorId, 'hero');
  assert.deepEqual({ ...ofSheet, actorId: null }, { ...ofHero, actorId: null }, 'one engine, byte for byte');
});

court('a sheet sealed before the law folds as empty, fail-closed', () => {
  const elder = { ...sheetFor('mender', 1) };
  delete elder.conditions;
  const roll = companionRoll('Old Tam', elder, { id: 'r', kind: 'check', ability: 'WIS', dc: 10 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'normal', 'no lane, no teeth — never a crash');
});

// ---------------------------------------------------------------
// III. THE SHEET-CONDITION OP at the door (§II.3) — shape law always,
// membership law when the sheets ride the context.
// ---------------------------------------------------------------
const doorErrors = (op, context = {}, extraStory = {}) =>
  (validateDmTurn({ story: { sheet_condition: op, ...extraStory } }, [], context).errors || [])
    .filter((e) => e.includes('sheet_condition'));

court('a lawful op on a sheeted soul passes the door', () => {
  assert.deepEqual(doorErrors({ name: 'Brannoc', add: ['poisoned'] }, { sheets: ['Brannoc'] }), []);
  assert.deepEqual(doorErrors({ name: 'Brannoc', add: ['blinded', 'prone'], remove: ['poisoned'] }, { sheets: ['Brannoc'] }), []);
});

court('an unsheeted soul is refused when the sheets ride the context', () => {
  const errors = doorErrors({ name: 'Mave', add: ['poisoned'] }, { sheets: ['Brannoc'] });
  assert.ok(errors.some((e) => e.includes('unsheeted')), 'the stranger is named and refused');
});

court('a sheet granted this same breath counts as sheeted', () => {
  const errors = doorErrors({ name: 'Karsa', add: ['prone'] }, { sheets: [] },
    { sheet_grant: { name: 'Karsa', role: 'skirmisher', level: 1 } });
  assert.deepEqual(errors, [], 'the same-breath grant seats the name');
});

court('bare context keeps shape law only', () => {
  assert.deepEqual(doorErrors({ name: 'Anyone', add: ['poisoned'] }, {}), [],
    'no sheets lane, no membership court');
});

court('the door refuses every unlawful shape', () => {
  assert.ok(doorErrors(['poisoned'], {}).length, 'an array is not an op');
  assert.ok(doorErrors({ name: 'B' }, {}).length, 'a one-letter name fails');
  assert.ok(doorErrors({ name: 'Brannoc' }, {}).length, 'neither add nor remove is an empty word');
  assert.ok(doorErrors({ name: 'Brannoc', add: ['woozy'] }, {}).some((e) => e.includes('woozy')), 'a stranger condition is named');
  assert.ok(doorErrors({ name: 'Brannoc', add: ['poisoned', 'prone', 'blinded'] }, {}).length, 'three added is one too many');
  assert.ok(doorErrors({ name: 'Brannoc', add: ['prone', 'prone'] }, {}).length, 'a repeat is refused');
  assert.ok(doorErrors({ name: 'Brannoc', add: ['prone'], remove: ['prone'] }, {}).length, 'adding and removing the same is refused');
  assert.ok(doorErrors({ name: 'Brannoc', add: ['prone'], why: 'x' }, {}).length, 'a stranger key is refused');
});

// ---------------------------------------------------------------
// IV. THE REDUCER — the lane fills, refusals move nothing and say so,
// and the offscreen world may not poison the party.
// ---------------------------------------------------------------
const seatedCodex = () => {
  const codex = initCodex('classic-epic');
  codex.party = [{ name: 'Brannoc', sheet: { ...sheetFor('guardian', 1), conditions: [] } }];
  return codex;
};
const laneOf = (codex) => codex.party.find((m) => m.name === 'Brannoc').sheet.conditions;

court('an add lands on the sheet\u2019s lane', () => {
  const codex = applyStoryUpdates(seatedCodex(), { sheet_condition: { name: 'Brannoc', add: ['poisoned', 'prone'] } }, { turn: 4 });
  assert.deepEqual(laneOf(codex), ['poisoned', 'prone']);
});

court('adding a standing condition moves nothing and leaves a note', () => {
  const once = applyStoryUpdates(seatedCodex(), { sheet_condition: { name: 'Brannoc', add: ['poisoned'] } }, { turn: 4 });
  const notesBefore = once.notes.length;
  const twice = applyStoryUpdates(once, { sheet_condition: { name: 'Brannoc', add: ['poisoned'] } }, { turn: 5 });
  assert.deepEqual(laneOf(twice), ['poisoned'], 'the lane holds one poisoned, not two');
  assert.ok(twice.notes.length > notesBefore, 'the refusal is spoken, not silent');
});

court('removing an absent condition moves nothing and leaves a note; removing a standing one lands', () => {
  const seated = applyStoryUpdates(seatedCodex(), { sheet_condition: { name: 'Brannoc', add: ['prone'] } }, { turn: 4 });
  const notesBefore = seated.notes.length;
  const missed = applyStoryUpdates(seated, { sheet_condition: { name: 'Brannoc', remove: ['stunned'] } }, { turn: 5 });
  assert.deepEqual(laneOf(missed), ['prone'], 'nothing moved');
  assert.ok(missed.notes.length > notesBefore, 'and it says so');
  const cured = applyStoryUpdates(missed, { sheet_condition: { name: 'Brannoc', remove: ['prone'] } }, { turn: 6 });
  assert.deepEqual(laneOf(cured), [], 'the standing condition lifts');
});

court('the tick refusal: the offscreen world may not poison the party', () => {
  const codex = seatedCodex();
  const ticked = applyStoryUpdates(codex, { sheet_condition: { name: 'Brannoc', add: ['stunned'] } }, { turn: 5, tick: true });
  assert.deepEqual(laneOf(ticked), [], 'refused whole');
  assert.ok(ticked.notes.some((note) => /may not poison/.test(note)), 'the refusal names the law');
});

court('an unsheeted name at the reducer moves nothing and says so', () => {
  const codex = seatedCodex();
  const before = codex.notes.length;
  const next = applyStoryUpdates(codex, { sheet_condition: { name: 'Mave', add: ['prone'] } }, { turn: 5 });
  assert.equal(laneOf(next).length, 0);
  assert.ok(next.notes.length > before);
});

court('the lane the op filled is the lane the engine bites — end to end', () => {
  const codex = applyStoryUpdates(seatedCodex(), { sheet_condition: { name: 'Brannoc', add: ['poisoned'] } }, { turn: 4 });
  const sheet = codex.party.find((m) => m.name === 'Brannoc').sheet;
  const roll = companionRoll('Brannoc', sheet, { id: 'r', kind: 'check', ability: 'STR', dc: 10 }, seq(HIGH, LOW));
  assert.equal(roll.mode, 'disadvantage', 'the op\u2019s poison reaches the die');
  assert.equal(roll.cause, 'poisoned');
});

// ---------------------------------------------------------------
// V. SPOKEN WHERE THE TABLE READS (§II.4) — the briefing's sheet_state
// carries each sheet's standing conditions.
// ---------------------------------------------------------------
court('the briefing carries the standing conditions on each sheet', () => {
  const codex = applyStoryUpdates(seatedCodex(), { sheet_condition: { name: 'Brannoc', add: ['poisoned'] } }, { turn: 4 });
  const block = storyBlock(codex);
  const spoken = JSON.stringify(block.sheet_state ?? block);
  assert.ok(/Brannoc/.test(spoken) && /poisoned/.test(spoken),
    'the block speaks the sheet\u2019s conditions to the room');
});

console.log(`PASS — CONDITION-TEETH GATE: ${courts} courts sat, all green. One table, one engine, two lawful actors.`);
