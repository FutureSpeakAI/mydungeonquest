// G4 — harnessHonest (Rule 26)
//
// Rule 26: a test that cannot observe its property does not assert it.
//
// This gate documents what the Node / react-test-renderer / fake-indexeddb
// harness CAN and CANNOT verify, and enforces that no eval in the suite
// crosses the line.
//
// The harness CAN verify:
//   - CSS source text (property declarations, selectors, rule blocks)
//   - JS/JSX source text (function names, patterns, structural presence)
//   - Pure function output (reducers, validators, key derivation)
//   - Dexie operations via fake-indexeddb (structure, not quota)
//   - React component trees via react-test-renderer (structure, not pixels)
//   - Procedural/mock provider output (no real media, no real network)
//
// The harness CANNOT verify (requires a real browser / Playwright):
//   - Pixel positions, bounding boxes, or element overlap
//   - Computed layout (getBoundingClientRect, offsetHeight, scrollHeight)
//   - Audio playback, AudioContext, autoplay policy enforcement
//   - navigator.storage.estimate() / IndexedDB quota
//   - Font rendering, antialiasing, or pixel-level color contrast
//   - Device orientation, touch events, or notch / safe-area insets
//
// Courts:
//   1. README carries the honest harness caveat (no audio, no layout engine).
//   2. safeInsets.test.mjs labels itself as a CSS source check.
//   3. No eval calls getBoundingClientRect, offsetHeight, or getComputedStyle.
//   4. The three "CSS source" layout tests all declare their methodology.
//
// Node — no build, no browser, no keys.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT  = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO  = path.join(ROOT, '..', '..');

// ── 1. README carries the honest harness caveat ──────────────────────────
const readme = readFileSync(path.join(REPO, 'README.md'), 'utf8');
assert.ok(
  readme.includes('no audio') && readme.includes('no layout engine'),
  'README must document the Node harness limitations (no audio, no layout engine) ' +
  'so a reader knows eval green does not mean playback or layout is verified',
);
console.log('PASS court 1 — README carries the honest harness caveat');

// ── 2. safeInsets is labelled as a CSS source check, not a DOM probe ─────
const safeInsets = readFileSync(path.join(ROOT, 'evals', 'safeInsets.test.mjs'), 'utf8');
assert.ok(
  safeInsets.includes('CSS SOURCE verification') || safeInsets.includes('CSS source'),
  'safeInsets.test.mjs must declare its methodology as CSS source verification, not a DOM layout probe',
);
console.log('PASS court 2 — safeInsets.test.mjs is honestly labelled as CSS source verification');

// ── 3. No eval calls getBoundingClientRect, offsetHeight, getComputedStyle ─
// Exclude this file from the scan — it mentions the banned strings in its
// own assertions and error messages, which would cause a self-referential
// false positive.
const evalFiles = readdirSync(path.join(ROOT, 'evals')).filter(
  (f) => f !== 'harnessHonest.test.mjs' && (f.endsWith('.test.mjs') || f === 'run.mjs'),
);
// The three DOM probe strings are split across literals so this file's
// own source scanner can't accidentally match them.
const BANNED = ['getBoundingClient' + 'Rect', 'offset' + 'Height', 'getCom' + 'putedStyle'];
const domProbeFiles = [];
for (const file of evalFiles) {
  const src = readFileSync(path.join(ROOT, 'evals', file), 'utf8');
  if (BANNED.some((b) => src.includes(b))) {
    domProbeFiles.push(file);
  }
}
assert.deepEqual(
  domProbeFiles,
  [],
  'No eval may call getBoundingClientRect, offsetHeight, or getComputedStyle — ' +
  'these return zeros in the Node harness and produce false certification. ' +
  `Found in: [${domProbeFiles.join(', ')}]. ` +
  'Move any geometry assertion to the Playwright suite.',
);
console.log('PASS court 3 — No eval calls DOM geometry APIs that Node cannot observe');

// ── 4. The three layout-adjacent tests declare CSS / source methodology ──
const methodologyTests = ['safeInsets.test.mjs', 'composerFit.test.mjs', 'hudFit.test.mjs'];
for (const file of methodologyTests) {
  const src = readFileSync(path.join(ROOT, 'evals', file), 'utf8');
  const honest =
    src.includes('CSS') ||
    src.includes('source') ||
    src.includes('structural') ||
    src.includes('Source-level') ||
    src.includes('source-level') ||
    src.includes('source check');
  assert.ok(
    honest,
    `${file} must declare its methodology (CSS source / structural / source check) ` +
    `so readers know it cannot verify rendered geometry`,
  );
}
console.log('PASS court 4 — Layout-adjacent evals all declare CSS/source methodology');

console.log(
  'PASS — G4 harnessHonest (Rule 26): README caveat present, safeInsets honestly labelled, ' +
  'no eval calls DOM geometry APIs, layout-adjacent evals declare source methodology. ' +
  'Audio, pixel-geometry, and quota verification are deferred to the Playwright suite.',
);
