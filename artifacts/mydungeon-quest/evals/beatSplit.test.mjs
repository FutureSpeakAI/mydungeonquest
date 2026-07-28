// E6 — beatSplit
//
// ── ROOT CAUSE ───────────────────────────────────────────────────────────────
//
// Stage 1 A4 split beat.goal (private, model-facing) from beat.opening
// (player-facing chapter hook). The split was authored in:
//   - spines.js: `beats()` helper always populates `opening` (defaults to title)
//   - shareCard.js: uses `beat.opening || beat.title`
//   - storyBlock: passes only `goal` in the beat pack, never `opening`
//
// But the separation was INCOMPLETE:
//   - `chapterInfo` (story.js) still returned `goal: beat.goal` in its object
//   - App.jsx's campaign-mast rendered `{chapter.goal}` verbatim on screen
//
// This is P4 from the master directive. The player saw the raw design directive:
//   "Establish the hero, home, and what deserves protection."
// That is a DM briefing line, not a chapter hook.
//
// E6 closes P4: `chapterInfo` now returns `opening`, App.jsx renders it,
// and this eval enforces both sides structurally.
//
// THREE COURTS (E6):
//   1. SPINE DATA: every beat in every shipped spine has `opening` populated
//      and its opening line is never the bare goal string.
//   2. VIEW BOUNDARY (source checks): `chapterInfo` exposes `opening` only;
//      App.jsx mast renders `chapter.opening`; `storyBlock` keeps `opening`
//      OUT of the model-facing beat pack.
//   3. RUNTIME: `chapterInfo` returns an object with `opening`, never `goal`;
//      the chapter mast source never contains the directive string.
// ─────────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENGINE_ROOT = path.resolve(GAME_ROOT, '../../packages/engine/src');

// ── Court 1 — SPINE DATA ─────────────────────────────────────────────────────

const { SPINES } = await import(`${ENGINE_ROOT}/spines.js`);

assert.ok(Array.isArray(SPINES) && SPINES.length >= 9, `at least 9 shipped spines (got ${SPINES.length})`);

let totalBeats = 0;
for (const spine of SPINES) {
  assert.ok(Array.isArray(spine.beats) && spine.beats.length > 0, `spine '${spine.id}' has beats`);
  for (const beat of spine.beats) {
    totalBeats++;
    // Every beat must have `opening`
    assert.ok(
      typeof beat.opening === 'string' && beat.opening.trim().length > 0,
      `spine '${spine.id}' beat '${beat.key}': opening must be a non-empty string (got ${JSON.stringify(beat.opening)})`
    );
    // Every beat must have `goal` (the model-facing directive)
    assert.ok(
      typeof beat.goal === 'string' && beat.goal.trim().length > 0,
      `spine '${spine.id}' beat '${beat.key}': goal must be a non-empty string (got ${JSON.stringify(beat.goal)})`
    );
    // `opening` must never be identical to `goal` — they serve different audiences.
    // (opening defaults to `title`; title ≠ goal by design in every shipped spine)
    assert.notEqual(
      beat.opening.trim(), beat.goal.trim(),
      `spine '${spine.id}' beat '${beat.key}': opening must not equal goal ('${beat.opening}')`
    );
  }
}

console.log(`ok — spine data: ${SPINES.length} spines, ${totalBeats} beats; every beat has opening ≠ goal`);

// ── Court 2 — VIEW BOUNDARY (source level) ───────────────────────────────────

const storySrc = readFileSync(path.join(ENGINE_ROOT, 'story.js'), 'utf8');
const appSrc   = readFileSync(path.join(GAME_ROOT, 'src/App.jsx'), 'utf8');

// chapterInfo must return `opening`, not `goal`
assert.match(storySrc, /opening:\s*beat\.opening/,
  'chapterInfo must expose beat.opening under the key "opening"');
assert.doesNotMatch(
  // Scope the check to chapterInfo's return block; avoid false hits from storyBlock
  storySrc.slice(
    storySrc.indexOf('export function chapterInfo('),
    storySrc.indexOf('export function actInfo(')
  ),
  /\bgoal\s*:/,
  'chapterInfo must NOT return a goal field — goal is model-facing and must stay out of the view helper'
);

// App.jsx mast must render chapter.opening
assert.match(appSrc, /<p>\{chapter\.opening\}<\/p>/,
  'App.jsx campaign-mast must render chapter.opening in the <p> tag');
// App.jsx mast must NOT render chapter.goal
const mastBlock = appSrc.slice(appSrc.indexOf('campaign-mast'), appSrc.indexOf('campaign-mast') + 600);
assert.doesNotMatch(mastBlock, /chapter\.goal/,
  'App.jsx campaign-mast must not reference chapter.goal (P4 fix: goal is private)');

console.log('ok — view boundary: chapterInfo returns opening; App.jsx mast renders chapter.opening; goal field absent from view helper');

// storyBlock must keep `opening` OUT of the beat pack (model gets goal, not opening)
const storyBlockBody = storySrc.slice(
  storySrc.indexOf('export function storyBlock('),
  storySrc.indexOf('export function storyBlock(') + 800
);
assert.match(storyBlockBody, /goal:\s*beat\.goal/,
  'storyBlock beat pack must carry goal (model-facing directive)');
assert.doesNotMatch(storyBlockBody, /opening:\s*beat\.opening/,
  'storyBlock beat pack must NOT carry opening (player-facing hook must never ride the DM context)');

console.log('ok — curtain holds: storyBlock passes goal to DM, never opening');

// ── Court 3 — RUNTIME ────────────────────────────────────────────────────────
// Import story.js and exercise chapterInfo over a fixture codex for each spine.

const { chapterInfo } = await import(`${ENGINE_ROOT}/story.js`);

for (const spine of SPINES) {
  for (let beatIndex = 0; beatIndex < spine.beats.length; beatIndex++) {
    const fixCodex = { spine, beatIndex, cast: [] };
    const info = chapterInfo(fixCodex);

    // Must expose `opening`
    assert.ok(
      typeof info.opening === 'string' && info.opening.trim().length > 0,
      `chapterInfo for spine '${spine.id}' beat ${beatIndex}: must return opening (got ${JSON.stringify(info.opening)})`
    );
    // Must NOT expose `goal`
    assert.equal(info.goal, undefined,
      `chapterInfo for spine '${spine.id}' beat ${beatIndex}: must not return goal field (P4: goal is model-facing)`
    );
    // `opening` must not equal the goal of this beat
    const beat = spine.beats[beatIndex];
    assert.notEqual(
      info.opening.trim(), beat.goal.trim(),
      `chapterInfo for spine '${spine.id}' beat ${beatIndex}: opening must not be the goal string`
    );
  }
}

console.log(`ok — runtime: chapterInfo returns opening (never goal) across all ${SPINES.reduce((n, s) => n + s.beats.length, 0)} beat positions`);

console.log('PASS beatSplit — E6: every spine beat has opening \u2260 goal; chapterInfo exposes opening only; App.jsx mast renders chapter.opening; storyBlock keeps opening out of the model context; the player-facing chapter hook is never the raw design directive.');
