// headroomCurve — Work Order / Item 2
//
// Reports the context headroom curve to answer three questions:
//   Q1. At what soul count does the pack first exceed budget?
//   Q2. Does a chained saga (prior-volume memoir) push it over on its own?
//   Q3. Is 12 souls typical, or optimistic?
//
// All measurements are at chapter 15 (the end of the fixture, maximum depth).
//
// Configurations measured:
//   A. 12 souls (M1 baseline)
//   B. 16 souls (4 extras, all thread-holders → fullSet)
//   C. 20 souls (8 extras, all thread-holders → fullSet)
//   D. 12 souls + prior-volume memoir (chained saga)
//   E. 12 souls + 2 bond-4 heirs (kinship-immune under XX.8)
//
// Courts:
//  ① baseline (12 souls) matches M1 measurement to within 5% (regression guard)
//  ② 16-soul pack size reported — pass/overflow noted
//  ③ 20-soul pack size reported — pass/overflow noted
//  ④ chained saga pack size reported — is memoir alone enough to overflow?
//  ⑤ heirs-present pack size reported — does kinship immunity change the budget picture?
//  ⑥ crossing-point analysis: state the exact soul count where budget is exceeded

import assert from 'node:assert/strict';
import { buildContextPack, buildBriefing, PACK_BUDGET, BRIEF_BUDGET } from 'fatescript/graph';
import {
  buildDeepCampaign16, buildDeepCampaign20,
  buildChainedSaga, buildHeirsPresent,
} from './fixtures/headroomCampaign.mjs';
import { buildDeepCampaign } from './fixtures/deepCampaign.mjs';

// PACK_BUDGET and BRIEF_BUDGET imported from fatescript/graph — single source of truth.
const CHAPTER      = 15;

// ── Run each configuration ────────────────────────────────────────────────────

function measure(campaign, label) {
  const pack  = buildContextPack(campaign, { budget: PACK_BUDGET });
  const brief = buildBriefing(campaign, { budget: BRIEF_BUDGET });
  const packSize   = JSON.stringify(pack).length;
  const briefSize  = JSON.stringify(brief).length;
  const trimLog    = pack._trimLog ?? null;
  const dropped    = trimLog?.castDropped ?? [];
  const slimmed    = trimLog?.castSlimmed ?? [];
  const famineHit  = dropped.length > 0 || slimmed.length > 0;
  const souls      = campaign.codex.cast.length;
  const soulsInPack = (pack.cast || []).length;
  const scenePresent = pack.scene?.present ?? [];
  const castBlockSize = JSON.stringify(pack.cast || []).length;
  const memoirSize    = JSON.stringify(pack.memoir || []).length;
  return { label, souls, soulsInPack, packSize, briefSize, castBlockSize, memoirSize, famineHit, dropped, slimmed, scenePresent, withinPackBudget: packSize <= PACK_BUDGET, withinBriefBudget: briefSize <= BRIEF_BUDGET };
}

const A = measure(buildDeepCampaign(CHAPTER),       'A — 12 souls (M1 baseline)');
const B = measure(buildDeepCampaign16(CHAPTER),      'B — 16 souls');
const C = measure(buildDeepCampaign20(CHAPTER),      'C — 20 souls');
const D = measure(buildChainedSaga(CHAPTER),         'D — chained saga (prior-volume memoir)');
const E = measure(buildHeirsPresent(CHAPTER),        'E — heirs present (bond-4)');

// ── Report ────────────────────────────────────────────────────────────────────

console.log('\n=== headroomCurve: pack sizes at chapter 15 ===\n');
for (const m of [A, B, C, D, E]) {
  const overflowStr = m.withinPackBudget ? 'OK' : `OVERFLOW +${m.packSize - PACK_BUDGET}`;
  const briefStr    = m.withinBriefBudget ? 'OK' : `OVERFLOW +${m.briefSize - BRIEF_BUDGET}`;
  const famineStr   = m.famineHit
    ? `FAMINE — dropped:[${m.dropped.join(', ')}] slimmed:[${m.slimmed.join(', ')}]`
    : 'no famine';
  console.log(`${m.label}`);
  console.log(`  souls total: ${m.souls}  souls-in-pack: ${m.soulsInPack}`);
  console.log(`  pack: ${m.packSize} / ${PACK_BUDGET} (${overflowStr})  brief: ${m.briefSize} / ${BRIEF_BUDGET} (${briefStr})`);
  console.log(`  cast block: ${m.castBlockSize} chars  memoir block: ${m.memoirSize} chars`);
  console.log(`  scene present: [${m.scenePresent.join(', ')}]`);
  console.log(`  famine: ${famineStr}`);
  console.log();
}

// Estimated per-soul cost in fullSet (from baseline)
const baseSoulsInCodex = A.souls; // 11 NPCs
const basePackSize     = A.packSize;
const baseCastSize     = A.castBlockSize;
const perSoulFullSet   = baseCastSize / baseSoulsInCodex;
const nonCastBaseline  = basePackSize - baseCastSize;

console.log('=== Crossing-point analysis ===');
console.log(`Baseline: ${baseSoulsInCodex} souls in fullSet = ${baseCastSize} chars cast + ${nonCastBaseline} chars other blocks = ${basePackSize} chars total`);
console.log(`Average fullSet soul cost: ${Math.round(perSoulFullSet)} chars/soul`);
for (let n = baseSoulsInCodex + 1; n <= 30; n += 1) {
  const est = Math.round(baseCastSize + (n - baseSoulsInCodex) * perSoulFullSet) + nonCastBaseline;
  if (est > PACK_BUDGET) {
    console.log(`Estimated crossing point: ${n} souls → ~${est} chars (exceeds ${PACK_BUDGET})`);
    break;
  }
}
console.log();

// ── ① Baseline matches M1 measurement (regression guard) ─────────────────────
// M1 measured 6,482 chars at chapter 15 with 12 souls.
// Allow ±5% tolerance for measurement differences (log entry verbosity varies).
const M1_MEASUREMENT = 6482;
const M1_TOLERANCE   = Math.ceil(M1_MEASUREMENT * 0.05);
assert.ok(
  Math.abs(A.packSize - M1_MEASUREMENT) <= M1_TOLERANCE,
  `① baseline pack size ${A.packSize} must be within 5% of M1 measurement ${M1_MEASUREMENT} (±${M1_TOLERANCE})`,
);
console.log(`① PASS — baseline ${A.packSize} chars matches M1 measurement ${M1_MEASUREMENT} (within ${M1_TOLERANCE} chars)`);

// ── ② 16-soul measurement ────────────────────────────────────────────────────
if (!B.withinPackBudget) {
  console.log(`② FINDING — 16-soul pack overflows budget: ${B.packSize} chars (over by ${B.packSize - PACK_BUDGET})`);
} else {
  console.log(`② NOTE — 16-soul pack fits within budget: ${B.packSize} chars (headroom: ${PACK_BUDGET - B.packSize})`);
}

// ── ③ 20-soul measurement ────────────────────────────────────────────────────
if (!C.withinPackBudget) {
  console.log(`③ FINDING — 20-soul pack overflows budget: ${C.packSize} chars (over by ${C.packSize - PACK_BUDGET})`);
} else {
  console.log(`③ NOTE — 20-soul pack fits within budget: ${C.packSize} chars`);
}

// ── ④ Chained saga ───────────────────────────────────────────────────────────
const memoirAddition = D.memoirSize - A.memoirSize;
if (!D.withinPackBudget) {
  console.log(`④ FINDING — chained saga overflows budget: ${D.packSize} chars (over by ${D.packSize - PACK_BUDGET}; memoir added ${memoirAddition} chars)`);
} else {
  console.log(`④ NOTE — chained saga fits: ${D.packSize} chars (memoir added ${memoirAddition} chars, headroom ${PACK_BUDGET - D.packSize})`);
}
assert.ok(D.souls === A.souls, '④ chained saga must have same soul count as baseline');

// ── ⑤ Heirs present ──────────────────────────────────────────────────────────
const heirAddition = E.packSize - A.packSize;
console.log(`⑤ NOTE — heirs-present: ${E.packSize} chars (+${heirAddition} chars over baseline, ${E.souls} total souls, kinship-immune: bond-4 heir present)`);
if (!E.withinPackBudget) {
  console.log(`⑤ FINDING — heirs-present pack overflows`);
}

// ── ⑥ Crossing-point summary ─────────────────────────────────────────────────
console.log('\n=== Item 2 Answers ===');
// Q1: At what soul count does the pack first exceed budget?
const crossingN_actual = B.withinPackBudget ? (C.withinPackBudget ? '>20' : '17-20') : '13-16';
const estimated_crossing = Math.ceil((PACK_BUDGET - nonCastBaseline - baseCastSize) / perSoulFullSet) + baseSoulsInCodex + 1;
console.log(`Q1. Crossing point (estimated from per-soul cost): ${estimated_crossing} souls in fullSet.`);
console.log(`    At 16 souls (config B): ${B.withinPackBudget ? 'fits — ' + B.packSize + ' chars' : 'OVERFLOWS — ' + B.packSize + ' chars'}`);
console.log(`    At 20 souls (config C): ${C.withinPackBudget ? 'fits — ' + C.packSize + ' chars' : 'OVERFLOWS — ' + C.packSize + ' chars'}`);

// Q2: Does a chained saga push it over on its own?
const sagaOverflows = !D.withinPackBudget;
console.log(`Q2. Chained saga (prior-volume memoir): ${sagaOverflows ? 'YES — overflows on its own (' + D.packSize + ' chars)' : 'No — fits (' + D.packSize + ' chars)'}.`);
console.log(`    Memoir adds ${memoirAddition} chars over baseline memoir.`);

// Q3: Is 12 souls typical?
console.log(`Q3. 12 souls at 93% utilization. Budget headroom: ${PACK_BUDGET - A.packSize} chars.`);
console.log(`    Per-soul cost (fullSet): ~${Math.round(perSoulFullSet)} chars.`);
console.log(`    Adding 1 fullSet soul: ~${PACK_BUDGET - A.packSize - Math.round(perSoulFullSet)} chars remaining after the next soul.`);
const fits13 = A.packSize + perSoulFullSet <= PACK_BUDGET;
console.log(`    13 souls fits: ${fits13 ? 'YES' : 'NO (budget would be exceeded)'}.`);
console.log(`    Conclusion: 12 souls is ${estimated_crossing <= 14 ? 'close to the ceiling (1-2 souls from overflow)' : 'below mid-range (safe for several more)'}.`);

console.log('\nPASS — headroomCurve: all courts green (Rule 31: curve measured under real-depth conditions)');
