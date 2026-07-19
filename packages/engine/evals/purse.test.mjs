// ------------------------------------------------------------
// THE PURSE GATE (engine twin, pure fraction) — the Ledger Law's
// first seat (Directive VI, Phase 2 groundwork).
//
// The hero's purse and pack are projections of the sealed record:
// trade rows derived deterministically from the turns' own ops,
// folded through the engine's one ledger. Byte-identical on replay,
// struck rows move nothing, a causeless windfall is a receipt and
// never coin, an overdraft is refused whole, goods ride atomically,
// and the conservation court balances the room. Zero keys.
//
// The wiring fraction (the lib compat door, Overlays.jsx drawing the
// projection, the ribbon walking the era door) is React/source-shape
// law and is judged at the table's own gate — the engine seats the
// fold itself, so the lib re-export is the table's own concern.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { buildLedger, assertConservation, tradeRowsFrom, heroPurse, openingStake } from '../src/ledger.js';

const turn = (id, updates, text = 'The road pays its debts.') => ({
  id, dm: { state_updates: updates, narration_blocks: [{ text }] }
});
const CAMPAIGN = {
  hero: { name: 'Aldric', gold: 28, inventory: ['Traveler\u2019s pack', 'Rope'] },
  logs: [
    turn('t1', { gold_delta: 30, chronicle_add: 'the bounty on the marsh wolves' }),
    turn('t2', { gold_delta: -12 }),
    turn('t3', { add_items: ['Rope'] }),
    { id: 't4', redacted: true, dm: { state_updates: { gold_delta: 500 }, narration_blocks: [{ text: 'struck riches' }] } },
    { id: 't5', kind: 'tick', dm: { state_updates: { gold_delta: 500 }, narration_blocks: [{ text: 'offscreen riches' }] } },
    { id: 't6', dm: { state_updates: { gold_delta: 100 }, narration_blocks: [] } }
  ]
};

// 1. THE DERIVATION — record order, stable ids, struck and offscreen rows
//    feeding nothing, the cause carried from the turn's own word.
{
  const rows = tradeRowsFrom(CAMPAIGN);
  assert.deepEqual(rows.map((row) => row.id), ['trade:t1:0', 'trade:t2:1', 'trade:t3:2', 'trade:t6:3'], 'stable ids, struck and tick rows silent');
  assert.equal(rows[0].trade.cause, 'the bounty on the marsh wolves', 'the chronicle line is the cause');
  assert.equal(rows[1].trade.cause, 'The road pays its debts.', 'the narration stands in when the chronicle is silent');
  assert.equal(rows[3].trade.cause, '', 'a wordless windfall stays causeless \u2014 the engine will speak');
  assert.equal(JSON.stringify(rows), JSON.stringify(tradeRowsFrom(CAMPAIGN)), 'byte-identical on replay');
}

// 2. THE PROJECTION — the purse is the record folded, the causeless
//    windfall a receipt and never coin, the pack qty-true.
{
  const purse = heroPurse(CAMPAIGN);
  assert.equal(purse.coin, 10 + 30 - 12, 'opening stake plus the caused movements, nothing else');
  assert.equal(purse.agrees, true, 'the sheet and the ledger tell one story here');
  assert.deepEqual(purse.pack, [{ item: 'Traveler\u2019s pack', qty: 1 }, { item: 'Rope', qty: 1 }]);
  assert.equal(purse.refusals.length, 1);
  assert.equal(purse.refusals[0].reason, 'the world moves nothing without a cause', 'the windfall is a receipt');
  assert.equal(JSON.stringify(heroPurse(CAMPAIGN)), JSON.stringify(purse), 'the projection replays byte for byte');
}

// 3. HONEST DRIFT — a sheet that remembers differently is contradicted
//    out loud, never silently patched.
{
  const drifted = { ...CAMPAIGN, hero: { ...CAMPAIGN.hero, gold: 99 } };
  assert.equal(heroPurse(drifted).agrees, false, 'the record rules; the drift is named');
}

// 4. THE OVERDRAFT — refused whole, wallet untouched; and the room
//    balances under the conservation court.
{
  const overdrawn = { ...CAMPAIGN, logs: [...CAMPAIGN.logs, turn('t7', { gold_delta: -999 })] };
  const purse = heroPurse(overdrawn);
  assert.equal(purse.coin, 28, 'a purse too light pays nothing at all');
  assert.ok(purse.refusals.some((r) => r.reason === 'purse too light'), 'the refusal is a receipt');
  const entries = tradeRowsFrom(overdrawn);
  const opening = openingStake(overdrawn);
  const court = assertConservation(buildLedger({ entries, opening }), { entries, opening });
  assert.equal(court.ok, true, `coin conserved: ${court.errors.join('; ')}`);
}

console.log('PASS \u2014 the purse gate (engine twin, pure fraction): trade rows derive from the sealed record with stable ids and causes in the turn\u2019s own words, struck and offscreen rows move nothing, the coin and pack are byte-identical projections of the engine\u2019s fold, a causeless windfall and an overdraft are receipts rather than coin, drift from the sheet\u2019s old memory is named out loud, and the conservation court balances the room; the lib door and the folio\u2019s ribbon are judged at the table\u2019s own gate.');
