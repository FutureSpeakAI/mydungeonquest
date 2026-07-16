// ------------------------------------------------------------
// THE SLATE GATE (game) — the Market Law's first seat
// (Directive VI, Phase 3 groundwork).
//
// The folio's slate is a projection of the record through the
// engine's one fold: seeds lock at first witness, drift moves one
// notch per sealed tick toward the pressure the region's scars
// show, a calm region rests, a struck tick moves nothing, an
// uncaused change is a price attack refused by name, and the same
// record reads the same slate byte for byte. Zero keys.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { buildMarket, priceOf, slateLine, NOTCH } = await import('fatescript/market');
const { marketRowsFrom, regionSlate, STAPLES } = await import('../src/lib/market.js');

const SCARRED = { name: 'Harrow Ford', facts: ['Scarred by the flood at the mill (t.9).', 'The well was poisoned on the third night.'] };
const CALM = { name: 'Thornhollow', facts: ['A quiet season.'] };
const tick = (id) => ({ id, kind: 'tick', dm: { narration_blocks: [] } });
const CAMPAIGN = {
  homeRegion: 'Harrow Ford',
  codex: { regions: [SCARRED, CALM] },
  logs: [ { id: 'r1', dm: { narration_blocks: [{ text: 'a turn' }] } }, tick('k1'), tick('k2') ]
};

// 1. SEEDS LOCK AT FIRST WITNESS — deterministic, cited by the fold's
//    own words, byte-identical on replay.
{
  const rows = marketRowsFrom(CAMPAIGN);
  const seeds = rows.filter((row) => row.id.startsWith('price:seed:'));
  assert.equal(seeds.length, STAPLES.length * 2, 'every staple, every witnessed region');
  const market = buildMarket({ entries: rows });
  const bread = priceOf(market, 'Harrow Ford', 'bread');
  assert.ok(bread.locked >= 2 && bread.locked <= 6, 'a house price, 2..6 copper');
  assert.equal(bread.history[0].cause, 'first witnessed', 'the fold itself names the seed');
  assert.equal(JSON.stringify(rows), JSON.stringify(marketRowsFrom(CAMPAIGN)), 'byte-identical on replay');
}

// 2. THE DRIFT — one notch per sealed tick toward the scars' pressure;
//    a calm region rests; a leap never happens.
{
  const rows = marketRowsFrom(CAMPAIGN);
  const market = buildMarket({ entries: rows });
  const bread = priceOf(market, 'Harrow Ford', 'bread');
  const step = Math.max(1, Math.round(bread.locked * NOTCH));
  const target = bread.locked + Math.min(2, 4) * step; // two scars, capped law
  const expectTwoTicks = Math.min(bread.locked + 2 * step, target);
  assert.equal(bread.price, expectTwoTicks, 'two ticks, two notches at most, toward the pressure');
  assert.ok(bread.history.length >= 2, 'drift is cited history');
  assert.ok(bread.history[1].cause.includes('scarcity'), 'the cause names the hunger');
  const calmAle = priceOf(market, 'Thornhollow', 'ale');
  assert.equal(calmAle.price, calmAle.locked, 'a calm region rests at its word');
  assert.equal(calmAle.history.length, 1, 'rest is not history');
}

// 3. A STRUCK TICK MOVES NOTHING.
{
  const struck = { ...CAMPAIGN, logs: [CAMPAIGN.logs[0], { ...tick('k1'), redacted: true }, tick('k2')] };
  const market = buildMarket({ entries: marketRowsFrom(struck) });
  const whole = buildMarket({ entries: marketRowsFrom(CAMPAIGN) });
  const struckBread = priceOf(market, 'Harrow Ford', 'bread');
  const wholeBread = priceOf(whole, 'Harrow Ford', 'bread');
  assert.ok(struckBread.history.length < wholeBread.history.length, 'one fewer tick, one fewer notch');
}

// 4. THE ATTACK COURT SITS IN THE SAME FOLD — an uncaused change over
//    the derived record is refused by name.
{
  const rows = marketRowsFrom(CAMPAIGN);
  const standing = priceOf(buildMarket({ entries: rows }), 'Harrow Ford', 'bread');
  const attack = { id: 'price:attack', kind: 'price', turn: 99, redacted: false, price: { region: 'Harrow Ford', item: 'bread', price: standing.price + 3, cause: '' } };
  const market = buildMarket({ entries: [...rows, attack] });
  assert.equal(priceOf(market, 'Harrow Ford', 'bread').price, standing.price, 'never applied');
  assert.ok(market.refusals.some((r) => r.reason.includes('price attack blocked')), 'refused by name');
}

// 5. THE FOLIO'S RIBBON — the slate speaks the engine's own words for
//    the active region.
{
  const slate = regionSlate(CAMPAIGN);
  assert.equal(slate.region, 'Harrow Ford', 'the active region fronts the slate');
  assert.equal(slate.lines.length, STAPLES.length);
  const market = buildMarket({ entries: marketRowsFrom(CAMPAIGN) });
  assert.equal(slate.lines[0], slateLine(priceOf(market, 'Harrow Ford', STAPLES[0])), 'the ribbon adds no words of its own');
  assert.equal(JSON.stringify(regionSlate(CAMPAIGN)), JSON.stringify(slate), 'the slate replays byte for byte');
  const bare = regionSlate({ codex: { regions: [] }, logs: [] });
  assert.deepEqual(bare.lines, [], 'no region, no slate — never an invented market');
}

// 6. THE WIRING — the engine's fold under the lib, the ribbon on the folio.
{
  const lib = read('src/lib/market.js');
  assert.ok(lib.includes('fatescript/market') && lib.includes('buildMarket'), 'the engine\u2019s market is the only fold');
  assert.ok(lib.includes('driftFor'), 'ticks call the engine\u2019s drift');
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes('regionSlate'), 'the folio draws the slate');
  assert.ok(overlays.includes('The market slate'), 'the ribbon is seated');
}

console.log('PASS \u2014 the slate gate (game): staple seeds lock at first witness and replay byte for byte, drift walks one notch per sealed tick toward the scars\u2019 pressure while calm regions rest and struck ticks move nothing, an uncaused change is a price attack refused by name in the same fold, and the folio\u2019s ribbon speaks the engine\u2019s own slate lines for the active region.');
