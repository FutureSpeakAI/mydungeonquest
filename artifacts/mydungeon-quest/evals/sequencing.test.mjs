// THE SEQUENCING GATE — Task #50: story beats land in order.
// Presentation law over the sealed record: ticks render as dividers (never
// empty turn rows), chapter pages anchor at their boundaries regardless of
// arrival time (stack: closing turn → page → time passes → next chapter),
// pending seats exist only where a page can still land, the re-entry recap
// is honest (page → mast → silence; strikes respected; nothing generated),
// chips honor reduced motion, and the Chronicler never hears a tick.
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { orderFeed, recapFor, renderKindOf, tickPhrase, tickWhispers } = await import('fatescript/sequencing');
const { initCodex } = await import('fatescript/story');
const { buildChronicleRequest } = await import('fatescript/chronicler');
const { TickDivider, SuggestionRow } = await import('../src/components/Sequence.jsx');

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

// --- 7. The Chronicler never hears a tick ---
const request = buildChronicleRequest({ ...base, homeRegion: 'Larkspur Vale', logs: [turn('t1', 0, { blocks: [{ text: 'The mill burns bright.' }] }), theTick] }, 0);
assert.ok(request, 'the court convenes');
assert.ok(!JSON.stringify(request.body).includes('Offscreen'), 'retellings never quote the offscreen strides');

// --- 8. Rendered rows: the divider speaks; chips honor reduced motion ---
// JSX interpolation splits text into separate children; read the ROW as a
// reader would — every rendered string, joined — before judging it.
const textOf = (node) => node == null ? '' : typeof node === 'string' ? node : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.children);
let tree;
TestRenderer.act(() => { tree = TestRenderer.create(h(TickDivider, { log: theTick, prevLog: turn('t2', 0, { time: { unit: 'days', n: 2 } }) })); });
const dividerText = textOf(tree.toJSON());
assert.ok(dividerText.includes('2 days pass.'), 'the divider reads the sealed clock');
assert.ok(dividerText.includes('Meanwhile, Mirabel presses on toward the mill\u2019s debt.'), 'the world is heard to move, quoting its sealed op');
assert.ok(dividerText.trim().length > 0, 'never an empty row');

let chips;
TestRenderer.act(() => { chips = TestRenderer.create(h(SuggestionRow, { suggestions: ['Press on', 'Rest', 'Ask her'], disabled: false, onPick: () => {}, reduceMotion: true })); });
for (const button of chips.root.findAllByType('button')) {
  assert.equal(button.props.className, undefined, 'reduced motion: no entrance class');
  assert.equal(button.props.style, undefined, 'reduced motion: no staggered delay');
}
TestRenderer.act(() => { chips = TestRenderer.create(h(SuggestionRow, { suggestions: ['Press on', 'Rest', 'Ask her'], disabled: false, onPick: () => {}, reduceMotion: false })); });
const delays = chips.root.findAllByType('button').map((button) => parseFloat(button.props.style.animationDelay));
assert.ok(delays.every((d, i) => i === 0 || d > delays[i - 1]), 'chips arrive on a staggered beat');
assert.ok(chips.root.findAllByType('button').every((button) => button.props.className === 'chip-enter'));

// --- 9. Amendments after review: borrowed books and the app-level still ---
const { PendingPage } = await import('../src/components/Sequence.jsx');
assert.equal(recapFor({ ...base, logs, readOnly: true, chroniclePages: [pageLater] }), null, 'a borrowed (read-only) book earns no recap, even with lawful pages');
let quill;
TestRenderer.act(() => { quill = TestRenderer.create(h(PendingPage, { reduceMotion: true })); });
assert.ok(String(quill.toJSON().props.className).includes('still'), 'app-level reduced motion stills the writing quill');
TestRenderer.act(() => { quill = TestRenderer.create(h(PendingPage, { reduceMotion: false })); });
assert.ok(!String(quill.toJSON().props.className).includes('still'), 'motion-welcoming tables keep the quill alive');

console.log('PASS — the sequencing gate: time passes visibly (never an empty row), pages anchor at their boundary (turn → page → tick), pending seats only where a page can land (and always released), the recap is honest, strike-respecting, and never for borrowed books, chips and the quill honor reduced motion, and the Chronicler never hears a tick.');
