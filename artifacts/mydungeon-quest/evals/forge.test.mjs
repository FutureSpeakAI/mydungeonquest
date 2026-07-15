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
console.log('PASS — the forge gate: seeded spins, lawful bones, the Oracle keeps its answers, every field wears an honest die.');
