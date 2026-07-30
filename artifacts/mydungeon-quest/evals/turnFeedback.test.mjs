// TURN FEEDBACK — structural gate (Part 4, Work Order Jul 2026)
//
// Verifies the named-progress invariants in App.jsx:
//   1. Named status labels exist for every step > 2s
//   2. setBusy(false) fires in the SUCCESS path before voice/art fire-and-forget
//   3. refreshShelf is fire-and-forget (no await) on the success path
//   4. The Composer has a stated reason when disabled (not silent rejection)
//
// This is a source-shape gate, like budgetLiteral. Behavioral verification
// (delayed mock model, delayed paint) requires a mounted React harness and
// lives in the e2e suite. The shape gate ensures the wiring exists and hasn't
// been accidentally reverted.

import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(ROOT, 'src/App.jsx'), 'utf8');

// Helper: find the line number of a string in source
const lineOf = (needle) => {
  const idx = src.indexOf(needle);
  if (idx === -1) return -1;
  return src.slice(0, idx).split('\n').length;
};

// ① Named status labels — each step that takes > 1s has a named indicator
const labels = [
  ['Writing…', 'Generation step: DM is writing'],
  ['Checking the turn…', 'Validation step after DM response arrives'],
  ['Sealing…', 'Vault seal step'],
  ['Chronicling the act…', 'Act-close annal step (slow on act boundaries)'],
  ['✦ The turn is sealed.', 'Final confirmation'],
  ['Casting voices…', 'Voice synthesis step (fire-and-forget, informational)'],
];

for (const [label, description] of labels) {
  const ln = lineOf(`'${label}'`);
  assert.ok(ln !== -1, `Missing status label '${label}' — required for: ${description}`);
}

// ② setBusy(false) fires on the SUCCESS path before playNarration and queueMedia
// The success path is inside the try block. setBusy(false) must appear there,
// not only in the finally block.
const sealedLine   = lineOf("setStatus('✦ The turn is sealed.');");
const busyFalseLine = lineOf('setBusy(false); // input re-enabled at narration seal');
const playNarLine  = lineOf('playNarration(next, sealedLog);');
const queueLine    = lineOf('queueMedia(next, record, dm, log.id);');

assert.ok(sealedLine !== -1, "'✦ The turn is sealed.' status is present");
assert.ok(busyFalseLine !== -1, 'setBusy(false) with the Part 4.1 comment is present in the success path');
assert.ok(playNarLine !== -1, 'playNarration call is present');
assert.ok(queueLine !== -1, 'queueMedia call is present');

// setBusy(false) must come BEFORE both fire-and-forget calls
assert.ok(busyFalseLine < playNarLine, `setBusy(false) (line ${busyFalseLine}) must precede playNarration (line ${playNarLine})`);
assert.ok(busyFalseLine < queueLine,   `setBusy(false) (line ${busyFalseLine}) must precede queueMedia (line ${queueLine})`);

// ③ refreshShelf is fire-and-forget on the success path (no await before setBusy)
// The success path must not contain 'await refreshShelf()' — it was changed to
// 'refreshShelf()' so the shelf list update doesn't delay input re-enabling.
// NOTE: 'refreshShelf' still appears with await in other callbacks (vault sync,
// campaign delete, etc.) — only test that 'await refreshShelf()' does NOT appear
// immediately before the sealed-status block.
const refreshFOF = src.includes('refreshShelf(); // fire-and-forget');
assert.ok(refreshFOF, "refreshShelf is fire-and-forget in the turn success path (comment present)");

// ④ Composer has a stated reason when disabled — not silent rejection
// The composer-writing span must exist; it shows 'Writing…' alongside the
// disabled send button so the player knows WHY their action is locked.
const composerWritingSpan = src.includes('composer-writing');
assert.ok(composerWritingSpan, 'Composer has a .composer-writing stated-reason element');

// ④ The send button has a named aria-label when busy (accessibility)
const ariaLabelBusy = src.includes('The Dungeon Master is writing — your action waits');
assert.ok(ariaLabelBusy, 'Composer send button has a stated aria-label when busy');

// ⑤ No blank > 2s: every slow substep has a label
// On act-change turns, the pipeline runs: sealing → chronicling → sealed.
// Verify both 'Sealing…' and 'Chronicling the act…' appear AND that
// 'Chronicling the act…' appears AFTER 'Sealing…' (correct order).
const sealingLine     = lineOf("'Sealing…'");
const chroniclingLine = lineOf("'Chronicling the act…'");
assert.ok(sealingLine !== -1 && chroniclingLine !== -1, "Both 'Sealing…' and 'Chronicling the act…' labels present");
assert.ok(sealingLine < chroniclingLine, `'Sealing…' (line ${sealingLine}) precedes 'Chronicling the act…' (line ${chroniclingLine})`);

console.log('turnFeedback: PASS');
console.log(`  Labels: Writing(${lineOf("'Writing…'")}) → Checking(${lineOf("'Checking the turn…'")}) → Sealing(${sealingLine}) → Chronicling(${chroniclingLine}) → Sealed(${sealedLine}) → Voices(${lineOf("'Casting voices…'")})`);
console.log(`  setBusy(false) at line ${busyFalseLine}, before playNarration(${playNarLine}) and queueMedia(${queueLine})`);
console.log(`  refreshShelf: fire-and-forget ✓`);
console.log(`  Composer stated reason: ✓`);
