// PART 1 GATE — no numeric budget literal outside the constants definition.
//
// PACK_BUDGET (32500) and BRIEF_BUDGET (33000) are exported from
// packages/engine/src/graph.js. Every other file imports from there.
// This test asserts that no file outside the constants source hardcodes the
// raw numbers, so changing the budget remains a one-line edit in one place.
//
// Exemptions:
//   - packages/engine/src/graph.js itself (the canon file — contains the
//     export const PACK_BUDGET = 32500 / BRIEF_BUDGET = 33000 definitions)
//   - budget: 900 / budget: 120 etc. (pressure-test values — different numbers)
//   - Strings with commas: '32,500 chars' etc. (human-readable text,
//     not JS numeric tokens; \b32500\b won't match '32,500')

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir   = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dir, '..');                          // artifacts/mydungeon-quest
const ENGINE  = path.resolve(ROOT, '../../packages/engine/src');   // the canon home

const CANON    = path.resolve(ENGINE, 'graph.js');
const SELF     = path.resolve(__dir, 'budgetLiteral.test.mjs'); // self-exempt: must name values in error text

// Walk a directory, returning all .js / .mjs / .jsx / .ts / .tsx files,
// skipping node_modules and .git.
function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.(js|mjs|jsx|ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

const DIRS = [ENGINE, path.join(ROOT, 'evals'), path.join(ROOT, 'src'), path.join(ROOT, 'server')];

const PATTERN = /\b(32500|33000)\b/;
const violations = [];

for (const dir of DIRS) {
  for (const file of walk(dir)) {
    if (path.resolve(file) === CANON) continue; // exempt: the definition itself
    if (path.resolve(file) === SELF)  continue; // exempt: this enforcement test
    const src = readFileSync(file, 'utf8');
    if (PATTERN.test(src)) violations.push(path.relative(ROOT, file));
  }
}

assert.deepEqual(
  violations,
  [],
  `Budget literals (32500 / 33000) found outside packages/engine/src/graph.js:\n${violations.map((f) => `  ${f}`).join('\n')}\nEach site must import PACK_BUDGET / BRIEF_BUDGET from fatescript/graph instead.`,
);

console.log('PASS — no budget literals (32500 / 33000) outside the constants definition (packages/engine/src/graph.js)');
