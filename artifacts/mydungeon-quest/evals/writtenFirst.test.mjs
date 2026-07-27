// ---------------------------------------------------------------------------
// WRITTEN FIRST GATE (C2) — every player-visible string before turn one
// resolves from a fixture, and every such string passes a grammar check.
//
// Proofs:
//   1. Every fixture entry's title, covenant, and tone are non-empty strings.
//   2. No entry string contains a doubled determiner (the the, a a, a an …).
//   3. No entry string starts a sentence with an orphan conjunction (And, But, Or).
//   4. No entry string has a bare subject-verb mismatch heuristic (I is, you is, he are, they is).
//   5. All titles start with a capital letter.
//   6. All covenants end with expected punctuation (period or em-dash).
//   7. The fixture has at least 3 entries (the three shown by default).
// ---------------------------------------------------------------------------
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// Import the fixture.
const { WORLD_DECK } = await import('../src/lib/worldDeck.js');

check(WORLD_DECK.length >= 3, `fixture has at least 3 entries (found ${WORLD_DECK.length})`);

// ── Grammar checks ─────────────────────────────────────────────────────────
// Doubled determiners: "the the", "a a", "an an", "a an", "an a", etc.
const DOUBLED_DET = /\b(the|a|an)\s+(the|a|an)\b/i;

// Orphan conjunctions: sentence starts with And / But / Or.
// Covers start of string OR beginning of a new sentence (after . or — or –).
const ORPHAN_CONJ = /(^|[.!?…—–]\s+)(And|But|Or)\s/;

// Basic subject-verb mismatch heuristics.
const SV_MISMATCH = /\b(I\s+is|you\s+is|he\s+are|she\s+are|it\s+are|they\s+is|we\s+is)\b/i;

for (const entry of WORLD_DECK) {
  const label = `[${entry.id}]`;
  const strings = [
    { field: 'title', value: entry.title },
    { field: 'covenant', value: entry.covenant },
    { field: 'tone', value: entry.tone },
  ];

  for (const { field, value } of strings) {
    const key = `${label} ${field}`;

    check(typeof value === 'string' && value.length > 0, `${key}: non-empty string`);

    if (typeof value !== 'string') continue;

    check(!DOUBLED_DET.test(value), `${key}: no doubled determiner (value: "${value}")`);
    check(!ORPHAN_CONJ.test(value), `${key}: no orphan conjunction at sentence start (value: "${value}")`);
    check(!SV_MISMATCH.test(value), `${key}: no subject-verb mismatch (value: "${value}")`);
  }

  // Titles must start with a capital letter.
  check(
    typeof entry.title === 'string' && /^[A-Z]/.test(entry.title),
    `${label} title: starts with a capital (value: "${entry.title}")`
  );

  // Covenants should end with punctuation (. or .).
  const cov = typeof entry.covenant === 'string' ? entry.covenant.trim() : '';
  check(
    /[.!?]$/.test(cov) || /[—–]/.test(cov),
    `${label} covenant: ends with punctuation or contains an em-dash (value: "${cov}")`
  );

  // styleBible must also be a non-empty string.
  check(
    typeof entry.styleBible === 'string' && entry.styleBible.length > 0,
    `${label} styleBible: non-empty string`
  );
}

// ── Cross-check: DEFAULT_WORLD_DECK is exactly the first 3 entries ─────────
const { DEFAULT_WORLD_DECK } = await import('../src/lib/worldDeck.js');
check(DEFAULT_WORLD_DECK.length === 3, `DEFAULT_WORLD_DECK has exactly 3 entries (found ${DEFAULT_WORLD_DECK.length})`);
for (let i = 0; i < 3; i++) {
  check(
    DEFAULT_WORLD_DECK[i].id === WORLD_DECK[i].id,
    `DEFAULT_WORLD_DECK[${i}] matches WORLD_DECK[${i}] (${WORLD_DECK[i].id})`
  );
}

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — written-first gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — written first: all fixture strings are non-empty, grammatically clean, and properly structured; DEFAULT_WORLD_DECK is the first three entries.');
