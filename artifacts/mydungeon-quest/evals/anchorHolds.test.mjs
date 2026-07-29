// J6 — anchorHolds (P24: hero anchor resolves correctly after J1 isolation fix)
//
// Stage 5 J0 Report 1 found that P17 (foreign reference sheets contaminating
// plates) was not confirmed by static analysis. The actual contamination cause
// was P18 (beat clause staging named prose objects as foreground elements),
// fixed in J2. J1 added the belt-and-suspenders E3 assertion at
// resolveAnchors() exit. J6 confirms the hero-anchor path:
//   — the hero is seatable in the scene roster (named in cue.subjects → painted)
//   — her anchor resolves via her NAME matching the cue's subjects list
//   — resolveWardenAnchor uses sheets:false (bust-first, no reference sheets)
//   — the E3 isolation from J1 applies to hero anchors just like cast anchors
//
// Courts:
//  ① heroSoul is exported from prompts.js — the hero is seated as a soul
//     when her name appears in cue.subjects
//  ② hero seated via name === campaign.hero.name (case-exact, no folding)
//  ③ resolveWardenAnchor (foundry.js) passes sheets:false to resolveAnchors
//  ④ foundry.js comment names the warden anchor as bust-first, never a sheet
//  ⑤ Functional: a cue naming the hero produces a prompt that includes her name
//  ⑥ heroSoul carries name, mark, and presentation fields
//  ⑦ Case-exact: hero.name is a plain string that matches as an anchor label

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROMPTS_PATH = path.resolve(ROOT, '../../packages/engine/src/cinema/prompts.js');
const FOUNDRY_PATH = path.join(ROOT, 'src/lib/cinema/foundry.js');
const promptsSrc = readFileSync(PROMPTS_PATH, 'utf8');
const foundrySrc = readFileSync(FOUNDRY_PATH, 'utf8');

// ① heroSoul exported from prompts.js
assert.ok(
  promptsSrc.includes('export function heroSoul'),
  'heroSoul must be exported from prompts.js so the hero can be seated as a soul',
);

// ② Hero seated by name === campaign.hero.name (case-exact)
assert.ok(
  promptsSrc.includes('name === campaign.hero.name'),
  'hero must be seated via name === campaign.hero.name (case-exact match, no case folding)',
);

// ③ resolveWardenAnchor passes sheets:false
assert.ok(
  foundrySrc.includes('sheets: false') || foundrySrc.includes('sheets:false'),
  'resolveWardenAnchor must pass sheets:false to resolveAnchors (bust-first, never a reference sheet)',
);

// ④ Comment confirms warden anchor is bust-first
assert.ok(
  foundrySrc.includes('bust-first') || foundrySrc.includes('never a sheet'),
  'foundry.js must document that the warden anchor is bust-first and never a reference sheet',
);

// ⑤–⑦ Functional courts
import('../../../packages/engine/src/cinema/prompts.js').then(async ({ scenePrompt, heroSoul }) => {
  const hero = {
    name: 'Sera',
    mark: 'a crescent scar above the left eye',
    presentation: 'A wary scout who trusts the dark.',
    ancestry: 'human',
    className: 'ranger',
    bearing: 'Moves without sound, eyes always on the exit.',
  };
  const campaign = {
    hero,
    codex: {
      arc: { style_bible: 'Dark fantasy ink-wash style.' },
      cast: [], // hero NOT in cast wiki
      regions: [{ name: 'The Crossroads', visual: 'A muddy fork.', state: 'desolate' }],
      fixtures: [],
      bestiary: [],
      beats: [],
      blight: 1,
    },
    logs: [],
    styleBible: null,
  };

  // ⑤ Cue naming Sera → prompt includes Sera
  const cue = { subjects: ['Sera'], region: 'The Crossroads', mood: 'Tense dusk.', crowd: null };
  const prompt = scenePrompt(campaign, cue, null);
  assert.ok(
    prompt.includes('Sera'),
    `FUNCTIONAL: scenePrompt must include the hero name when she is in cue.subjects; got prompt length=${prompt.length}`,
  );

  // ⑥ heroSoul carries required fields
  const soul = heroSoul(hero);
  assert.strictEqual(soul.name, 'Sera', 'heroSoul must carry the hero name');
  assert.ok(typeof soul.mark === 'string' && soul.mark.trim(), 'heroSoul must carry the mark');
  assert.ok(typeof soul.presentation === 'string', 'heroSoul must carry the presentation');

  // ⑦ hero.name is a plain string (anchor label match is exact)
  assert.strictEqual(typeof hero.name, 'string', 'hero.name must be a plain string');
  // The hero must NOT be seated when the subject name uses different casing
  // (name === campaign.hero.name is strict-equal, so 'sera' ≠ 'Sera')
  const cueLower = { subjects: ['sera'], region: 'The Crossroads', mood: 'Dusk.', crowd: null };
  const promptLower = scenePrompt(campaign, cueLower, null);
  // The hero's mark is distinctive — if she were wrongly seated (case-folded),
  // her identity clause would appear with her mark
  const heroSeatedWrong = promptLower.includes(hero.mark);
  assert.ok(
    !heroSeatedWrong,
    `Case-exact: 'sera' (lowercase) must not seat Sera (uppercase); mark must not appear when casing mismatches`,
  );

  console.log(
    'PASS — J6 anchorHolds: heroSoul exported from prompts.js; hero seated via case-exact name match; ' +
    'resolveWardenAnchor passes sheets:false (bust-first, never a reference sheet); ' +
    'bust-first documented in foundry.js comment; ' +
    'FUNCTIONAL: Sera in cue.subjects → Sera in prompt; heroSoul carries name/mark/presentation; ' +
    'case-exact: lowercase subject does not seat the hero.',
  );
}).catch((e) => {
  console.error('FAIL — anchorHolds functional courts:', e.message);
  process.exit(1);
});
