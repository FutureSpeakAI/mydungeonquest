// ------------------------------------------------------------
// THE PURSE at the table — the Ledger Law's first seat
// (Directive VI, Phase 2 groundwork).
//
// Coin and goods are never created or destroyed except by explicit,
// cause-bearing op — and the ops already live in the sealed record:
// every DM turn's gold and item movements. This seat DERIVES the
// trade rows from the record (stable ids, no clock, no dice) and
// folds them through the engine's one ledger (fatescript/ledger),
// so the hero's purse and pack in the folio are projections —
// byte-identical on replay, refusals kept as receipts, struck rows
// moving nothing. The world is the one faucet and the one sink,
// and it moves nothing without a cause: a causeless windfall shows
// up as a receipt, not as coin.
//
// The opening stake is the forge's floor (10 coin, the traveler's
// pack) unless the tale carries its own — an elder volume that
// arrived with more will read as honest drift until the saga seam
// writes its stake, and the folio says so out loud.
// ------------------------------------------------------------
import { buildLedger, walletOf, inventoryOf, WORLD } from 'fatescript/ledger';
import { purseOf } from 'fatescript/trove';
import { laneOf, listOf, rowsOf } from 'fatescript/rows';

export function openingStake(campaign) {
  if (campaign?.openingStake) return campaign.openingStake;
  return { [campaign?.hero?.name || 'hero']: { coin: 10, goods: [{ item: 'Traveler\u2019s pack', qty: 1 }] } };
}

// The record's own trades: one derived world-trade per movement, in
// record order, stable ids, struck rows feeding nothing. The cause is
// the turn's own word — the chronicle line first, the narration second;
// a movement with no word at all stays causeless and lets the engine
// refuse it into a receipt.
export function tradeRowsFrom(campaign) {
  const hero = campaign?.hero?.name || 'hero';
  const rows = [];
  rowsOf(campaign?.logs).forEach((log, index) => {
    if (!log || log.redacted) return;
    if (log.kind === 'tick' || log.kind === 'annal' || log.kind === 'span') return;
    const updates = laneOf(laneOf(log.dm)?.state_updates);
    if (!updates) return;
    const cause = String(updates.chronicle_add || listOf(laneOf(log.dm)?.narration_blocks).find((b) => b?.text)?.text || '').slice(0, 160);
    const push = (from, to, coin, goods) => rows.push({
      id: `trade:${log.id}:${rows.length}`, kind: 'trade', turn: log.turn ?? index, redacted: false,
      trade: { from, to, coin, goods, cause }
    });
    const delta = Math.floor(Number(updates.gold_delta || 0));
    if (delta > 0) push(WORLD, hero, delta, []);
    if (delta < 0) push(hero, WORLD, -delta, []);
    const gained = listOf(updates.add_items).map((item) => ({ item: String(item), qty: 1 }));
    if (gained.length) push(WORLD, hero, 0, gained);
    const lost = listOf(updates.remove_items).map((item) => ({ item: String(item), qty: 1 }));
    if (lost.length) push(hero, WORLD, 0, lost);
  });
  return rows;
}

// THE ONE-COIN LAW (Directive XII §IV) — the era door. A tale holding ANY
// purse movement for the hero is purse-law whole: its figure is the purse
// fold and nothing else. A tale holding none is a legacy tale: its figure
// derives from the old lane — the opening stake and every gold_delta row —
// each entry cited to the turn that moved it, struck turns moving nothing.
// The two lanes NEVER sum. One seat; every surface that speaks the hero's
// coin speaks through this door.
export function oneCoinFigure(campaign) {
  const hero = campaign?.hero?.name || 'hero';
  const purse = purseOf(campaign, hero);
  if (purse.entries.length) return { era: 'purse', coin: purse.coin, entries: purse.entries };
  const legacy = heroPurse(campaign);
  const stake = openingStake(campaign)[hero]?.coin ?? 10;
  const entries = [{ delta: stake, reason: 'the opening stake, the forge\u2019s floor', turn: 0, clamped: false }];
  for (const row of tradeRowsFrom(campaign)) {
    if (!row.trade.coin) continue;
    entries.push({
      delta: row.trade.from === hero ? -row.trade.coin : row.trade.coin,
      reason: row.trade.cause || 'the old lane, uncaused',
      turn: row.turn, clamped: false
    });
  }
  return { era: 'legacy', coin: legacy.coin, entries };
}

// The folio's purse: a projection of the record, never a counter.
export function heroPurse(campaign) {
  const hero = campaign?.hero?.name || 'hero';
  const entries = tradeRowsFrom(campaign);
  const opening = openingStake(campaign);
  const ledger = buildLedger({ entries, opening });
  const coin = walletOf(ledger, hero);
  return {
    coin,
    pack: inventoryOf(ledger, hero),
    refusals: ledger.refusals,
    lines: ledger.lines,
    agrees: coin === (campaign?.hero?.gold ?? coin)
  };
}
