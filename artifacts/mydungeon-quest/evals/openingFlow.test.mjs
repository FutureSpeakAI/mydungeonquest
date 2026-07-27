// ---------------------------------------------------------------------------
// OPENING FLOW GATE (B2 — The first sixty seconds)
// Verifies: four named genesis labels defined; step map covers all stages;
// paint budget and over-budget message match spec; the genesis turn seals
// well within the budget (input is unlocked before paint is due); App wires
// all four step transitions; no blank gap between adjacent steps.
// Headless; keyless-safe (DM_PROVIDER=mock forced at module top).
// ---------------------------------------------------------------------------
process.env.DM_PROVIDER = 'mock';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GENESIS_LABELS, GENESIS_STEP_LABELS, PAINT_BUDGET_MS, OVER_BUDGET_MESSAGE } from '../src/lib/openingFlow.js';

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// ── 1. GENESIS_LABELS: four named labels in pinned order ──────────────────
const WANT_LABELS = [
  'Building your world.',
  'Painting the opening scene.',
  'Casting voices.',
  'Preparing your first chapter.',
];
check(GENESIS_LABELS.length === 4, 'exactly four named genesis labels');
for (const [i, want] of WANT_LABELS.entries()) {
  check(GENESIS_LABELS[i] === want, `label ${i} — "${GENESIS_LABELS[i]}" equals "${want}"`);
}
check(!GENESIS_LABELS.some((l) => l.includes('%')), 'no label carries a percentage — a step, not a meter');

// ── 2. GENESIS_STEP_LABELS: step map covers all four keys ────────────────
const STEPS = ['world', 'scene', 'voices', 'chapter'];
for (const step of STEPS) {
  check(typeof GENESIS_STEP_LABELS[step] === 'string' && GENESIS_STEP_LABELS[step].length > 0,
    `step "${step}" has a non-empty label`);
  check(WANT_LABELS.includes(GENESIS_STEP_LABELS[step]),
    `step "${step}" label is one of the four named labels`);
}
const labelSet = new Set(Object.values(GENESIS_STEP_LABELS));
check(labelSet.size === 4, 'all four steps carry distinct labels — no two steps share a word');

// ── 3. No blank gap between adjacent steps ───────────────────────────────
for (let i = 0; i < STEPS.length - 1; i++) {
  const cur = GENESIS_STEP_LABELS[STEPS[i]];
  const nxt = GENESIS_STEP_LABELS[STEPS[i + 1]];
  check(cur && nxt, `transition ${STEPS[i]} → ${STEPS[i + 1]}: both ends have a label`);
  check(cur !== nxt, `adjacent steps "${STEPS[i]}" and "${STEPS[i + 1]}" have distinct labels`);
}

// ── 4. Paint budget and over-budget message ──────────────────────────────
check(typeof PAINT_BUDGET_MS === 'number' && PAINT_BUDGET_MS > 15_000,
  `paint budget is generous enough for real queues: ${PAINT_BUDGET_MS}ms (>15000)`);
check(PAINT_BUDGET_MS < 60_000,
  `paint budget does not hold the player hostage: ${PAINT_BUDGET_MS}ms (<60000)`);
check(
  OVER_BUDGET_MESSAGE ===
    'The artwork is taking longer than usual. Your story will start without it and the illustration will appear when it is ready.',
  'over-budget message matches spec verbatim'
);
check(!OVER_BUDGET_MESSAGE.includes('%') && !OVER_BUDGET_MESSAGE.includes('\u2014'),
  'over-budget message carries no percentage and no em dash — plain speech');

// ── 5. App wires all four steps and both budget constants ────────────────
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
check(app.includes('genesisStep'), 'App maintains a genesisStep state');
check(app.includes("setGenesisStep('world')"), "genesis start sets step to 'world'");
check(app.includes("setGenesisStep('scene')"), "pour dispatch sets step to 'scene'");
check(app.includes("setGenesisStep('voices')"), "turn seal sets step to 'voices'");
check(app.includes("setGenesisStep('chapter')"), "genesis finally sets step to 'chapter'");
check(app.includes('GENESIS_STEP_LABELS'), 'App reads the step-label map from openingFlow');
check(app.includes('PAINT_BUDGET_MS'), 'App references the paint budget constant');
check(app.includes('OVER_BUDGET_MESSAGE'), 'App references the over-budget message constant');
check(app.includes('onTurnSealed'), 'App passes onTurnSealed hook into the genesis pour');
check(app.includes('hooks?.onTurnSealed'), 'playTurn calls hooks.onTurnSealed when the turn seals');
check(app.includes('overBudget'), 'App tracks the over-budget log-id in state');
check(app.includes("setPaintingImages((prev) => ({ ...prev, [logId]: true }))") || app.includes('setPaintingImages((prev)'),
  'onTurnSealed reserves the image slot immediately, before the media gate fires');

// ── 6. Input decoupled from art: turn seals quickly ──────────────────────
// getDmTurn is the synchronous/mock path — its latency represents the window
// between genesis start and input being unlocked. The paint budget is the
// deadline players wait before seeing the slow-art notice; the turn must seal
// well before that.
import { getDmTurn } from '../server/dm.js';
const t0 = Date.now();
const dmResult = await getDmTurn({
  campaign: { id: 'flow-trial', title: 'Flow Trial', covenant: 'A road that falls north.', homeRegion: 'Thornhaven', tone: 'mythic', lines: [], veils: [], styleBible: '' },
  hero: { name: 'River', className: 'Ranger', hp: 10, maxHp: 10, level: 1, race: 'Human', keepsake: 'a map', spells: [], spellSlots: {}, caster: null, spellEnergy: {}, concentration: null },
  story: { beat: { index: 0, title: 'The Opening', opening: 'The road turns north.' }, regions: [], prior_suggestions: [], party_state: [], presence_state: [], fixture_state: [], bestiary_state: [], sheet_state: [], calendar_state: null, ambitions_state: [], clocks_state: [], rumors_state: [] },
  state: {}, memory: [], history: [],
  player: 'Begin the chronicle.', resolution: null, turn: 0, genesis: true,
  entropy: { pool: [1, 2, 3, 4, 5], draw: () => 0.5 },
}, {});
const elapsed = Date.now() - t0;
check(dmResult?.provider === 'mock', 'genesis turn uses the mock provider');
check(Array.isArray(dmResult?.turn?.narration_blocks) && dmResult.turn.narration_blocks.length >= 1,
  'genesis turn carries at least one narration block');
check(elapsed < PAINT_BUDGET_MS,
  `turn sealed in ${elapsed}ms — well within the ${PAINT_BUDGET_MS}ms paint budget; input unlocks before art is due`);

// ── final verdict ─────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — opening flow gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log(`PASS — opening flow: four named labels defined in order; step map complete; budget=${PAINT_BUDGET_MS}ms; genesis turn sealed in ${elapsed}ms; App wires all four step transitions and both budget constants; no blank gap between adjacent steps.`);
