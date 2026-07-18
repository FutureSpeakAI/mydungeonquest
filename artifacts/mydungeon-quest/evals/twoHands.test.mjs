// THE TWO HANDS GATE (Directive XIII, Law II) — chance and intention as
// equals. Every asked field owns a die and a pen; the pen's ink is
// sovereign (no spin may cross it); the ONE consent is a sovereign
// field's own die. Proven headless on the real components, with the
// sovereign ledger read back from the draft the forge itself writes.
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(`l:${k}`) ? store.get(`l:${k}`) : null), setItem: (k, v) => store.set(`l:${k}`, String(v)), removeItem: (k) => store.delete(`l:${k}`) };
globalThis.sessionStorage = { getItem: (k) => (store.has(`s:${k}`) ? store.get(`s:${k}`) : null), setItem: (k, v) => store.set(`s:${k}`, String(v)), removeItem: (k) => store.delete(`s:${k}`) };
globalThis.window = globalThis.window || { location: { search: '', href: 'http://localhost/' } };

const { mockSmith, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS, fastFields } = await import('fatescript/smith');
const { CLASSES } = await import('fatescript/forgeRolls');
const { WorldForge, HeroForge } = await import('../src/components/Forge.jsx');

const draft = (key) => JSON.parse(store.get(`s:${key}`) || 'null');
const act = (fn) => TestRenderer.act(fn);
const findByLabel = (root, label) => root.findAll((n) => n.type === 'button' && n.props['aria-label'] === label)[0];

// —— The floor itself: deterministic, conditioned, and lock-blind. ——
const a = mockSmith({ scope: 'world', locked: { covenant: 'X' }, seed: 11 });
assert.deepEqual(a, mockSmith({ scope: 'world', locked: { covenant: 'X' }, seed: 11 }), 'same seed, same lock, same hand');
assert.notDeepEqual(a.candidates, mockSmith({ scope: 'world', locked: { covenant: 'Y' }, seed: 11 }).candidates, 'a changed lock re-conditions the deal');
for (const scope of ['world', 'hero']) {
  const keys = scope === 'world' ? WORLD_KEYS : HERO_KEYS;
  for (const lockKey of keys) {
    const out = mockSmith({ scope, locked: { [lockKey]: 'held' }, seed: 3 });
    for (const candidate of out.candidates) assert.ok(!(lockKey in candidate), `${scope}: a candidate never carries the locked key ${lockKey}`);
  }
}
const nameOnly = mockSmith({ scope: 'field', field: 'name', locked: { ancestry: 'Held' }, seed: 5 });
for (const candidate of nameOnly.candidates) assert.deepEqual(Object.keys(candidate), ['name'], 'a field respin touches its field alone');
const calling = mockSmith({ scope: 'field', field: 'className', locked: {}, seed: 5 });
for (const candidate of calling.candidates) {
  assert.deepEqual(Object.keys(candidate).sort(), ['className', ...CALLING_RIDERS].sort(), 'the calling moves as one body');
  const cls = CLASSES.find((c) => c.className === candidate.className);
  assert.deepEqual(candidate.skills, cls.skills, 'the riders agree with the calling');
}
const heldRider = mockSmith({ scope: 'field', field: 'className', locked: { bearing: 'my own bearing' }, seed: 5 });
for (const candidate of heldRider.candidates) assert.ok(!('bearing' in candidate), 'a sovereign rider is dropped from the body');

// —— The pen is sovereign at the world door. ——
let world;
act(() => { world = TestRenderer.create(h(WorldForge, { mediaTier: 'parchment', onBack: () => {}, onContinue: () => {} })); });
const covenantField = world.root.findAll((n) => n.type === 'textarea')[0];
const OWN_INK = 'My own promise of rust and rain.';
await act(async () => { covenantField.props.onChange({ target: { value: OWN_INK } }); });
assert.ok(draft('mdq:forge:world').__sovereign.includes('covenant'), 'the pen marks its ink sovereign in the draft ledger');
const spinButton = world.root.findAll((n) => n.type === 'button' && n.props.className === 'secondary-button')[0];
for (let i = 0; i < 3; i += 1) await act(async () => { spinButton.props.onClick(); });
assert.equal(world.root.findAll((n) => n.type === 'textarea')[0].props.value, OWN_INK, 'three whole-world spins later, the ink stands byte-for-byte');
assert.ok(draft('mdq:forge:world').title !== undefined, 'the spins still wrote the unsovereign remainder');

// A neighbour's die never crosses the ink; the field's OWN die lifts it.
const toneDie = findByLabel(world.root, 'Spin the feel');
const toneBefore = () => draft('mdq:forge:world').tone ?? world.root.findAll((n) => n.type === 'input')[0].props.value;
let toneMoved = false;
for (let i = 0; i < 6 && !toneMoved; i += 1) { const was = toneBefore(); await act(async () => { toneDie.props.onClick(); }); toneMoved = toneBefore() !== was; }
assert.ok(toneMoved, 'the feel\u2019s die moves the feel');
assert.equal(world.root.findAll((n) => n.type === 'textarea')[0].props.value, OWN_INK, 'a neighbour\u2019s die never crosses the ink');
const covenantDie = findByLabel(world.root, 'Spin a promise');
let inkLifted = false;
for (let i = 0; i < 6 && !inkLifted; i += 1) { await act(async () => { covenantDie.props.onClick(); }); inkLifted = world.root.findAll((n) => n.type === 'textarea')[0].props.value !== OWN_INK; }
assert.ok(inkLifted, 'the field\u2019s OWN die is the one consent that lifts its ink');
assert.ok(!draft('mdq:forge:world').__sovereign.includes('covenant'), 'lifted ink returns the field to the dice\u2019s custody');

// —— The pen is sovereign at the hero door, and the calling conditions the cast. ——
let hero;
act(() => { hero = TestRenderer.create(h(HeroForge, { world: { title: 'The Probe' }, mediaTier: 'parchment', onBack: () => {}, onBegin: () => {} })); });
const nameField = hero.root.findAll((n) => n.type === 'input' && n.props.maxLength === 60)[0];
await act(async () => { nameField.props.onChange({ target: { value: 'Karis Vale' } }); });
const callingSelect = hero.root.findAll((n) => n.type === 'select')[0];
const chosen = CLASSES[2].className;
await act(async () => { callingSelect.props.onChange({ target: { value: chosen } }); });
assert.deepEqual(draft('mdq:forge:hero').skills, CLASSES[2].skills, 'choosing a calling seats its whole sheet');
const castButton = hero.root.findAll((n) => n.type === 'button' && n.props.className === 'secondary-button')[0];
for (let i = 0; i < 2; i += 1) await act(async () => { castButton.props.onClick(); });
const after = draft('mdq:forge:hero');
assert.equal(after.name, 'Karis Vale', 'two whole casts later, the penned name stands');
assert.equal(after.className, chosen, 'the chosen calling stands through the cast');
assert.deepEqual(after.skills, CLASSES[2].skills, 'the cast dealt a sheet coherent with the locked calling');
assert.ok(after.__sovereign.includes('name') && after.__sovereign.includes('className'), 'the sovereign ledger names both inks');

// Every fast-path hero field wears BOTH hands on the rendered door.
const heroDice = hero.root.findAll((n) => n.type === 'button' && /\bdice-button\b/.test(String(n.props.className || ''))).map((n) => n.props['aria-label']);
for (const label of ['Spin a name', 'Spin an ancestry', 'Spin a calling', 'Spin the words', 'Spin a mark', 'Spin a keepsake', 'Spin a voice']) {
  assert.ok(heroDice.includes(label), `the die "${label}" waits beside its pen`);
}
assert.equal(fastFields('hero').length, 8, 'eight questions, eight surfaces');

console.log('PASS — the two hands gate: the mock smith deterministic and lock-blind with the calling moving as one body, the pen sovereign through whole spins and neighbour dice at both doors, the own-die consent lifting ink back to the dice, and every fast question wearing both hands.');
