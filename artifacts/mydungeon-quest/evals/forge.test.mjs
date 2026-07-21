// THE FORGE GATE — every door yields a complete lawful form; the dice are
// deterministic per seed; the Oracle keeps the player's answers.
import assert from 'node:assert/strict';
import { rollWorld, rollHero, oracleWorld, oracleHero, rollTitle, rollAbilities, CLASSES } from 'fatescript/forgeRolls';
import { SPINES } from 'fatescript/spines';

const worldA = rollWorld(7), worldA2 = rollWorld(7), worldB = rollWorld(8);
assert.deepEqual(worldA, worldA2, 'the same seed spins the same world');
assert.notDeepEqual(worldA, worldB, 'different seeds spin different worlds');
for (const key of ['title', 'covenant', 'spineId', 'tone', 'homeRegion', 'styleBible']) assert.ok(worldA[key], `spin fills ${key}`);
assert.ok(SPINES.some((s) => s.id === worldA.spineId), 'the spun spine is a real spine');

const heroA = rollHero(3), heroA2 = rollHero(3);
assert.deepEqual(heroA, heroA2, 'the same seed casts the same bones');
const sum = Object.values(heroA.abilities).reduce((a, b) => a + b, 0);
assert.equal(sum, 72, 'the standard array holds — nothing rolled above the law');
assert.ok(['feminine', 'masculine', 'neutral'].includes(heroA.presentation), 'the bones state a presentation');
for (const key of ['name', 'ancestry', 'className', 'bearing', 'background', 'mark']) assert.ok(heroA[key], `bones fill ${key}`);
assert.ok(CLASSES.some((c) => c.className === heroA.className && c.hitDie === heroA.hitDie), 'class, die, and skills agree');

const ow = oracleWorld({ place: 'a drowned coast', wound: 'its names are being stolen', hope: 'one honest harbor' });
assert.ok(ow.covenant.includes('drowned coast') && ow.covenant.includes('names are being stolen') && ow.covenant.includes('one honest harbor'), 'the Oracle keeps all three answers');
const oh = oracleHero({ path: 'the shadow', virtue: 'patient cunning', keepsake: 'a rival\u2019s glove' });
assert.equal(oh.className, 'Rogue', 'the path chooses the class');
assert.ok(oh.background.includes('patient cunning') && oh.background.includes('glove'), 'virtue and keepsake ride the background');
assert.equal(Object.values(oh.abilities).reduce((a, b) => a + b, 0), 72);

assert.equal(rollTitle(11), rollTitle(11), 'a single field rerolls deterministically');
assert.deepEqual(rollAbilities('Wizard', 5), rollAbilities('Wizard', 5));
// --- THE RESEAT LAW — sovereign ink obeys the calling's own table ---
// A pen-marked grimoire survives candidate reseats, but the calling's owed
// ceilings outrank the pen: reseating a caster into a calling that owes
// nothing prunes every excess row at the door (no unlawful craft ships
// through Begin, no invisible rows wedge behind the closed panel), and
// erased ink drops the pen's mark so the next caster reseat deals one-tap.
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { HeroForge } = await import('../src/components/Forge.jsx');
const { validateSpellPicks, knownCountsFor } = await import('fatescript/grimoire');

let begun = null; let tree;
TestRenderer.act(() => { tree = TestRenderer.create(h(HeroForge, { world: { title: 'The Bench World' }, onBack: () => {}, onBegin: (hero) => { begun = hero; } })); });
const callingSelect = () => tree.root.findAllByType('select').find((sel) => sel.findAllByType('option').some((o) => o.props.value === 'Wizard'));
const reseat = (className) => TestRenderer.act(() => { callingSelect().props.onChange({ target: { value: className } }); });
const beginButton = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'))[0];
const grimoireBoxes = () => tree.root.findAll((n) => n.type === 'input' && n.props.type === 'checkbox');
assert.ok(callingSelect() && beginButton(), 'the forge renders its calling door and its Begin door');

const owedFull = knownCountsFor('full', 1);
reseat('Wizard');
assert.equal(grimoireBoxes().filter((box) => box.props.checked).length, owedFull.cantrips + owedFull.spells, 'a caster reseat deals the exact owed hand (one-tap law)');
assert.equal(beginButton().props.disabled, false, 'the dealt hand opens the door');
TestRenderer.act(() => { grimoireBoxes().find((box) => box.props.checked).props.onChange(); }); // the pen lifts one row — the grimoire is sovereign ink now

reseat('Ranger');
assert.equal(grimoireBoxes().length, 0, 'a calling that owes nothing closes the grimoire panel');
assert.equal(beginButton().props.disabled, false, 'zero owed, zero held: the door stands open, never wedged over invisible rows');
TestRenderer.act(() => { beginButton().props.onClick(); });
assert.ok(begun, 'the chronicle begins');
assert.deepEqual(begun.spells ?? [], [], 'no sovereign caster rows ship on a sheet that owes none (the reseat prune)');

begun = null;
reseat('Wizard');
assert.equal(grimoireBoxes().filter((box) => box.props.checked).length, owedFull.cantrips + owedFull.spells, 'erased ink does not haunt the deal — the hand rides whole again');
assert.equal(beginButton().props.disabled, false, 'the re-dealt hand opens the door');
TestRenderer.act(() => { beginButton().props.onClick(); });
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: begun.spells }).ok, true, 'the shipped grimoire is lawful to the last row');

console.log('PASS — the forge gate: seeded spins, lawful bones, the Oracle keeps its answers, every field wears an honest die.');
