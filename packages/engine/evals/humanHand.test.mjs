// THE HUMAN HAND GATE — the tell court at the table (twin of the
// table's gate, the pure fraction). The sealed record is measured,
// free and deterministic: four tell families counted per thousand
// words, struck rows staying struck, rows that never spoke
// contributing nothing. A hot family draws its counter-directive into
// the pack — capped at three, hottest first — and the pressure lands
// on the next turn. The court measures; it never rewrites. Zero keys.
//
// The wiring fraction (the court sitting at the App's pack seam, its
// pressure riding the directives additively, the codex/Book showing
// the patron the finding, and the compat lib's engine door) is
// React/component source and is judged at the table's own gate — the
// engine has no table to render.
import assert from 'node:assert/strict';
import { TELL_FAMILIES, styleDirectives, tellCourt } from '../src/tells.js';

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

console.log('PASS \u2014 the human hand gate (engine twin, pure fraction): the tell court measures the sealed record free and deterministic with struck rows staying struck and silent rows contributing nothing, hot families are convicted with citations while a quiet record convicts nobody, the counter-directives ride the pack capped at three hottest first so the pressure lands on the next turn \u2014 the court measures, it never rewrites; the wiring and the patron\u2019s view are judged at the table\u2019s own gate.');
