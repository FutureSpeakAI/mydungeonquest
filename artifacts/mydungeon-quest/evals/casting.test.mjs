// THE CASTING GATE (Experience Directive XVIII, Article V) — the cast door
// refuses by name at every bench (hero, sheet, enemy species card), a cast
// spends exactly one slot of its own level (identity on refusal), the one
// thread of concentration holds unless the same op releases it, the ledger
// speaks the release, the offscreen world may not cast, and a cast IS the
// actor's action (one-action seeding). Keyless, pure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { applyStoryUpdates, initCodex } from 'fatescript/story';
import { applyCast, createHero } from 'fatescript/rules';
import { SPELL_TABLE, companionSpellsFor, spellRowFor } from 'fatescript/grimoire';

const at = (p) => new URL(p, import.meta.url);
const castTurn = (cast_spell, extra = {}) => ({ ...safeFallbackTurn('', 3), story: { cast_spell, ...(extra.story || {}) }, ...(extra.combat ? { combat: extra.combat } : {}) });
const verdict = (turn, context) => validateDmTurn(turn, [], context);
const refusedWith = (turn, context, needle, label) => {
  const v = verdict(turn, context);
  assert.equal(v.ok, false, `${label}: the door must refuse`);
  assert.ok(v.errors.some((e) => e.includes(needle)), `${label}: the refusal names its law (wanted "${needle}", saw: ${v.errors.join(' | ')})`);
};
const baseContext = () => ({
  hero: 'Elaria', heroCaster: 'full',
  heroSpells: ['fire bolt', 'cure wounds', 'moonbeam', 'bless'],
  casterSlots: { 1: { current: 2, max: 2 }, 2: { current: 1, max: 1 } },
  concentration: null,
  sheets: ['Rell Marrow'],
  sheetCasters: [],
  cast: [{ name: 'Old Maren', status: 'dead' }, { name: 'Rell Marrow', status: 'alive' }],
  combatants: [{ id: 'gnoll-1', name: 'the gnoll', species: 'gnoll', hp: 7 }],
  bestiary: [{ species: 'gnoll', spells: ['poison spray'] }]
});

// --- 1. The hero bench: every refusal row by name ---
assert.equal(verdict(castTurn({ caster: 'Elaria', spell: 'fire bolt', target: 'the gnoll' }), baseContext()).ok, true, 'a lawful learned cantrip passes');
refusedWith(castTurn({ caster: 'Elaria' }), baseContext(), 'cast_spell must be an object carrying caster and spell', 'shape law');
refusedWith(castTurn({ caster: 'Elaria', spell: 'summon-nonsense' }), baseContext(), 'names a spell the grimoire does not hold', 'unknown spell');
assert.ok(spellRowFor('magic missile'), 'the probe spell exists in the library');
{
  const v = verdict(castTurn({ caster: 'Elaria', spell: 'magic missile' }), baseContext());
  assert.equal(v.ok, false, 'an unlearned spell is refused at the hero bench');
  assert.ok(v.errors.some((e) => e.includes('magic missile') && !e.includes('does not hold')), 'the refusal is the learned law, not the library law');
}
{
  const drained = baseContext(); drained.casterSlots = { 1: { current: 0, max: 2 } };
  refusedWith(castTurn({ caster: 'Elaria', spell: 'cure wounds' }), drained, 'no slot of level 1 remains for cure wounds', 'empty slot');
}
{
  const tank = baseContext(); tank.heroCaster = 'energy'; tank.spellEnergy = { current: 0, max: 3 };
  refusedWith(castTurn({ caster: 'Elaria', spell: 'cure wounds' }), tank, 'the energy tank is empty', 'spent tank');
}
{
  const held = baseContext(); held.concentration = 'bless';
  refusedWith(castTurn({ caster: 'Elaria', spell: 'moonbeam' }), held, 'a second concentration while bless holds', 'one thread');
  assert.equal(verdict(castTurn({ caster: 'Elaria', spell: 'moonbeam', release: true }), held).ok, true, 'the same op carrying the release passes');
}
refusedWith(castTurn({ caster: 'Elaria', spell: 'fire bolt', release: false }), baseContext(), 'cast_spell.release, when it rides, is exactly true', 'release rider');
refusedWith(castTurn({ caster: 'Elaria', spell: 'fire bolt', target: 'The Uncounted Stranger' }), baseContext(), 'cast_spell.target is nobody the record counts', 'target census');
refusedWith(castTurn({ caster: 'Elaria', spell: 'fire bolt', target: 'Old Maren' }), baseContext(), 'cast_spell.target is sealed dead', 'the sealed dead');
refusedWith(castTurn({ caster: 'The Stranger', spell: 'fire bolt' }), baseContext(), 'cast_spell.caster is nobody the record counts', 'caster census');
{
  // the court is presence-based: with no census seated, it stays out of session
  const bare = baseContext(); delete bare.sheets; delete bare.heroSpells; delete bare.casterSlots;
  assert.equal(verdict(castTurn({ caster: 'The Stranger', spell: 'fire bolt' }), bare).ok, true, 'an unseated census proves nothing (fail-open house law)');
}

// --- 2. The sheet bench: the companion's own book, slots, and thread ---
{
  const ctx = baseContext();
  ctx.sheetCasters = [{ name: 'Rell Marrow', spells: ['cure wounds', 'pass without trace'], slots: { 1: '2/2', 2: '1/1' }, concentration: null }];
  assert.equal(verdict(castTurn({ caster: 'Rell Marrow', spell: 'cure wounds', target: 'Elaria' }), ctx).ok, true, 'a sheeted caster casts from her own book');
  const v = verdict(castTurn({ caster: 'Rell Marrow', spell: 'bless' }), ctx);
  assert.equal(v.ok, false, 'a spell off the sheet\u2019s book is refused');
  ctx.sheetCasters = [{ name: 'Rell Marrow', spells: ['cure wounds'], slots: { 1: '0/2' }, concentration: null }];
  refusedWith(castTurn({ caster: 'Rell Marrow', spell: 'cure wounds' }), ctx, "no slot of level 1 remains on Rell Marrow's sheet", 'sheet slot law');
  ctx.sheetCasters = [{ name: 'Rell Marrow', spells: ['cure wounds', 'pass without trace'], slots: { 1: '2/2', 2: '1/1' }, concentration: 'bless' }];
  refusedWith(castTurn({ caster: 'Rell Marrow', spell: 'pass without trace' }), ctx, 'Rell Marrow already holds bless', 'sheet one-thread');
}

// --- 3. The enemy bench: the species card, and only the card ---
{
  const ctx = baseContext();
  assert.equal(verdict(castTurn({ caster: 'the gnoll', spell: 'poison spray' }), ctx).ok, true, 'an enemy casts what its card carries');
  refusedWith(castTurn({ caster: 'the gnoll', spell: 'fire bolt' }), ctx, 'the gnoll card carries no such spell: fire bolt', 'cardless craft');
  // a card sealed this same breath teaches the standing combatant
  const fresh = baseContext(); fresh.bestiary = [];
  const turn = castTurn({ caster: 'the gnoll', spell: 'fire bolt' }, { story: { creature_add: { species: 'gnoll', visual: 'a rangy hyena-thing in rusted mail', nature: 'Pack skirmisher, cackling and craven.', threat: 2, spells: ['fire bolt'] } } });
  assert.equal(verdict(turn, fresh).ok, true, 'a same-turn creature_add card seats the craft');
}

// --- 4. The arithmetic: exactly one slot, identity on refusal ---
const hero = createHero({ name: 'Elaria', className: 'wizard', abilities: { STR: 8, DEX: 12, CON: 14, INT: 15, WIS: 10, CHA: 10 }, spells: ['fire bolt', 'cure wounds', 'bless'] });
assert.equal(hero.caster, 'full', 'the wizard casts on the full table');
{
  const after = applyCast(hero, spellRowFor('fire bolt'));
  assert.notEqual(after, hero, 'a lawful cantrip returns a new hero');
  assert.deepEqual(after.spellSlots, hero.spellSlots, 'a cantrip is slotless');
}
{
  const spent = applyCast(hero, spellRowFor('cure wounds'));
  assert.equal(spent.spellSlots[1].current, hero.spellSlots[1].max - 1, 'exactly one slot of the spell\u2019s level');
  assert.equal(hero.spellSlots[1].current, hero.spellSlots[1].max, 'the input hero is never touched');
  let walker = hero;
  while (walker.spellSlots[1].current > 0) walker = applyCast(walker, spellRowFor('cure wounds'));
  const refused = applyCast(walker, spellRowFor('cure wounds'));
  assert.equal(refused, walker, 'an empty slot refuses by identity — the same object back');
}
{
  const held = applyCast(hero, spellRowFor('bless'));
  assert.equal(held.concentration, 'bless', 'a concentration cast seats the thread');
  const second = applyCast(held, spellRowFor('bless'));
  assert.equal(second, held, 'a second thread without release refuses by identity');
  const swapped = applyCast(held, spellRowFor('bless'), { release: true });
  assert.notEqual(swapped, held, 'the same op carrying release passes');
}
{
  const warlock = createHero({ name: 'Vex', className: 'warlock', abilities: { STR: 8, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 15 }, spells: ['cure wounds'] });
  assert.equal(warlock.caster, 'energy', 'the warlock rides the tank');
  const spent = applyCast(warlock, spellRowFor('cure wounds'));
  assert.equal(spent.spellEnergy.current, warlock.spellEnergy.max - 1, 'a leveled cast spends one charge');
  let drained = warlock;
  while (drained.spellEnergy.current > 0) drained = applyCast(drained, spellRowFor('cure wounds'));
  assert.equal(applyCast(drained, spellRowFor('cure wounds')), drained, 'an empty tank refuses by identity');
  assert.notEqual(applyCast(drained, spellRowFor('fire bolt')), drained, 'cantrips stay free when the tank is dry');
}

// --- 5. The fold: the sheet spends, the ledger speaks, the tick may not cast ---
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { cast_add: [{ name: 'Rell Marrow', role: 'sellsword', visual: 'Scar-knuckled woman in oiled leather.', voice: 'low gravel', goal: 'Die owing nothing', secret: 'Owes everything' }] }, { turn: 1 });
codex = applyStoryUpdates(codex, { party_join: { name: 'Rell Marrow' } }, { turn: 2 });
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'Rell Marrow', role: 'mender', level: 2 } }, { turn: 3 });
const rell = () => codex.party.find((m) => m.name === 'Rell Marrow');
assert.deepEqual(rell().sheet.spells, companionSpellsFor('mender', 2, 'full'), 'the grant arms the mender from the shelf');
assert.equal(rell().sheet.concentration, null, 'the thread is born released');
const slotCount = (sheet, level) => { const s = (sheet.spellSlots || sheet.slots || {})[level]; return typeof s === 'string' ? Number(s.split('/')[0]) : Number(s?.current); };
const before = slotCount(rell().sheet, 1);
assert.ok(before >= 1, 'the mender owns first-circle slots');
codex = applyStoryUpdates(codex, { cast_spell: { caster: 'Rell Marrow', spell: 'cure wounds', target: 'Elaria' } }, { turn: 4 });
assert.equal(slotCount(rell().sheet, 1), before - 1, 'the fold spends exactly one sheet slot');
codex = applyStoryUpdates(codex, { cast_spell: { caster: 'Rell Marrow', spell: 'bless' } }, { turn: 5 });
assert.equal(rell().sheet.concentration, 'bless', 'the fold seats the sheet\u2019s thread');
codex = applyStoryUpdates(codex, { cast_spell: { caster: 'Rell Marrow', spell: 'bless', release: true } }, { turn: 6 });
assert.ok(codex.notes.some((n) => n.includes('Concentration released: Rell Marrow lets bless fall.')), 'the release seals its note in the ledger');
codex = applyStoryUpdates(codex, { cast_spell: { caster: 'Rell Marrow', spell: 'cure wounds' } }, { turn: 7, tick: true });
assert.ok(codex.notes.some((n) => n.includes('The offscreen world may not cast: cast_spell refused on a tick.')), 'the offscreen world may not cast');
codex = applyStoryUpdates(codex, { cast_spell: { caster: 'Elaria', spell: 'moonbeam', release: true } }, { turn: 8, heroName: 'Elaria', heroConcentration: 'bless' });
assert.ok(codex.notes.some((n) => n.includes('Concentration released: Elaria lets bless fall.')), 'the hero\u2019s release speaks through the meta seat');
codex = applyStoryUpdates(codex, { spell_learn: { name: 'Elaria', spells: ['fireball', 'not-a-spell'] } }, { turn: 9 });
assert.ok(codex.notes.some((n) => n.includes('Learned: Elaria takes fireball into the grimoire.')), 'learning notes only lawful keys');
codex = applyStoryUpdates(codex, { creature_add: { species: 'marsh hag', visual: 'a bent crone of reeds and river mud', nature: 'River-witch of the drowned fords.', threat: 3, spells: ['hold person', 'witch-nonsense'] } }, { turn: 10 });
{
  const card = (codex.bestiary || []).find((c) => c.species === 'marsh hag');
  assert.ok(card, 'the card seals');
  assert.deepEqual(card.spells, ['hold person'], 'the card\u2019s book holds only lawful keys');
}

// --- 6. One action: a cast IS the actor's turn (seeding law, source-bound) ---
const protocolSource = readFileSync(at('../../../packages/engine/src/protocol.js'), 'utf8');
assert.ok(/THE CASTING LAW \(XVIII, Article V\)/.test(protocolSource), 'the seeding law stands by name in the round court');
assert.ok(/actors\.add\(canonKey\(turnCast\.caster\)\)/.test(protocolSource), 'the cast\u2019s caster is seeded into the acted set');

// --- 7. Lockstep: the briefing benches carry the same evidence ---
const dmSource = readFileSync(at('../server/dm.js'), 'utf8');
for (const seat of ['heroSpells', 'casterSlots', 'sheetCasters', 'spellEnergy']) assert.ok(dmSource.includes(seat), `the judge seats ${seat}`);
assert.ok(dmSource.includes("required: ['caster','spell']"), 'the schema requires caster and spell');
const appSource = readFileSync(at('../src/App.jsx'), 'utf8');
assert.ok(appSource.includes('state: { hero: base.hero, combat: base.combat, caster_line: casterLineOf(base.hero) }'), 'the caster line rides LAST in [STATE] (cache posture)');
const mirrorBytes = 'sheet_state.filter((row) => Array.isArray(row?.spells))';
assert.ok(dmSource.includes(mirrorBytes) && appSource.includes(mirrorBytes), 'both benches seat sheetCasters from the same bytes (seat-binding law)');
const promptSource = readFileSync(at('../src/lib/systemPrompt.js'), 'utf8');
assert.ok(promptSource.includes('49. THE CASTING'), 'the casting law speaks in the prompt');

console.log('PASS: the casting law holds — every bench refuses by name, one slot per cast with identity on refusal, one thread of concentration, the ledger speaks the release, and a cast is the actor\u2019s whole action');
