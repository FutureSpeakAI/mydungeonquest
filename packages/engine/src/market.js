// ------------------------------------------------------------
// THE MARKET — the Market Law (Directive VI).
//
// The house does not simulate an economy; it witnesses one. The first
// time a price is quoted at the table, it locks — canon lock, applied
// to commerce. A later, different price without a stated cause is a
// price attack: refused, recorded, never applied. With a cause it is
// history, cited like any other fact. Between witnesses the market may
// drift, but only as the Living World moves: one notch per tick at
// most, deterministic in (book, region, turn), and always *toward* the
// pressure the record shows — a scarred region is a hungry one. Prices
// are integers in copper; nothing here invents a good the record never
// named.
// ------------------------------------------------------------

export const NOTCH = 0.25;           // one notch of drift: a quarter of the locked price
export const DRIFT_CAP_NOTCHES = 4;  // drift may never carry a price past double or below half

const clean = (value, cap = 80) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);
const keyOf = (region, item) => `${clean(region).toLowerCase()}::${clean(item).toLowerCase()}`;

// A sealed price witness. Ordinary record: kind 'price', dm envelope empty.
export function priceEntry({ region, item, price, cause = '', turn = 0 } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `price-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'price', turn,
    price: { region: clean(region), item: clean(item), price: Math.max(1, Math.floor(Number(price) || 1)), cause: clean(cause, 160) },
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}

// The fold: first witness locks; change requires cause; attacks are receipts.
export function buildMarket({ entries = [] } = {}) {
  const market = { book: new Map(), refusals: [] };
  for (const entry of entries) {
    if (entry?.kind !== 'price' || !entry.price || entry.redacted) continue;
    const { region, item, price, cause } = entry.price;
    const key = keyOf(region, item);
    const standing = market.book.get(key);
    if (!standing) {
      market.book.set(key, { region, item, locked: price, price, locked_turn: entry.turn, history: [{ price, cause: cause || 'first witnessed', turn: entry.turn }] });
      continue;
    }
    if (price === standing.price) continue; // the same word twice is still the same word
    if (!cause) {
      market.refusals.push({ turn: entry.turn, region, item, price, reason: 'price attack blocked: the market remembers its word' });
      continue;
    }
    standing.price = price;
    standing.history.push({ price, cause, turn: entry.turn });
  }
  return market;
}

export function priceOf(market, region, item) {
  return market.book.get(keyOf(region, item)) || null;
}

// The pressure a region's record puts on its market: every scar on the
// region card is a mouth the market must feed. Pressure is read, never
// guessed — a scar is a fact whose text carries the wound.
const SCAR_WORDS = /scar|burn|flood|ruin|poison|drown|blight|razed|wave|famine/i;
export function pressureOf(regionCard = {}) {
  const facts = regionCard.facts || regionCard.known_facts || [];
  return facts.filter((fact) => SCAR_WORDS.test(String(fact))).length;
}

// The drift: one notch per tick at most, deterministic, always toward
// the pressure baseline (locked price grown by one notch per point of
// pressure, capped). A calm region drifts home; a scarred one climbs.
// Returns a cause-bearing price entry, or null when the market is at rest.
export function driftFor(market, regionCard, item, turn) {
  const standing = priceOf(market, regionCard.name, item);
  if (!standing) return null;
  const pressure = Math.min(DRIFT_CAP_NOTCHES, pressureOf(regionCard));
  const step = Math.max(1, Math.round(standing.locked * NOTCH));
  const target = standing.locked + pressure * step;
  if (standing.price === target) return null;
  const next = standing.price + Math.sign(target - standing.price) * step;
  const settled = Math.sign(target - standing.price) !== Math.sign(target - next) ? target : next;
  return priceEntry({
    region: regionCard.name, item,
    price: Math.max(1, settled),
    cause: pressure > 0 ? `scarcity — the record shows ${pressure} scar${pressure === 1 ? '' : 's'} on ${regionCard.name}` : `the market settles toward its word`,
    turn
  });
}

// The slate, spoken for the folio — "Bread — 3 copper ▲ (was 2, t.12: scarcity)."
export function slateLine(quote) {
  const last = quote.history[quote.history.length - 1];
  const glyph = quote.price > quote.locked ? '▲' : quote.price < quote.locked ? '▼' : '—';
  return `${quote.item} — ${quote.price} copper ${glyph}${quote.history.length > 1 ? ` (was ${quote.locked}, t.${last.turn}: ${last.cause})` : ''}`;
}

// ------------------------------------------------------------
// THE SLATE at the table — the Market Law's first seat (Directive
// VI, Phase 3 groundwork), seated home with the parity cut.
//
// The house does not simulate an economy; it witnesses one — and the
// witnessing runs through the one fold above: the first quote locks,
// an uncaused change is a price attack refused by name, a caused
// change is cited history, and drift moves one notch per sealed tick
// toward the pressure the region's scars show.
//
// The staple basket (bread, rope, ale) is the folio's convention: a
// region's first witness seeds each staple at a deterministic house
// price (named as the first witnessed quote — the fold itself says
// so), and only the Living World's own sealed ticks move it after
// that. Stable ids, no clock, no dice: the same record reads the
// same slate, byte for byte.
// ------------------------------------------------------------
export const STAPLES = ['bread', 'rope', 'ale'];

// The house's seed price: deterministic in (region, item), 2..6 copper.
const seedPrice = (region, item) => {
  const word = `${String(region).toLowerCase()}::${String(item).toLowerCase()}`;
  let sum = 0;
  for (const ch of word) sum = (sum + ch.charCodeAt(0)) % 997;
  return 2 + (sum % 5);
};

const stableRow = (id, turn, price) => ({ id, kind: 'price', turn, redacted: false, price });

// The record's own quotes: seeds at first witness, then one drift pass
// per sealed tick row, in record order — each drift folded before the
// next is asked, so a notch is a notch and never a leap.
export function marketRowsFrom(campaign) {
  const regions = campaign?.codex?.regions || [];
  const rows = [];
  for (const region of regions) {
    for (const item of STAPLES) {
      rows.push(stableRow(`price:seed:${region.name}:${item}`, 0, {
        region: region.name, item, price: seedPrice(region.name, item), cause: ''
      }));
    }
  }
  (campaign?.logs || []).forEach((log, index) => {
    if (!log || log.redacted || log.kind !== 'tick') return;
    const market = buildMarket({ entries: rows });
    for (const region of regions) {
      for (const item of STAPLES) {
        const drift = driftFor(market, region, item, index);
        if (drift) rows.push(stableRow(`price:drift:${log.id}:${region.name}:${item}`, index, drift.price));
      }
    }
  });
  return rows;
}

// The folio's slate: the active region's staples, spoken in the
// engine's own words, with any attack receipts alongside.
export function regionSlate(campaign, regionName = null) {
  const regions = campaign?.codex?.regions || [];
  const region = regionName || regions[0]?.name || campaign?.homeRegion || null;
  const entries = marketRowsFrom(campaign);
  const market = buildMarket({ entries });
  const lines = region
    ? STAPLES.map((item) => priceOf(market, region, item)).filter(Boolean).map((quote) => slateLine(quote))
    : [];
  return { region, lines, refusals: market.refusals };
}
