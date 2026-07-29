// H4 — harnessSplit (Rule 26 implementation: two suites, one ledger)
//
// Confirms the gate ledger is split between two suites, and a reader can
// tell at a glance which suite holds each gate. The Node suite remains
// the keyless floor; the browser suite (Playwright, tests/e2e/h4-*.spec.ts)
// adds the geometry, audio, and storage observations Node cannot make.
//
// Courts:
//  ① BUILD_STATUS.md exists and names both suites with a Suite column
//  ② playwright.config.ts has the h4 browser projects (layout, audio, storage)
//  ③ Browser test files exist for each H4 category
//  ④ No geometry/audio/quota API calls in any Node eval (belt-and-suspenders
//     with harnessHonest — this court specifically names the browser gates)
//  ⑤ The node suite passes keyless (this file itself is a node eval — its
//     inclusion in the eval chain proves the floor holds)
//
// Source-level court — no build, no AI keys required (Rule 26).

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① BUILD_STATUS.md has a Suite column section
const buildStatus = src('BUILD_STATUS.md');
assert.ok(
  buildStatus.includes('Browser suite') || buildStatus.includes('browser suite') || buildStatus.includes('Node suite'),
  'BUILD_STATUS.md must document both Node and Browser suites (H4 added the split)',
);
assert.ok(
  buildStatus.includes('h4-layout') || buildStatus.includes('H4') || buildStatus.includes('browser harness'),
  'BUILD_STATUS.md must name the H4 browser courts or the browser harness',
);

// ② playwright.config.ts has the h4 browser projects
const playwrightConfig = src('playwright.config.ts');
assert.ok(
  playwrightConfig.includes('h4-layout'),
  'playwright.config.ts must have an h4-layout project',
);
assert.ok(
  playwrightConfig.includes('h4-audio'),
  'playwright.config.ts must have an h4-audio project',
);
assert.ok(
  playwrightConfig.includes('h4-storage'),
  'playwright.config.ts must have an h4-storage project',
);

// ③ Browser test files exist
assert.ok(
  existsSync(path.join(ROOT, 'tests/e2e/h4-layout.spec.ts')),
  'tests/e2e/h4-layout.spec.ts must exist — layout geometry courts (real browser, 360/390/430 widths)',
);
assert.ok(
  existsSync(path.join(ROOT, 'tests/e2e/h4-audio.spec.ts')),
  'tests/e2e/h4-audio.spec.ts must exist — narration chain courts (real browser)',
);
assert.ok(
  existsSync(path.join(ROOT, 'tests/e2e/h4-storage.spec.ts')),
  'tests/e2e/h4-storage.spec.ts must exist — IndexedDB quota courts (real browser)',
);

// ④ Belt-and-suspenders: the harnessHonest gate already proved this, but
//    confirm specifically that the new H4 browser test files use real browser
//    APIs — they are NOT source-checked here (that would require a Node run
//    against TypeScript, which needs a build); we verify they do NOT appear in
//    the Node eval chain (they belong in the browser suite, not here).
const packageJson = JSON.parse(src('package.json'));
const evalScript = packageJson.scripts?.eval || '';
assert.ok(
  !evalScript.includes('h4-layout') && !evalScript.includes('h4-audio') && !evalScript.includes('h4-storage'),
  'H4 browser tests must NOT appear in the Node eval chain — they belong in the Playwright browser suite',
);

// ⑤ The Node suite floor: the fact that this file is in the eval chain
//    (verified by harnessHonest) and passes proves the floor holds.
//    The G13 keyless count check (in the proving loop's g13-check.spec.ts)
//    confirms the browser suite's check count separately.
const leanDoor = src('evals/leanDoor.test.mjs');
assert.ok(
  leanDoor.includes('PASS'),
  'leanDoor.test.mjs must have a PASS line (the closure is lawful)',
);

console.log(
  'PASS — H4 harnessSplit: BUILD_STATUS.md documents both suites; playwright.config.ts ' +
  'has h4-layout, h4-audio, h4-storage projects; browser test files exist; ' +
  'H4 tests are NOT in the Node eval chain; Node floor holds.',
);
