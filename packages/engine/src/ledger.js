// ------------------------------------------------------------
// THE LEDGER — the Ledger Law (Directive VI).
//
// Coins and goods are never created or destroyed except by explicit,
// cause-bearing op. A trade is double-entry: one sealed row moves value
// from one purse to another, atomically — coin and goods together or
// not at all. Wallets and inventories are projections of the trade
// record, byte-identical on replay; a vendor is just a soul with a
// till. The world itself may give and take ('world' is the one lawful
// faucet and the one lawful sink), but never silently: a world trade
// without a cause is refused. And a trade the purse cannot pay is
// refused whole — recorded as a receipt, applied as nothing. The dice
// belong to the player; the coins belong to the ledger.
// ------------------------------------------------------------

export const WORLD = 'world';

const clean = (value, cap = 80) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);

// A sealed trade row. Ordinary record: kind 'trade', dm envelope empty.
export function tradeEntry({ from, to, coin = 0, goods = [], cause = '', turn = 0 } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `trade-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'trade', turn,
    trade: {
      from: clean(from), to: clean(to),
      coin: Math.max(0, Math.floor(Number(coin) || 0)),
      goods: (goods || []).map((line) => ({ item: clean(line.item), qty: Math.max(1, Math.floor(Number(line.qty) || 1)) })),
      cause: clean(cause, 160)
    },
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}

const purseOf = (ledger, name) => {
  if (!ledger.wallets.has(name)) ledger.wallets.set(name, 0);
  if (!ledger.inventories.has(name)) ledger.inventories.set(name, new Map());
  return { coin: ledger.wallets.get(name), goods: ledger.inventories.get(name) };
};

// The fold: every trade row, in record order. Refusals are receipts —
// recorded with their reason, applied as nothing at all.
export function buildLedger({ entries = [], opening = {} } = {}) {
  const ledger = { wallets: new Map(), inventories: new Map(), refusals: [], lines: [] };
  for (const [name, stake] of Object.entries(opening)) {
    ledger.wallets.set(name, Math.max(0, Math.floor(stake.coin || 0)));
    ledger.inventories.set(name, new Map((stake.goods || []).map((line) => [line.item, line.qty])));
  }
  for (const entry of entries) {
    if (entry?.kind !== 'trade' || !entry.trade || entry.redacted) continue;
    const { from, to, coin, goods, cause } = entry.trade;
    const refuse = (reason) => ledger.refusals.push({ turn: entry.turn, from, to, coin, goods, reason });
    if (!from || !to || from === to) { refuse('malformed'); continue; }
    if ((from === WORLD || to === WORLD) && !cause) { refuse('the world moves nothing without a cause'); continue; }
    const giver = purseOf(ledger, from);
    if (from !== WORLD) {
      if (giver.coin < coin) { refuse('purse too light'); continue; }
      const short = goods.find((line) => (giver.goods.get(line.item) || 0) < line.qty);
      if (short) { refuse(`does not hold ${short.item}`); continue; }
    }
    // Atomic: both sides move together, or the receipt above already spoke.
    const taker = purseOf(ledger, to);
    if (from !== WORLD) ledger.wallets.set(from, giver.coin - coin);
    if (to !== WORLD) ledger.wallets.set(to, taker.coin + coin);
    for (const line of goods) {
      if (from !== WORLD) giver.goods.set(line.item, (giver.goods.get(line.item) || 0) - line.qty);
      if (to !== WORLD) taker.goods.set(line.item, (taker.goods.get(line.item) || 0) + line.qty);
      if (from !== WORLD && giver.goods.get(line.item) <= 0) giver.goods.delete(line.item);
    }
    ledger.lines.push(ledgerLine(entry.trade, entry.turn));
  }
  return ledger;
}

// The ledger, spoken — "Five copper and the rowan charm, hero to Mira, for healing (t.41)."
export function ledgerLine(trade, turn) {
  const goods = (trade.goods || []).map((line) => (line.qty > 1 ? `${line.qty}× ${line.item}` : `the ${line.item}`)).join(', ');
  const value = [trade.coin ? `${trade.coin} copper` : '', goods].filter(Boolean).join(' and ') || 'nothing';
  return `${value}, ${trade.from} to ${trade.to}${trade.cause ? `, for ${trade.cause}` : ''} (t.${turn}).`;
}

export function walletOf(ledger, name) { return ledger.wallets.get(name) || 0; }
export function inventoryOf(ledger, name) {
  return [...(ledger.inventories.get(name) || new Map()).entries()].map(([item, qty]) => ({ item, qty }));
}
export function holds(ledger, name, item) { return (ledger.inventories.get(name)?.get(item) || 0) > 0; }

// The conservation court: coin in the room equals coin poured in. Every
// copper traces to the opening stakes plus the world's cause-bearing
// faucet, less what the world took back.
export function assertConservation(ledger, { entries = [], opening = {} } = {}) {
  const poured = Object.values(opening).reduce((sum, stake) => sum + (stake.coin || 0), 0);
  let faucet = 0, sink = 0;
  for (const entry of entries) {
    if (entry?.kind !== 'trade' || !entry.trade || entry.redacted) continue;
    const refused = ledger.refusals.some((r) => r.turn === entry.turn && r.from === entry.trade.from && r.to === entry.trade.to && r.coin === entry.trade.coin);
    if (refused) continue;
    if (entry.trade.from === WORLD) faucet += entry.trade.coin;
    if (entry.trade.to === WORLD) sink += entry.trade.coin;
  }
  const held = [...ledger.wallets.entries()].reduce((sum, [name, coin]) => (name === WORLD ? sum : sum + coin), 0);
  const ok = held === poured + faucet - sink;
  return { ok, held, poured, faucet, sink, errors: ok ? [] : [`coin drifted: holds ${held}, lawful ${poured + faucet - sink}`] };
}
