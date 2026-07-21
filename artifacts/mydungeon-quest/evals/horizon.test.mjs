// THE HORIZON GATE — Directive XIX, Article VII. The edge never runs dry:
// every volume's forge mints a swept pool of six rumors; the chart's blank
// vellum carries up to three at its edge, marked as rumor and never drawn
// as geography; the Dungeon Master may open one into a thread carrying its
// exact citation; the pool rotates and the next rumor seats at the edge.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock, horizonRumors } from '../src/lib/story.js';
import { mockStorySmith, validateRumorPool, RUMOR_COUNT } from 'fatescript/storySmith';
import { chartOf } from 'fatescript/chart';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const base = { cast: [], threads: [] };

// --- 1. The pool: minted six, swept, sealed into the codex ---
const minted = mockStorySmith({ covenant: 'a quiet vale under old oaths', tone: 'wonder', seed: 7 });
assert.equal(minted.rumors.length, RUMOR_COUNT, 'the mock smith mints exactly six rumors');
assert.equal(validateRumorPool(minted.rumors).ok, true, 'and the pool passes its own court');
let codex = initCodex('classic-epic', { rumors: minted.rumors });
assert.equal(codex.rumorPool.length, RUMOR_COUNT, 'the pool seats whole at the forge');
assert.ok(codex.rumorPool.every((row) => row.status === 'unopened' && row.opened_turn === null), 'every rumor opens unopened and uncited');
assert.deepEqual(initCodex('classic-epic').rumorPool, [], 'a seedless forge is lawful — the horizon simply stays empty');

// --- 2. The edge: bounded three, rotation on open ---
const edgeAtBirth = horizonRumors(codex);
assert.equal(edgeAtBirth.length, 3, 'the edge carries three while the pool holds');
assert.deepEqual(edgeAtBirth, codex.rumorPool.slice(0, 3).map((row) => row.text), 'in pool order — deterministic, cache-stable');
assert.deepEqual(storyBlock(codex).rumors_state, edgeAtBirth, 'the machine seat carries the same three');
const campaign = { codex, logs: [], hero: { name: 'Maren' } };
const chart = chartOf(campaign);
assert.deepEqual(chart.edge_rumors, edgeAtBirth, 'the chart edge carries them marked as rumor');
assert.ok(!chart.medallions.some((m) => edgeAtBirth.includes(m?.name)), 'and never draws a rumor as geography');

// --- 3. The door: the citation must name the horizon's own words ---
const cited = edgeAtBirth[0];
const rumorCtx = { ...base, rumors: edgeAtBirth };
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'The bell under the ford', kind: 'mystery', rumor: cited }] }), [], rumorCtx).ok, true, 'citing a standing rumor is lawful');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'The bell under the ford', rumor: cited.toUpperCase() }] }), [], rumorCtx).ok, true, 'the citation court reads case-blind');
const stray = validateDmTurn(turn({ thread_add: [{ label: 'The bell under the ford', rumor: 'A whisper nobody whispered' }] }), [], rumorCtx);
assert.equal(stray.ok, false, 'citing a stranger rumor is refused');
assert.ok(stray.errors.some((error) => /rumor/i.test(error)), 'and the refusal names the rumor court');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'The bell under the ford', rumor: 'A whisper nobody whispered' }] }), [], base).ok, true, 'a bare context proves nothing (elder sealed inputs)');

// --- 4. The fold: the thread carries the citation, the pool rotates ---
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'The bell under the ford', kind: 'mystery', rumor: cited }] }, { turn: 4 });
const thread = codex.threads.find((row) => row.label === 'The bell under the ford');
assert.equal(thread.rumor, cited, 'the thread carries its citation whole');
const openedRow = codex.rumorPool.find((row) => row.text === cited);
assert.equal(openedRow.status, 'opened', 'the cited rumor leaves the horizon');
assert.equal(openedRow.opened_turn, 4, 'citing the turn it opened');
const edgeAfter = horizonRumors(codex);
assert.equal(edgeAfter.length, 3, 'the pool seats the next — the edge never runs dry while the pool holds');
assert.ok(!edgeAfter.includes(cited), 'and the opened rumor no longer rides it');
assert.deepEqual(chartOf({ codex, logs: [], hero: { name: 'Maren' } }).edge_rumors, edgeAfter, 'the chart edge rotates with it');

// --- 5. The belt: a stranger citation folds as a note, never silently ---
const notesBefore = codex.notes.length;
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'A road nobody rumored', rumor: 'Words outside the pool' }] }, { turn: 5 });
assert.ok(codex.notes.length > notesBefore, 'the stranger citation leaves a standing note');
assert.ok(codex.notes.some((note) => note.includes('The cited rumor is not on the horizon')), 'and the belt names the stranger by law');
assert.ok(codex.threads.some((row) => row.label === 'A road nobody rumored'), 'the thread stands — only the pool holds fast');
assert.equal(codex.rumorPool.filter((row) => row.status === 'opened').length, 1, 'no pool row rotates for words outside the horizon');

// --- 6. The horizon drains honestly ---
let draining = structuredClone(codex);
let opened = draining.rumorPool.filter((row) => row.status === 'opened').length;
for (const row of draining.rumorPool) {
  if (row.status !== 'unopened') continue;
  draining = applyStoryUpdates(draining, { thread_add: [{ label: `Opened: ${row.text.slice(0, 60)}`, rumor: row.text }] }, { turn: 6 + opened });
  opened += 1;
}
assert.equal(horizonRumors(draining).length, 0, 'a drained pool leaves a blank edge');
assert.deepEqual(chartOf({ codex: draining, logs: [], hero: { name: 'Maren' } }).edge_rumors, [], 'and the chart honestly shows nothing');

console.log('PASS — the horizon gate: a swept pool of six, a bounded rotating edge marked as rumor, citations carried whole, and a blank vellum when the whispers run out.');
