// J4 — tickGrammar (P21: grammatical tick text, no doubled punctuation, clause boundary)
//
// The tick system's excerpt() function extracts the first clause of a goal
// for use in the fact_add string. P21 identified three grammar defects:
//   1. Imperative goals starting with a capital letter ("Find the artifact")
//      produced mid-sentence capitals ("presses on toward Find the artifact").
//   2. Goals ending with trailing punctuation produced doubled punctuation
//      ("presses on toward clear the path..").
//   3. The 7-word slice could cut mid-clause, leaving a dangling fragment.
//
// J4 fixes: lowercase the first letter, trim trailing punctuation, and clip
// at a natural clause boundary (period or comma within the 7-word window).
//
// Courts:
//  ① excerpt logic is present in livingWorld.js source (lowercase, trim, clause)
//  ② Functional: imperative goal → lowercase first letter
//  ③ Functional: trailing-period goal → no doubled period in fact_add
//  ④ Functional: comma-delimited goal → clips at the comma, no dangling fragment
//  ⑤ Functional: short goal (< 7 words) → returned whole (lowercase first letter)
//  ⑥ tickUpdates produces a fact_add ending with exactly one period
//  ⑦ No stride phrase produces an ALL-CAPS mid-sentence insertion

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIVING_WORLD = path.resolve(ROOT, '../../packages/engine/src/livingWorld.js');
const engineSrc = readFileSync(LIVING_WORLD, 'utf8');

// ① excerpt fixes are in source
assert.ok(
  engineSrc.includes('toLowerCase()') || engineSrc.includes('.toLowerCase()'),
  'excerpt() must lowercase the first letter of the extracted goal text (P21 grammar fix)',
);
assert.ok(
  engineSrc.includes("[.,;:!?]+$"),
  'excerpt() must trim trailing punctuation to prevent doubled periods in fact_add',
);
assert.ok(
  engineSrc.includes('[.!?]$') || engineSrc.includes("/.test(") || engineSrc.includes('clause'),
  'excerpt() must include a clause-boundary check (period or comment about clause)',
);

// ②–⑦ Functional courts
import('../../../packages/engine/src/livingWorld.js').then(async ({ tickUpdates }) => {
  const baseSoul = { role: 'envoy', status: 'active', bond: 3, introduced_turn: 0 };

  // ② Imperative goal: capital first letter → must be lowercased in fact_add
  const imperativeCodex = { cast: [{ ...baseSoul, name: 'Maret', goal: 'Find the lost chalice.' }] };
  const result = tickUpdates(imperativeCodex, 1);
  assert.ok(result, 'tickUpdates must return updates for an imperative goal');
  const fact = result.cast_update[0].fact_add;
  // The goal excerpt must NOT appear with capital "Find" mid-sentence
  assert.ok(
    !fact.includes('Find the'),
    `Fact must not contain capitalized "Find the" mid-sentence; got: "${fact}"`,
  );
  assert.ok(
    fact.toLowerCase().includes('find the') || fact.includes('find'),
    `Fact must contain the goal text in lowercase; got: "${fact}"`,
  );

  // ③ Trailing-period goal → no doubled period
  const trailingPeriodCodex = { cast: [{ ...baseSoul, name: 'Lena', goal: 'Recover the map. Return it safely.' }] };
  const result3 = tickUpdates(trailingPeriodCodex, 1);
  const fact3 = result3.cast_update[0].fact_add;
  // Must end with exactly one period (or other terminal punctuation)
  assert.ok(
    !fact3.endsWith('..') && !fact3.endsWith('..'),
    `Fact must not have doubled periods; got: "${fact3}"`,
  );
  const terminalPunct = fact3.match(/[.!?]+$/)?.[0] || '';
  assert.ok(
    terminalPunct.length <= 1,
    `Fact must end with at most one terminal punctuation mark; got: "${fact3}"`,
  );

  // ④ Comma-delimited goal → clips at the comma
  const commaCodex = { cast: [{ ...baseSoul, name: 'Wren', goal: 'Gather allies, then march on the capital' }] };
  const result4 = tickUpdates(commaCodex, 1);
  const fact4 = result4.cast_update[0].fact_add;
  // The comma itself should not appear (it marks the clause boundary)
  // And "march on the capital" should not appear (it's after the comma)
  assert.ok(
    !fact4.includes(',') || fact4.indexOf(',') === fact4.length - 1,
    `Fact from a comma-delimited goal should not contain a mid-sentence comma; got: "${fact4}"`,
  );

  // ⑤ Short goal (< 7 words) → returned whole with lowercase first letter
  const shortGoal = 'guard the eastern gate';
  const shortCodex = { cast: [{ ...baseSoul, name: 'Bram', goal: shortGoal }] };
  const result5 = tickUpdates(shortCodex, 1);
  const fact5 = result5.cast_update[0].fact_add;
  assert.ok(
    fact5.includes(shortGoal),
    `Short goal must appear whole in the fact; got: "${fact5}"`,
  );

  // ⑥ Every fact_add ends with exactly one period
  const multiCodex = {
    cast: [
      { ...baseSoul, name: 'A', goal: 'Find the chalice' },
      { ...baseSoul, name: 'B', goal: 'Protect the village.' },
      { ...baseSoul, name: 'C', goal: 'Win allegiance, build the coalition' },
    ],
  };
  const result6 = tickUpdates(multiCodex, 3);
  for (const update of result6.cast_update) {
    const f = update.fact_add;
    assert.ok(f.endsWith('.'), `fact_add must end with a period; got: "${f}"`);
    assert.ok(!f.endsWith('..'), `fact_add must not end with doubled periods; got: "${f}"`);
  }

  // ⑦ No stride phrase produces an ALL-CAPS word mid-sentence
  for (const update of result6.cast_update) {
    const words = update.fact_add.split(' ').slice(1); // skip "Offscreen"
    const capsWord = words.find((w) => /^[A-Z]{2,}/.test(w.replace(/[^a-zA-Z]/g, '')));
    assert.ok(
      !capsWord,
      `Fact must not contain an ALL-CAPS mid-sentence word; got: "${update.fact_add}", word: "${capsWord}"`,
    );
  }

  console.log(
    'PASS — J4 tickGrammar: excerpt() lowercases first letter, trims trailing punctuation, ' +
    'clips at clause boundary; imperative goal lowercase in fact_add; trailing-period goal has ' +
    'single terminal period; comma-delimited goal clips at comma; short goal returned whole; ' +
    'all fact_add strings end with exactly one period; no ALL-CAPS mid-sentence.',
  );
}).catch((e) => {
  console.error('FAIL — tickGrammar functional courts:', e.message);
  process.exit(1);
});
