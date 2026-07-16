// THE CLOCK-AT-TABLE GATE — Directive VI, Phase 1: the world clock reaches
// the table. The pack speaks the derived hour (one clock, two witnesses —
// the DM and the codex read the same fold), an act interlude seals one
// honest day anchored at its beat with a silent envelope, band-crossings
// surface as notes in the raven style (derived, never invented; the dead
// never age; a soul without a band holds its tongue), and the divider
// quotes the span's own words verbatim. PASS only grows.
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { worldClock, clockLine } = await import('fatescript/clock');
const { INTERLUDE_SPAN, packClock, clockWords, interludeRow, bandNotes, spanPhrase } = await import('../src/lib/clockAtTable.js');
const { TickDivider } = await import('../src/components/Sequence.jsx');

// --- 1. The pack speaks the derived hour — and only the derived hour ---
const dmMove = (unit, n) => ({ dm: { time_advance: { unit, n } } });
const logs = [dmMove('days', 2), dmMove('hours', 5)];
const packed = packClock(logs);
assert.equal(packed.line, clockLine(worldClock(logs)), 'one clock, two witnesses: the pack quotes the same fold the codex reads');
assert.equal(packed.day, 3);
assert.equal(packed.watch, 'afternoon');
assert.equal(packClock([]).line, 'Day 1, morning.', 'a tale opens on day one, in the morning');
assert.equal(clockWords(logs), packed.line, 'the codex head and the pack speak identical words');

// --- 2. An act interlude seals one honest day, anchored at its beat ---
const { row, before, after } = interludeRow(logs, { turn: 4, beatIndex: 2, cause: 'the act turns' });
assert.deepEqual(INTERLUDE_SPAN, { unit: 'days', n: 1 }, 'the interlude is deterministic by law: the same act turn always costs the same day');
assert.equal(row.kind, 'span');
assert.deepEqual(row.clock_advance, { unit: 'days', n: 1 });
assert.equal(row.beatIndex, 2, 'the span sits at its beat so the page law keeps holding');
assert.equal(row.dm.narration_blocks.length, 0, 'the envelope is silent — nothing downstream mistakes a span for a spoken turn');
assert.equal(row.dm.story, null);
assert.equal(after.totalHours - before.totalHours, 24, 'one day, exactly');
assert.equal(worldClock([...logs, row]).day, before.day + 1, 'the fold reads the sealed span the same way');

// --- 3. The span speaks its own words, deterministically ---
assert.equal(spanPhrase(row), 'The road takes a day — the act turns');
assert.equal(spanPhrase({ clock_advance: { unit: 'years', n: 3 } }), 'The road takes 3 years.');
assert.equal(spanPhrase({ clock_advance: { unit: 'hours', n: 1 }, cause: '' }), 'The road takes an hour.');

// --- 4. Band-crossings surface as raven-style notes; the dead never age ---
const beforeYears = worldClock([{ clock_advance: { unit: 'years', n: 7 } }]);
const afterYears = worldClock([{ clock_advance: { unit: 'years', n: 9 } }]);
const cast = [
  { name: 'Mirabel', band: 'child', status: 'active' },
  { name: 'Old Sef', band: 'child', status: 'dead' },
  { name: 'Tomas', status: 'active' }
];
const notes = bandNotes(cast, beforeYears, afterYears);
assert.deepEqual(notes, ['Mirabel has grown out of childhood.'], 'one crossing spoken; the dead are outside time; a soul without a band holds its tongue');
assert.deepEqual(bandNotes(cast, beforeYears, beforeYears), [], 'no years, no notes — nothing is invented');

// --- 5. The divider quotes the span verbatim — never an empty row ---
let tree;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(TickDivider, { log: { ...row, notes }, prevLog: null }));
});
const rendered = JSON.stringify(tree.toJSON());
assert.ok(rendered.includes('The road takes a day — the act turns'), 'the divider speaks the span\u2019s own phrase');
assert.ok(rendered.includes('Mirabel has grown out of childhood.'), 'the crossing note reaches the table');
assert.ok(rendered.includes('time-divider'), 'a span is a quiet divider, never an empty turn row');
TestRenderer.act(() => tree.unmount());

// --- 6. Sealed time never takes a narrative seat downstream ---
// The chapter page anchors after the closing TURN, never after the span
// or tick that followed it; the recap guard sees spans as sealed time,
// not story; the public shelf never shows an empty span passage.
const { buildChronicleRequest } = await import('fatescript/chronicler');
const { recapFor } = await import('fatescript/sequencing');
const { shelfModel, pickTurningPoint } = await import('fatescript/shareCard');

const turnRow = (id, beatIndex, text) => ({ id, beatIndex, redacted: false, player: `deed of ${id}`, resolution: null,
  dm: { narration_blocks: [{ text }], story: null, time_advance: null, dialogue_cue: null } });
const tickRow = { id: 'k9', kind: 'tick', beatIndex: 1, redacted: false, player: null,
  dm: { narration_blocks: [], story: { cast_update: [] }, time_advance: null, dialogue_cue: null } };
const spanRow2 = { ...interludeRow([], { turn: 2, beatIndex: 1, cause: 'the act turns' }).row };

const fixture = {
  title: 'The Salt Road', tone: 'grim', styleBible: '', homeRegion: 'Saltmere',
  hero: { name: 'Aldric' },
  codex: { cast: [], regions: [], spine: { beats: [{ title: 'The Door', goal: 'open it', act: 1 }, { title: 'The Road', goal: 'walk it', act: 2 }] } },
  logs: [turnRow('t1', 0, 'The door refuses.'), turnRow('t2', 0, 'The door yields at last.'), tickRow, spanRow2]
};
const request = buildChronicleRequest(fixture, 0);
assert.equal(request.afterLogId, 't2', 'the page anchors after the closing turn — never after sealed time');
assert.equal(recapFor({ logs: [spanRow2], codex: fixture.codex, chroniclePages: [] }) ?? null, null, 'a journal of spans alone is sealed time, not a tale to recap');
const shelf = shelfModel({ worldTitle: 'w', taleTitle: 't', entries: [turnRow('t1', 0, 'Prose.'), spanRow2] });
assert.equal(shelf.passages.length, 1, 'the public shelf never shows an empty span passage');
assert.equal(pickTurningPoint([spanRow2]) ?? null, null, 'a span is never a turning point');

console.log('PASS \u2014 the clock at the table: the pack speaks the derived hour, the interlude seals one honest day at its beat with a silent envelope, band-crossings surface as raven-style notes (the dead never age), the divider quotes the span verbatim, and sealed time never takes a narrative seat — the page anchors after the prose, the recap and the public shelf hold their tongues.');
