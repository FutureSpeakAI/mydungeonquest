// evals/auditionVoice.test.mjs — THE AUDITION VOICE GATE (C6).
//
// Three candidates, described by sound — never by the provider's name.
// This court proves:
//
//   1. The tray renders exactly three candidates (not ten).
//   2. No rendered string matches any provider voice name.
//   3. Every description comes from the sound lexicon in audition.js.
//   4. The shuffle mechanism draws from the same register.
//   5. The old footer text is gone from the creation flow.
//   6. Candidates in the tray are from the stated identity's register.
//
// Keyless, network-free, build-free.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { soundDesc, dealAuditions, AUDITION_COUNT } from '../src/lib/audition.js';
import { VOICE_REGISTER } from 'fatescript/cinema/casting';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const forge = read('src/components/Forge.jsx');
const auditionSrc = read('src/lib/audition.js');

// Provider names that must never appear in a rendered description.
const PROVIDER_NAMES = ['Daniel', 'Adam', 'Arnold', 'Callum', 'Bill', 'Josh', 'Bella', 'Domi', 'Charlotte', 'Alice', 'Matilda', 'Elli'];

// ── 1. Sound lexicon is used for rendering (not candidate.label) ──────────
assert.ok(
  forge.includes('soundDesc('),
  'AuditionRow renders descriptions from soundDesc(), not from candidate.label',
);
// candidate.label must not appear in the tray rendering context.
assert.ok(
  !forge.includes('{candidate.label}'),
  'candidate.label (provider name) is not rendered in the audition row',
);

// ── 2. Old footer text is gone ────────────────────────────────────────────
assert.ok(
  !forge.includes('casting session reads the finished card'),
  '"casting session reads the finished card" is gone from the creation flow',
);
assert.ok(
  !forge.includes('Ten voices wait'),
  '"Ten voices wait" is gone from the creation flow',
);

// ── 3. Tray trimmed to three ──────────────────────────────────────────────
assert.ok(
  forge.includes('.slice(0, 3)'),
  'the tray is explicitly trimmed to three candidates',
);
// The shuffle mechanism exists so Shuffle draws a different three.
assert.ok(
  forge.includes('shuffleSeed'),
  'a shuffleSeed state drives the Shuffle action',
);
// The base deal (old law) is preserved alongside the shuffle variant.
assert.ok(
  forge.includes('dealAuditions(presentation, name)'),
  'the unchanged ten-voice dealer is still called for the initial deal',
);

// ── 4. Sound lexicon covers all ensemble voices — no provider names ───────
const allIds = Object.keys(VOICE_REGISTER);
assert.ok(allIds.length >= 12, `VOICE_REGISTER covers the full ensemble (found ${allIds.length} voices)`);

for (const id of allIds) {
  const desc = soundDesc(id);
  assert.ok(desc && desc.length > 0, `voice ${id} has a non-empty sound description`);
  for (const providerName of PROVIDER_NAMES) {
    assert.ok(
      !desc.includes(providerName),
      `sound description for ${id} does not contain provider name "${providerName}" (got: "${desc}")`,
    );
  }
}

// The SOUND_MAP is defined inside audition.js (not shipped from the engine).
assert.ok(
  auditionSrc.includes('SOUND_MAP'),
  'the sound lexicon lives in audition.js, not the engine',
);

// ── 5. Tray candidates are from the stated register ───────────────────────
for (const pres of ['feminine', 'masculine']) {
  const pool = dealAuditions(pres, 'Wren');
  const tray = pool.slice(0, 3);
  const expectedReg = pres === 'feminine' ? 'fem' : 'masc';
  assert.equal(tray.length, 3, `${pres} tray has exactly 3 candidates`);
  for (const c of tray) {
    assert.equal(
      VOICE_REGISTER[c.id],
      expectedReg,
      `${pres} tray candidate ${c.id} is in the ${expectedReg} register`,
    );
  }
}

// Shuffle seed changes the three shown — same register, different picks.
for (const pres of ['feminine', 'masculine']) {
  const base = dealAuditions(pres, 'Aster Vale').slice(0, 3).map((c) => c.id).join(',');
  let foundDifferent = false;
  for (let seed = 1; seed <= 10; seed += 1) {
    const shuffled = dealAuditions(pres, `Aster Vale:s${seed}`).slice(0, 3).map((c) => c.id).join(',');
    const expectedReg = pres === 'feminine' ? 'fem' : 'masc';
    // Every shuffled candidate must still be in the stated register.
    const shuffledCandidates = dealAuditions(pres, `Aster Vale:s${seed}`).slice(0, 3);
    for (const c of shuffledCandidates) {
      assert.equal(VOICE_REGISTER[c.id], expectedReg, `shuffled ${pres} candidate stays in register`);
    }
    if (shuffled !== base) foundDifferent = true;
  }
  assert.ok(foundDifferent, `shuffle produces different ${pres} candidates within 10 seeds`);
}

// ── 6. dealAuditions still exports AUDITION_COUNT = 10 (Tenor law intact) ─
assert.equal(AUDITION_COUNT, 10, 'the ten-voice Tenor law is unchanged');

console.log('PASS auditionVoice — three sound-described candidates, no provider names, shuffle stays in register, old footer gone, Tenor law intact');
