// ---- THE TEMPO LAW (engine twin, pure court — Directive XX, Law IV) ----
//
// The illuminated tier paints where the story turns, not where the clock
// ticks. This twin judges the court itself, headless and keyless, over the
// sealed fixture tale alone:
//   1. 'every' answers paint on every single walk — byte-faithful to
//      today's cadence — and says so in its reason.
//   2. 'turning' paints exactly the turning points: genesis, beat
//      boundaries, image cues, introductions, region movement, combat's
//      first round, cinematics — judged against an independent read of
//      the fixture's own fields, with hand-pinned witnesses.
//   3. 'sparse' is a strict subset (genesis, boundaries, explicit cues
//      only) — movement, first blood, and introductions alone hold.
//   4. Every reason cites evidence riding that very turn; a turn judged
//      alone answers exactly as in the walk (no reach backward or
//      forward); repeat walks are byte-stable under all three cadences.
//   5. The setting law: absence and alien words read 'every' (a pre-tempo
//      save keeps today's cadence); the deep-frozen evidence is never
//      written by any walk.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tempoCourt, tempoSetting, TEMPO_SETTINGS } from '../src/tempo.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

const tale = JSON.parse(readFileSync(new URL('./fixtures/tales/crown-intrigue.chronicle.json', import.meta.url), 'utf8'));
const rows = tale.journal.filter((row) => row.type === 'turn').map((row) => ({ i: row.i, dm: row.payload.dm }));
assert.ok(rows.length >= 30, 'the fixture carries a full tale of sealed turns');
const codex = tale.campaign.codex;
deepFreeze(rows); deepFreeze(codex);
const snapshot = JSON.stringify({ rows, codex });

const verdictsUnder = (setting) => rows.map((row) => tempoCourt({ dm: row.dm, codex, turnIndex: row.i, setting }));

// ---- 1. 'every' paints every single walk ----
const every = verdictsUnder('every');
assert.ok(every.every((verdict) => verdict.paints === true), "'every' answers paint on every walk");
assert.ok(every.every((verdict) => typeof verdict.reason === 'string' && verdict.reason.includes('every turn')), 'and its reason names the cadence law');

// ---- 2. 'turning' paints exactly the turning points ----
const expectTurning = (row) => row.i === 0
  || row.dm?.story?.beat_advance === true
  || !!row.dm?.image_cue
  || (Array.isArray(row.dm?.story?.cast_add) && row.dm.story.cast_add.length > 0)
  || (typeof row.dm?.story?.scene_set?.region === 'string' && row.dm.story.scene_set.region.length > 0)
  || row.dm?.combat?.op === 'start'
  || !!row.dm?.cinematic;
const turning = verdictsUnder('turning');
rows.forEach((row, idx) => assert.equal(turning[idx].paints, expectTurning(row), `turn i=${row.i} under 'turning'`));
const at = (i) => turning[rows.findIndex((row) => row.i === i)];
const rowAt = (i) => rows.find((row) => row.i === i);
// Hand-pinned witnesses from the sealed fixture, each citing its own turn:
assert.ok(at(0).paints && at(0).reason.includes('genesis'), 'genesis earns its plate and says so');
assert.ok(at(4).paints && at(4).reason.includes('beat boundary'), 'the boundary turn cites the spine');
assert.ok(at(7).paints && at(7).reason.includes(rowAt(7).dm.story.scene_set.region), 'the movement turn names the very region set this turn');
assert.ok(at(21).paints && /combat opens/.test(at(21).reason), 'first blood cites the opening round');
assert.ok(at(29).paints && at(29).reason.includes(rowAt(29).dm.story.cast_add[0].name), 'the introduction names the soul who joined this turn');
for (const quiet of [2, 5, 11]) {
  assert.ok(!at(quiet).paints, `quiet turn i=${quiet} holds`);
  assert.ok(at(quiet).reason.includes('standing plate holds'), 'and the hold is named honestly — never a recycled painting re-attested as new');
}

// ---- 3. 'sparse': a strict subset — the marked three alone ----
const expectSparse = (row) => row.i === 0 || row.dm?.story?.beat_advance === true || !!row.dm?.image_cue;
const sparse = verdictsUnder('sparse');
rows.forEach((row, idx) => {
  assert.equal(sparse[idx].paints, expectSparse(row), `turn i=${row.i} under 'sparse'`);
  if (sparse[idx].paints) assert.ok(turning[idx].paints, 'sparse never paints where turning holds');
  if (sparse[idx].paints) assert.ok(/genesis|beat boundary|image cue/.test(sparse[idx].reason), 'a sparse reason cites genesis, the boundary, or the cue alone');
});
for (const held of [7, 21, 29]) {
  const idx = rows.findIndex((row) => row.i === held);
  assert.ok(!sparse[idx].paints && turning[idx].paints, `i=${held}: the strictness witness — a turning point sparse declines`);
}

// ---- 4. turn-local citations, byte-stable repeats ----
for (const setting of TEMPO_SETTINGS) {
  assert.equal(JSON.stringify(verdictsUnder(setting)), JSON.stringify(verdictsUnder(setting)), `byte-stable on repeat walks under '${setting}'`);
}
const lone = rowAt(29);
const alone = tempoCourt({ dm: JSON.parse(JSON.stringify(lone.dm)), codex: null, turnIndex: lone.i, setting: 'turning' });
assert.deepEqual(alone, at(29), 'a turn judged utterly alone answers exactly as in the walk — the court never reaches backward or forward');

// ---- 5. the setting law and the untouched evidence ----
assert.deepEqual([...TEMPO_SETTINGS], ['every', 'turning', 'sparse']);
assert.ok(Object.isFrozen(TEMPO_SETTINGS), 'the three cadences are sealed');
for (const alien of [undefined, null, '', 'cinema', 'EVERY', 42, {}]) {
  assert.equal(tempoSetting(alien), 'every', 'absence and alien words read every — the lawful default, no ground moved silently');
}
assert.equal(tempoSetting('turning'), 'turning');
assert.equal(tempoSetting('sparse'), 'sparse');
const malformed = tempoCourt({ dm: { story: { cast_add: 'not-a-list', scene_set: { region: 9 } }, combat: { op: 'update' } }, codex: null, turnIndex: 3, setting: 'turning' });
assert.equal(malformed.paints, false, 'malformed evidence proves nothing — fail-closed, never a crash');
assert.equal(JSON.stringify({ rows, codex }), snapshot, 'the deep-frozen evidence was never written by any walk');

console.log('PASS — the tempo law (engine twin, pure court): deterministic verdicts across the sealed fixture under all three cadences, byte-stable on repeat walks, every reason cited to its own turn (a turn judged alone answers identically — no reach backward or forward), the every cadence answering paint on every single walk, sparse a strict subset of turning with movement, first blood, and introductions declining, absence and alien settings reading every by the lawful default, malformed evidence proving nothing, and the frozen evidence never written.');
