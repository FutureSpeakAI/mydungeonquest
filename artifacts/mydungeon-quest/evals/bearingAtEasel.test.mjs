// ------------------------------------------------------------
// THE BEARING-AT-EASEL GATE — Directive VI, the bearing's wiring.
//
// The engine's bearing gate proves the law; THIS gate proves the
// easel obeys it: paint prompts speak through bearingFor/bearingBlock
// (locked canon verbatim, age from the clock, the dead never aging),
// the roster seats at most three painted subjects — speaker, then
// villain, then bond — with everyone else staged in prose, the same
// seating rides the reference anchors, and the whole brief is
// deterministic. Keyless: prompts are judged as text; no paint flows.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { portraitPrompt, scenePrompt, sceneRoster } from '../src/lib/cinema/prompts.js';
import { yearsSinceTurn } from '../src/lib/clockAtTable.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const soulAdd = (name, role, visual, age = 'adult') => ({
  name, role, visual, voice: 'low and even', goal: 'endure the season',
  voice_card: { gender: 'neutral', age, timbre: 'dry' },
});
const dmRow = (ops = {}) => ({ dm: { narration_blocks: [], story: ops }, ts: 1, redacted: false });

const WREN_VISUAL = 'a reed-thin scout in a patched green cloak';
const VEX_VISUAL = 'a pale usurer in raven silks';
const MORA_VISUAL = 'a broad ferrywoman with rope-scarred hands';
const TOLL_VISUAL = 'a stooped gatekeeper under a rusted bell';

const campaign = {
  id: 'c-easel', title: 'The Easel Trial', styleBible: 'Ink and candle-gold',
  homeRegion: 'The Vale', lines: [], veils: [],
  hero: { name: 'Bram', bearing: 'a lean woodsman with storm-grey eyes', mark: 'a copper-banded quarterstaff', pronouns: 'he/him', level: 1 },
  codex: {
    arc: {}, blight: 1,
    cast: [
      { name: 'Wren', visual: WREN_VISUAL, goal: 'find her brother' },
      { name: 'Vex', visual: VEX_VISUAL, goal: 'own the vale' },
      { name: 'Mora', visual: MORA_VISUAL, goal: 'keep the crossing' },
      { name: 'Toll', visual: TOLL_VISUAL, goal: 'ring true' },
    ],
    regions: [{ name: 'The Vale', visual: 'terraced orchards under mist', state: 'uneasy' }],
  },
  logs: [
    dmRow({ cast_add: [
      soulAdd('Wren', 'scout', WREN_VISUAL, 'young'),
      soulAdd('Vex', 'villain', VEX_VISUAL),
      soulAdd('Mora', 'ferrywoman', MORA_VISUAL),
      soulAdd('Toll', 'gatekeeper', TOLL_VISUAL, 'elder'),
    ] }),
    { kind: 'span', clock_advance: { unit: 'years', n: 20 }, cause: 'the long peace', turn: 0, dm: null },
    dmRow({ cast_update: [{ name: 'Mora', status: 'dead' }] }),
  ],
};

// 1. The clock's own arithmetic: a span after a turn ages that turn's
//    souls; a soul introduced after the span is untouched by it.
{
  assert.equal(yearsSinceTurn(campaign.logs, 0), 20, 'the span falls after turn 0 — twenty years walked');
  assert.equal(yearsSinceTurn(campaign.logs, 1), 0, 'turn 1 seals after the span — no years since');
  assert.equal(yearsSinceTurn([], 0), 0, 'an empty record has walked nowhere');
}

// 2. The card is the prompt: locked visual VERBATIM, age from the clock.
//    Wren entered young; twenty years make an adult — the prompt says so.
{
  const wren = portraitPrompt(campaign, campaign.codex.cast[0], 'bust');
  assert.ok(wren.includes(WREN_VISUAL), 'the locked canon rides verbatim, never paraphrased');
  assert.ok(wren.includes('Aged forward'), 'twenty years show — age comes from the clock, not the card');
  const vex = portraitPrompt(campaign, campaign.codex.cast[1], 'bust');
  assert.ok(vex.includes(VEX_VISUAL), 'every painted soul wears its own canon');
}

// 3. THE DEAD NEVER AGE — and rest is named. Mora fell; her band froze.
{
  const mora = portraitPrompt(campaign, campaign.codex.cast[2], 'bust');
  assert.ok(mora.includes('at rest'), 'the dead sit for the painter at rest');
  assert.ok(!mora.includes('Aged forward'), 'the dead never age — the span does not touch her');
}

// 4. The hero's mark rides the paint — the signature the forge chalked
//    lives inside the locked canon, so the paint can hold it.
{
  const bram = portraitPrompt(campaign, { name: 'Bram', visual: 'unused fallback', goal: 'stand' }, 'bust');
  assert.ok(bram.includes('copper-banded quarterstaff'), 'the mark is in the brief — the paint follows it');
}

// 5. THE ROSTER — speaker first, then villain, then the rest by bond and
//    name; capped at three; the staged are named in prose, not painted.
{
  const cue = { kind: 'scene', mood: 'a tense crossing', subjects: ['Wren', 'Vex', 'Mora', 'Toll'], region: 'The Vale' };
  const moment = { prose: 'The bell rings once.', seed: 'seed-1', speaker: 'Toll' };
  const roster = sceneRoster(campaign, cue, moment);
  assert.deepEqual(roster.painted.map((seat) => seat.name), ['Toll', 'Vex', 'Mora'], 'speaker, then villain, then the quiet order');
  assert.deepEqual(roster.staged, ['Wren'], 'the fourth chair is staged, not painted');
  const scene = scenePrompt(campaign, cue, moment);
  assert.ok(scene.includes(TOLL_VISUAL), 'the speaker is painted');
  assert.ok(scene.includes(VEX_VISUAL), 'the villain is painted');
  assert.ok(!scene.includes(WREN_VISUAL), 'the staged soul lends no canon to the plate');
  assert.ok(scene.includes("staged in the scene's prose: Wren"), 'the staged are named honestly in prose');
  assert.ok(scene.includes('The Vale region canon'), 'the region still speaks');
}

// 6. Determinism — the same turn briefs the same plate, byte for byte.
{
  const cue = { kind: 'scene', mood: 'a tense crossing', subjects: ['Wren', 'Vex', 'Mora', 'Toll'], region: 'The Vale' };
  const moment = { prose: 'The bell rings once.', seed: 'seed-1', speaker: 'Toll' };
  assert.equal(scenePrompt(campaign, cue, moment), scenePrompt(campaign, cue, moment), 'one turn, one brief');
  assert.equal(portraitPrompt(campaign, campaign.codex.cast[0]), portraitPrompt(campaign, campaign.codex.cast[0]), 'one soul, one sitting');
}

// 7. THE WIRING — the easel speaks the engine's own words, and the job
//    bench seats references by the same roster.
{
  const prompts = read('src/lib/cinema/prompts.js');
  // The parity cut seated the easel home: the lib is the engine's door, whole.
  assert.ok(prompts.includes("export * from 'fatescript/cinema/prompts'"), 'the easel speaks from its one seat');
  const engineEasel = read('../../packages/engine/src/cinema/prompts.js');
  assert.ok(engineEasel.includes('bearingBlock'), 'the easel speaks bearingBlock');
  assert.ok(engineEasel.includes('paintRoster'), 'the easel seats by paintRoster');
  const app = read('src/App.jsx');
  assert.ok(app.includes('speaker: (dm.narration_blocks'), 'the moment carries the first voice to the roster');
  assert.ok(app.includes('sceneRoster('), 'reference anchors follow the painted, never the merely present');
}

console.log('PASS — the bearing at the easel: locked canon rides verbatim, age walks in from the clock and never touches the dead, the mark stays in the brief, the roster seats speaker–villain–bond and caps at three with the staged named in prose, references follow the painted, and the same turn briefs the same plate byte for byte.');
