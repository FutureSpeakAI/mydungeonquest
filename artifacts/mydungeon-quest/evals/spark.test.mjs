// THE SPARK GATE — onboarding as law. Three ready worlds are dealt
// deterministically from the forge's own pools, each distinct and whole;
// the quickstart route is three choices; and the spark row renders one
// tappable card per world, headless.
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { sparks, quickstartPlan } = await import('../src/lib/onboarding.js');
const { TITLES, COVENANTS, TONES } = await import('../src/lib/forgeRolls.js');
const { SparkRow } = await import('../src/components/Sparks.jsx');

const deal = sparks(7);
assert.equal(deal.length, 3);
assert.equal(JSON.stringify(deal), JSON.stringify(sparks(7)), 'same seed, same deal');
assert.notEqual(JSON.stringify(deal), JSON.stringify(sparks(8)), 'a new seed deals a new hand');
assert.equal(new Set(deal.map((s) => s.title)).size, 3, 'three distinct titles');
assert.equal(new Set(deal.map((s) => s.covenant)).size, 3, 'three distinct covenants');
for (const spark of deal) {
  assert.ok(TITLES.includes(spark.title) && COVENANTS.includes(spark.covenant) && TONES.includes(spark.tone), 'every spark comes from the pools');
  assert.ok(/[.!]$/.test(spark.covenant.trim()), 'a covenant is a complete sentence');
}
const plan = quickstartPlan();
assert.ok(plan.taps <= 3, 'three choices or fewer to the table');
assert.equal(plan.steps.length, plan.taps);

let picked = null; let tree;
TestRenderer.act(() => { tree = TestRenderer.create(h(SparkRow, { sparks: deal, disabled: false, onPick: (s) => { picked = s; } })); });
const cards = tree.root.findAllByType('button');
assert.equal(cards.length, 3, 'one card per world');
TestRenderer.act(() => { cards[1].props.onClick(); });
assert.equal(picked.title, deal[1].title, 'a tap adopts the whole spark');
console.log('PASS — the spark gate: three distinct ready worlds dealt from the pools, deterministic by seed, complete sentences all, three taps to the table, one card per world.');
