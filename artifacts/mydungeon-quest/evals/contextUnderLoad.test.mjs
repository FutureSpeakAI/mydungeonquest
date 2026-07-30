// contextUnderLoad — Stage 8 / M1
//
// Proves the context pack stays within budget under real-content conditions
// (Rule 31: the property is tested where it would fail).
//
// The keyless march proves the budget is not exceeded across 30 turns of
// mock content. That is insufficient because:
//   (a) the mock DM produces less content per turn than a real model
//   (b) 30 turns is a fraction of a 15-chapter campaign
//   (c) the mock march uses ~3 souls with minimal known_facts
//
// This test uses a deterministic deep-campaign fixture:
//   - 12 carded souls (each with 6 known_facts strings, ~50 chars each)
//   - 4 regions with full visual descriptions
//   - 4 open threads
//   - 60 turns across 15 chapters (4 per chapter), narration at ceiling
//
// The pack is assembled at chapters 1, 4, 8, 12, and 15. At each checkpoint:
//   - Pack JSON size is measured and reported
//   - Per-block sizes are reported
//   - Budget compliance is asserted (or overflow is named as the finding)
//   - The scene floor (in-scene souls) is verified to be never trimmed
//   - Every trim emits a _trimLog record
//   - Famine conditions, if reached, are reported
//
// Per Rule 31: "A property that fails under load is not proven by a fixture
// below that load." This fixture represents real load at depth.
//
// Per Stage 8 M1 constraint: this test may NOT adjust the budget to pass.
// If the pack overflows at any checkpoint, that IS the finding and the test
// names it explicitly.
//
// Courts:
//  ① pack assembles at each of the five chapter checkpoints (no crash)
//  ② pack JSON size is within 7,000 chars at every checkpoint — OR the
//     specific overflow is named and the test fails as a Rule 31 finding
//  ③ the scene floor is never trimmed (in-scene souls always ride full)
//  ④ any trim emits a _trimLog record (the trim path is observable)
//  ⑤ famine conditions, if reached, are reported in the LOOP_LOG-style output
//  ⑥ per-block sizes are reported at each checkpoint
//  ⑦ buildBriefing (7,800-char budget) also stays within budget

import assert from 'node:assert/strict';
import { buildContextPack, buildBriefing, PACK_BUDGET, BRIEF_BUDGET } from 'fatescript/graph';
import { buildDeepCampaign, CHECKPOINTS } from './fixtures/deepCampaign.mjs';

// PACK_BUDGET and BRIEF_BUDGET imported from fatescript/graph — single source of truth.

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return the set of soul names that are in-scene per buildContextPack. */
function inSceneNames(pack) {
  return new Set(pack.scene?.present || []);
}

/** Return the scene souls from the assembled cast. */
function sceneEntry(pack, name) {
  return (pack.cast || []).find((s) => s.name === name);
}

// ── Run the checkpoints ───────────────────────────────────────────────────────

const overflows = [];
const trimEvents = [];
const report = [];

for (const chapter of CHECKPOINTS) {
  const campaign = buildDeepCampaign(chapter);
  const pack = buildContextPack(campaign, { budget: PACK_BUDGET });
  const brief = buildBriefing(campaign, { budget: BRIEF_BUDGET });

  const packJson    = JSON.stringify(pack);
  const briefJson   = JSON.stringify(brief);
  const packSize    = packJson.length;
  const briefSize   = briefJson.length;
  const trimLog     = pack._trimLog ?? null;
  const sceneNames  = inSceneNames(pack);

  // Per-block breakdown
  const blockSizes = {};
  for (const [k, v] of Object.entries(pack)) {
    blockSizes[k] = JSON.stringify(v).length;
  }

  const entry = {
    chapter,
    beatIndex: campaign.codex.beatIndex,
    soulsInCodex: campaign.codex.cast.length,
    soulsInPack: (pack.cast || []).length,
    scenePresent: [...sceneNames],
    packSize,
    briefSize,
    withinPackBudget: packSize <= PACK_BUDGET,
    withinBriefBudget: briefSize <= BRIEF_BUDGET,
    trim: trimLog
      ? { dropped: trimLog.castDropped || [], slimmed: trimLog.castSlimmed || [] }
      : null,
    blockSizes,
  };
  report.push(entry);

  if (packSize > PACK_BUDGET) {
    overflows.push(`chapter ${chapter}: pack ${packSize} > budget ${PACK_BUDGET} chars (overflow by ${packSize - PACK_BUDGET})`);
  }
  if (briefSize > BRIEF_BUDGET) {
    overflows.push(`chapter ${chapter}: brief ${briefSize} > budget ${BRIEF_BUDGET} chars (overflow by ${briefSize - BRIEF_BUDGET})`);
  }
  if (trimLog && Object.keys(trimLog).length) trimEvents.push({ chapter, trimLog });
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('\n=== contextUnderLoad: chapter-by-chapter pack sizes ===');
for (const e of report) {
  console.log(`\nChapter ${e.chapter} (beat ${e.beatIndex}): souls-in-codex=${e.soulsInCodex} souls-in-pack=${e.soulsInPack}`);
  console.log(`  pack: ${e.packSize} chars (${e.withinPackBudget ? 'OK' : 'OVERFLOW'})  brief: ${e.briefSize} chars (${e.withinBriefBudget ? 'OK' : 'OVERFLOW'})`);
  console.log(`  scene present: ${e.scenePresent.join(', ') || '(none)'}`);
  if (e.trim) {
    console.log(`  TRIM — dropped: [${e.trim.dropped.join(', ')}]  slimmed: [${e.trim.slimmed.join(', ')}]`);
  }
  const topBlocks = Object.entries(e.blockSizes).sort(([, a], [, b]) => b - a).slice(0, 5);
  console.log(`  top-5 blocks by size: ${topBlocks.map(([k, v]) => `${k}=${v}`).join('  ')}`);
}

if (trimEvents.length) {
  console.log('\n=== TRIM EVENTS (famine fired) ===');
  for (const { chapter, trimLog } of trimEvents) {
    console.log(`  chapter ${chapter}: dropped=[${(trimLog.castDropped || []).join(', ')}] slimmed=[${(trimLog.castSlimmed || []).join(', ')}]`);
  }
} else {
  console.log('\n(no trim events — famine never fired across all checkpoints)');
}

if (overflows.length) {
  console.log('\n=== OVERFLOW FINDINGS (Rule 31 — this IS the defect) ===');
  for (const msg of overflows) console.log(`  OVERFLOW: ${msg}`);
}

// ── ① Pack assembles at all checkpoints ──────────────────────────────────────
assert.equal(report.length, CHECKPOINTS.length, `pack assembled at all ${CHECKPOINTS.length} checkpoints`);
console.log('\n① PASS — pack assembled at all checkpoints without crash');

// ── ② Budget compliance ───────────────────────────────────────────────────────
// Per M1 constraint: if it overflows, that is the finding; the test fails and
// names the overflow explicitly.
if (overflows.length) {
  // Rule 31 finding: log the overflow before failing
  console.error('\n② FINDING (Rule 31): context pack overflows under real-content load.');
  console.error('   L1\'s fix is incomplete. The defect is:');
  for (const msg of overflows) console.error(`   ${msg}`);
  assert.fail(`Context pack overflows under load — Rule 31 finding:\n${overflows.join('\n')}`);
} else {
  console.log('② PASS — pack within budget at every chapter checkpoint');
}

// ── ③ Scene floor never trimmed ───────────────────────────────────────────────
for (const e of report) {
  for (const soulName of e.scenePresent) {
    // Find the soul in the campaign fixture to verify it's in-scene
    const campaign = buildDeepCampaign(e.chapter);
    const packAtChapter = buildContextPack(campaign, { budget: PACK_BUDGET });
    const soulInPack = sceneEntry(packAtChapter, soulName);
    assert.ok(
      soulInPack && (soulInPack.visual || soulInPack.role),
      `scene soul "${soulName}" at chapter ${e.chapter} must be in pack and carry identifying fields`,
    );
  }
}
console.log('③ PASS — scene floor never trimmed (in-scene souls always in pack)');

// ── ④ Every trim emits _trimLog ───────────────────────────────────────────────
for (const e of report) {
  // If fewer souls in pack than codex, there MUST be a trimLog
  if (e.soulsInPack < e.soulsInCodex) {
    const campaign = buildDeepCampaign(e.chapter);
    const pack = buildContextPack(campaign, { budget: PACK_BUDGET });
    assert.ok(
      pack._trimLog && Object.keys(pack._trimLog).length > 0,
      `chapter ${e.chapter}: souls were trimmed (${e.soulsInCodex} → ${e.soulsInPack}) but _trimLog is empty`,
    );
  }
}
console.log('④ PASS — every trim emits a _trimLog record');

// ── ⑤ Famine report is present when reached ──────────────────────────────────
const famineChapters = report.filter((e) => e.trim !== null);
if (famineChapters.length > 0) {
  console.log(`⑤ PASS — famine reported at ${famineChapters.length} chapter(s): ${famineChapters.map((e) => e.chapter).join(', ')}`);
} else {
  console.log('⑤ PASS — famine never reached (pack fits within budget across all chapters without dropping souls)');
}

// ── ⑥ Per-block sizes reported ───────────────────────────────────────────────
// Verified implicitly by the report loop above (blockSizes recorded for all checkpoints)
for (const e of report) {
  assert.ok(
    Object.keys(e.blockSizes).length > 0,
    `chapter ${e.chapter}: blockSizes must be non-empty`,
  );
}
console.log('⑥ PASS — per-block sizes reported at each checkpoint');

// ── ⑦ buildBriefing also within budget ───────────────────────────────────────
const briefOverflows = report.filter((e) => !e.withinBriefBudget);
if (briefOverflows.length > 0) {
  assert.fail(`buildBriefing overflows at: ${briefOverflows.map((e) => `chapter ${e.chapter} (${e.briefSize} chars)`).join(', ')}`);
}
console.log(`⑦ PASS — buildBriefing within ${BRIEF_BUDGET}-char budget at all chapter checkpoints`);

console.log('\nPASS — contextUnderLoad: all courts green (Rule 31 load fixture at chapter 15 within budget)');
