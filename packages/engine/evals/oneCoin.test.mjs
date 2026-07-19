// THE ONE-COIN GATE (engine twin, pure fraction — Directive XII §IV,
// §VII.1) — one purse, one truth. The purse ledger is the coin; the
// mechanical lane is a retired mark that raises nothing; the two lanes
// never sum. The era door reads a tale whole: any purse movement for the
// hero makes it purse-law; none makes it legacy, its figure derived and
// cited from the old lane. Keyless, deterministic.
//
// The migration fraction (§IV.5: derived, cited, sealed once, on a
// WRITABLE landing only) rides Dexie/fake-indexeddb over src/lib/db.js
// and src/lib/reconcile.js — persistence law judged at the table's own
// gate; the engine holds no database.
// The room-advises-nothing check reads the game's own server/dm.js —
// that server law is judged at the table's own gate; the engine has no
// server. The engine's sovereign mock is twinned here directly.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHero } from '../src/rules.js';
import { initCodex } from '../src/story.js';
import { oneCoinFigure } from '../src/ledger.js';
import { validateDmTurn } from '../src/protocol.js';

let courts = 0;
const court = (name, fn) => Promise.resolve(fn()).then(() => { courts += 1; console.log(`  ✓ ${name}`); });

// —— builders ——
const goldRow = (turn, delta, extra = {}) => ({
  id: `log-${turn}`, kind: 'turn', turn, redacted: false,
  dm: {
    narration_blocks: [{ text: `Coin moved on turn ${turn}.` }],
    state_updates: { gold_delta: delta, chronicle_add: `The old lane stirred on turn ${turn}.` },
    story: {}
  },
  ...extra
});
const purseRow = (turn, delta, reason, holder = 'Wren', extra = {}) => ({
  id: `log-${turn}`, kind: 'turn', turn, redacted: false,
  dm: { narration_blocks: [{ text: `The purse spoke on turn ${turn}.` }], story: { purse: [{ holder, delta, reason }] } },
  ...extra
});
let serial = 0;
const tale = (logs, extra = {}) => ({
  id: `onecoin-${serial += 1}`, title: 'The Ledger Proof',
  hero: createHero({ name: 'Wren' }), codex: initCodex('classic-epic'),
  logs, turnNumber: logs.length, ...extra
});

// ---------------------------------------------------------------
// I. THE ERA DOOR (§IV.4) — purse-law whole, or legacy derived and cited.
// ---------------------------------------------------------------
await court('a tale with purse movements is purse-law whole', () => {
  const figure = oneCoinFigure(tale([purseRow(2, 4, 'a wager won')]));
  assert.equal(figure.era, 'purse');
  assert.equal(figure.coin, 4);
  assert.equal(figure.entries.length, 1);
  assert.equal(figure.entries[0].turn, 2, 'cited to the row\u2019s own sealed turn');
});

await court('a tale with none derives from the old lane, every row cited, the stake at turn zero', () => {
  const figure = oneCoinFigure(tale([goldRow(1, 5), goldRow(2, -3)]));
  assert.equal(figure.era, 'legacy');
  assert.equal(figure.coin, 12, '10 stake + 5 - 3');
  assert.deepEqual(figure.entries.map((e) => e.turn), [0, 1, 2], 'stake first, then the rows');
  assert.ok(figure.entries[0].reason.includes('opening stake'), 'the stake names itself');
  assert.ok(figure.entries.slice(1).every((e) => e.reason.length > 0), 'every movement carries its cause');
});

await court('struck turns move nothing in either era', () => {
  const legacy = oneCoinFigure(tale([goldRow(1, 5), goldRow(2, -3, { redacted: true })]));
  assert.equal(legacy.coin, 15, 'the struck loss never happened');
  assert.deepEqual(legacy.entries.map((e) => e.turn), [0, 1], 'no citation to a struck turn');
  const purse = oneCoinFigure(tale([purseRow(1, 6, 'honest work'), purseRow(2, 9, 'a lie', 'Wren', { redacted: true })]));
  assert.equal(purse.era, 'purse');
  assert.equal(purse.coin, 6, 'the struck purse row feeds nothing');
});

await court('a tale whose only purse rows are struck reads as legacy — strikes outrank', () => {
  const figure = oneCoinFigure(tale([purseRow(1, 9, 'a lie', 'Wren', { redacted: true }), goldRow(2, 2)]));
  assert.equal(figure.era, 'legacy', 'no standing purse movement, no purse era');
  assert.equal(figure.coin, 12);
});

await court('the purse fold clamps at zero and says so', () => {
  const figure = oneCoinFigure(tale([purseRow(1, 2, 'a start'), purseRow(2, -5, 'a robbery')]));
  assert.equal(figure.coin, 0);
  assert.equal(figure.entries[1].clamped, true, 'the clamp is on the record');
});

// ---------------------------------------------------------------
// II. THE TWO LANES NEVER SUM (§IV.3).
// ---------------------------------------------------------------
await court('a purse-era figure ignores the old lane entirely', () => {
  const mixed = tale([goldRow(1, 50), purseRow(2, 4, 'a wager won'), goldRow(3, 50)]);
  mixed.hero.gold = 99; // the shadow may drift; no surface reads it
  const figure = oneCoinFigure(mixed);
  assert.equal(figure.era, 'purse');
  assert.equal(figure.coin, 4, 'never 4+100, never 99 — the purse fold and nothing else');
});

await court('another soul\u2019s purse is not the hero\u2019s era', () => {
  const figure = oneCoinFigure(tale([purseRow(1, 7, 'a companion\u2019s pay', 'Karsa'), goldRow(2, 2)]));
  assert.equal(figure.era, 'legacy', 'Karsa\u2019s purse does not open the hero\u2019s era door');
  assert.equal(figure.coin, 12, 'and her coin never sums into it');
});

// ---------------------------------------------------------------
// III. THE RETIRED MARK (§IV.2) — accepted at the door forever, advised
// nowhere, never emitted by the mock.
// ---------------------------------------------------------------
await court('gold_delta stays lawful at the door — old tales must replay', () => {
  const { errors = [] } = validateDmTurn({ state_updates: { gold_delta: 3 } }, [], {});
  assert.deepEqual(errors.filter((e) => /gold/i.test(e)), [], 'the retired mark raises nothing');
});

await court('the sovereign mock never emits the retired mark', () => {
  const mock = readFileSync(fileURLToPath(import.meta.resolve('../src/mockDm.js')), 'utf8');
  assert.ok(!/gold_delta/.test(mock), 'the sovereign mock speaks only the purse');
});

console.log(`PASS — the ONE-COIN gate (engine twin, pure fraction): ${courts} courts sat, all green. One purse, one truth, and the lanes never sum; the migration seal and the server prompt-law are judged at the table\u2019s own gate.`);
