// ---------------------------------------------------------------------------
// THE QUIET TABLE GATE — Experience-Directive XVII (keyless, fault-injected).
// Two clauses, one law: the model is never taught to write an operation the
// court refuses, and the court's own language never reaches a player's eye.
//   1. Schema-validator lockstep — the tool schema mirrors the validator's
//      enums exactly, beginning with the equip kinds; probed BOTH ways
//      (lawful value accepted, canary value refused) so drift cannot hide.
//   2. The note-free render contract — reducer notes, validator violations,
//      and Editor verdicts are ledger-only; poisoned payloads are injected
//      and the render surfaces stay silent, structurally.
// Headless: node + fake-indexeddb + react-test-renderer, no AI keys.
// ---------------------------------------------------------------------------

import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { dmToolSchema, judgeTurn } = await import('../server/dm.js');
const { renderableTurn } = await import('../src/lib/plateroad.js');
const { CONDITIONS, ROLE_TABLE } = await import('fatescript/rules');
const { LogEntry } = await import('../src/App.jsx');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};
const sameSet = (a, b) => {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, at) => value === right[at]);
};
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
};

// --- CLAUSE 1: schema-validator lockstep -----------------------------------
const schemaProps = dmToolSchema?.properties || dmToolSchema?.input_schema?.properties || dmToolSchema?.parameters?.properties || null;
check(!!schemaProps, 'the tool schema is probe-able from the one exported seat');
const storyProps = schemaProps?.story?.anyOf?.find((arm) => arm?.type === 'object')?.properties || null;
check(!!storyProps, 'the story arm of the schema opens for the walk');

// The equip kinds, first — the clause the directive names.
const equipArm = storyProps?.item_equip?.anyOf?.find((arm) => arm?.type === 'object') || null;
check(!!equipArm && equipArm.additionalProperties === false, 'item_equip is declared closed: no key the court would refuse');
check(sameSet(Object.keys(equipArm?.properties || {}), ['name', 'holder']), 'item_equip teaches exactly the keys the validator allows: name, holder');
check(/weapon or tool/i.test(JSON.stringify(storyProps?.item_equip || {})), 'item_equip teaches the equip kinds in the validator\u2019s own words: weapon or tool');

const trovedInput = { turn: 3, hero: { name: 'Bram' }, story: { trove_state: [
  { name: 'Iron Pick', holder: 'Bram', kind: 'tool', equipped: false },
  { name: 'Gold Chalice', holder: 'Bram', kind: 'treasure', equipped: false }
] } };
const equipTurn = (name) => ({ narration_blocks: [{ speaker: 'dm', text: 'The hand closes on it.' }], suggestions: ['Press on', 'Hold fast'], story: { item_equip: { name, holder: 'Bram' } } });
const toolErrors = judgeTurn(equipTurn('Iron Pick'), trovedInput)?.errors || [];
const chaliceErrors = judgeTurn(equipTurn('Gold Chalice'), trovedInput)?.errors || [];
check(!toolErrors.some((error) => /equip/i.test(error)), `a tool equips without an equip refusal (saw: ${JSON.stringify(toolErrors.filter((e) => /equip/i.test(e)))})`);
check(chaliceErrors.some((error) => /equip/i.test(error)), `a treasure is refused at the equip door (errors: ${JSON.stringify(chaliceErrors.slice(0, 4))})`);

// The thread ops — newly declared; enums, bounds, and closed keys mirror.
const threadAddItems = storyProps?.thread_add?.items || null;
check(!!threadAddItems && threadAddItems.additionalProperties === false, 'thread_add is declared closed, mirroring the validator\u2019s noUnknown');
check(sameSet(Object.keys(threadAddItems?.properties || {}), ['label', 'kind', 'holder']), 'thread_add teaches exactly label, kind, holder');
check(sameSet(threadAddItems?.properties?.kind?.enum || [], ['promise', 'debt', 'mystery', 'goal']), 'thread_add.kind mirrors the validator\u2019s four kinds exactly');
check(threadAddItems?.properties?.label?.minLength === 3 && threadAddItems?.properties?.label?.maxLength === 90, 'thread_add.label mirrors the validator\u2019s 3\u201390 bounds');
check(storyProps?.thread_add?.maxItems === 2, 'thread_add mirrors the validator\u2019s ceiling of two');
const threadResolveItems = storyProps?.thread_resolve?.items || null;
check(!!threadResolveItems && threadResolveItems.additionalProperties === false, 'thread_resolve is declared closed');
check(sameSet(Object.keys(threadResolveItems?.properties || {}), ['label', 'outcome']), 'thread_resolve teaches exactly label, outcome');
check(sameSet(threadResolveItems?.properties?.outcome?.enum || [], ['kept', 'broken', 'resolved']), 'thread_resolve.outcome mirrors the validator\u2019s three outcomes exactly');

const threadTurn = (op) => ({ narration_blocks: [{ speaker: 'dm', text: 'A debt is spoken aloud.' }], suggestions: ['Press on', 'Hold fast'], story: op });
const skeletal = { turn: 3, hero: { name: 'Bram' }, story: {} };
const lawfulKind = judgeTurn(threadTurn({ thread_add: [{ label: 'The ferryman is owed his coin', kind: 'promise' }] }), skeletal)?.errors || [];
const canaryKind = judgeTurn(threadTurn({ thread_add: [{ label: 'The ferryman is owed his coin', kind: 'vendetta' }] }), skeletal)?.errors || [];
check(!lawfulKind.some((error) => /thread_add\.kind/.test(error)), 'a schema-taught thread kind walks through the court');
check(canaryKind.some((error) => /thread_add\.kind/.test(error)), 'a kind outside the schema\u2019s enum is refused by the court (the mirror holds both ways)');
const lawfulOutcome = judgeTurn(threadTurn({ thread_resolve: [{ label: 'The ferryman is owed his coin', outcome: 'kept' }] }), skeletal)?.errors || [];
const canaryOutcome = judgeTurn(threadTurn({ thread_resolve: [{ label: 'The ferryman is owed his coin', outcome: 'forgotten' }] }), skeletal)?.errors || [];
check(!lawfulOutcome.some((error) => /thread_resolve\.outcome/.test(error)), 'a schema-taught outcome walks through the court');
check(canaryOutcome.some((error) => /thread_resolve\.outcome/.test(error)), 'an outcome outside the enum is refused by name');
const shortLabel = judgeTurn(threadTurn({ thread_add: [{ label: 'ab', kind: 'goal' }] }), skeletal)?.errors || [];
check(shortLabel.some((error) => /thread_add\.label/.test(error)), 'the label floor the schema teaches is the floor the court enforces');

// Conditions and roles — true set-equality against the engine\u2019s own law.
const conditionArm = storyProps?.sheet_condition?.anyOf?.find((arm) => arm?.type === 'object') || null;
const conditionNames = Object.keys(CONDITIONS);
check(sameSet(conditionArm?.properties?.add?.items?.enum || [], conditionNames), 'sheet_condition.add mirrors the SRD condition set exactly');
check(sameSet(conditionArm?.properties?.remove?.items?.enum || [], conditionNames), 'sheet_condition.remove mirrors the same set');
const grantArm = storyProps?.sheet_grant?.anyOf?.find((arm) => arm?.type === 'object') || null;
check(sameSet(grantArm?.properties?.role?.enum || [], Object.keys(ROLE_TABLE)), 'sheet_grant.role mirrors the role table\u2019s own keys');

// Item kinds — the standing mirror, re-attested.
check(sameSet(storyProps?.item_add?.items?.properties?.kind?.enum || [], ['weapon', 'tool', 'keepsake', 'treasure', 'document', 'armor']), 'item_add.kind mirrors the validator\u2019s six kinds (armor seated by XVIII \u00a7I)');
const lawfulItem = judgeTurn(threadTurn({ item_add: [{ name: 'Sealed Writ', kind: 'document', holder: 'Bram', note: null }] }), skeletal)?.errors || [];
const canaryItem = judgeTurn(threadTurn({ item_add: [{ name: 'Sealed Writ', kind: 'relic', holder: 'Bram', note: null }] }), skeletal)?.errors || [];
check(!lawfulItem.some((error) => /item_add/.test(error) && /kind/.test(error)), 'a schema-taught item kind walks through the court');
check(canaryItem.some((error) => /item_add/.test(error) && /kind/.test(error)), 'an item kind outside the enum is refused');

// --- CLAUSE 2: the note-free render contract (fault injection) --------------
const poisoned = {
  narration_blocks: [{ speaker: 'dm', text: 'The rain holds over the pass.' }],
  suggestions: ['Press on', 'Turn back'],
  editor_note: { reasons: ['the dash law: zero em dashes ship'], flags: ['dash'] },
  notes: ['reducer: seat repaired quietly'],
  violations: ['court: item_equip refused'],
  repair: { errors: ['narration_blocks must contain 1-8 blocks'] },
  room_ledger: { flags: ['dash', 'cliche'], editor_verdict: 'revise' },
  flags: ['dash', 'tells'],
  verdict: 'revise'
};
const safe = renderableTurn(poisoned);
check(sameSet(Object.keys(safe), ['narration_blocks', 'suggestions']), 'the whitelist copies only render-lawful fields from a poisoned turn');
for (const courtKey of ['editor_note', 'notes', 'violations', 'repair', 'room_ledger', 'flags', 'verdict']) {
  check(!(courtKey in safe), `court language never crosses: ${courtKey} is structurally absent`);
}
const lawfulEleven = {
  narration_blocks: [{ speaker: 'dm', text: 'x' }], suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: null
};
check(Object.keys(renderableTurn(lawfulEleven)).length === 11, 'every lawful render field crosses whole \u2014 the whitelist is a door, not a filter of the lawful');

const appSource = read('src/App.jsx');
check(appSource.includes('dm: renderableTurn(dm)'), 'the log row seats the whitelist at its build \u2014 court fields are never copied in');
check(/import\s*{[^}]*renderableTurn[^}]*}\s*from '\.\/lib\/plateroad\.js'/.test(appSource), 'the row\u2019s whitelist is the one road\u2019s own, not a mirror');

const campaign = { id: 'camp-qt', title: 'The Quiet Table', tone: 'mythic' };
const courtWords = /revise|flagged|violation|reducer:|editor_note|editor_verdict|repair/i;
const renderLog = async (dm) => {
  const log = { id: `qt-${Math.random().toString(36).slice(2, 8)}`, player: 'I look around.', deed: null, dm, ts: 1752900000000, resolution: null, redacted: false, turn: 3, beatIndex: 1, room: { beat_index: 1, director_calls: 1, editor_calls: 2, art_director_calls: 0, revisions: 1, flags: ['dash', 'cliche'], editor_verdict: 'revise' } };
  let root = null;
  await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
  const spoken = textOf(root.toJSON());
  root.unmount();
  return spoken;
};
const spokenSafe = await renderLog(renderableTurn(poisoned));
check(spokenSafe.includes('The rain holds over the pass.'), 'the page itself still speaks after the whitelist');
check(!courtWords.test(spokenSafe), `no court word reaches the player through the lawful row (saw: ${JSON.stringify(spokenSafe.match(courtWords) || [])})`);
const spokenRaw = await renderLog(poisoned);
check(!courtWords.test(spokenRaw), 'even a raw poisoned row stays silent at the surface \u2014 defense in depth, the ledger rides unread');

// --- the gate's word ---------------------------------------------------------
if (failures > 0) {
  console.error(`FAIL — the quiet table gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — the quiet table gate: the schema mirrors the court\u2019s enums exactly (equip kinds first, threads, conditions, roles, item kinds, both directions), and injected court language never reaches a render surface.');
