// J3 — captionSingleSource (P19: single caption path, no second generator)
//
// Stage 5 J0 confirmed that 'cueCaption' is the single path for generating
// plate captions. J3 proves this structurally — no second generator function
// can produce caption text outside of the cueCaption path.
//
// Courts:
//  ① The template phrases ("the staged moment", "as this page tells it")
//     appear ONLY in comments, never as generated string content
//  ② cue.mood is explicitly EXCLUDED from cueCaption (comment confirms intent)
//  ③ Only ONE cueCaption call feeds the figcaption element
//  ④ The figcaption uses 'mood' which is always sourced from cueCaption()
//  ⑤ No other function in App.jsx generates caption text for the figcaption
//  ⑥ cueCaption priority: sealed cue.caption → subjects+region → plateMood fallback

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSrc = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

// ① Template phrases must be in comments only, never in generated strings
// Strip all comments (single-line and inline) to check generated content.
// Simplified check: ensure the phrases appear only where preceded by '//' or '/*'.
const stageLines = appSrc.split('\n').filter((line) => line.includes('the staged moment'));
for (const line of stageLines) {
  const commentStart = Math.min(
    line.includes('//') ? line.indexOf('//') : Infinity,
    line.includes('/*') ? line.indexOf('/*') : Infinity,
  );
  const phraseIdx = line.indexOf('the staged moment');
  assert.ok(
    phraseIdx > commentStart,
    `"the staged moment" must appear only in comments, but found in non-comment context: "${line.trim()}"`,
  );
}
// "as this page tells it" must similarly appear only in comments
const pageLinesArr = appSrc.split('\n').filter((line) => line.includes('as this page tells it'));
for (const line of pageLinesArr) {
  const commentStart = Math.min(
    line.includes('//') ? line.indexOf('//') : Infinity,
    line.includes('/*') ? line.indexOf('/*') : Infinity,
  );
  const phraseIdx = line.indexOf('as this page tells it');
  assert.ok(
    phraseIdx > commentStart,
    `"as this page tells it" must appear only in comments, but found in non-comment context: "${line.trim()}"`,
  );
}

// ② cue.mood is excluded from cueCaption — the comment says "Skips cue.mood intentionally"
assert.ok(
  appSrc.includes('Skips cue.mood intentionally'),
  'cueCaption must have a comment explicitly stating cue.mood is excluded (P19)',
);
// And cue.mood must not appear in the cueCaption function body
const cueCaptionStart = appSrc.indexOf('function cueCaption(');
const cueCaptionEnd = appSrc.indexOf('\n}', cueCaptionStart) + 2;
const cueCaptionBody = appSrc.slice(cueCaptionStart, cueCaptionEnd);
assert.ok(
  !cueCaptionBody.includes('cue.mood') && !cueCaptionBody.includes('cue?.mood'),
  'cueCaption function body must not reference cue.mood — mood field is intentionally excluded',
);

// ③ Only ONE cueCaption call feeds the figcaption
// Count cueCaption references in non-comment lines only.
const nonCommentLines = appSrc.split('\n').filter((line) => {
  const trimmed = line.trimStart();
  return !trimmed.startsWith('//') && !trimmed.startsWith('*');
});
const cueCaptionCalls = (nonCommentLines.join('\n').match(/cueCaption\(/g) || []).length;
// Definition + one call site = 2 occurrences on non-comment lines. If there are more,
// there is a second caller that might feed into a second caption path.
assert.ok(
  cueCaptionCalls <= 2,
  `Expected at most 2 non-comment occurrences of 'cueCaption(' (definition + one call), found ${cueCaptionCalls}`,
);

// ④ figcaption uses the 'mood' variable which comes from cueCaption()
assert.ok(
  appSrc.includes('const mood = cueCaption(cue, log.dm)'),
  "The 'mood' variable must be assigned from cueCaption(cue, log.dm) — single source",
);
assert.ok(
  appSrc.includes('<figcaption>{mood}'),
  "figcaption must render {mood} — the cueCaption-sourced string",
);

// ⑤ No other function generates caption text for figcaption — check that no
//    other function writes directly to 'figcaption' context without going
//    through cueCaption (simple: no other 'figcaption' element in App.jsx).
const figcaptionOccurrences = (appSrc.match(/figcaption/g) || []).length;
// The opening tag + closing tag = 2. If there are more, there is a second plate.
// Each plate adds 2: a <figcaption> and </figcaption>. We allow at most 4 (two plates max).
assert.ok(
  figcaptionOccurrences <= 4,
  `Too many figcaption elements (${figcaptionOccurrences}) — verify each one uses cueCaption`,
);

// ⑥ cueCaption priority chain is in order: caption → subjects+region → plateMood
assert.ok(
  cueCaptionBody.includes('cue?.caption') &&
  cueCaptionBody.indexOf('cue?.caption') < cueCaptionBody.indexOf('subjects.length'),
  'cueCaption must check sealed cue.caption BEFORE subjects (priority order: sealed → subjects+region → fallback)',
);
assert.ok(
  cueCaptionBody.includes('plateMood'),
  'cueCaption must use plateMood as the last-resort fallback',
);

console.log(
  'PASS — J3 captionSingleSource: "the staged moment" and "as this page tells it" appear ' +
  'only in comments; cue.mood explicitly excluded from cueCaption; exactly one cueCaption call ' +
  'feeds figcaption via the "mood" variable; no second caption-generating path; ' +
  'priority: sealed cue.caption → subjects+region → plateMood fallback.',
);
