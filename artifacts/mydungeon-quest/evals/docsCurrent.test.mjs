// H9 — docsCurrent (CLAWS.md completeness gate)
//
// The standing laws are referenced from evals and source but lived only in
// comments. H9 creates docs/CLAWS.md as the authoritative home and extends
// this gate to confirm:
//
//  ① docs/CLAWS.md exists
//  ② Rule 24 is defined (the record survives the code)
//  ③ Rule 25 is defined (export always works)
//  ④ Rule 26 is defined (claim only what the tool can see)
//  ⑤ Rule 27 is defined (a refusal is a loud failure)
//  ⑥ The pin-move law is documented (joint soulsWeb + leanDoor requirement)
//  ⑦ soulsWeb.test.mjs cross-points leanDoor.test.mjs (the gates reference each other)
//  ⑧ leanDoor.test.mjs cross-points soulsWeb.test.mjs

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① docs/CLAWS.md exists
assert.ok(
  existsSync(path.join(ROOT, 'docs/CLAWS.md')),
  'docs/CLAWS.md must exist — the standing laws must have a canonical home',
);

const claws = src('docs/CLAWS.md');

// ② Rule 24 — the record survives the code
assert.ok(
  claws.includes('Rule 24'),
  'CLAWS.md must define Rule 24 (the record survives the code)',
);
assert.ok(
  claws.includes('exportRawJournal'),
  'CLAWS.md Rule 24 must name exportRawJournal as the raw-read gate',
);

// ③ Rule 25 — export always works
assert.ok(
  claws.includes('Rule 25'),
  'CLAWS.md must define Rule 25 (export always works)',
);

// ④ Rule 26 — claim only what the tool can see
assert.ok(
  claws.includes('Rule 26'),
  'CLAWS.md must define Rule 26 (claim only what the tool can see)',
);
assert.ok(
  claws.includes('Node suite') || claws.includes('Node/react'),
  'CLAWS.md Rule 26 must name the Node suite (CSS source assertions)',
);
assert.ok(
  claws.includes('Playwright') || claws.includes('browser suite'),
  'CLAWS.md Rule 26 must name the Playwright/browser suite for real geometry',
);

// ⑤ Rule 27 — a refusal is a loud failure
assert.ok(
  claws.includes('Rule 27'),
  'CLAWS.md must define Rule 27 (a refusal is a loud failure)',
);
assert.ok(
  claws.includes('logRefusal'),
  'CLAWS.md Rule 27 must name the logRefusal shared helper',
);
assert.ok(
  claws.includes('console.warn'),
  "CLAWS.md Rule 27 must state that refusals emit console.warn('[refusal]', ...)",
);

// ⑥ Pin-move law documented (joint soulsWeb + leanDoor requirement)
assert.ok(
  claws.includes('soulsWeb') && claws.includes('leanDoor'),
  'CLAWS.md must document the joint soulsWeb + leanDoor pin-move requirement',
);
assert.ok(
  claws.includes('same commit') || claws.includes('one commit'),
  'CLAWS.md must state that pin moves must be done in the same commit',
);
assert.ok(
  claws.includes('CLOSURE_BYTES_PIN') && claws.includes('PIN_KB'),
  'CLAWS.md must name both pin constants (CLOSURE_BYTES_PIN and PIN_KB)',
);

// ⑦ soulsWeb cross-points leanDoor
const soulsWeb = src('evals/soulsWeb.test.mjs');
assert.ok(
  soulsWeb.includes('leanDoor') || soulsWeb.includes('lean door'),
  'soulsWeb.test.mjs must cross-point leanDoor.test.mjs in its header',
);

// ⑧ leanDoor cross-points soulsWeb
const leanDoor = src('evals/leanDoor.test.mjs');
assert.ok(
  leanDoor.includes('soulsWeb'),
  'leanDoor.test.mjs must cross-point soulsWeb.test.mjs in its header',
);

console.log(
  'PASS — H9 docsCurrent: CLAWS.md exists; Rule 24 (record survives), Rule 25 (export works), ' +
  'Rule 26 (claim only what you can see), Rule 27 (refusal is loud) all defined; ' +
  'joint pin-move law documented (same commit, CLOSURE_BYTES_PIN + PIN_KB); ' +
  'soulsWeb cross-points leanDoor and vice versa.',
);
