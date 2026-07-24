// THE KINSHIP GATE (engine twin) — Directive XX, Law VIII: the recency
// horizon never starves the bound. On a forty-soul fixture: the bond-four
// mother, silent sixty turns, rides EVERY pack in slim form; the budget
// holds with the scene floor whole; the unbound famine exactly as before
// (tail-first among themselves) and the dead earn no immunity; when the
// bound alone overflow they seat in deterministic priority — bond
// descending, kin and enemy ties before the merely bound, introduced
// ascending — byte-stable on the repeat walk; and a fixture where no
// bound soul is starved keeps today's seats in today's order, the
// contract keys exactly storyBlock's own plus the pack's standing four.
// The table strip (App.jsx's briefing seat, the door's shipping) is
// judged by the game's own kinship gate.
import assert from 'node:assert/strict';
import { initCodex, storyBlock } from '../src/story.js';
import { buildContextPack } from '../src/graph.js';

const HERO = { name: 'Sera Vale', className: 'Knight' };

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- The forty-soul world ----
// Cast rows direct (the reducer's own shape, fixtures.mjs's precedent);
// the LOG carries the same introductions as ops, so the card reducer
// derives the kin ties exactly as it does at the live table. last_seen
// stays short by design: it rides the trim-immune presence_state forty
// times over, and the famine must have something it is ALLOWED to eat.
const soul = (name, role, over = {}) => ({
  id: `s-${name.toLowerCase().replace(/\s+/g, '-')}`, name, role,
  visual: `${name}, a weathered face beneath a travel hood`,
  voice: 'a voice', goal: 'a goal', secret: '', status: 'active', bond: 0,
  last_seen: 'the vale road', known_facts: [], bond_arc: [], introduced_turn: 1, ...over
});

function fortySoulCodex() {
  const codex = initCodex('classic-epic', {
    arc: { title: 'The Long Vale', evil_plot: 'The Regent drains the vale', stakes: 'Every hearth', style_bible: 'Iron and candlelight' }
  });
  // THE ADVERSARIAL SEATING — what makes this gate BIND. The bound ride
  // at the very TAIL of the cast, in an order deliberately scrambled
  // against the law's priority, so the old tail-first famine would eat
  // them FIRST and mere cast position can never impersonate the
  // immunity. Under the pre-law builder, court one reds (the mother
  // falls at seven thousand) and the squeeze court goes hollow (only
  // head-seated carters survive); under a comparator turned ascending,
  // the priority prefix breaks. Position proves nothing here — only the
  // law seats these souls.
  const cast = [soul('The Regent of Ash', 'villain', { introduced_turn: 1 })];
  for (let i = 1; i <= 32; i += 1) {
    cast.push(soul(`Carter${String(i).padStart(2, '0')}`, 'a carter of the long vale road between the winter fair and the drowned crossing', { introduced_turn: 3 + i }));
  }
  cast.push(
    soul('Petra', 'her sister, a reeve', { bond: 0, introduced_turn: 2 }),
    soul('Halvor', 'a drover of the high road above the ashen pass', { bond: 3, introduced_turn: 3 }),
    soul('Edda', 'her grandmother, at rest', { bond: 4, status: 'dead', introduced_turn: 1, last_seen: 'the ford, at rest' }),
    soul('Wren', 'a fletcher of the low field beyond the winter fair', { bond: 3, introduced_turn: 1 }),
    soul('Maren', 'her mother, the miller', { bond: 4, introduced_turn: 1, last_seen: 'the mill on the west water' }),
    soul('Ysolt', 'a reeve of the drowned crossing on the north water', { bond: 3, introduced_turn: 2 }),
    soul('Tilda', 'her aunt, the brewer', { bond: 3, introduced_turn: 5 })
  );
  codex.cast = cast;
  codex.regions = [{ name: 'The Vale', visual: 'A river vale of slate roofs', state: 'whole' }];
  return codex;
}

// The log: introductions at turn 1 (the kin ties are born here), the
// mother's only words at turn 1, then a long silence — the fresh scene at
// turns 56 through 61 belongs to three carters, so the recent-entry
// window (the last six ENTRIES) never reaches back to her.
function fortySoulLogs() {
  const intro = (name, role) => ({ name, role, visual: 'in paint', voice: 'a voice', goal: 'a goal', secret: '' });
  const late = (turn, speaker, text) => ({ turn, dm: { narration_blocks: [{ speaker, text }], story: null } });
  return [
    { turn: 1, dm: { narration_blocks: [{ speaker: 'Maren', text: 'Come home when the wheel turns.' }], story: { cast_add: [
      intro('Maren', 'her mother, the miller'), intro('The Regent of Ash', 'villain'),
      intro('Tilda', 'her aunt, the brewer'), intro('Petra', 'her sister, a reeve'),
      intro('Edda', 'her grandmother, at rest'), intro('Wren', 'a fletcher of the low field'),
      intro('Ysolt', 'a reeve of the crossing'), intro('Halvor', 'a drover of the high road')
    ] } } },
    { turn: 2, dm: { narration_blocks: [], story: { cast_update: [{ name: 'Edda', status: 'dead', last_seen: 'the ford, at rest' }] } } },
    late(56, 'Carter01', 'The road is washed out.'),
    late(57, 'Carter02', 'The bridge held.'),
    late(58, 'Carter03', 'The Regent\u2019s men took the toll.'),
    late(59, 'Carter01', 'Snow before the fair, mark it.'),
    late(60, 'Carter02', 'The mill wheel still turns west.'),
    late(61, 'Carter03', 'The vale holds its breath.')
  ];
}

const campaign = { hero: HERO, codex: fortySoulCodex(), logs: fortySoulLogs() };
deepFreeze(campaign);

// ---- 1. The mother rides every pack, slim, under the default budget ----
for (const logsUpTo of [7, 8]) {
  const walked = { hero: HERO, codex: fortySoulCodex(), logs: fortySoulLogs().slice(0, logsUpTo) };
  const pack = buildContextPack(walked, { budget: 7000 });
  assert.ok(JSON.stringify(pack).length <= 7000, `the budget holds under the default seven thousand (saw ${JSON.stringify(pack).length})`);
  const maren = pack.cast.find((s) => s.name === 'Maren');
  assert.ok(maren, 'the bond-four mother, sixty turns silent, rides the pack');
  assert.ok(!maren.visual, 'the rider rides SLIM — the immunity adds no full seat');
  assert.equal(maren.bond, 4, 'the slim shape still speaks her bond');
  const wren = pack.cast.find((s) => s.name === 'Wren');
  assert.ok(wren && !wren.visual, 'the merely bond-three fletcher rides slim too — bond alone is enough');
  const petra = pack.cast.find((s) => s.name === 'Petra');
  assert.ok(petra && !petra.visual, 'the bond-zero sister rides by her kin tie alone');
}

// ---- 2. The scene floor is whole and full; the unbound famine as before ----
const tight = buildContextPack(campaign, { budget: 7000 });
const regent = tight.cast.find((s) => s.name === 'The Regent of Ash');
assert.ok(regent && regent.visual, 'the villain rides full — the immunity rearranged nothing above it');
const carterOne = tight.cast.find((s) => s.name === 'Carter01');
assert.ok(carterOne && carterOne.visual, 'the spoken carter holds the scene floor in full');
const eddaAtSeven = tight.cast.find((s) => s.name === 'Edda');
assert.ok(!eddaAtSeven || !eddaAtSeven.visual, 'the dead grandmother never rides full — if the tail-first famine has not yet reached her seat, she sits slim like any unbound soul');
const quietCarters = [];
for (let i = 4; i <= 32; i += 1) quietCarters.push(`Carter${String(i).padStart(2, '0')}`);
const seated = quietCarters.filter((name) => tight.cast.some((s) => s.name === name));
const fallenCarters = quietCarters.filter((name) => !tight.cast.some((s) => s.name === name));
assert.ok(fallenCarters.length > 0, 'the budget truly bit — unbound carters fell');
for (const stay of seated) for (const gone of fallenCarters) {
  assert.ok(quietCarters.indexOf(stay) < quietCarters.indexOf(gone), 'the unbound famine is tail-first among themselves, exactly as before');
}

// ---- 3. The overflow: the bound seat in deterministic priority ----
// Measure the floor first (the standing practice): a budget of one forces
// the maximal walk — every unbound rider gone, every slim taken, every
// bound seat surrendered — and proves the drop loop can empty the room.
// Then a budget a few seats above the floor makes the bound choose.
// Priority: bond descending, kin before the merely bound, introduced
// ascending — Maren (4) → Tilda (3, kin) → Wren (3, i1) → Ysolt (3, i2)
// → Halvor (3, i3) → Petra (0, kin).
const priority = ['Maren', 'Tilda', 'Wren', 'Ysolt', 'Halvor', 'Petra'];
const floorPack = buildContextPack(campaign, { budget: 1 });
assert.ok(!priority.some((name) => floorPack.cast.some((s) => s.name === name)), 'at the impossible budget every bound seat is surrendered — the overflow walk runs to its end');
const floorSize = JSON.stringify(floorPack).length;
const squeezeBudget = floorSize + 520;
const squeezedOnce = buildContextPack(campaign, { budget: squeezeBudget });
const squeezedTwice = buildContextPack(campaign, { budget: squeezeBudget });
assert.equal(JSON.stringify(squeezedOnce), JSON.stringify(squeezedTwice), 'the squeezed walk is byte-stable on the repeat');
assert.ok(JSON.stringify(squeezedOnce).length <= squeezeBudget, 'the squeezed walk lands under its budget');
assert.ok(!squeezedOnce.cast.some((s) => s.name === 'Edda'), 'the dead grandmother earns no immunity — at the squeeze she falls with the unbound while living bound still hold seats');
const kept = priority.filter((name) => squeezedOnce.cast.some((s) => s.name === name));
assert.ok(kept.length > 0, 'the squeeze left at least one bound rider — the court is not hollow');
assert.ok(kept.length < priority.length, 'the squeeze truly forced the bound to choose seats');
assert.deepEqual(kept, priority.slice(0, kept.length), 'the bound seat by the tick-target precedent — bond descending, kin before the merely bound, introduced ascending — and the lowest seat falls first');

// ---- 4. No starved bound: today's seats in today's order, contract whole ----
const roomy = buildContextPack(campaign, { budget: 20000 });
assert.equal(JSON.stringify(roomy), JSON.stringify(buildContextPack(campaign, { budget: 20000 })), 'the roomy walk is byte-stable');
const castNames = campaign.codex.cast.map((s) => s.name);
assert.deepEqual(
  roomy.cast.map((s) => s.name).slice().sort(),
  castNames.slice().sort(),
  'nobody falls when the budget never bites'
);
const restZone = roomy.cast.filter((s) => !s.visual).map((s) => s.name);
assert.deepEqual(restZone, castNames.filter((name) => restZone.includes(name)), 'the slim rest keeps the cast\u2019s own order — the immunity adds riders, it never rearranges the seated');
const block = storyBlock(campaign.codex);
for (const key of Object.keys(block)) assert.ok(key in roomy, `contract key ${key} preserved`);
assert.deepEqual(
  Object.keys(roomy).slice().sort(),
  [...new Set([...Object.keys(block), 'presence_state', 'cast', 'regions', 'scene'])].sort(),
  'the pack adds no key the contract does not already name'
);
assert.deepEqual(roomy.directives, block.directives, 'directives ride verbatim');

console.log('PASS — the kinship gate (engine): the bond-four mother, sixty turns silent, rides every pack slim and the bond-three and kin-tied ride with her; the dead earn no immunity and the unbound famine tail-first exactly as before; the scene floor stands full; when the bound alone overflow they seat by bond, kin before the merely bound, then the elder introduction, byte-stable on the repeat walk; and an unstarved fixture keeps today\u2019s seats in today\u2019s order under storyBlock\u2019s unbroken contract.');
