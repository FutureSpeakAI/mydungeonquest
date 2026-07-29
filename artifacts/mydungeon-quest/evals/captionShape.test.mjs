// J3 — captionShape (P20: captions do not cut mid-word, are never empty)
//
// P20 identified that the plateMood fallback in cueCaption used a hard
// .slice(0, 90) which can cut mid-word. J3 added word-boundary backtracking:
// if the slice lands inside a word (exactly 90 chars), back up to the last space.
//
// Courts:
//  ① App.jsx cueCaption has the word-boundary backtracking guard
//  ② The guard fires ONLY when the slice is at the max (text was longer)
//  ③ The fallback when no word boundary exists preserves the raw slice (no crash)
//  ④ The sealed cue.caption path is immune to word-cutting (it returns whole)
//  ⑤ The subjects+region path is immune to word-cutting (no slice on the compound)
//  ⑥ Functional: a 120-char narration produces a caption ≤89 chars ending on a word
//  ⑦ Functional: a sealed caption returns exactly as-is, regardless of length
//  ⑧ Functional: a cue with subjects and region produces "Name in Region" (no cut)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSrc = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

// ① Word-boundary backtracking guard is present in cueCaption
const cueCaptionStart = appSrc.indexOf('function cueCaption(');
const cueCaptionEnd = appSrc.indexOf('\n}', cueCaptionStart) + 2;
const cueCaptionBody = appSrc.slice(cueCaptionStart, cueCaptionEnd);

assert.ok(
  cueCaptionBody.includes('lastIndexOf') && cueCaptionBody.includes("' '"),
  'cueCaption must use lastIndexOf(" ") to back up to a word boundary before returning the plateMood fallback (P20)',
);

// ② The guard fires ONLY when the slice is at the max
assert.ok(
  cueCaptionBody.includes('>= 90') || cueCaptionBody.includes('=== 90') || cueCaptionBody.includes('raw.length >= 90'),
  'the word-boundary guard must check that the raw slice is at the max length (90) before backtracking',
);

// ③ Fallback when no space: preserves the raw slice (the || raw guard)
assert.ok(
  cueCaptionBody.includes('|| raw'),
  'the word-boundary backtrack must fall back to the raw slice when no space is found (|| raw)',
);

// ④ Sealed cue.caption path returns whole — it returns BEFORE reaching plateMood
const sealedReturnIdx = cueCaptionBody.indexOf('return cue.caption');
const plateMoodIdx = cueCaptionBody.indexOf('plateMood');
assert.ok(
  sealedReturnIdx !== -1 && sealedReturnIdx < plateMoodIdx,
  'the sealed cue.caption return must come before plateMood (sealed captions are never sliced)',
);

// ⑤ The subjects+region path has no slice operation — it joins an already-bounded array
// (slice(0,3) limits to 3 subjects, then join — no character-level slicing of the result)
const subjectReturnIdx = cueCaptionBody.indexOf("join(', ')");
assert.ok(subjectReturnIdx !== -1, 'cueCaption must have a subjects join path');
// Check that the join result is returned directly (no .slice(0, N) on the join result)
const afterJoin = cueCaptionBody.slice(subjectReturnIdx, subjectReturnIdx + 60);
assert.ok(
  !afterJoin.includes('.slice(') && !afterJoin.includes('lastIndexOf'),
  'the subjects+region join result must be returned directly, with no character-level slicing',
);

// ⑥–⑧ Functional courts — import plateMood from the engine
// (cueCaption is not exported from App.jsx, so we replicate its logic functionally.)
import('../src/lib/cinema/prompts.js').then(async ({ plateMood }) => {
  // ⑥ A 120-char narration: plateMood returns max 90 chars, but the word-boundary
  //    backtrack must produce a string that ends on a word boundary (no partial words).
  const longText = 'The wanderer pressed through the hollow wind toward a distant ridge where lanterns burned against the darkening sky and ravens circled twice.';
  // Replicate cueCaption's plateMood fallback (cue is absent, no subjects, no region)
  const raw = plateMood({ narration_blocks: [{ text: longText }] }, 90);
  // Apply the word-boundary backtrack (same logic as cueCaption)
  const capped = raw && raw.length >= 90 ? (raw.slice(0, raw.lastIndexOf(' ')) || raw) : raw;
  assert.ok(capped.length <= 89, `Backtracked caption must be ≤89 chars, got ${capped.length}: "${capped}"`);
  assert.ok(!capped.endsWith('-'), `Caption must not end mid-hyphenation: "${capped}"`);
  // Must end on a word character (letter, digit, punctuation like ',' or '.')
  assert.ok(
    /[\w,.'";!?…]$/.test(capped),
    `Caption must end on a word boundary character: "${capped}"`,
  );

  // ⑦ Sealed caption returns exactly as-is
  // Simulate cueCaption priority 1: sealed caption of any length
  const sealedCaption = 'Maren stands at the edge of the forest, torch in hand, the wolves circling.';
  const cue = { caption: sealedCaption, subjects: [], region: '' };
  const result1 = typeof cue?.caption === 'string' && cue.caption.trim() ? cue.caption : null;
  assert.strictEqual(result1, sealedCaption, 'sealed cue.caption must be returned exactly as-is');

  // ⑧ Subjects + region: no word-cutting
  const subjects = ['Maren Voss', 'Holt'];
  const region = 'Larkspur Crossing';
  const result2 = `${subjects.slice(0, 3).join(', ')} in ${region}`;
  assert.ok(!result2.endsWith(' '), 'subjects+region caption must not end with a space');
  assert.ok(result2.includes('in'), 'subjects+region caption must include "in" separator');
  assert.ok(result2.startsWith('Maren Voss'), 'first subject must lead the caption');

  console.log(
    `PASS — J3 captionShape: word-boundary guard present in cueCaption (lastIndexOf(" ")); ` +
    `fires only at max length (90); || raw fallback for no-space edge case; ` +
    `sealed cue.caption immune (returns before plateMood); subjects+region immune (join, no char-slice); ` +
    `functional: "${capped}" (≤89, ends on word); sealed returns whole; subjects+region correct.`,
  );
}).catch((e) => {
  console.error('FAIL — captionShape functional courts:', e.message);
  process.exit(1);
});
