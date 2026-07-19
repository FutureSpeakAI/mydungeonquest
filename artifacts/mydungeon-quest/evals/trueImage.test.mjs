// ------------------------------------------------------------
// TRUE IMAGE — EXPERIENCE DIRECTIVE XVII, Stage One (Task 60B).
//
// Four gates, four PASS lines:
//   1. oneRoad       — the single pipeline module: pinned ratios, the
//                      vertical law at the mock adapter, the render-payload
//                      whitelist, honest empty-frame speech, and ONE seat
//                      (app, server court, and foundry all import plateroad).
//   2. freshPlate    — the render door: papers must match the very turn,
//                      captions must stand, refusals show an HONEST empty
//                      frame, and grandfathered history renders whole.
//   3. propLaw       — the identity ceiling and the prop law, seated in the
//                      SAME court on both benches (server judgeTurn executed,
//                      client landing probed at the source seam), with the
//                      schema and system prompt teaching the same pins.
//   4. easelPriority — paint asks enter the wire before audio asks,
//                      deterministically, via the one road's own sort.
// Headless: node + fake-indexeddb + react-test-renderer, no AI keys.
// ------------------------------------------------------------

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
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

const {
  PLATE_RATIO, PLATE_KINDS, ratioFor, checkPlateRatio, admitPlate, emptyFrameLine,
  cueCourt, propLawCheck, movedItems, groundFixtures, easelOrder, renderableTurn
} = await import('../src/lib/plateroad.js');
const { mockAdapter } = await import('../server/adapters/mock.js');
const { judgeTurn } = await import('../server/dm.js');
const { revealSet } = await import('../src/lib/reveals.js');
const { LogEntry } = await import('../src/App.jsx');

const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
};
const collectClass = (node, cls, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectClass(child, cls, out); return out; }
  if (String(node.props?.className || '').split(/\s+/).includes(cls)) out.push(node);
  if (node.children) collectClass(node.children, cls, out);
  return out;
};
const collectType = (node, type, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectType(child, type, out); return out; }
  if (node.type === type) out.push(node);
  if (node.children) collectType(node.children, type, out);
  return out;
};
const svgSize = (bytes) => {
  const text = bytes.toString();
  return { w: Number(text.match(/width="(\d+)"/)?.[1]), h: Number(text.match(/height="(\d+)"/)?.[1]), text };
};

// ---------------------------------------------------------------------------
// 1. ONE ROAD — pinned ratios, the vertical law at the keyless adapter, the
//    render-payload whitelist, honest empty-frame speech, one seat for all.
// ---------------------------------------------------------------------------
{
  // The vertical law's pins: feed plates 3:4, sheets 1:1, furniture 16:9.
  assert.equal(PLATE_RATIO, '3:4', 'the pinned portrait ratio is 3:4');
  assert.deepEqual(PLATE_KINDS, ['scene', 'portrait'], 'feed plates are scene and portrait');
  assert.equal(ratioFor('scene'), '3:4');
  assert.equal(ratioFor('portrait'), '3:4');
  assert.equal(ratioFor('sheet'), '1:1');
  for (const furniture of ['key_art', 'cover', 'region', 'beat-still']) assert.equal(ratioFor(furniture), '16:9', `${furniture} is furniture, not a feed plate`);

  // The delivery check: exact, tolerant to provider rounding, and no more.
  assert.ok(checkPlateRatio(768, 1024, 'scene').ok, 'a true 3:4 box passes');
  assert.ok(checkPlateRatio(766, 1024, 'scene').ok, 'provider rounding within 1/50 passes');
  assert.ok(!checkPlateRatio(1280, 720, 'scene').ok, 'a landscape box is a wrong frame for a feed plate');
  assert.ok(checkPlateRatio(1024, 1024, 'sheet').ok, 'sheets are square');
  assert.ok(checkPlateRatio(1280, 720, 'key_art').ok, 'furniture keeps the wide frame');
  assert.ok(!checkPlateRatio(0, 0, 'scene').ok, 'a degenerate box never passes');

  // The keyless adapter obeys the same pins BY CONSTRUCTION.
  const scene = svgSize((await mockAdapter.paint({ prompt: 'a ruined gate', kind: 'scene' })).bytes);
  assert.ok(checkPlateRatio(scene.w, scene.h, 'scene').ok, `mock scene plate is vertical (${scene.w}x${scene.h})`);
  const portrait = svgSize((await mockAdapter.paint({ prompt: 'a face', kind: 'portrait' })).bytes);
  assert.ok(checkPlateRatio(portrait.w, portrait.h, 'portrait').ok, 'mock portrait is vertical');
  const region = svgSize((await mockAdapter.paint({ prompt: 'a vale', kind: 'region' })).bytes);
  assert.ok(checkPlateRatio(region.w, region.h, 'region').ok, 'mock region canon keeps the wide frame');

  // The render-payload whitelist: court language is structurally absent
  // from what a render surface may receive — never copied, no blacklist.
  const turn = {
    narration_blocks: [{ text: 'Rain falls.', speaker: null }],
    image_cue: { kind: 'scene', subjects: ['Mara Vey'], caption: 'rain on the gate' },
    story: { cast_add: [] },
    suggestions: ['Look up'],
    validator_notes: 'COURT LANGUAGE — must never render',
    repair_attempts: 2,
    __debug: { prompt: 'secret' }
  };
  const safe = renderableTurn(turn);
  assert.deepEqual(Object.keys(safe).sort(), ['image_cue', 'narration_blocks', 'story', 'suggestions'], 'only whitelisted fields cross to a render surface');
  assert.equal(safe.narration_blocks, turn.narration_blocks, 'whitelisted fields cross whole, by reference — never rebuilt');
  assert.ok(!('validator_notes' in safe) && !('repair_attempts' in safe) && !('__debug' in safe), 'court language is structurally absent');
  assert.equal(renderableTurn(null), null, 'a null turn passes through untouched');

  // The empty frame speaks plain words — never dev language.
  for (const status of ['paperless', 'stale-papers', 'captionless', 'refused-paint', 'painting', 'unknown-status']) {
    const line = emptyFrameLine(status);
    assert.ok(line && typeof line === 'string' && line.length > 10, `a line stands for ${status}`);
    assert.ok(!/hash|attest|undefined|null|payload|schema|assert/i.test(line), `the ${status} line speaks the player's language`);
  }

  // ONE SEAT: the app, the server court, and the foundry all import the
  // one road — the law is never mirrored (the mirrors-need-one-seat law).
  assert.ok(read('src/App.jsx').includes("from './lib/plateroad.js'"), 'the app imports the one road');
  assert.ok(read('server/dm.js').includes("from '../src/lib/plateroad.js'"), 'the server court imports the one road');
  assert.ok(read('src/lib/cinema/foundry.js').includes("from '../plateroad.js'"), 'the foundry imports the one road');

  console.log('PASS — one road: pinned vertical frames, whitelisted render payloads, plain empty-frame speech, one seat.');
}

// ---------------------------------------------------------------------------
// 2. FRESH PLATE — the render door: this turn's papers or an honest empty
//    frame; grandfathered history renders whole.
// ---------------------------------------------------------------------------
{
  // The door itself, all four verdicts.
  assert.equal(admitPlate({ turnHash: 'T', attestation: null, caption: 'c' }).status, 'paperless');
  assert.equal(admitPlate({ turnHash: 'T', attestation: { originTurnHash: 'T' }, caption: 'c' }).status, 'paperless', 'papers without an asset hash are no papers');
  assert.equal(admitPlate({ turnHash: 'T', attestation: { assetHash: 'a', originTurnHash: 'OTHER' }, caption: 'c' }).status, 'stale-papers');
  assert.equal(admitPlate({ turnHash: null, attestation: { assetHash: 'a', originTurnHash: null }, caption: 'c' }).status, 'stale-papers', 'an unsealed turn admits no papered plate');
  assert.equal(admitPlate({ turnHash: 'T', attestation: { assetHash: 'a', originTurnHash: 'T' }, caption: '  ' }).status, 'captionless');
  const admitted = admitPlate({ turnHash: 'T', attestation: { assetHash: 'a', originTurnHash: 'T' }, caption: 'the gate' });
  assert.ok(admitted.admit && admitted.status === 'admitted');

  const CAMP = 'camp-true-image-door';
  const campaign = { id: CAMP };
  const dm = { narration_blocks: [{ text: 'Rain.', speaker: null }], image_cue: { kind: 'scene', subjects: [], caption: 'the flooded gate' } };

  // STALE PAPERS — another moment's painting: an honest EMPTY FRAME, no
  // image, no seen-mark, the refusal named in plain words.
  {
    const log = { id: 'lg-stale', recordHash: 'seal-A', dm, imageUrl: 'data:image/png;base64,AA==', imageAssetHash: 'plate-stale', imagePapers: { assetHash: 'plate-stale', originTurnHash: 'seal-ELSEWHERE' } };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    const tree = root.toJSON();
    assert.equal(collectClass(tree, 'empty-frame').length, 1, 'the refused plate shows the honest empty frame');
    assert.equal(collectClass(tree, 'plate-zoom').length, 0, 'no image button renders for a refused plate');
    assert.equal(collectType(tree, 'img').length, 0, 'NO image at all — never yesterday\u2019s painting, never a stand-in');
    assert.ok(textOf(tree).includes('belongs to another moment'), 'the refusal speaks its reason in plain words');
    const caption = collectType(tree, 'figcaption')[0];
    assert.ok(textOf(caption).includes('empty frame'), 'the folio names the empty frame honestly');
    const seen = await revealSet(CAMP, 'plate');
    assert.ok(!seen.has('plate-stale'), 'a plate that never rendered is never marked seen');
    await act(async () => { root.unmount(); });
  }

  // THIS TURN'S PAPERS — the plate renders, marked illuminated and seen.
  {
    const log = { id: 'lg-fresh', recordHash: 'seal-B', dm, imageUrl: 'data:image/png;base64,AA==', imageAssetHash: 'plate-fresh', imagePapers: { assetHash: 'plate-fresh', originTurnHash: 'seal-B' } };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    const tree = root.toJSON();
    assert.equal(collectClass(tree, 'empty-frame').length, 0, 'papers of this very turn admit the plate');
    assert.equal(collectType(tree, 'img').length, 1, 'the admitted plate renders');
    assert.ok(textOf(collectType(tree, 'figcaption')[0]).includes('illuminated'), 'the admitted plate is illuminated');
    const seen = await revealSet(CAMP, 'plate');
    assert.ok(seen.has('plate-fresh'), 'the rendered plate marks itself seen');
    await act(async () => { root.unmount(); });
  }

  // THE GRANDFATHER CLAUSE — logs sealed before papers existed render
  // exactly as they always did: immutable history is never re-judged.
  {
    const log = { id: 'lg-old', recordHash: 'seal-C', dm, imageUrl: 'data:image/png;base64,AA==', imageAssetHash: 'plate-old' };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    const tree = root.toJSON();
    assert.equal(collectClass(tree, 'empty-frame').length, 0, 'paperless history is grandfathered, not refused');
    assert.equal(collectType(tree, 'img').length, 1, 'the old plate still renders');
    assert.ok(textOf(collectType(tree, 'figcaption')[0]).includes('illuminated'), 'history keeps its illumination');
    await act(async () => { root.unmount(); });
  }

  // The landing writes the papers beside the image — the door's evidence
  // is seated in the same settlement that lands the plate.
  assert.ok(read('src/App.jsx').includes('imagePapers: { assetHash: asset.assetHash, originTurnHash: asset.originTurnHash ?? null }'), 'the settlement writes the plate\u2019s papers');

  console.log('PASS — fresh plate: this turn\u2019s papers or an honest empty frame; history grandfathered whole.');
}

// ---------------------------------------------------------------------------
// 3. PROP LAW & IDENTITY CEILING — one court, both benches.
// ---------------------------------------------------------------------------
{
  // The ceiling: at most five identifiable subjects, one seat per soul.
  const six = { kind: 'scene', subjects: ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'] };
  const sixCourt = cueCourt(six);
  assert.ok(!sixCourt.ok && sixCourt.violations.some((v) => v.includes('identifiable figures')), 'a sixth likeness is refused');
  assert.ok(cueCourt({ kind: 'scene', subjects: ['A1', 'B2', 'C3', 'D4', 'E5'] }).ok, 'five subjects seat lawfully');
  assert.ok(!cueCourt({ kind: 'scene', subjects: ['Mara', ' mara '] }).ok, 'a repeated soul is refused — one seat each');
  assert.ok(cueCourt(null).ok, 'a null cue asks for nothing and violates nothing');
  assert.ok(!cueCourt({ kind: 'scene', subjects: [], items: ['a', 'b', 'c', 'd', 'e'] }).ok, 'a fifth named item is refused');
  assert.ok(!cueCourt({ kind: 'scene', subjects: [], items: ['x'] }).ok, 'an unnamed scrap is no item');

  // The prop law, in its own words.
  const evidence = {
    trove: [{ name: 'The Ferry-Iron Knife', holder: 'Mara Vey' }, { name: 'The Waystation Bell', holder: null }],
    fixtures: ['The Waystation Bell'],
    moved: ['A stub of chalk']
  };
  assert.ok(propLawCheck({ subjects: ['Mara Vey'], items: ['The Ferry-Iron Knife'] }, evidence).ok, 'a held thing appears in its holder\u2019s hands');
  const absent = propLawCheck({ subjects: ['Bram'], items: ['The Ferry-Iron Knife'] }, evidence);
  assert.ok(!absent.ok && absent.refusals[0].includes('Mara Vey'), 'the refusal names the absent holder');
  assert.ok(propLawCheck({ subjects: [], items: ['The Waystation Bell'] }, evidence).ok, 'a fixture of the ground needs no holder');
  assert.ok(propLawCheck({ subjects: [], items: ['A stub of chalk'] }, evidence).ok, 'a thing moved this turn may be shown moving');
  const stranger = propLawCheck({ subjects: [], items: ['A crown of glass'] }, evidence);
  assert.ok(!stranger.ok && stranger.refusals[0].includes('no recorded hand'), 'an unheld, unfixed, unmoved thing is refused');

  // The evidence gatherers fold their own laws.
  assert.deepEqual(movedItems({ item_add: [{ name: 'A' }], item_transfer: [{ name: 'B' }], item_remove: [{ name: 'C' }], item_equip: { name: 'D' } }), ['A', 'B', 'C', 'D']);
  assert.deepEqual(groundFixtures([{ place: 'The Vale', name: 'Bell' }, { place: 'Elsewhere', name: 'Gate' }], ' the vale '), ['Bell'], 'fixtures fold to the standing ground, case-blind');
  assert.deepEqual(groundFixtures([{ place: 'The Vale', name: 'Bell' }], null), [], 'no ground, no fixtures');

  // THE SERVER BENCH, EXECUTED — the same court sits inside judgeTurn
  // (skeletal turns: the shape validator names its own violations; this
  // gate asserts only on the cue courts' clauses).
  const input = {
    entropy: null,
    hero: { name: 'Bram' },
    story: {
      cast: [{ name: 'Mara Vey' }],
      trove_state: [{ name: 'The Ferry-Iron Knife', holder: 'Mara Vey' }],
      fixture_state: [{ place: 'The Wayhouse', name: 'The Waystation Bell' }],
      scene_state: { region: 'The Wayhouse' }
    }
  };
  const turnWith = (cue) => ({ narration_blocks: [{ speaker: null, text: 'Rain.' }], story: {}, image_cue: cue });
  const ceilingVerdict = judgeTurn(turnWith(six), input);
  assert.ok(ceilingVerdict.errors.some((e) => e.includes('identifiable figures')), 'the server bench refuses the sixth likeness');
  const propVerdict = judgeTurn(turnWith({ kind: 'scene', subjects: ['Bram'], items: ['The Ferry-Iron Knife'] }), input);
  assert.ok(propVerdict.errors.some((e) => e.includes('Mara Vey')), 'the server bench names the absent holder');
  const lawful = judgeTurn(turnWith({ kind: 'scene', subjects: ['Mara Vey'], items: ['The Ferry-Iron Knife', 'The Waystation Bell'] }), input);
  assert.ok(!lawful.errors.some((e) => e.includes('image_cue')), 'a lawful cue draws no cue clause from the server bench');

  // THE CLIENT BENCH, SEATED — the landing runs the same two courts from
  // the same one seat (source seam: the court names, on the cue, at the
  // landing block).
  const app = read('src/App.jsx');
  assert.ok(app.includes('cueCourt(dm.image_cue)'), 'the landing seats the identity ceiling');
  assert.ok(app.includes('propLawCheck(dm.image_cue'), 'the landing seats the prop law');
  assert.ok(app.includes('...cueBench.violations') && app.includes('...propBench.refusals'), 'the landing joins the cue courts to the one repair message');

  // THE TEACHING RIDES IN LOCKSTEP — the schema pins what the validator
  // enforces; the system prompt teaches the same law it will be held to.
  const dmSource = read('server/dm.js');
  assert.ok(dmSource.includes('maxItems: 5'), 'the schema pins the five-subject ceiling');
  assert.ok(dmSource.includes("items: { type: 'array', maxItems: 4"), 'the schema admits at most four named items');
  const promptSource = read('src/lib/systemPrompt.js');
  assert.ok(promptSource.includes("42. THE PLATE'S BUDGET"), 'rule 42 teaches the plate\u2019s budget');
  assert.ok(promptSource.includes('43. THE PROP LAW'), 'rule 43 teaches the prop law');

  console.log('PASS — prop law & identity ceiling: one court, both benches, schema and teaching in lockstep.');
}

// ---------------------------------------------------------------------------
// 4. EASEL PRIORITY — paint asks enter the wire before audio asks.
// ---------------------------------------------------------------------------
{
  const jobs = [
    { kind: 'music', priority: 4, id: 'm4' },
    { kind: 'paint', priority: 1, id: 'p1a' },
    { kind: 'paint', priority: 2, id: 'p2' },
    { kind: 'paint', priority: 0, id: 'p0' },
    { kind: 'music', priority: 3, id: 'm3' },
    { kind: 'paint', priority: 1, id: 'p1b' },
    { kind: 'paint', id: 'p-late' }
  ];
  const order = easelOrder(jobs).map((job) => job.id);
  assert.deepEqual(order, ['p0', 'p1a', 'p1b', 'p2', 'p-late', 'm3', 'm4'], 'paint class first, priority within class, declaration order on ties');
  assert.ok(Math.max(...order.slice(0, 5).map((id, i) => i)) < 5 && order.slice(5).every((id) => id.startsWith('m')), 'every image ask precedes every audio ask');
  assert.equal(jobs[0].id, 'm4', 'the sort never mutates the declared batch');
  assert.deepEqual(easelOrder(jobs).map((job) => job.id), order, 'the order is deterministic');

  // The dispatch loop rides the one road's sort — not a local mirror.
  assert.ok(read('src/App.jsx').includes('easelOrder(jobs'), 'queueMedia dispatches through easelOrder');

  console.log('PASS — easel priority: the paint request enqueues ahead of voice and music, deterministically.');
}

console.log('OK trueImage.test.mjs — one road, fresh plates, the prop law, and the easel priority hold keyless.');
