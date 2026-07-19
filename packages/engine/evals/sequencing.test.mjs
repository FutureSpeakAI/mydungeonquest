// THE SEQUENCING GATE — story beats land in order (twin of the table's
// gate, the pure fraction). Presentation law over the sealed record:
// ticks render as dividers (never empty turn rows), chapter pages
// anchor at their boundaries regardless of arrival time (stack:
// closing turn → page → time passes → next chapter), pending seats
// exist only where a page can still land, the re-entry recap is
// honest (page → mast → silence; strikes respected; nothing
// generated), and the Chronicler never hears a tick. The rendered
// rows themselves (dividers, chips, the quill) are React and are
// judged at the table's own gate — the engine has no window to render.
import assert from 'node:assert/strict';
import { orderFeed, recapFor, renderKindOf, tickPhrase, tickWhispers } from '../src/sequencing.js';
import { initCodex } from '../src/story.js';
import { buildChronicleRequest } from '../src/chronicler.js';

const turn = (id, beat, opts = {}) => ({ id, beatIndex: beat, redacted: Boolean(opts.redacted), player: opts.player || null, kind: undefined,
  dm: { narration_blocks: opts.blocks || [{ text: `prose of ${id}` }], story: null, time_advance: opts.time || null } });
const tick = (id, beat, ops) => ({ id, kind: 'tick', beatIndex: beat, redacted: false, player: null,
  dm: { narration_blocks: [], story: { cast_update: ops }, time_advance: null } });

// --- 1. A tick is never an empty turn row ---
const theTick = tick('k1', 1, [
  { name: 'Mirabel', fact_add: 'Offscreen — presses on toward the mill\u2019s debt.', last_seen: 'about her own business' },
  { name: 'Tomas', fact_add: 'Offscreen — meets a setback pursuing the river-debt.', last_seen: 'on the road' },
  { name: 'Ilse', fact_add: 'Offscreen — gathers what she needs for the search.', last_seen: 'offscreen' }
]);
assert.equal(renderKindOf(theTick), 'tick');
assert.equal(renderKindOf(turn('t0', 0)), 'turn');

// --- 2. The phrase reads the sealed neighbor; whispers quote the ops ---
assert.equal(tickPhrase(turn('t', 0, { time: { unit: 'days', n: 3 } })), '3 days pass.');
assert.equal(tickPhrase(turn('t', 0, { time: { unit: 'hours', n: 1 } })), 'An hour passes.');
assert.equal(tickPhrase(null), 'Time passes.');
const whispers = tickWhispers(theTick);
assert.equal(whispers.length, 2, 'at most two whispers');
assert.equal(whispers[0].change, 'presses on toward the mill\u2019s debt', 'the prefix and period are shed, nothing else');
assert.ok(theTick.dm.story.cast_update[0].fact_add.includes(whispers[0].change), 'a whisper quotes its sealed op');

// --- 3. The boundary stack: turn → page → tick → next chapter ---
const logs = [turn('t1', 0), turn('t2', 0, { time: { unit: 'days', n: 2 } }), theTick, turn('t3', 1)];
const page0 = { beatIndex: 0, afterLogId: 't2', recordHash: 'r0', passage: 'as written', title: 'Chapter the First' };
let seats = orderFeed(logs, [page0], []);
assert.deepEqual(seats.map((s) => s.kind), ['turn', 'turn', 'page', 'tick', 'turn'], 'the page closes its chapter before time passes');

// --- 4. Arrival time is irrelevant; orphans are recovered at their beat ---
const orphan = { beatIndex: 0, afterLogId: 'gone-forever', recordHash: 'r1', passage: 'as written', title: 'Orphaned' };
seats = orderFeed(logs, [orphan], []);
assert.deepEqual(seats.map((s) => s.kind), ['turn', 'turn', 'page', 'tick', 'turn'], 'a page never drifts, even without its anchor');
const nowhere = { beatIndex: 9, afterLogId: 'nope', recordHash: 'r2', passage: 'as written', title: 'Beyond' };
seats = orderFeed(logs, [nowhere], []);
assert.equal(seats[seats.length - 1].kind, 'page', 'a truly homeless page still renders, at the end');

// --- 5. Pending seats: only where a page can still land ---
seats = orderFeed(logs, [], [{ beatIndex: 0, afterLogId: 't2' }]);
assert.deepEqual(seats.map((s) => s.kind), ['turn', 'turn', 'page-pending', 'tick', 'turn'], 'the writing row holds the page\u2019s exact seat');
seats = orderFeed(logs, [page0], [{ beatIndex: 0, afterLogId: 't2' }]);
assert.ok(!seats.some((s) => s.kind === 'page-pending'), 'a landed page dissolves its pending seat');
seats = orderFeed(logs, [], []);
assert.ok(!seats.some((s) => s.kind === 'page-pending'), 'no seat is ever held unbidden (keyless holds none by construction)');

// --- 6. The recap is honest: page → mast → silence; strikes respected ---
const codex = initCodex('classic-epic');
const base = { title: 'The Unwritten Road', hero: { name: 'Sera' }, codex, completed: false };
assert.equal(recapFor({ ...base, logs: [] }), null, 'a fresh tale stays silent');
assert.equal(recapFor({ ...base, logs: [theTick] }), null, 'ticks alone earn no recap');
const mastOnly = recapFor({ ...base, logs });
assert.equal(mastOnly.kind, 'mast', 'no page yet: the mast alone orients');
assert.ok(mastOnly.mast.arc && mastOnly.mast.chapter, 'the mast names the tale and the chapter');
const pageLater = { beatIndex: 1, afterLogId: 't3', recordHash: 'r3', passage: 'later', title: 'Chapter the Second' };
let recap = recapFor({ ...base, logs, chroniclePages: [page0, pageLater] });
assert.equal(recap.kind, 'page'); assert.equal(recap.page.beatIndex, 1, 'the latest lawful page leads');
recap = recapFor({ ...base, logs, chroniclePages: [page0, { ...pageLater, redacted: true }] });
assert.equal(recap.page.beatIndex, 0, 'a struck page is never shown');
const struckLogs = logs.map((log) => log.id === 't3' ? { ...log, redacted: true } : log);
recap = recapFor({ ...base, logs: struckLogs, chroniclePages: [page0, pageLater] });
assert.equal(recap.page.beatIndex, 0, 'a page whose anchor was struck is never shown');
assert.equal(recapFor({ ...base, logs, completed: true, chroniclePages: [page0] }), null, 'a finished book opens to keepsakes, not a recap');
assert.equal(recapFor({ ...base, logs, readOnly: true, chroniclePages: [pageLater] }), null, 'a borrowed (read-only) book earns no recap, even with lawful pages');

// --- 7. The Chronicler never hears a tick ---
const request = buildChronicleRequest({ ...base, homeRegion: 'Larkspur Vale', logs: [turn('t1', 0, { blocks: [{ text: 'The mill burns bright.' }] }), theTick] }, 0);
assert.ok(request, 'the court convenes');
assert.ok(!JSON.stringify(request.body).includes('Offscreen'), 'retellings never quote the offscreen strides');

console.log('PASS — the sequencing gate (engine twin, pure fraction): time passes visibly (never an empty row), pages anchor at their boundary (turn → page → tick), pending seats only where a page can land (and always released), the recap is honest, strike-respecting, and never for borrowed books, and the Chronicler never hears a tick; the rendered rows are judged at the table\u2019s own gate.');
