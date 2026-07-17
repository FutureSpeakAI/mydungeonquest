// THE POISON SWEEP (0.6.3, Task 54 Move Two) — recognition demands bake
// text. A prompt that orders a thing be "unmistakable at a glance" or
// "recognizable" invites the painter to LETTER the plate — the very
// lettering THE UNLETTERED WORLD refuses — and the warden then lawfully
// refuses the render twice and the ask dies. Task 53's last red (the
// blighted-vale refusal) traced to exactly this. The gate sweeps every
// prompt the app builds for the painter and reds on ANY recognition,
// visibility-adverb, or lettering demand. Prominence stays lawful when
// it is demanded through size, framing, form, and silhouette alone.
//
// The engine's frozen UNLETTERED_WORLD clause is excised byte-exact
// before the sweep: it PROHIBITS lettering ("no … labels …", "legible or
// decorative writing", "beyond legibility"), and its lawful nouns must
// not mask a demand hiding elsewhere in the same prompt.
import assert from 'node:assert/strict';
import { UNLETTERED_WORLD } from 'fatescript/unlettered';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';
import { portraitPrompt, regionPrompt, scenePrompt, keyArtPrompt, momentBrief, momentRuling } from '../src/lib/cinema/prompts.js';

// —— The demand families. One pattern per plague-word family. ——
const RECOGNITION_DEMANDS = [
  { name: 'unmistakable', pattern: /unmistakab/i },
  { name: 'at-a-glance', pattern: /at\s+a\s+glance/i },
  { name: 'recognize', pattern: /recogni[sz]/i },
  { name: 'legible', pattern: /legib/i },
  { name: 'label', pattern: /\blabell?(?:ed|ing|s)?\b/i },
  { name: 'adverb-visibility', pattern: /(?:clearly|plainly|unmistakably|obviously|distinctly|prominently)\s+(?:visible|marked|readable|identifiable|present|in\s+frame|in\s+the\s+foreground)/i },
  { name: 'show-plainly', pattern: /show\s+(?:plainly|clearly)/i },
];

const sweep = (text) => {
  const bare = String(text).split(UNLETTERED_WORLD).join(' ');
  return RECOGNITION_DEMANDS.filter(({ pattern }) => pattern.test(bare)).map(({ name }) => name);
};

// —— A sweep that cannot bite is not a tooth: the retired demands trip it. ——
const RELICS = [
  'is plainly visible at this distance: rendered large, sharp, and unmistakable',
  'the palette itself must say abundance at a glance',
  'the change of fortune must be unmistakable at a glance',
  "rendered large and distinct enough to recognize at this plate's distance",
  'must be recognizably the SAME person',
  'must be plainly visible on them',
  'clearly present together, large in the frame, each recognizable by its form',
  'above all, show plainly: the bell',
  // Iteration 54.1's own poison — the beat clause that ordered a LETTER
  // staged "plainly in the foreground"; the warden refused the plate twice
  // and THE TERMINAL ANSWER read the refusal in 1.6 minutes. Never again.
  'stage every thing the telling names (a road, a fork, a bell, a glow, a letter) plainly in the foreground of the frame',
];
for (const relic of RELICS) {
  assert.ok(sweep(relic).length >= 1, `the sweep must bite the retired demand: "${relic}"`);
}

// —— The canonical fixture (the unlettered gate's own donor), every builder. ——
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, {
  cast_add: [{ name: 'Corin Voss', role: 'envoy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } }],
  world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards under chalk' } }
});
const campaign = { styleBible: 'BIBLE', covenant: 'the river covenant', homeRegion: 'Larkspur Vale', tone: 'mythic', hero: { name: 'Maren', mark: 'a burn in the shape of a key', presentation: 'feminine' }, codex, logs: [] };
const vale = codex.regions.find((entry) => entry.name === 'Larkspur Vale');
assert.ok(vale, 'the fixture region seats');

const build = () => ({
  'portrait (marked hero, bust)': portraitPrompt(campaign, { name: 'Maren', mark: 'a burn in the shape of a key', goal: 'reach the vault' }, 'bust'),
  'portrait (unmarked, dramatic)': portraitPrompt(campaign, { name: 'Corin Voss', goal: 'press the claim' }, 'dramatic'),
  'region (thriving)': regionPrompt(campaign, { ...vale, state: 'thriving' }),
  'region (wounded)': regionPrompt(campaign, { ...vale, state: 'wounded' }),
  'region (blighted)': regionPrompt(campaign, { ...vale, state: 'blighted' }),
  'scene (marked hero seated, with moment)': scenePrompt(
    campaign,
    { subjects: ['Maren', 'Corin Voss'], region: 'Larkspur Vale', mood: 'dusk on the terraces' },
    { prose: 'He set the letter on the stone as the bell tolled.', speaker: 'Corin Voss', seed: 't54' }
  ),
  'keyart (establishing)': keyArtPrompt(campaign, 'establishing'),
  'keyart (act-2)': keyArtPrompt(campaign, 'act-2'),
  'keyart (act-3)': keyArtPrompt(campaign, 'act-3'),
  'the moment brief': momentBrief('He set the letter on the stone as the bell tolled.'),
  'the moment repaint note': momentRuling({ moment_staged: false, missing: 'the bell', floor: false, malformed: false }, { attempt: 1 }).notes.join(' '),
});

const first = build();
// The sweep only proves the mark laws clean if the mark laws actually rode.
assert.ok(first['portrait (marked hero, bust)'].includes('never cropped away'), 'the mark clause rides the marked portrait');
assert.ok(first['scene (marked hero seated, with moment)'].includes('facing the viewer'), 'the mark law rides the marked scene');
for (const [name, text] of Object.entries(first)) {
  const hits = sweep(text);
  assert.deepEqual(hits, [], `recognition demand in ${name}: [${hits.join(', ')}]`);
}

// —— Byte-stable: the same ask builds the same bytes, twice. ——
const second = build();
assert.deepEqual(second, first, 'prompt builders are byte-stable across builds');

console.log(`PASS poisonSweep — ${RECOGNITION_DEMANDS.length} demand families swept over ${Object.keys(first).length} built texts; tripwire bit ${RELICS.length} relics; byte-stable`);
