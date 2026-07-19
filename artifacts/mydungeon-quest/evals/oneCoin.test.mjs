// THE ONE-COIN GATE (Directive XII §IV, §VII.1) — one purse, one truth.
// The purse ledger is the coin; the mechanical lane is a retired mark
// that raises nothing; the two lanes never sum. The era door reads a
// tale whole: any purse movement for the hero makes it purse-law; none
// makes it legacy, its figure derived and cited from the old lane. The
// migration is derived, cited, sealed once, and only on a WRITABLE
// landing. Keyless, deterministic, fake-indexeddb.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHero } from 'fatescript/rules';
import { initCodex } from 'fatescript/story';
import { oneCoinFigure } from '../src/lib/ledger.js';
import { reconcileLegacyPurse } from '../src/lib/reconcile.js';
import { db } from '../src/lib/db.js';
import { validateDmTurn } from '../src/lib/protocol.js';

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
// III. THE MIGRATION (§IV.5) — derived, cited, sealed once, writable only.
// ---------------------------------------------------------------
await court('a writable legacy tale seals ONE cited reconciliation and becomes purse-law whole', async () => {
  const legacy = tale([goldRow(1, 5)]);
  await db.campaigns.put(legacy);
  const next = await reconcileLegacyPurse(legacy);
  const last = next.logs[next.logs.length - 1];
  assert.equal(last.kind, 'reconciliation');
  assert.deepEqual(last.citations, [0, 1], 'cited to the stake and the row that earned it');
  assert.equal(last.dm.story.purse[0].delta, 15, 'exactly the legacy figure');
  assert.equal(last.dm.story.purse[0].holder, 'Wren');
  const figure = oneCoinFigure(next);
  assert.equal(figure.era, 'purse', 'from that record on, purse-law whole');
  assert.equal(figure.coin, 15, 'the figure crosses the era door unchanged');
  const journal = await db.journal.where('campaignId').equals(next.id).sortBy('i');
  assert.equal(journal.length, 1, 'one record sealed');
  assert.equal(journal[0].type, 'reconciliation');
  assert.deepEqual(journal[0].payload.citations, [0, 1], 'the seal carries the citations');
  assert.equal(next.headHash, journal[0].recordHash, 'the head moves with the seal');
  // sealed ONCE: a second landing derives and writes nothing
  const again = await reconcileLegacyPurse(next);
  assert.equal(again.logs.length, next.logs.length, 'no second reconciliation');
  assert.equal((await db.journal.where('campaignId').equals(next.id).count()), 1);
});

await court('the era door admits one hand \u2014 two parallel landings seal exactly once', async () => {
  const legacy = tale([goldRow(1, 5)]);
  await db.campaigns.put(legacy);
  const [first, second] = await Promise.all([reconcileLegacyPurse(legacy), reconcileLegacyPurse(legacy)]);
  assert.equal(
    await db.journal.where('campaignId').equals(legacy.id).filter((row) => row.type === 'reconciliation').count(),
    1, 'one sealed record in the journal, never two'
  );
  const shelf = await db.campaigns.get(legacy.id);
  assert.equal(shelf.logs.filter((row) => row.kind === 'reconciliation').length, 1, 'one visible row on the shelf');
  assert.equal(shelf.turnCount, 1, 'the chain advanced once');
  assert.equal(shelf.headHash, (await db.journal.where('campaignId').equals(legacy.id).sortBy('i'))[0].recordHash, 'the head stands on the one seal');
  const sealedReturns = [first, second].filter((t) => (Array.isArray(t.logs) ? t.logs : []).some((row) => row.kind === 'reconciliation'));
  assert.ok(sealedReturns.length >= 1, 'at least one hand walks away holding the sealed truth');
  for (const held of sealedReturns) {
    const figure = oneCoinFigure(held);
    assert.equal(figure.era, 'purse');
    assert.equal(figure.coin, 15, 'the figure crosses the era door once, never doubled');
  }
});

await court('read-only, completed, sealed, unplayed, and zero-figure tales are never written', async () => {
  const families = [
    tale([goldRow(1, 5)], { readOnly: true }),
    tale([goldRow(1, 5)], { completed: true }),
    tale([goldRow(1, 5)], { sealedAt: 1720000000000 }),
    tale([]), // unplayed — meets the purse law at its genesis pour instead
    tale([{ id: 'tick-1', kind: 'tick', turn: 1, redacted: false, dm: { story: {} } }]),
    tale([goldRow(1, -10)]) // zero figure — zero moves nothing
  ];
  for (const family of families) {
    const back = await reconcileLegacyPurse(family);
    assert.equal(back, family, 'the very object returns, unwritten');
    assert.equal(await db.journal.where('campaignId').equals(family.id).count(), 0, 'no record sealed');
  }
});

await court('a restored spine continues hash-only and unwritten', async () => {
  const restored = tale([goldRow(1, 5)]);
  await db.keys.put({ campaignId: restored.id, restoredFromVault: true });
  const back = await reconcileLegacyPurse(restored);
  assert.equal(back, restored);
  assert.equal(await db.journal.where('campaignId').equals(restored.id).count(), 0);
});

// ---------------------------------------------------------------
// IV. THE RETIRED MARK (§IV.2) — accepted at the door forever, advised
// nowhere, never emitted by the mock.
// ---------------------------------------------------------------
await court('gold_delta stays lawful at the door — old tales must replay', () => {
  const { errors = [] } = validateDmTurn({ state_updates: { gold_delta: 3 } }, [], {});
  assert.deepEqual(errors.filter((e) => /gold/i.test(e)), [], 'the retired mark raises nothing');
});

await court('the mock never emits the retired mark, and the room never advises it', () => {
  const mock = readFileSync(fileURLToPath(import.meta.resolve('fatescript/mockDm')), 'utf8');
  assert.ok(!/gold_delta/.test(mock), 'the sovereign mock speaks only the purse');
  const room = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
  assert.ok(!/gold_delta/.test(room), 'no schema advises it, no prompt law names it');
});

console.log(`PASS — ONE-COIN GATE: ${courts} courts sat, all green. One purse, one truth, and the lanes never sum.`);
