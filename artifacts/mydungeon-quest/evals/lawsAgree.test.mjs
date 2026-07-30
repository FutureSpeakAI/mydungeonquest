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

// ─────────────────────────────────────────────────────────────────────────────
// K9+Part3 — three feasibility courts (Stage 6.5 Part 3)
//
// Courts ⑥ and ⑦ confirm each band's floor sits below its ceiling and that
// adjacent bands do not overlap. They do NOT confirm a real turn can land
// inside a band. These three courts close that gap.
//
// ⑧ Implied block length (joint feasibility across words AND blocks):
//    minWords / maxBlocks ≥ MIN_BLOCK_WORDS — minimum average block length
//    maxWords / minBlocks ≤ MAX_BLOCK_WORDS — maximum average block length
//    Named constants: MIN_BLOCK_WORDS=10 (a 10-word paragraph is the absolute
//    minimum for coherent DM narration prose; prevents degenerate band geometry
//    like minWords:200, maxBlocks:20 forcing 10-word micro-paragraphs).
//    MAX_BLOCK_WORDS=120 (a 120-word single paragraph is readable for this
//    prose style; prevents degenerate geometry like maxWords:360, minBlocks:1
//    forcing the model to produce one 360-word wall of text).
//
// ⑨ Craft target inside enforced band (the voice.js EDITOR_ADDENDUM drift check):
//    voice.js EDITOR_ADDENDUM contains hardcoded word counts. These are the
//    craft target the Editor sees (second-pass revision instructions). They
//    must match NARRATION_FLOOR exactly. If they diverge — Editor says
//    "60-140 words", validator enforces "180-400" — the Editor revises the
//    model into failing turns without warning.
//
// ⑩ Minimum span per band:
//    maxWords - minWords ≥ MIN_SPAN (20). A span of 1 (minWords:60, maxWords:61)
//    passes courts ⑥ and ⑦ but is a point target, not a range — no model will
//    land there reliably. MIN_SPAN=20 requires a real range.

const MIN_BLOCK_WORDS = 10;  // absolute floor: ~2 short sentences
const MAX_BLOCK_WORDS = 120; // absolute ceiling: a long but single-page paragraph
const MIN_SPAN = 20;         // minimum word range width per band

// ⑧ Implied block length — joint feasibility
for (const [name, band] of Object.entries(NARRATION_FLOOR.byMeasure)) {
  const minAvgBlockLen = band.minWords / band.maxBlocks;
  const maxAvgBlockLen = band.maxWords / band.minBlocks;

  assert.ok(
    minAvgBlockLen >= MIN_BLOCK_WORDS,
    `K9+⑧: ${name} band implies minimum avg block length of ${minAvgBlockLen.toFixed(1)} words ` +
    `(minWords:${band.minWords} / maxBlocks:${band.maxBlocks}); must be ≥ ${MIN_BLOCK_WORDS} — ` +
    `band geometry forces implausibly short paragraphs`,
  );
  assert.ok(
    maxAvgBlockLen <= MAX_BLOCK_WORDS,
    `K9+⑧: ${name} band implies maximum avg block length of ${maxAvgBlockLen.toFixed(1)} words ` +
    `(maxWords:${band.maxWords} / minBlocks:${band.minBlocks}); must be ≤ ${MAX_BLOCK_WORDS} — ` +
    `band geometry forces implausibly long paragraphs`,
  );
}

// ⑨ Craft target (voice.js EDITOR_ADDENDUM) matches enforced band (NARRATION_FLOOR)
// The EDITOR_ADDENDUM is sent to the second-pass model as revision instructions.
// It hardcodes word counts that must be identical to NARRATION_FLOOR — any drift
// causes the Editor to revise the primary draft into validator-failing territory.
const voiceSrc = src('src/lib/voice.js');

// Extract hardcoded counts from EDITOR_ADDENDUM using named-measure patterns
const editorBandPattern = /(\w+) requires (\d+)-(\d+) words in (\d+)-(\d+) paragraphs/g;
const editorBands = {};
for (const m of voiceSrc.matchAll(editorBandPattern)) {
  editorBands[m[1]] = {
    minWords:  parseInt(m[2], 10),
    maxWords:  parseInt(m[3], 10),
    minBlocks: parseInt(m[4], 10),
    maxBlocks: parseInt(m[5], 10),
  };
}
// 'none' band is stated as "with no beat_intent the range is N-M words" (no block count)
const editorNoneMatch = voiceSrc.match(/no beat_intent the range is (\d+)-(\d+) words/);

assert.ok(
  Object.keys(editorBands).length >= 3,
  `K9+⑨: voice.js EDITOR_ADDENDUM must state word+block counts for ≥3 named measures (lean/standard/rich); found: ${JSON.stringify(Object.keys(editorBands))}`,
);
assert.ok(
  editorNoneMatch,
  `K9+⑨: voice.js EDITOR_ADDENDUM must state the none-band word range ("with no beat_intent the range is N-M words")`,
);

// Check each named band matches NARRATION_FLOOR
for (const [name, edBand] of Object.entries(editorBands)) {
  const flBand = NARRATION_FLOOR.byMeasure[name];
  assert.ok(
    flBand,
    `K9+⑨: voice.js EDITOR_ADDENDUM mentions measure "${name}" but NARRATION_FLOOR.byMeasure has no such band`,
  );
  assert.strictEqual(
    edBand.minWords, flBand.minWords,
    `K9+⑨: voice.js EDITOR_ADDENDUM ${name}.minWords (${edBand.minWords}) disagrees with NARRATION_FLOOR (${flBand.minWords}) — Editor will revise into the wrong target`,
  );
  assert.strictEqual(
    edBand.maxWords, flBand.maxWords,
    `K9+⑨: voice.js EDITOR_ADDENDUM ${name}.maxWords (${edBand.maxWords}) disagrees with NARRATION_FLOOR (${flBand.maxWords}) — Editor will revise into the wrong target`,
  );
  assert.strictEqual(
    edBand.minBlocks, flBand.minBlocks,
    `K9+⑨: voice.js EDITOR_ADDENDUM ${name}.minBlocks (${edBand.minBlocks}) disagrees with NARRATION_FLOOR (${flBand.minBlocks})`,
  );
  assert.strictEqual(
    edBand.maxBlocks, flBand.maxBlocks,
    `K9+⑨: voice.js EDITOR_ADDENDUM ${name}.maxBlocks (${edBand.maxBlocks}) disagrees with NARRATION_FLOOR (${flBand.maxBlocks})`,
  );
}

// none band: check word range only (blocks not stated in EDITOR_ADDENDUM for none)
const editorNoneMin = parseInt(editorNoneMatch[1], 10);
const editorNoneMax = parseInt(editorNoneMatch[2], 10);
assert.strictEqual(
  editorNoneMin, NARRATION_FLOOR.byMeasure.none.minWords,
  `K9+⑨: voice.js EDITOR_ADDENDUM none.minWords (${editorNoneMin}) disagrees with NARRATION_FLOOR (${NARRATION_FLOOR.byMeasure.none.minWords})`,
);
assert.strictEqual(
  editorNoneMax, NARRATION_FLOOR.byMeasure.none.maxWords,
  `K9+⑨: voice.js EDITOR_ADDENDUM none.maxWords (${editorNoneMax}) disagrees with NARRATION_FLOOR (${NARRATION_FLOOR.byMeasure.none.maxWords})`,
);

// ⑩ Minimum span per band (range must be a real range, not a point target)
for (const [name, band] of Object.entries(NARRATION_FLOOR.byMeasure)) {
  const span = band.maxWords - band.minWords;
  assert.ok(
    span >= MIN_SPAN,
    `K9+⑩: ${name} band span is ${span} words (max:${band.maxWords} − min:${band.minWords}); must be ≥ ${MIN_SPAN} — a near-point target cannot be reliably hit`,
  );
}

console.log(
  `PASS — K9 lawsAgree: three-source constraint agreement confirmed. ` +
  `NARRATION_FLOOR is the ONE seat (exported from protocol.js); ` +
  `system prompt imports and embeds NARRATION_FLOOR dynamically (no hardcoded counts); ` +
  `validator reads NARRATION_FLOOR.byMeasure[bandKey] at runtime; ` +
  `tool schema minItems=${toolMinItems} ≤ ${floorMinBlocks} (NARRATION_FLOOR min minBlocks), ` +
  `maxItems=${toolMaxItems} ≥ ${floorMaxBlocks} (NARRATION_FLOOR max maxBlocks); ` +
  `all ${Object.keys(NARRATION_FLOOR.byMeasure).length} bands internally consistent; lean/standard/rich no overlap. ` +
  `Part 3 feasibility: ⑧ implied block lengths plausible (${MIN_BLOCK_WORDS}–${MAX_BLOCK_WORDS} words/block) for all bands; ` +
  `⑨ voice.js EDITOR_ADDENDUM craft targets match NARRATION_FLOOR for all ${Object.keys(editorBands).length + 1} bands; ` +
  `⑩ every band span ≥ ${MIN_SPAN} words.`,
);
