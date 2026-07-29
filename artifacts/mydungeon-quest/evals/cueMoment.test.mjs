// J2 — cueMoment (P18/Rule 28: cue composition after removal of prop-staging directive)
//
// Stage 5 J0 identified P18 as the root cause of scene-plate contamination:
// scenePrompt's beat clause told the painter to "stage every thing the telling
// names (a road, a fork, a bell, a glow, a lantern) large in the foreground of
// the frame, filling a commanding share of it, each named thing carried by its
// form and silhouette alone". This made non-present objects named in the
// narration prose dominant visual elements of the plate.
//
// J2 rewrites the beat clause: the cue carries who is present, where they
// stand, what is happening, and the light. It does NOT lift nouns from the
// narration prose and stage them as foreground objects.
//
// Courts:
//  ① The P18 contamination phrase is gone from scenePrompt source
//  ② The beat clause still depict who/where/what/light (essential elements)
//  ③ The beat-wins rule (time/day/weather/light from moment) is still present
//  ④ The written-matter rule (WRITTEN objects → closed/turned) is still present
//  ⑤ The telling's words are still stage directions only
//  ⑥ Functional: a fixture moment produces a prompt without the forbidden phrase
//  ⑦ Functional: a fixture moment with a named prop does NOT generate a
//     "large in the foreground" directive for that prop in the final prompt

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// The prompts.js in the game re-exports from the engine package.
// Read the engine's source directly (the re-export proves the engine wins).
const enginePromptsPath = path.resolve(ROOT, '../../packages/engine/src/cinema/prompts.js');
const engineSrc = readFileSync(enginePromptsPath, 'utf8');

// ① P18 contamination phrase must be gone
assert.ok(
  !engineSrc.includes('stage every thing the telling names'),
  'P18: the "stage every thing the telling names" phrase must be removed from scenePrompt',
);
assert.ok(
  !engineSrc.includes('large in the foreground of the frame, filling a commanding share'),
  'P18: the "large in the foreground" prop-staging directive must be removed from scenePrompt',
);

// ② Beat clause still carries who/where/what/light
assert.ok(
  engineSrc.includes('who is present') && engineSrc.includes('where they stand'),
  'J2 beat clause must state who is present and where they stand',
);
assert.ok(
  engineSrc.includes('what is happening') && engineSrc.includes('the light'),
  'J2 beat clause must state what is happening and the light',
);

// ③ Beat-wins rule still present
assert.ok(
  engineSrc.includes('beat wins') && engineSrc.includes('from the moment alone'),
  'beat-wins rule (time/day/weather from moment alone) must still be in the beat clause',
);

// ④ Written-matter rule still present
assert.ok(
  engineSrc.includes('WRITTEN') && engineSrc.includes('closed or turned object'),
  'written-matter rule (WRITTEN → closed/turned object) must still be in the beat clause',
);

// ⑤ Stage-directions-only rule still present
assert.ok(
  engineSrc.includes('stage directions only') && engineSrc.includes('never painted as visible writing'),
  'telling\'s words are stage directions only — must still be in the beat clause',
);

// ⑥–⑦ Functional courts: generate a prompt and verify no forbidden phrase
// Import scenePrompt from the engine via the game's local re-export.
import('../src/lib/cinema/prompts.js').then(async ({ scenePrompt }) => {
  // Minimal fixture campaign
  const campaign = {
    codex: {
      arc: { style_bible: 'Dark fantasy ink-wash style. Muted earth tones.' },
      cast: [],
      regions: [{ name: 'The Crossroads', visual: 'A muddy fork where two roads meet under a storm sky.', state: 'desolate' }],
      fixtures: [],
      bestiary: [],
      beats: [],
      blight: 2,
    },
    hero: { name: 'Sera', mark: 'human', presentation: 'A wary scout.', ancestry: 'human', className: 'ranger' },
    logs: [],
    styleBible: null,
  };

  // A moment where the prose names a lantern and a bell — the P18 directive
  // would have told the painter to stage these "large in the foreground".
  const moment = {
    prose: 'Sera lifts a lantern against the dark crossroads. A distant bell tolls.',
    seed: 42,
    speaker: 'Sera',
    spellClause: null,
  };

  const cue = {
    subjects: ['Sera'],
    region: 'The Crossroads',
    mood: 'Tense dusk, storm approaching.',
    crowd: null,
  };

  const prompt = scenePrompt(campaign, cue, moment);

  // ⑥ The prompt must not contain the forbidden prop-staging phrase
  assert.ok(
    !prompt.includes('stage every thing the telling names'),
    'FUNCTIONAL: generated prompt must not contain the P18 "stage every thing" directive',
  );
  assert.ok(
    !prompt.includes('large in the foreground of the frame'),
    'FUNCTIONAL: generated prompt must not contain the "large in the foreground" prop instruction',
  );

  // ⑦ A named prop (lantern) must not appear as a staged foreground directive
  // The word "lantern" may still appear in the beat clause (it's in the prose
  // quote), but must NOT be followed by "large in the foreground" or
  // "filling a commanding share" instructions.
  const lanternIdx = prompt.indexOf('lantern');
  if (lanternIdx !== -1) {
    const context = prompt.slice(lanternIdx, lanternIdx + 120);
    assert.ok(
      !context.includes('large in the foreground') && !context.includes('filling a commanding share'),
      `FUNCTIONAL: "lantern" in the prompt must not be followed by prop-staging directive; got: "${context}"`,
    );
  }

  // The prompt must still carry the beat quote (it's the essential moment)
  assert.ok(
    prompt.includes('Depict this beat literally'),
    'FUNCTIONAL: the beat clause must still direct literal depiction of the moment',
  );

  // The prompt must still carry the written-matter rule
  assert.ok(
    prompt.includes('WRITTEN') || prompt.includes('closed or turned'),
    'FUNCTIONAL: the written-matter rule must appear in the generated prompt',
  );

  console.log(
    'PASS — J2 cueMoment: P18 "stage every thing the telling names" phrase removed; ' +
    '"large in the foreground" prop-staging directive removed; beat clause retains ' +
    'who/where/what/light; beat-wins, written-matter, and stage-directions-only rules ' +
    'intact; functional prompt from a lantern+bell moment contains no prop-staging directive.',
  );
}).catch((e) => {
  console.error('FAIL — cueMoment functional courts:', e.message);
  process.exit(1);
});
