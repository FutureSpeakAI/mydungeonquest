// THE KINSHIP GATE (game) — Directive XX, Law VIII at the table: the
// briefing the door actually builds (App.jsx's own seat, buildBriefing
// from fatescript/graph) carries the kinship rider on a fixture
// campaign — the bond-four mother, sixty turns silent, rides slim; the
// kin-tied ride with her — while the contract keys stand whole, a
// pre-kinship save walks the builder DEEP-FROZEN (any hidden write
// throws) with byte-stable output, and the budget holds end to end.
// The engine twin judges the pure fraction's full law (famine order,
// overflow priority, the dead); this gate judges the SEATING: the
// briefing lane the table ships through the door each turn.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initCodex, storyBlock } from 'fatescript/story';
import { buildBriefing, BRIEF_BUDGET } from 'fatescript/graph';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const HERO = { name: 'Sera Vale', className: 'Knight' };

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- The fixture campaign: a long tale whose bound souls went quiet ----
const soul = (name, role, over = {}) => ({
  id: `s-${name.toLowerCase().replace(/\s+/g, '-')}`, name, role,
  visual: `${name}, a weathered face beneath a travel hood`,
  voice: 'a voice', goal: 'a goal', secret: '', status: 'active', bond: 0,
  last_seen: 'the vale road', known_facts: [], bond_arc: [], introduced_turn: 1, ...over
});

function fixtureCodex() {
  const codex = initCodex('classic-epic', {
    arc: { title: 'The Long Vale', evil_plot: 'The Regent drains the vale', stakes: 'Every hearth', style_bible: 'Iron and candlelight' }
  });
  // THE ADVERSARIAL SEATING — what makes this gate BIND. The bound ride
  // at the very TAIL of the cast, so the old tail-first famine would eat
  // them FIRST: under the pre-law builder the mother falls from the
  // briefing and this court reds. Position proves nothing — only the
  // law seats her.
  const cast = [soul('The Regent of Ash', 'villain', { introduced_turn: 1 })];
  for (let i = 1; i <= 40; i += 1) {
    cast.push(soul(`Carter${String(i).padStart(2, '0')}`, 'a carter of the long vale road between the winter fair and the drowned crossing', { introduced_turn: 3 + i }));
  }
  cast.push(
    soul('Petra', 'her sister, a reeve', { bond: 0, introduced_turn: 2 }),
    soul('Wren', 'a fletcher of the low field beyond the winter fair', { bond: 3, introduced_turn: 1 }),
    soul('Maren', 'her mother, the miller', { bond: 4, introduced_turn: 1, last_seen: 'the mill on the west water' })
  );
  codex.cast = cast;
  codex.regions = [{ name: 'The Vale', visual: 'A river vale of slate roofs', state: 'whole' }];
  return codex;
}

function fixtureLogs() {
  const intro = (name, role) => ({ name, role, visual: 'in paint', voice: 'a voice', goal: 'a goal', secret: '' });
  const late = (turn, speaker, text) => ({ turn, dm: { narration_blocks: [{ speaker, text }], story: null } });
  return [
    { turn: 1, dm: { narration_blocks: [{ speaker: 'Maren', text: 'Come home when the wheel turns.' }], story: { cast_add: [
      intro('Maren', 'her mother, the miller'), intro('The Regent of Ash', 'villain'),
      intro('Petra', 'her sister, a reeve'), intro('Wren', 'a fletcher of the low field')
    ] } } },
    late(56, 'Carter01', 'The road is washed out.'),
    late(57, 'Carter02', 'The bridge held.'),
    late(58, 'Carter03', 'The Regent\u2019s men took the toll.'),
    late(59, 'Carter01', 'Snow before the fair, mark it.'),
    late(60, 'Carter02', 'The mill wheel still turns west.'),
    late(61, 'Carter03', 'The vale holds its breath.')
  ];
}

// ---- 1. The pre-kinship save walks the door's own builder deep-frozen ----
// A campaign written before this law carries no new block and no new op —
// the same builder must read it without writing a byte into it, and twice
// must be byte-identical.
const campaign = { id: 'long-tale', title: 'The Long Vale', hero: HERO, codex: fixtureCodex(), logs: fixtureLogs(), completed: false };
deepFreeze(campaign);
const briefing = buildBriefing(campaign);
const again = buildBriefing(campaign);
assert.equal(JSON.stringify(briefing), JSON.stringify(again), 'the briefing is byte-stable on the repeat walk');

// ---- 2. The rider rides the briefing the door ships ----
const maren = briefing.cast.find((s) => s.name === 'Maren');
assert.ok(maren, 'the bond-four mother, sixty turns silent, rides the briefing the door builds');
assert.ok(!maren.visual, 'she rides SLIM — the immunity claims no full seat');
assert.equal(maren.bond, 4, 'the slim shape still speaks her bond');
const petra = briefing.cast.find((s) => s.name === 'Petra');
assert.ok(petra && !petra.visual, 'the bond-zero sister rides by her kin tie alone');
const wren = briefing.cast.find((s) => s.name === 'Wren');
assert.ok(wren && !wren.visual, 'the bond-three fletcher rides by bond alone');
const fallen = [];
for (let i = 4; i <= 40; i += 1) if (!briefing.cast.some((s) => s.name === `Carter${String(i).padStart(2, '0')}`)) fallen.push(i);
assert.ok(fallen.length > 0, 'the budget truly bit on this fixture — unbound carters fell while the bound ride');

// ---- 3. The contract stands whole and the budget holds end to end ----
const block = storyBlock(campaign.codex);
for (const key of Object.keys(block)) assert.ok(key in briefing, `contract key ${key} rides the briefing`);
assert.deepEqual(briefing.directives, block.directives, 'directives ride verbatim');
assert.ok(JSON.stringify(briefing).length <= BRIEF_BUDGET, `the briefing holds its own default budget end to end (saw ${JSON.stringify(briefing).length})`);
assert.equal(Object.keys(briefing)[0], 'calendar', 'the calendar still leads — the briefing\u2019s fixed order is untouched');

// ---- 4. The wiring: the door's briefing IS this builder ----
const app = read('src/App.jsx');
assert.ok(app.includes("import { buildBriefing } from 'fatescript/graph'"), 'the table imports the briefing from the engine\u2019s own graph lane');
assert.ok(app.includes('buildBriefing('), 'the door\u2019s [STORY] seat builds through buildBriefing — the kinship law rides every shipped turn');

console.log('PASS — the kinship gate: the briefing the door builds carries the bond-four mother slim after sixty silent turns and the kin-tied and bond-three ride with her while unbound carters fall; a pre-kinship save walks the builder deep-frozen and byte-stable; the contract keys and the calendar\u2019s lead stand whole; the budget holds end to end; and the door\u2019s own seat ships this builder every turn.');
