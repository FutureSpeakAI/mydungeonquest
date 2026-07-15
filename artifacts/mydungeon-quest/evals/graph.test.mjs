// THE GRAPH GATE — the [STORY] pack is scene-first, tie-aware, budgeted,
// deterministic, and keeps storyBlock's contract (directives verbatim).
import assert from 'node:assert/strict';
import { initCodex, applyStoryUpdates, storyBlock } from 'fatescript/story';
import { buildContextPack } from 'fatescript/graph';

const hero = { name: 'Sera Vale', ancestry: 'Human', className: 'Knight', presentation: 'feminine' };
let codex = initCodex('classic-epic');
const add = (name, role, extra = {}) => ({ name, role, visual: `${name} in paint`, voice: 'a voice', goal: 'a goal', secret: '', ...extra });
codex = applyStoryUpdates(codex, { cast_add: [
  add('Mirabel', 'her mother, the miller'),
  add('The Regent of Ash', 'villain'),
  add('Tomas', 'a ferryman'), add('Ilse', 'a chandler'), add('Bren', 'a stablehand'), add('Odo', 'a beggar-saint')
] }, { turn: 1 });
// The log is the record: the same ops that built the codex ride in the log,
// exactly as they do at the live table.
const logs = [
  { turn: 1, dm: { narration_blocks: [{ speaker: 'Mirabel', text: 'Come home.' }], story: { cast_add: [
    add('Mirabel', 'her mother, the miller'), add('The Regent of Ash', 'villain'),
    add('Tomas', 'a ferryman'), add('Ilse', 'a chandler'), add('Bren', 'a stablehand'), add('Odo', 'a beggar-saint')
  ] } } },
  { turn: 2, dm: { narration_blocks: [{ speaker: 'Mirabel', text: 'The frost is early.' }, { text: 'Wind moved the wheat.' }], story: null } }
];
const campaign = { hero, codex, logs };

const one = buildContextPack(campaign, { budget: 7000 });
const two = buildContextPack(campaign, { budget: 7000 });
assert.deepEqual(one, two, 'the pack is deterministic');
for (const key of Object.keys(storyBlock(codex))) assert.ok(key in one, `contract key ${key} preserved`);
assert.deepEqual(one.directives, storyBlock(codex).directives, 'directives ride verbatim');
assert.ok(one.scene.present.includes('Mirabel'), 'the speaker is in the scene');
const mira = one.cast.find((s) => s.name === 'Mirabel');
const regent = one.cast.find((s) => s.name === 'The Regent of Ash');
assert.ok(mira.visual && regent.visual, 'scene souls and the villain ride full');
assert.ok(one.scene.ties.some((t) => t.includes('kin')), 'ties surface for the DM');

const tight = buildContextPack(campaign, { budget: 900 });
assert.ok(JSON.stringify(tight).length <= 1400, 'the budget bites');
const odo = tight.cast.find((s) => s.name === 'Odo');
assert.ok(!odo || !odo.visual, 'an off-scene, untied soul never rides full under pressure');
const tightMira = tight.cast.find((s) => s.name === 'Mirabel');
assert.ok(tightMira && tightMira.visual, 'the scene floor is never trimmed');
console.log('PASS — the graph gate: scene-first, tie-aware, budgeted, deterministic, contract intact.');
