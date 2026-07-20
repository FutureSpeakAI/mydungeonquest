// THE ENCHANT GATE (Experience Directive XVIII, Article II) — the rune
// table is bounded and carries no free-form mechanics; the door refuses
// unknown keys, second runes, and unlawful seats; the reducer guards the
// door-blind paths and the briefing speaks the rune. Keyless, pure node.
import assert from 'node:assert/strict';
import { ENCHANT_TABLE, derivedAc, equippedRows } from 'fatescript/armory';
import { ITEM_KINDS, safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { applyStoryUpdates, initCodex, storyBlock } from 'fatescript/story';

// --- 1. The table is bounded and carries no free mechanics ---
const keys = Object.keys(ENCHANT_TABLE);
assert.ok(keys.length >= 3 && keys.length <= 9, 'a single-digit table, as the directive orders');
assert.deepEqual([...keys].sort(), ['flaming', 'keen', 'vicious', 'warded'], 'the four rune keys exactly');
for (const [key, row] of Object.entries(ENCHANT_TABLE)) {
  assert.ok(Array.isArray(row.seats) && row.seats.length > 0 && row.seats.every((kind) => ITEM_KINDS.has(kind)), `${key} seats only on lawful kinds`);
  for (const [rider, value] of Object.entries(row)) {
    if (rider === 'seats') continue;
    assert.ok(Number.isInteger(value) || /^\d+d\d+$/.test(String(value)) || ['fire'].includes(value), `${key}.${rider} is a flat bonus or a table die, nothing free-form`);
  }
}

// --- 2. The door: keys, seats, and the one-rune law ---
const turnWith = (story) => ({ ...safeFallbackTurn('', 3), story });
const ctx = { cast: [], trove: [
  { name: 'a ferry-iron knife', kind: 'weapon', holder: 'Maren' },
  { name: 'an oak shield', kind: 'armor', holder: 'Maren' },
  { name: 'the keen hookblade', kind: 'weapon', holder: 'Maren', enchant: 'keen' }
] };
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'keen' } }), [], ctx).ok, true, 'a lawful rune passes the door');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'sunfire' } }), [], ctx).ok, false, 'an unknown key dies at the door');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'the keen hookblade', holder: 'Maren', enchant: 'vicious' } }), [], ctx).ok, false, 'a second rune dies at the door — one per notable thing, ever');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'an oak shield', holder: 'Maren', enchant: 'flaming' } }), [], ctx).ok, false, 'an unlawful seat dies at the door');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'an oak shield', holder: 'Maren', enchant: 'warded' } }), [], ctx).ok, true, 'warded seats on armor');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a thing never sealed', holder: 'Maren', enchant: 'keen' } }), [], ctx).ok, false, 'an unheld thing takes no rune');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a ferry-iron knife', holder: 'Edda', enchant: 'keen' } }), [], ctx).ok, false, 'the wrong hand takes no rune');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'keen', power: 3 } }), [], ctx).ok, false, 'free mechanics die at the door');
assert.equal(validateDmTurn(turnWith({ item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'keen' } }), [], { cast: [] }).ok, true, 'a bare context waives the holding court, never shape');
assert.equal(validateDmTurn(turnWith({ item_enchant: ['not', 'an', 'object'] }), [], ctx).ok, false, 'an array is not the op');
assert.equal(validateDmTurn(turnWith({ item_add: [{ name: 'a warded buckler', kind: 'armor', holder: 'Maren', note: null, enchant: 'warded' }] }), [], ctx).ok, true, 'born-enchanted armor passes');
assert.equal(validateDmTurn(turnWith({ item_add: [{ name: 'a cursed coin', kind: 'treasure', holder: 'Maren', note: null, enchant: 'keen' }] }), [], ctx).ok, false, 'a rune refuses an unlawful birth seat');
assert.equal(validateDmTurn(turnWith({ item_add: [{ name: 'a strange blade', kind: 'weapon', holder: 'Maren', note: null, enchant: 'moonlit' }] }), [], ctx).ok, false, 'an unknown birth key is refused');

// --- 3. The reducer guards the door-blind paths; the briefing speaks ---
let codex = initCodex();
codex = applyStoryUpdates(codex, { item_add: [
  { name: 'a ferry-iron knife', kind: 'weapon', holder: 'Maren' },
  { name: 'a warded buckler', kind: 'armor', holder: 'Maren', enchant: 'warded' }
] }, { turn: 1 });
assert.equal(codex.trove.find((t) => t.name === 'a warded buckler')?.enchant, 'warded', 'born-enchanted things carry their rune from the first stamp');
codex = applyStoryUpdates(codex, { item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'keen' } }, { turn: 2 });
assert.equal(codex.trove.find((t) => t.name === 'a ferry-iron knife')?.enchant, 'keen', 'the rune takes at the fold');
codex = applyStoryUpdates(codex, { item_enchant: { name: 'a ferry-iron knife', holder: 'Maren', enchant: 'vicious' } }, { turn: 3 });
assert.equal(codex.trove.find((t) => t.name === 'a ferry-iron knife')?.enchant, 'keen', 'a second rune is refused whole — the first stands');
assert.ok(codex.notes.some((note) => note.includes('already carries')), 'the second-rune refusal is a spoken wound');
codex = applyStoryUpdates(codex, { item_enchant: { name: 'a warded buckler', holder: 'Maren', enchant: 'keen' } }, { turn: 4 });
assert.equal(codex.trove.find((t) => t.name === 'a warded buckler')?.enchant, 'warded', 'an unlawful seat is refused at the fold');
codex = applyStoryUpdates(codex, { item_enchant: { name: 'a ferry-iron knife', holder: 'Edda', enchant: 'flaming' } }, { turn: 5 });
assert.equal(codex.trove.find((t) => t.name === 'a ferry-iron knife')?.enchant, 'keen', 'the wrong hand works no rune');
let tickCodex = initCodex();
tickCodex = applyStoryUpdates(tickCodex, { item_add: [{ name: 'a plain blade', kind: 'weapon', holder: 'Maren' }] }, { turn: 1 });
tickCodex = applyStoryUpdates(tickCodex, { item_enchant: { name: 'a plain blade', holder: 'Maren', enchant: 'keen' } }, { turn: 2, tick: true });
assert.ok(!tickCodex.trove.find((t) => t.name === 'a plain blade')?.enchant, 'the offscreen tick may not work runes');
assert.ok(tickCodex.notes.some((note) => note.includes('tick')), 'the tick refusal is a spoken wound');
const spokenRow = storyBlock(codex).trove_state.find((row) => row.name === 'a ferry-iron knife');
assert.equal(spokenRow?.enchant, 'keen', 'trove_state speaks the rune while it stands');
const plainRow = storyBlock(tickCodex).trove_state.find((row) => row.name === 'a plain blade');
assert.ok(plainRow && !('enchant' in plainRow) && !('equipped' in plainRow), 'the runeless keep the old two-key shape — structurally absent, never null');

// --- 4. The rune's numbers come from the table row alone ---
const rows = equippedRows([{ name: 'an oak shield', kind: 'armor', holder: 'Maren', status: 'held', equipped: true, enchant: 'warded' }], 'Maren');
assert.equal(derivedAc({ DEX: 10 }, rows), 13, 'shield 2 + warded 1 over the unarmored 10 — riders read from the row, never prose');

console.log('PASS: the enchant law holds — table bounded, one rune per thing, keys and seats enforced at door and fold');
