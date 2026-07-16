// THE LEDGER GATE — the Ledger Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { tradeEntry, buildLedger, walletOf, inventoryOf, holds, assertConservation, ledgerLine, WORLD } from '../src/ledger.js';

const opening = {
  hero: { coin: 12, goods: [{ item: 'rowan charm', qty: 1 }, { item: 'torch', qty: 3 }] },
  Mira: { coin: 3 }
};
const entries = [
  tradeEntry({ from: 'hero', to: 'Mira', coin: 5, goods: [{ item: 'rowan charm', qty: 1 }], cause: 'healing at the ford', turn: 41 }),
  tradeEntry({ from: WORLD, to: 'hero', coin: 10, cause: 'the reward for the well', turn: 44 }),
  tradeEntry({ from: 'hero', to: 'Mira', coin: 50, cause: 'a foolish offer', turn: 45 }),            // purse too light — refused
  tradeEntry({ from: 'Mira', to: 'hero', goods: [{ item: 'lantern', qty: 1 }], cause: 'a gift', turn: 46 }), // does not hold it — refused
  tradeEntry({ from: WORLD, to: 'Mira', coin: 99, turn: 47 }),                                        // world without cause — refused
  tradeEntry({ from: 'hero', to: 'hero', coin: 1, cause: 'nonsense', turn: 48 })                      // malformed — refused
];
const build = { entries, opening };
const ledger = buildLedger(build);

// Double-entry, atomically: one row moved both sides, exactly.
assert.equal(walletOf(ledger, 'hero'), 12 - 5 + 10);
assert.equal(walletOf(ledger, 'Mira'), 3 + 5);
assert.ok(holds(ledger, 'Mira', 'rowan charm'), 'the charm arrived');
assert.ok(!holds(ledger, 'hero', 'rowan charm'), 'the charm left');
assert.deepEqual(inventoryOf(ledger, 'hero'), [{ item: 'torch', qty: 3 }], 'the torches never moved');

// Refusals are receipts — recorded with reasons, applied as nothing.
assert.equal(ledger.refusals.length, 4);
assert.ok(ledger.refusals.some((r) => r.reason === 'purse too light'));
assert.ok(ledger.refusals.some((r) => r.reason.includes('does not hold')));
assert.ok(ledger.refusals.some((r) => r.reason.includes('without a cause')), 'the world moves nothing without a cause');
assert.ok(ledger.refusals.some((r) => r.reason === 'malformed'));

// Conservation: every copper traces to the stakes and the cause-bearing faucet.
const court = assertConservation(ledger, build);
assert.ok(court.ok, court.errors.join('; '));
assert.equal(court.held, 25);
assert.equal(court.faucet, 10);

// Byte-identical replay: the same record folds to the same purses.
const snapshot = (led) => JSON.stringify({ wallets: [...led.wallets.entries()], inventories: [...led.inventories.entries()].map(([name, goods]) => [name, [...goods.entries()]]) });
assert.equal(snapshot(ledger), snapshot(buildLedger(build)));

// A struck trade never moves value.
const struck = entries.map((entry, i) => (i === 0 ? { ...entry, redacted: true } : entry));
const struckLedger = buildLedger({ entries: struck, opening });
assert.equal(walletOf(struckLedger, 'Mira'), 3, 'a redacted trade moves nothing');
assert.ok(holds(struckLedger, 'hero', 'rowan charm'));

// The ledger speaks in the record's own terms, citing its turn.
const line = ledgerLine(entries[0].trade, 41);
assert.ok(line.includes('5 copper and the rowan charm'));
assert.ok(line.includes('hero to Mira'));
assert.ok(line.includes('(t.41)'));
assert.equal(ledger.lines.length, 2, 'only applied trades reach the spoken ledger');

console.log('PASS \u2014 the ledger gate: trades move both sides atomically, coin is conserved to the copper, the world gives nothing without a cause, refusals are receipts, struck rows move nothing, and replay is byte-identical.');
