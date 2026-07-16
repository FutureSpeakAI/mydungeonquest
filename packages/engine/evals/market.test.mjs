// THE MARKET GATE — the Market Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { priceEntry, buildMarket, priceOf, pressureOf, driftFor, slateLine } from '../src/market.js';

const witness = [
  priceEntry({ region: 'Harrow Ford', item: 'bread', price: 2, turn: 12 }),
  priceEntry({ region: 'harrow ford', item: 'Bread', price: 2, turn: 14 }),                    // the same word twice
  priceEntry({ region: 'Harrow Ford', item: 'bread', price: 3, turn: 20 }),                    // no cause — an attack
  priceEntry({ region: 'Harrow Ford', item: 'bread', price: 3, cause: 'the war levy', turn: 25 })
];
const market = buildMarket({ entries: witness });
const bread = priceOf(market, 'Harrow Ford', 'bread');

// The first quote locks; the market remembers its word.
assert.equal(bread.locked, 2);
assert.equal(bread.locked_turn, 12);
assert.equal(bread.history.length, 2, 'a repeat is not history and an attack is not history');

// An uncaused change is a price attack: refused, recorded, never applied.
assert.equal(market.refusals.length, 1);
assert.ok(market.refusals[0].reason.includes('price attack blocked'));

// A caused change is history, cited like any other fact.
assert.equal(bread.price, 3);
assert.equal(bread.history[1].cause, 'the war levy');
assert.equal(bread.history[1].turn, 25);

// Pressure is read from the record, never guessed.
const scarred = { name: 'Harrow Ford', facts: ['Scarred by the tidal wave at Saltmere (t.60) — grave.', 'The well was poisoned on the third night.', 'The miller married in spring.'] };
assert.equal(pressureOf(scarred), 2);
assert.equal(pressureOf({ name: 'Thornhollow', facts: ['A quiet season.'] }), 0);

// Drift is causal, one notch at most, and always toward the pressure.
const drift = driftFor(market, scarred, 'bread', 30);
assert.ok(drift, 'a scarred region is a hungry one');
assert.equal(drift.price.price, 4, 'one notch of a quarter of the locked price');
assert.ok(drift.price.cause.includes('scarcity'));
assert.ok(drift.price.cause.includes('2 scars'));
assert.equal(JSON.stringify(driftFor(market, scarred, 'bread', 30).price), JSON.stringify(drift.price), 'the same market drifts the same way');

// Applied drift is just another witness — and the market comes to rest at the pressure line.
const after = buildMarket({ entries: [...witness, drift] });
assert.equal(priceOf(after, 'Harrow Ford', 'bread').price, 4);
assert.equal(driftFor(after, scarred, 'bread', 31), null, 'at the pressure line, the market rests');

// A calm region settles back toward its locked word.
const calm = { name: 'Harrow Ford', facts: ['A quiet season.'] };
const settle = driftFor(after, calm, 'bread', 32);
assert.equal(settle.price.price, 3, 'one notch home, not a plunge');
assert.ok(settle.price.cause.includes('settles toward its word'));

// The slate speaks for the folio, trend and cause in one line.
const line = slateLine(priceOf(after, 'Harrow Ford', 'bread'));
assert.ok(line.includes('bread — 4 copper ▲'));
assert.ok(line.includes('was 2'));

// A world that never quoted a price has no market to drift.
assert.equal(driftFor(market, scarred, 'salt', 30), null, 'nothing here invents a good the record never named');

console.log('PASS \u2014 the market gate: the first quote locks, uncaused change is an attack refused by name, caused change is cited history, drift is causal and one notch at most, and the slate reads trend and reason in the record\u2019s own words.');
