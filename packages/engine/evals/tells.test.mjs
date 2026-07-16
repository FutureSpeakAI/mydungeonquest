// THE TELLS GATE — the Human Hand holds or this file turns the build red.
// StoryScope's measurable fingerprints, tried in a deterministic court.
import assert from 'node:assert/strict';
import { TELL_FAMILIES, TELL_THRESHOLDS, MIN_HITS, measureTells, tellReport, styleDirectives } from '../src/tells.js';
import { fixtureEntries } from './fixtures.mjs';

assert.deepEqual(Object.keys(TELL_FAMILIES), ['statedMoral', 'borrowedBody', 'tidyBow', 'hushedRegister']);

// A passage written the way the paper says machines write.
const machineFlavored = [
  'She finally understood that the vale had never needed saving. He suddenly realized that the bell was only a bell.',
  'She knew now that courage was a door. Her stomach dropped as the gate opened, and his heart pounded against the dark.',
  'Her breath caught at the top of the stair. They walked the sacred road home.',
  'All was well in Harrow Ford at last. The matter was settled, and the lanterns burned until morning.'
].join(' ');

const dm = (text) => ({ narration_blocks: [{ text }], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] });
const dirty = [
  { turn: 10, redacted: false, dm: dm(machineFlavored) },
  { turn: 11, redacted: true, dm: dm('All was well. All was well. The matter was settled forever, sacred and solemn.') } // struck — the court may not read it
];

// The court convicts the hot families and leaves the cold one alone.
const report = tellReport(dirty);
assert.deepEqual([...report.flagged].sort(), ['borrowedBody', 'statedMoral', 'tidyBow'], 'three families run hot');
assert.ok(!report.flagged.includes('hushedRegister'), `one 'sacred' in a chapter convicts nobody — the floor is ${MIN_HITS}`);
assert.equal(report.counts.statedMoral, 3);
assert.equal(report.counts.borrowedBody, 3);
assert.equal(report.counts.tidyBow, 2);
assert.ok(report.offenders.every((o) => o.turn === 10), 'a struck row cannot testify');
assert.ok(report.offenders.some((o) => o.family === 'statedMoral' && o.sample.length > 0), 'convictions carry citations');
assert.equal(JSON.stringify(tellReport(dirty)), JSON.stringify(report), 'the same record convicts the same tells');

// Counter-directives: ordered by how far over the line, capped, verbatim-stable.
const directives = styleDirectives(report);
assert.equal(directives.length, 3);
assert.ok(directives[0].includes('Do not state the moral'), 'the hottest family is answered first');
assert.ok(directives.some((line) => line.includes('loose ends')), 'the tidy bow is answered with the Loom\u2019s creed');
assert.ok(directives.every((line) => typeof line === 'string' && line.length <= 200), 'counter-directives fit the pack\u2019s directives contract');
assert.equal(styleDirectives(report, { cap: 2 }).length, 2, 'the cap is the cap');

// Clean prose is left in peace: the fixture record carries no machine flavor.
const clean = tellReport(fixtureEntries());
assert.deepEqual(clean.flagged, []);
assert.deepEqual(styleDirectives(clean), [], 'no conviction, no correction');

// The measure itself is honest arithmetic.
const empty = measureTells('');
assert.equal(empty.words, 0);
assert.ok(Object.values(empty.per1k).every((rate) => rate === 0));
const single = measureTells('The sacred road was long.');
assert.equal(single.counts.hushedRegister, 1);
assert.ok(single.per1k.hushedRegister > TELL_THRESHOLDS.hushedRegister, 'per-thousand explodes on tiny text \u2014');
assert.ok(!tellReport([{ turn: 1, redacted: false, dm: dm('The sacred road was long.') }]).flagged.includes('hushedRegister'), '\u2014 which is exactly why the floor exists');

console.log('PASS \u2014 the tells gate: the four fingerprint families are convicted by count and rate with a floor against stray hits, struck rows cannot testify, counter-directives come capped and ordered into the pack\u2019s own contract, and clean prose is left in peace.');
