// ---------------------------------------------------------------------------
// THE UNMET GATE — Experience-Directive XVII, Article VI (keyless).
// Presence in canon is NOT presence in the tale. The Book reads the record's
// introduction ledger (a lawful integer stamp, or the grandfather bench for
// tales older than the stamp law) and renders the unmet as ABSENCE — no
// card, no count, no trail note, and no side door (tie chip, soul page,
// sworn chip) may name them. Introduced rows ride WHOLE, verbatim, so
// tomorrow's blocks survive today's reader. Born fail-closed: junk proves
// nothing, a torn fold shows nobody rather than everybody.
// Headless: pure node, no AI keys.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { isIntroduced, introducedCast, introducedNames } from '../src/lib/unmet.js';

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// --- LAW I: the stamp seats a soul ------------------------------------------
check(isIntroduced({ name: 'Maro', introduced_turn: 3 }) === true, 'a lawful integer stamp seats a soul');
check(isIntroduced({ name: 'Maro', introduced_turn: 0 }) === true, 'turn zero is a lawful stamp — genesis introductions count');
check(isIntroduced({ name: 'Maro' }) === false, 'a stampless, traceless soul is unmet');
check(isIntroduced({ name: 'Maro', introduced_turn: null }) === false, 'a null stamp proves nothing');
check(isIntroduced({ name: 'Maro', introduced_turn: '3' }) === false, 'a string stamp proves nothing — the ledger speaks integers');
check(isIntroduced({ name: 'Maro', introduced_turn: 2.5 }) === false, 'a fractional stamp proves nothing');

// --- LAW II: the grandfather bench ------------------------------------------
check(isIntroduced({ name: 'Old Tam', status: 'dead' }) === true, 'a recorded death seats an old soul — the record plainly moved him');
check(isIntroduced({ name: 'Old Tam', last_seen: 'the flooded mill' }) === true, 'a sighting on the record seats an old soul');
check(isIntroduced({ name: 'Old Tam', last_seen: '   ' }) === false, 'a blank sighting proves nothing');
check(isIntroduced({ name: 'Old Tam', bond: 2 }) === true, 'a standing bond seats an old soul');
check(isIntroduced({ name: 'Old Tam', bond: 0 }) === false, 'bond zero alone proves nothing');
check(isIntroduced({ name: 'Old Tam', bond: -1 }) === false, 'a negative bond alone proves nothing');
check(isIntroduced({ name: 'Old Tam', bond_arc: ['met on the road'] }) === true, 'a bond arc on the record seats an old soul');
check(isIntroduced({ name: 'Old Tam', bond_arc: [] }) === false, 'an empty arc proves nothing');
check(isIntroduced({ name: 'Old Tam', known_facts: ['owes the miller'] }) === true, 'a known fact on the record seats an old soul');
check(isIntroduced({ name: 'Old Tam', known_facts: [] }) === false, 'an empty fact ledger proves nothing');

// --- LAW III: born fail-closed ----------------------------------------------
check(isIntroduced({ introduced_turn: 3 }) === false, 'a nameless row proves nothing, stamp or no stamp');
check(isIntroduced({ name: '', introduced_turn: 3 }) === false, 'an empty name proves nothing');
check(isIntroduced({ name: '   ', status: 'dead' }) === false, 'a blank name proves nothing');
check(isIntroduced({ name: 7, status: 'dead' }) === false, 'a non-string name proves nothing');
check([null, undefined, 42, 'soul', [], ['x']].every((junk) => isIntroduced(junk) === false),
  'junk rows prove nothing and never crash the reader');

// --- LAW IV: the shelf's fold — whole rows, absence for the unmet -----------
const met = { name: 'Sera Quill', introduced_turn: 2, future_block: { shape: 'unknown to this reader' }, rumor_ledger: ['heard at the ferry'] };
const villain = { name: 'The Hollow King', role: 'the far shadow', wants: 'the valley' };
const oldDead = { name: 'Old Tam', status: 'dead' };
const campaign = { hero: { name: 'Wren Vale' }, codex: { cast: [met, villain, oldDead, null, 'torn row'] } };
const shelf = introducedCast(campaign);
check(shelf.length === 2, 'the shelf seats exactly the introduced — the unmet villain is ABSENT, not flagged');
check(shelf[0] === met && shelf[1] === oldDead, 'introduced rows ride by REFERENCE — verbatim, never rebuilt');
check(shelf[0].future_block?.shape === 'unknown to this reader' && shelf[0].rumor_ledger?.length === 1,
  'tomorrow\u2019s blocks survive today\u2019s reader — novel fields carried whole');
check(introducedCast(null).length === 0 && introducedCast({}).length === 0 && introducedCast({ codex: { cast: 'torn' } }).length === 0,
  'a torn fold shows nobody rather than everybody');

const spoken = introducedNames(campaign);
check(spoken.has('wren vale'), 'the hero always speaks for herself');
check(spoken.has('sera quill') && spoken.has('old tam'), 'the introduced are spoken, lowercased');
check(!spoken.has('the hollow king'), 'the unmet villain\u2019s name is never uttered');
check(introducedNames({ codex: { cast: [met] } }).size === 1, 'a heroless record still speaks its introduced');
check(introducedNames(campaign, { name: 'Another Hand' }).has('another hand'), 'a passed hero takes the seat when offered');

// --- LAW V: the Book's own seats --------------------------------------------
const book = readFileSync(new URL('../src/components/Book.jsx', import.meta.url), 'utf8');
check(book.includes('try { return introducedCast(campaign); } catch { return []; }'),
  'the shelf folds fail-closed at the Book\u2019s own seat');
check(book.includes('try { return introducedNames(campaign); } catch { return new Set(); }'),
  'the spoken-names fold fails closed too');
check(book.includes('shownCast.map(') && !book.includes('c.cast.map('),
  'the cast shelf renders the introduced fold, never raw canon');
check(book.includes('spoken.has(openSoul.trim().toLowerCase())'),
  'the soul page side door is barred — an unmet name opens nothing');
check(book.split('spoken.has(').length - 1 >= 2,
  'more than one side door checks the spoken ledger — ties cannot name the unmet');
check(book.includes('soulsSwornTo(shownCast'),
  'the sworn chips read the introduced fold — no unmet name on the atlas door');
check(!book.includes('c.cast.length') && !book.includes('>Unmet') && !book.includes('unmet-count'),
  'absence is absence — the Book computes no raw-cast counter and prints no unmet label');

// --- the gate's word --------------------------------------------------------
if (failures > 0) {
  console.error(`FAIL — the unmet gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — the unmet gate: presence in canon is not presence in the tale; the Book reads only the record\u2019s introduction ledger, every side door checks the spoken names, the unmet render as absence on every surface, introduced rows ride whole, and a torn fold shows nobody rather than everybody.');
