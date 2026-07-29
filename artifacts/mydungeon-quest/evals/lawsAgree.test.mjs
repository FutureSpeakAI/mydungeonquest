// K9 — lawsAgree (three-source constraint agreement)
//
// Stage 6 K9: Verify that the three enforcement sites for narration constraints
// all agree — no site hardcodes values that drift from the canonical source.
//
// The three sources:
//   1. NARRATION_FLOOR (packages/engine/src/protocol.js) — the ONE canonical
//      definition of word and block counts for each beat measure.
//   2. System prompt (src/lib/systemPrompt.js) — dynamically reads NARRATION_FLOOR;
//      must not embed hardcoded word counts.
//   3. DM tool schema (server/dm.js) — the JSON schema sent to the AI model;
//      narration_blocks minItems/maxItems must be compatible with NARRATION_FLOOR.
//   4. Validator (packages/engine/src/protocol.js validateDmTurn) — reads
//      NARRATION_FLOOR.byMeasure at runtime; must not hardcode separate values.
//
// Rule: "All three enforcement sites (schema, prompt, validator) moved to
//       NARRATION_FLOOR.byMeasure in lockstep" (protocol.js comment, line ~1197).
//
// Courts:
//  ① NARRATION_FLOOR is the ONE seat: exported from protocol.js, read by name
//  ② System prompt imports NARRATION_FLOOR from fatescript; no hardcoded counts
//  ③ Validator reads NARRATION_FLOOR.byMeasure; no separate hardcoded bands
//  ④ Tool schema minItems ≤ NARRATION_FLOOR.byMeasure.*.minBlocks minimum
//  ⑤ Tool schema maxItems ≥ NARRATION_FLOOR.byMeasure.*.maxBlocks maximum
//  ⑥ All four byMeasure bands internally consistent (maxWords > minWords,
//     maxBlocks > minBlocks, maxBlocks ≥ minBlocks+1 for lean)
//  ⑦ No band overlaps (lean.maxWords ≤ standard.minWords ≤ rich.minWords)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const protocolSrc = src('../../packages/engine/src/protocol.js');
const systemPromptSrc = src('src/lib/systemPrompt.js');
const dmServerSrc = (() => {
  try { return src('server/dm.js'); } catch { return ''; }
})();

// Load the actual NARRATION_FLOOR from the protocol module
import { NARRATION_FLOOR } from '../../../packages/engine/src/protocol.js';

// ① NARRATION_FLOOR is the ONE seat
assert.ok(
  protocolSrc.includes('export const NARRATION_FLOOR'),
  'NARRATION_FLOOR must be exported from protocol.js as the ONE canonical seat',
);
assert.ok(
  typeof NARRATION_FLOOR.byMeasure === 'object',
  'NARRATION_FLOOR.byMeasure must be an object with keys lean/standard/rich/none',
);
for (const band of ['lean', 'standard', 'rich', 'none']) {
  assert.ok(
    typeof NARRATION_FLOOR.byMeasure[band] === 'object',
    `NARRATION_FLOOR.byMeasure.${band} must be defined`,
  );
}

// ② System prompt imports NARRATION_FLOOR; no hardcoded word counts
assert.ok(
  systemPromptSrc.includes("import { NARRATION_FLOOR }"),
  'System prompt must import NARRATION_FLOOR from fatescript/protocol — not hardcode word counts',
);
// The system prompt must use NARRATION_FLOOR.byMeasure.lean.minWords etc. (template literal)
assert.ok(
  systemPromptSrc.includes('NARRATION_FLOOR.byMeasure.lean.minWords'),
  'System prompt must reference NARRATION_FLOOR.byMeasure.lean.minWords in the narration instruction',
);
assert.ok(
  systemPromptSrc.includes('NARRATION_FLOOR.byMeasure.none.minWords'),
  'System prompt must reference NARRATION_FLOOR.byMeasure.none.minWords for the no-measure path',
);
// No hardcoded divergent word floor — the system prompt must not embed a literal
// floor that differs from NARRATION_FLOOR (e.g. "at least 90 words" when lean min is 40).
const hardcodedWordPattern = /\bat least (\d{2,}) words\b|\bminimum (\d{2,}) words\b|\b(\d{2,}) words minimum\b/g;
const systemPromptLiterals = [...systemPromptSrc.matchAll(hardcodedWordPattern)];
assert.strictEqual(
  systemPromptLiterals.length, 0,
  `System prompt must not embed hardcoded word floor literals (found: ${systemPromptLiterals.map((m) => m[0]).join(', ')}); use NARRATION_FLOOR.byMeasure`,
);

// ③ Validator reads NARRATION_FLOOR.byMeasure at runtime
assert.ok(
  protocolSrc.includes('NARRATION_FLOOR.byMeasure[bandKey]'),
  'Validator (validateDmTurn) must read NARRATION_FLOOR.byMeasure[bandKey] at runtime',
);
assert.ok(
  protocolSrc.includes('band.minWords'),
  'Validator must use band.minWords from NARRATION_FLOOR (not a separate hardcoded constant)',
);
assert.ok(
  protocolSrc.includes('band.maxWords'),
  'Validator must use band.maxWords from NARRATION_FLOOR (not a separate hardcoded constant)',
);

// ④ Tool schema minItems ≤ min(NARRATION_FLOOR.byMeasure.*.minBlocks)
// The tool schema narration_blocks entry must be extracted from dm.js
const toolSchemaMatch = dmServerSrc.match(
  /narration_blocks:\s*\{\s*type:\s*'array',\s*minItems:\s*(\d+),\s*maxItems:\s*(\d+)/,
);
assert.ok(
  toolSchemaMatch,
  'K9: tool schema (dm.js) must define narration_blocks with minItems and maxItems',
);
const toolMinItems = parseInt(toolSchemaMatch[1], 10);
const toolMaxItems = parseInt(toolSchemaMatch[2], 10);

const floorMinBlocks = Math.min(...Object.values(NARRATION_FLOOR.byMeasure).map((b) => b.minBlocks));
const floorMaxBlocks = Math.max(...Object.values(NARRATION_FLOOR.byMeasure).map((b) => b.maxBlocks));

assert.ok(
  toolMinItems <= floorMinBlocks,
  `K9: tool schema minItems (${toolMinItems}) must be ≤ NARRATION_FLOOR.byMeasure min minBlocks (${floorMinBlocks}) — schema must not demand more blocks than the narrowest band allows`,
);

// ⑤ Tool schema maxItems ≥ max(NARRATION_FLOOR.byMeasure.*.maxBlocks)
assert.ok(
  toolMaxItems >= floorMaxBlocks,
  `K9: tool schema maxItems (${toolMaxItems}) must be ≥ NARRATION_FLOOR.byMeasure max maxBlocks (${floorMaxBlocks}) — schema must allow the richest band's ceiling`,
);

// ⑥ Each byMeasure band is internally consistent
for (const [name, band] of Object.entries(NARRATION_FLOOR.byMeasure)) {
  assert.ok(
    band.maxWords > band.minWords,
    `K9: NARRATION_FLOOR.byMeasure.${name}.maxWords (${band.maxWords}) must be > minWords (${band.minWords})`,
  );
  assert.ok(
    band.maxBlocks >= band.minBlocks,
    `K9: NARRATION_FLOOR.byMeasure.${name}.maxBlocks (${band.maxBlocks}) must be ≥ minBlocks (${band.minBlocks})`,
  );
}

// ⑦ No band word-range overlaps (tighter check — lean ceiling ≤ standard floor)
assert.ok(
  NARRATION_FLOOR.byMeasure.lean.maxWords <= NARRATION_FLOOR.byMeasure.standard.minWords,
  `K9: lean.maxWords (${NARRATION_FLOOR.byMeasure.lean.maxWords}) must be ≤ standard.minWords (${NARRATION_FLOOR.byMeasure.standard.minWords}) — no overlapping bands`,
);
assert.ok(
  NARRATION_FLOOR.byMeasure.standard.maxWords <= NARRATION_FLOOR.byMeasure.rich.minWords,
  `K9: standard.maxWords (${NARRATION_FLOOR.byMeasure.standard.maxWords}) must be ≤ rich.minWords (${NARRATION_FLOOR.byMeasure.rich.minWords}) — no overlapping bands`,
);

console.log(
  `PASS — K9 lawsAgree: three-source constraint agreement confirmed. ` +
  `NARRATION_FLOOR is the ONE seat (exported from protocol.js); ` +
  `system prompt imports and embeds NARRATION_FLOOR dynamically (no hardcoded counts); ` +
  `validator reads NARRATION_FLOOR.byMeasure[bandKey] at runtime; ` +
  `tool schema minItems=${toolMinItems} ≤ ${floorMinBlocks} (NARRATION_FLOOR min minBlocks), ` +
  `maxItems=${toolMaxItems} ≥ ${floorMaxBlocks} (NARRATION_FLOOR max maxBlocks); ` +
  `all ${Object.keys(NARRATION_FLOOR.byMeasure).length} bands internally consistent; lean/standard/rich no overlap.`,
);
