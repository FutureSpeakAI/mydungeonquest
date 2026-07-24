// ------------------------------------------------------------
// THE ELDER MEMORY GATE — Experience Directive XX, Law VII.
//
// The epoch fraction holds or this file turns the build red: the
// keyless floor is deterministic, budgeted, and cited; the citation
// court refuses claims the cited turns do not prove (walked
// adversarially); the quote court folds typography and never wording;
// the ladder reads freshest-act-raw then prior-acts-by-their-seals
// under ONE fixed total budget on a five-act fixture; and the sealed
// row is machinery — an empty dm envelope the book can never speak.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  EPOCH_LIMITS, actEpochSlice, epochSummary, validateEpochSummary,
  epochLadder, epochEntry, buildEpochPrompt
} from '../src/epoch.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- the five-act fixture: spoken turns, machinery, and one redaction ----
const beats = [
  { act: 1, title: 'The Ford' }, { act: 2, title: 'The Toll' }, { act: 3, title: 'The Vale' },
  { act: 4, title: 'The Keep' }, { act: 5, title: 'The Crown' }
];
const emptyDm = () => ({ narration_blocks: [], suggestions: [], roll_request: null, story: null });
const spoken = (turn, beatIndex, player, text, story = null) => ({
  turn, beatIndex, player, redacted: false,
  dm: { narration_blocks: [{ speaker: null, text }], suggestions: [], roll_request: null, story }
});
const entries = [
  spoken(0, 0, 'I cross the ford.', 'The ford lay silver under dawn. Mira said, \u201cCarry it the last mile.\u201d',
    { cast_add: [{ name: 'Mira' }], cast_update: [] }),
  spoken(1, 0, 'I bury Edda.', 'Edda lay still by the reeds; Torvald dug in silence.',
    { cast_add: [{ name: 'Torvald' }], cast_update: [{ name: 'Edda', status: 'dead' }] }),
  { turn: 1, beatIndex: 0, kind: 'annal', redacted: false, annal: 'machinery rides silent', dm: emptyDm() },
  spoken(2, 1, 'I pay the toll.', 'The tollman took the coin with a crooked smile.',
    { cast_add: [{ name: 'Aldric' }], cast_update: [{ name: 'Aldric', fact_add: 'keeps the bridge ledger under the floorboard' }] }),
  spoken(3, 2, 'I light the beacon.', 'The vale answered with fire on every hill.', null),
  spoken(4, 3, 'I open the gate.', 'The keep stood silent; the gate swung wide.', null),
  spoken(5, 4, 'I climb the stair.', 'The crown chamber breathed cold.', null),
  spoken(6, 4, 'I take the crown.', 'Gold, and heavier than gold.', null),
  spoken(7, 4, 'I turn to leave.', 'A door closed somewhere far below.', null),
  { turn: 8, beatIndex: 4, player: 'REDACTEDWORD', redacted: true, dm: { narration_blocks: [{ speaker: null, text: 'REDACTEDWORD' }], suggestions: [] } },
  { turn: 9, beatIndex: 4, kind: 'tick', redacted: false, dm: emptyDm() }
];
const record = deepFreeze({ entries, codex: { spine: { beats }, beatIndex: 4, cast: [], regions: [] }, hero: { name: 'Sable' } });

// ---- COURT 1: the keyless floor — deterministic, budgeted, self-lawful ----
const floor = epochSummary(record, 0);
assert.equal(floor, epochSummary(record, 0), 'the same record composes the same floor, byte for byte');
assert.ok(floor.startsWith('Act 1.'), 'the head is exactly "Act N."');
assert.ok(floor.length <= EPOCH_LIMITS.summary, 'the floor honors the 900-character law');
assert.ok(floor.includes('Edda fell [t1].'), 'the fallen are remembered with their citation');
assert.ok(floor.includes('Mira entered the tale [t0].'), 'arrivals carry the turn that saw them');
const floorVerdict = validateEpochSummary(floor, record, 0);
assert.ok(floorVerdict.ok, `the floor must pass its own court: ${floorVerdict.errors.join('; ')}`);
// The slice sees only the act's spoken rows — machinery and redactions never.
assert.equal(actEpochSlice(record, 0).length, 2, 'act one holds two spoken turns; the annal row is machinery');
assert.equal(actEpochSlice(record, 4).length, 3, 'the redacted turn and the tick are not memory');

// A bloated act still folds under the budget, whole claims only.
const bloatEntries = [];
for (let i = 0; i < 40; i += 1) {
  bloatEntries.push(spoken(i, 0, `I press on, stage ${i}.`, `The road wound on past marker posts and mile stones without end, stage upon stage.`,
    { cast_add: [], cast_update: [{ name: 'Warden', fact_add: `holds the ${'long '.repeat(12)}watch over crossing number ${i} of the great road` }] }));
}
const bloatRecord = deepFreeze({ entries: bloatEntries, codex: { spine: { beats: [{ act: 1 }] }, beatIndex: 0 }, hero: {} });
const bloated = epochSummary(bloatRecord, 0);
assert.ok(bloated.length <= EPOCH_LIMITS.summary, 'even a bloated act folds under the 900-character law');
assert.ok(validateEpochSummary(bloated, bloatRecord, 0).ok, 'the folded floor is still lawful — no claim cut mid-word');

// ---- COURT 2: the citation court, walked adversarially ----
const refused = (text, why) => {
  const verdict = validateEpochSummary(text, record, 0);
  assert.ok(!verdict.ok, `the court must refuse ${why}: ${JSON.stringify(text)}`);
};
refused('Act 1. Mira crossed alone.', 'a claim without its citation');
refused('Act 1. Edda fell [t99].', 'a citation outside the act\u2019s spoken record');
refused('Act 1. Edda fell [t3].', 'a citation into another act');
refused('Act 2. Mira entered the tale [t0].', 'a head naming the wrong act');
refused('Act 1. Torvald fell [t0].', 'a name the cited turn never speaks — proof rides the claim\u2019s OWN citations');
refused(`Act 1. ${'Mira pressed on [t0]. '.repeat(60)}`.trim(), 'a summary over the 900-character law');
assert.ok(validateEpochSummary('Act 1. Torvald dug in silence [t1].', record, 0).ok, 'what the cited turn holds, the court seats');
assert.ok(!validateEpochSummary('', record, 0).ok, 'an empty summary proves nothing');

// ---- COURT 3: the quote court — typography folds, wording never ----
assert.ok(validateEpochSummary('Act 1. Mira said "Carry it the last mile." [t0].', record, 0).ok,
  'a verbatim quote is lawful even across smart and straight marks');
refused('Act 1. Mira said \u201cCarry it the first mile.\u201d [t0].', 'a quote the record never spoke');

// ---- COURT 4: the ladder on five acts — order, one budget, determinism ----
const rows = [
  { actIndex: 0, text: 'Act 1. Mira entered the tale [t0]. Edda fell [t1].' },
  { actIndex: 1, text: 'Act 2. Aldric entered the tale [t2].' },
  { actIndex: 2, text: 'Act 3. The vale answered with fire [t3].' },
  { actIndex: 3, text: 'Act 4. The keep stood silent [t4]. The gate swung wide [t4].' }
];
const ladder = epochLadder(record, rows);
assert.deepEqual(ladder, epochLadder(record, rows), 'the ladder is deterministic');
assert.ok(ladder[0].startsWith('t5:') && ladder[1].startsWith('t6:') && ladder[2].startsWith('t7:'),
  'the freshest act rides raw, in played order');
assert.equal(ladder[3], rows[3].text, 'the elder seals follow, newest act first');
assert.deepEqual(ladder.slice(3), [rows[3].text, rows[2].text, rows[1].text, rows[0].text], 'every earlier act rides as its sealed summary');
assert.ok(!ladder.some((line) => line.includes('REDACTEDWORD')), 'redacted turns never reach the raw block');
assert.ok(!ladder.some((line) => line.includes('machinery rides silent')), 'machinery rows never reach the raw block');
assert.ok(JSON.stringify(ladder).length <= EPOCH_LIMITS.ladder, 'the assembly fits the one fixed budget');

// The budget stays ONE number as the acts stack — three, four, five acts in.
for (const [beatIndex, closed] of [[2, 2], [3, 3], [4, 4]]) {
  const stacked = epochLadder({ ...record, codex: { ...record.codex, beatIndex } }, rows.slice(0, closed));
  assert.ok(JSON.stringify(stacked).length <= EPOCH_LIMITS.ladder, `at ${closed + 1} acts the same fixed budget holds`);
}

// One act re-sealed twice: the NEWEST seal wins its rung.
const resealed = epochLadder(record, [...rows, { actIndex: 3, text: 'Act 4. The keep fell to ash [t4].' }]);
assert.equal(resealed[3], 'Act 4. The keep fell to ash [t4].', 'a re-sealed act rides its newest seal');

// Folds under a tightened budget: the ELDEST seal headlines first (head +
// first cited claim — never the bare head), the newest seal stands whole.
const squeezed = epochLadder(record, rows, { budget: JSON.stringify(ladder).length - 1 });
assert.equal(squeezed[squeezed.length - 1], 'Act 1. Mira entered the tale [t0].', 'the eldest seal folds to head plus first claim');
assert.equal(squeezed[3], rows[3].text, 'the newest seal is the last to fold');
// Starved to the bone, the newest raw line is the floor that never drops.
const starved = epochLadder(record, rows, { budget: 40 });
assert.equal(starved.length, 1, 'the starved ladder keeps one line');
assert.ok(starved[0].startsWith('t7:'), 'and that line is the newest raw turn');

// ---- COURT 5: the row and the charge stay in lockstep with the courts ----
const rowShape = epochEntry('Act 1. Edda fell [t1].', { turn: 9, actIndex: 0, beatIndex: 0, label: 'illuminated' });
assert.equal(rowShape.kind, 'epoch');
assert.equal(rowShape.label, 'illuminated');
assert.equal(epochEntry('x', { label: 'anything-else' }).label, 'floor', 'an unknown label folds to the floor — never mistaken for the illuminated seat');
assert.equal(rowShape.epoch, 'Act 1. Edda fell [t1].');
assert.equal(rowShape.dm.narration_blocks.length, 0, 'the envelope is empty — the book can never speak it');
assert.equal(rowShape.dm.suggestions.length, 0);
assert.equal(rowShape.redacted, false);
// The public shelf and the turning point are curtain surfaces: an epoch
// row crosses neither — no blank unstruck passage, no machinery deed
// (the skip is by KIND — a planted resolution must not tempt the pick).
const { shelfModel, pickTurningPoint } = await import('../src/shareCard.js');
const plantedEpoch = { ...rowShape, resolution: { success: true, dc: 30 } };
assert.equal(shelfModel({ entries: [entries[0], plantedEpoch] }).passages.length, 1,
  'the shelf carries the spoken turn alone — the epoch row never crosses the curtain');
const spokenDeed = { ...entries[1], resolution: { success: true, dc: 5 } };
assert.equal(pickTurningPoint([spokenDeed, plantedEpoch]).entry, spokenDeed,
  'an epoch row can never be the turning point, whatever deed it wears — the lesser spoken deed outranks it');
const charge = buildEpochPrompt({ actIndex: 2, corpus: [{ turn: 4, texts: ['The keep stood silent; the gate swung wide.'] }] });
assert.ok(charge.includes('Act 3.'), 'the charge names the exact head the court will demand');
assert.ok(charge.includes('epoch_summary'), 'the charge binds the one tool');
assert.ok(charge.includes(String(EPOCH_LIMITS.summary)), 'the charge carries the 900-character law');
assert.ok(charge.includes('turn 4'), 'the transcript rides the charge');

console.log('PASS \u2014 the elder memory holds: the floor cites its turns, the courts refuse invention, the ladder keeps one budget however long the tale grows.');
