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
