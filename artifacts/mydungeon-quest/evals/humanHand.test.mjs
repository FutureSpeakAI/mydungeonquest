// ------------------------------------------------------------
// THE HUMAN HAND GATE (game) — the tell court at the table
// (Directive VI, Phase 10).
//
// The sealed record is measured, free and deterministic: four tell
// families counted per thousand words, struck rows staying struck,
// rows that never spoke contributing nothing. A hot family draws
// its counter-directive into the pack — capped at three, hottest
// first — and the pressure lands on the next turn. The court
// measures; it never rewrites. Zero keys.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { TELL_FAMILIES, styleDirectives } = await import('fatescript/tells');
const { tellCourt } = await import('../src/lib/tells.js');

const narrate = (text) => ({ dm: { narration_blocks: [{ text }] }, redacted: false });

const CAMPAIGN = {
  id: 'c1',
  logs: [
    narrate('She finally understood that the road was the prize. The real treasure had walked beside her. What really mattered most was the walking. It was in that moment that the lesson took root.'),
    narrate('Her heart pounded at the gate. Her stomach dropped when the bell rang. Her breath caught on the last stair.'),
    { ...narrate('All was well. The matter was settled. Nothing left to fear.'), redacted: true },
    { kind: 'tick', story: {}, redacted: false }
  ]
};

// 1. THE COURT IN SESSION — four families stand; the hot ones are
//    convicted with citations; the struck row convicts nothing; the
//    same record convicts the same tells.
{
  assert.equal(Object.keys(TELL_FAMILIES).length, 4, 'four families, no more');
  const { report } = tellCourt(CAMPAIGN);
  assert.ok(report.flagged.includes('statedMoral'), 'the stated moral runs hot');
  assert.ok(report.flagged.includes('borrowedBody'), 'the borrowed body runs hot');
  assert.ok(!report.flagged.includes('tidyBow'), 'a struck row stays struck — its bow convicts nobody');
  assert.ok(report.offenders.some((o) => o.family === 'statedMoral' && o.sample), 'offenders are cited with their own words');
  assert.equal(JSON.stringify(tellCourt(CAMPAIGN)), JSON.stringify(tellCourt(CAMPAIGN)), 'the same record, the same verdict');
}

// 2. THE COUNTER-DIRECTIVES — hottest family first, capped at three,
//    and a quiet record draws no correction at all.
{
  const { directives } = tellCourt(CAMPAIGN);
  assert.ok(directives.length >= 2 && directives.length <= 3, 'capped correction');
  assert.ok(directives[0].includes('Do not state the moral'), 'hottest family speaks first');
  assert.ok(directives[1].includes('Not every feeling lives in the stomach'), 'the borrowed body answers second');
  const allHot = styleDirectives({ flagged: Object.keys(TELL_FAMILIES), per1k: { statedMoral: 30, borrowedBody: 30, tidyBow: 30, hushedRegister: 30 } });
  assert.equal(allHot.length, 3, 'the pack never drowns in correction — three lines, no more');
  const quiet = tellCourt({ id: 'q', logs: [narrate('The rain came and the innkeeper grumbled about the roof.')] });
  assert.deepEqual(quiet.report.flagged, [], 'a quiet record convicts nobody');
  assert.deepEqual(quiet.directives, [], 'no conviction, no correction');
  const empty = tellCourt({ id: 'e', logs: [] });
  assert.deepEqual(empty.directives, [], 'an unopened tale owes the court nothing');
}

// 3. THE WIRING — the court sits at the pack seam, its pressure rides
//    the directives additively for the NEXT turn, the codex shows the
//    finding, and the engine's court is the only court.
{
  const app = read('src/App.jsx');
  assert.ok(app.includes('tellCourt(base)'), 'the sealed record is measured at the table');
  assert.ok(app.includes('...hand.directives'), 'the counter-directives ride the pack, additively');
  const book = read('src/components/Book.jsx'); // Task 58C: the tell court's face moved whole into the Book.
  assert.ok(book.includes('The human hand — the tell court'), 'the finding is visible to the patron');
  const lib = read('src/lib/tells.js');
  assert.ok(lib.includes('fatescript/tells') && lib.includes('tellReport') && lib.includes('styleDirectives'), 'the engine\u2019s court, whole');
}

console.log('PASS \u2014 the human hand gate (game): the tell court measures the sealed record free and deterministic with struck rows staying struck and silent rows contributing nothing, hot families are convicted with citations while a quiet record convicts nobody, the counter-directives ride the pack capped at three hottest first so the pressure lands on the next turn, and the codex shows the patron the finding \u2014 the court measures, it never rewrites.');
