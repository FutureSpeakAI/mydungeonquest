// THE VISUAL BIBLE GATE (engine twin, pure fraction) — every image
// prompt derives identity from the card: presentation and age choose the
// noun (paint under the Tenor Law's discipline), the mark rides verbatim,
// the appearance canon rides whole, the campaign's own style bible opens
// every prompt, and the clause is byte-stable. Loose narration never
// writes an identity. The game addresses this law by its old in-game seat
// ('../src/lib/cinema/prompts.js', a shim re-exporting 'fatescript/cinema/
// prompts'); here we import the engine's true seat directly.
import assert from 'node:assert/strict';
import { identityClause, portraitPrompt, scenePrompt, keyArtPrompt, VISUAL_REGISTER } from '../src/cinema/prompts.js';

assert.equal(identityClause({ presentation: 'feminine', mark: 'a burn in the shape of a key', visual: 'weather-worn leathers' }),
  'a woman; marked by a burn in the shape of a key; appearance canon: weather-worn leathers');
assert.ok(identityClause({ voice_card: { gender: 'masculine', age: 'child' }, visual: 'mud-splashed' }).startsWith('a boy'));
assert.ok(identityClause({ voice_card: { gender: 'neutral', age: 'elder' } }).startsWith('an elderly person'));
assert.equal(identityClause({}), 'a person', 'no stated identity earns the plain noun, never a guess');
assert.ok(identityClause({ gender: 'masculine', age_band: 'adult', visual: 'a clipped grey coat' }).startsWith('a man;'),
  'a SEALED cast entry (Tenor reducer shape) reads its flattened card');
assert.ok(identityClause({ gender: 'feminine', age_band: 'elder' }).startsWith('an elderly woman'), 'age_band rides from the sealed shape');
const soul = { presentation: 'feminine', explicitAge: 'young', mark: 'mismatched eyes, one gold', visual: 'river-grey cloak' };
assert.equal(identityClause(soul), identityClause(soul), 'same card, same bytes');
assert.ok(Object.keys(VISUAL_REGISTER).length === 3);

const campaign = { styleBible: 'TESTBIBLE romantic oil', logs: [], codex: { arc: null, blight: 2, cast: [
  { name: 'Edda', role: 'family', visual: 'a grey shawl and flour-dusted hands', goal: 'hold the ferry-house', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } }
], regions: [{ name: 'Larkspur Vale', visual: 'terraced orchards under chalk', state: 'wounded' }] } };

const portrait = portraitPrompt(campaign, { name: 'Maren', presentation: 'feminine', mark: 'a burn in the shape of a key', visual: 'weather-worn leathers', goal: 'read the stone' });
assert.ok(portrait.startsWith('TESTBIBLE romantic oil'), 'the style bible opens every prompt');
assert.ok(portrait.includes('a burn in the shape of a key'), 'the mark rides verbatim');
assert.ok(portrait.includes('a woman;'), 'presentation chooses the noun');

const cue = { subjects: ['Edda'], region: 'Larkspur Vale', mood: 'dusk at the ferry' };
const scene = scenePrompt(campaign, cue, { prose: 'She waits by the water.', seed: 'turn-9' });
assert.ok(scene.includes('an elderly woman'), 'a cast soul is painted by her stated card');
assert.ok(scene.includes('a grey shawl'), 'the appearance canon rides whole');
assert.ok(scene.includes('terraced orchards') && scene.includes('wounded'), 'the region canon and state ride');
assert.equal(scene, scenePrompt(campaign, cue, { prose: 'She waits by the water.', seed: 'turn-9' }), 'same turn, same brief');
// (56C) THE HONEST FRAME rides the bible: the principal clause crowns the
// cue's first subject by her identity clause, and the closure clause ends
// every subject-bearing scene brief — byte-stable, like every law here.
assert.ok(scene.includes(`Principal presence: Edda, ${identityClause(campaign.codex.cast[0])}`),
  'the principal clause crowns the first subject by her identity clause');
assert.ok(scene.includes('The frame is closed: the only figures in this frame are the named painted souls'),
  'the closure clause ends the brief');
assert.ok(scenePrompt(campaign, { ...cue, crowd: 'background' }, { prose: 'She waits by the water.', seed: 'turn-9' })
  .includes('The frame is closed except its granted crowd'),
  'a granted crowd rides its own closure clause');
assert.ok(keyArtPrompt(campaign).startsWith('TESTBIBLE romantic oil'));
console.log('PASS — the visual bible gate (engine twin, pure fraction): identity is painted from the card (noun by stated presentation and age, mark verbatim, canon whole), the style bible opens every prompt, and the clause is byte-stable.');
