// ------------------------------------------------------------
// THE SLATE at the table — the Market Law's first seat
// (Directive VI, Phase 3 groundwork).
//
// The house does not simulate an economy; it witnesses one — and the
// witnessing runs through the engine's one fold (fatescript/market):
// the first quote locks, an uncaused change is a price attack refused
// by name, a caused change is cited history, and drift moves one
// notch per sealed tick toward the pressure the region's scars show.
//
// The staple basket (bread, rope, ale) is the folio's convention: a
// region's first witness seeds each staple at a deterministic house
// price (named as the first witnessed quote — the fold itself says
// so), and only the Living World's own sealed ticks move it after
// that. Stable ids, no clock, no dice: the same record reads the
// same slate, byte for byte.
// ------------------------------------------------------------
import { buildMarket, priceOf, driftFor, slateLine } from 'fatescript/market';

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
