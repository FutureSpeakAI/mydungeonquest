// ------------------------------------------------------------
// REFERENCE SHEETS & THE SLOT LAW — EXPERIENCE DIRECTIVE XVII,
// Stage One (Task 60B). Two gates, two PASS lines:
//
//   1. sheet — every carded subject gets ONE composite sheet at
//      introduction: the fixed 2x2 grid brief with the silence
//      clause, the keyless adapter's textless square by construction,
//      deterministic mint jobs (souls r0, places keyed on their
//      standing state, species, notable items only), and the
//      NEVER-CHAINED law proven through the real Foundry: a sheet
//      mint resolves the sealed BUST even when a prior sheet sits
//      on the shelf, while a scene plate resolves the SHEET first.
//   2. slot — pinned per-provider budgets, the deterministic seating
//      plan (principal, ground, subjects, species, items; deduped;
//      capped), byte-stable binding lines composed from what actually
//      attached, and the foundry's cap at the pinned budget.
// Headless: node + fake-indexeddb, no AI keys, no network.
// ------------------------------------------------------------

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

// The browser pieces the foundry leans on, stood up honestly for node.
globalThis.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then((buf) => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`; this.onload?.(); })
      .catch((error) => this.onerror?.(error));
  }
};

// Every wire ask is captured; paint bodies are the evidence. The judge
// endpoints get the same blob-shaped answer freshPlates proved floors
// the courts honestly (a judge's stumble never convicts a render).
const paintCalls = [];
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).endsWith('/api/paint')) paintCalls.push(JSON.parse(opts.body || '{}'));
  return {
    ok: true,
    headers: { get: (name) => (name === 'X-Media-Provider' ? 'mock' : name === 'X-Media-Model' ? 'test-model' : null) },
    blob: async () => new Blob([`take-${paintCalls.length}`], { type: 'image/png' })
  };
};

const {
  SHEET_GRID, RE_ANCHOR_LEVER, SHEET_SILENCE_CLAUSE, sheetCells, sheetBrief,
  SLOT_BUDGETS, slotBudget, seatingPlan, bindingLinesFor
} = await import('../src/lib/plateroad.js');
const { sheetKey, sheetJobs, heroSheetJob, NOTABLE_ITEM_KINDS } = await import('../src/lib/sheets.js');
const { mockAdapter } = await import('../server/adapters/mock.js');
const { db } = await import('../src/lib/db.js');
const { Foundry } = await import('../src/lib/cinema/foundry.js');

const svgOf = (result) => result.bytes.toString();

// ---------------------------------------------------------------------------
// 1. THE REFERENCE SHEET — one composite image per subject, minted at
//    introduction, silent by construction, never chained.
// ---------------------------------------------------------------------------
{
  // The grid is pinned and the brief speaks it whole.
  assert.deepEqual(SHEET_GRID, { columns: 2, rows: 2 }, 'the sheet grid is pinned at 2x2');
  assert.equal(RE_ANCHOR_LEVER, false, 'the re-anchor lever exists and its default is OFF');
  const brief = sheetBrief({ name: 'Mara Vey', kind: 'soul', canon: 'storm-grey eyes, ash-blonde braid' });
  assert.ok(brief.includes('2x2 grid'), 'the brief orders the fixed grid');
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) assert.ok(brief.includes(corner), `the brief seats the ${corner} cell`);
  assert.ok(brief.includes(SHEET_SILENCE_CLAUSE), 'the silence clause rides every mint');
  assert.ok(brief.includes('storm-grey eyes'), 'sealed canon rides the brief exactly');
  assert.ok(brief.includes('attached sealed anchor'), 'derivation from the sealed anchor is ordered, never fresh invention');
  // Each subject kind studies its own four views.
  const kinds = ['soul', 'place', 'species', 'item'].map((kind) => sheetCells(kind).join('|'));
  assert.equal(new Set(kinds).size, 4, 'soul, place, species, and item sheets study different cells');
  for (const kind of ['soul', 'place', 'species', 'item']) assert.equal(sheetCells(kind).length, 4, `${kind} sheets hold exactly four cells`);

  // The keyless adapter mints a TEXTLESS square — silence by construction.
  const sheet = await mockAdapter.paint({ prompt: brief, kind: 'sheet' });
  const svg = svgOf(sheet);
  assert.ok(svg.includes('width="1024"') && svg.includes('height="1024"'), 'the mock sheet is square');
  assert.ok(!svg.includes('<text'), 'NOT ONE letter: the silence clause holds by construction, not by promise');
  assert.equal(svgOf(await mockAdapter.paint({ prompt: brief, kind: 'sheet' })), svg, 'the mock sheet is deterministic on its prompt');
  assert.notEqual(svgOf(await mockAdapter.paint({ prompt: 'another subject', kind: 'sheet' })), svg, 'different subjects mint different sheets');
  // Plates may carry the mock's honest labels; only sheets are silent.
  assert.ok(svgOf(await mockAdapter.paint({ prompt: 'a gate', kind: 'scene' })).includes('<text'), 'mock plates keep their procedural label — the silence law is the sheet\u2019s own');

  // The mint jobs: deterministic, introduction-driven, notable-only.
  assert.equal(sheetKey('c1', ' Mara Vey ', 'r0'), 'sheet:c1:mara vey:r0', 'the sheet key folds its name');
  assert.deepEqual([...NOTABLE_ITEM_KINDS].sort(), ['keepsake', 'treasure', 'weapon'], 'notable item kinds are pinned');
  const campaign = {
    id: 'c-sheets',
    hero: { name: 'Bram', appearance: 'grey eyes, a weathered coat', signature: 'a scarred left hand' },
    codex: {
      cast: [{ name: 'Mara Vey', visual: 'storm-grey eyes, ash-blonde braid' }],
      regions: [{ name: 'Larkspur Vale', visual: 'a green river vale', state: 'uneasy' }]
    }
  };
  const story = {
    cast_add: [{ name: 'Mara Vey' }, { name: 'Nobody Recorded' }],
    world: { region_add: { name: 'Larkspur Vale' } },
    creature_add: { species: 'Marsh Howler', visual: 'reed-green weed over hard ribs' },
    item_add: [
      { name: 'A ferry-iron knife', kind: 'weapon', note: 'river-true' },
      { name: 'A stub of chalk', kind: 'tool', note: 'plain' }
    ]
  };
  const jobs = sheetJobs(campaign, story);
  assert.equal(jobs.length, 4, 'soul, place, species, and the notable item mint — the plain tool does not');
  const [soul, place, species, item] = jobs;
  assert.equal(soul.options.kind, 'sheet');
  assert.equal(soul.options.variant, 'sheet');
  assert.deepEqual(soul.options.referenceLabels, ['Mara Vey'], 'the soul sheet derives from its OWN sealed anchor');
  assert.equal(soul.priority, 2, 'soul sheets seat after the busts and the moment\u2019s plate');
  assert.equal(soul.cacheKey, sheetKey('c-sheets', 'Mara Vey', 'r0'));
  assert.ok(soul.prompt.includes('ash-blonde braid'), 'the locked canon rides the mint');
  assert.equal(place.priority, 4, 'place sheets seat after the region\u2019s canon plate (rank 3) — the lane is serial');
  assert.equal(place.cacheKey, sheetKey('c-sheets', 'Larkspur Vale', 's:uneasy'), 'place sheets key on the standing state');
  assert.equal(species.cacheKey, sheetKey('c-sheets', 'Marsh Howler', 'r0'));
  assert.equal(item.cacheKey, sheetKey('c-sheets', 'A ferry-iron knife', 'r0'));
  // A turned state is a lawful canon change: the sheet re-mints under the
  // new state's key — and derives from the ORIGINAL anchor again.
  const turned = sheetJobs(campaign, { world: { region_update: { name: 'Larkspur Vale', state: 'blighted' } } });
  assert.equal(turned.length, 1);
  assert.equal(turned[0].cacheKey, sheetKey('c-sheets', 'Larkspur Vale', 's:blighted'), 'a turned state mints a fresh revision');
  assert.notEqual(turned[0].cacheKey, place.cacheKey, 'the new revision never collides with the old');
  const hero = heroSheetJob(campaign);
  assert.equal(hero.options.label, 'Bram');
  assert.ok(hero.prompt.includes('a scarred left hand'), 'the hero\u2019s sheet carries her sealed signature');

  // THE NEVER-CHAINED LAW, through the real Foundry: a prior sheet sits on
  // the shelf, newer than the bust — the MINT still resolves the bust; the
  // PLATE resolves the sheet first.
  const CAMP = 'camp-never-chained';
  await db.media.clear();
  await db.media.bulkPut([
    { assetHash: 'bust-1', cacheKey: 'k-bust', campaignId: CAMP, kind: 'paint', label: 'Mara Vey', variant: 'bust', originTurnHash: null, mime: 'image/png', createdAt: 1, blob: new Blob(['B1'], { type: 'image/png' }) },
    { assetHash: 'sheet-0', cacheKey: 'k-sheet0', campaignId: CAMP, kind: 'paint', label: 'Mara Vey', variant: 'sheet', originTurnHash: null, mime: 'image/svg+xml', createdAt: 9, blob: new Blob(['S0'], { type: 'image/svg+xml' }) }
  ]);
  const foundry = new Foundry({ campaignId: CAMP, tier: 'illuminated' });
  await foundry.enqueue({ kind: 'paint', prompt: 'A scene brief.', cacheKey: 'scene-fresh-1', options: { kind: 'scene', referenceLabels: ['Mara Vey'], seating: [{ name: 'Mara Vey', role: 'principal' }] } });
  const scene = paintCalls.at(-1);
  assert.equal(scene.references[0].assetHash, 'sheet-0', 'SHEET-FIRST: the standing revision rides to the easel for plates, even with the bust on the shelf');
  assert.ok(scene.prompt.includes('Reference image 1 is the composite reference sheet'), 'the binding line names the sheet for what it is');
  assert.ok(scene.prompt.includes('Mara Vey, the principal figure'), 'the binding line seats the principal by name');
  // Byte-stable: the same ask composes the same bound prompt.
  await foundry.enqueue({ kind: 'paint', prompt: 'A scene brief.', cacheKey: 'scene-fresh-2', options: { kind: 'scene', referenceLabels: ['Mara Vey'], seating: [{ name: 'Mara Vey', role: 'principal' }] } });
  assert.equal(paintCalls.at(-1).prompt, scene.prompt, 'binding lines are byte-stable');
  // The MINT, with that same prior sheet standing newest on the shelf:
  // it must reach past it to the sealed bust — sheets derive from anchors,
  // NEVER from other sheets, or drift compounds revision over revision.
  await foundry.enqueue({ kind: 'paint', prompt: sheetBrief({ name: 'Mara Vey', kind: 'soul', canon: 'braid' }), cacheKey: 'mint-fresh-1', options: { kind: 'sheet', label: 'Mara Vey', variant: 'sheet', referenceLabels: ['Mara Vey'] } });
  const mint = paintCalls.at(-1);
  assert.equal(mint.references.length, 1, 'a sheet mint attaches exactly its subject\u2019s anchor');
  assert.equal(mint.references[0].assetHash, 'bust-1', 'NEVER CHAINED: the mint derives from the sealed bust, not the prior sheet');
  // And once the fresh revision lands, the NEXT plate rides it — the
  // newest sheet is the standing one, by its own createdAt.
  await foundry.enqueue({ kind: 'paint', prompt: 'A later scene.', cacheKey: 'scene-fresh-3', options: { kind: 'scene', referenceLabels: ['Mara Vey'], seating: [{ name: 'Mara Vey', role: 'principal' }] } });
  const later = paintCalls.at(-1);
  assert.notEqual(later.references[0].assetHash, 'sheet-0', 'a fresh revision supersedes the old sheet at the easel');
  assert.notEqual(later.references[0].assetHash, 'bust-1', 'the plate still rides a SHEET, not the bare bust');
  await db.media.clear();

  console.log('PASS — reference sheets: 2x2 silent by construction, minted at introduction, never chained, sheet-first at the easel.');
}

// ---------------------------------------------------------------------------
// 2. THE SLOT LAW — pinned budgets, the deterministic seating plan, and the
//    foundry's cap at the pinned ceiling.
// ---------------------------------------------------------------------------
{
  assert.deepEqual(SLOT_BUDGETS.gemini, { subjects: 5, references: 14 }, 'Gemini\u2019s budget is pinned: 5 subjects, 14 references');
  assert.deepEqual(SLOT_BUDGETS.openai, { subjects: 5, references: 4 }, 'OpenAI\u2019s budget is pinned at its adapter\u2019s honest cap');
  assert.deepEqual(SLOT_BUDGETS.mock, { subjects: 5, references: 14 }, 'the keyless house exercises the full law');
  assert.deepEqual(slotBudget('no-such-painter'), SLOT_BUDGETS.gemini, 'an unknown painter gets the default budget, never a crash');

  // The seating plan: principal, ground, subjects in cue order, species,
  // items — deduped, capped, deterministic.
  const { plan } = seatingPlan({
    cue: { subjects: ['Bram', 'Mara Vey', 'Wren', ' bram '], items: ['A ferry-iron knife'] },
    region: 'Larkspur Vale',
    species: ['Marsh Howler']
  });
  assert.deepEqual(plan.map((seat) => `${seat.role}:${seat.name}`), [
    'principal:Bram', 'ground:Larkspur Vale', 'subject:Mara Vey', 'subject:Wren', 'species:Marsh Howler', 'item:A ferry-iron knife'
  ], 'principal first, ground second, cue order, species, item — the duplicate soul seats once');
  const crowded = seatingPlan({ cue: { subjects: Array.from({ length: 20 }, (_, i) => `Soul ${i + 1}`) }, region: 'The Vale' });
  assert.equal(crowded.plan.length, 14, 'the plan never exceeds the pinned reference budget');
  assert.equal(crowded.plan[0].name, 'Soul 1', 'the principal always rides');
  assert.equal(crowded.plan[1].name, 'The Vale', 'the ground always rides');

  // Binding lines: composed from what ACTUALLY attached, byte-stable,
  // each image bound to its subject in plain words.
  const resolved = [
    { name: 'Bram', role: 'principal', sheet: true },
    { name: 'Larkspur Vale', role: 'ground', sheet: false },
    { name: 'Marsh Howler', role: 'species', sheet: true },
    { name: 'A ferry-iron knife', role: 'item', sheet: false }
  ];
  const lines = bindingLinesFor(resolved);
  assert.equal(lines.length, 4);
  assert.ok(lines[0].startsWith('Reference image 1 is the composite reference sheet'), 'a sheet is named a sheet');
  assert.ok(lines[0].includes('Bram, the principal figure'));
  assert.ok(lines[1].includes('sealed reference portrait'), 'a bare anchor is named a portrait — the lines never lie about what attached');
  assert.ok(lines[1].includes('the ground this scene stands on'));
  assert.ok(lines[2].includes('every instance in frame'), 'one species sheet covers every instance');
  assert.ok(lines[3].includes('the named item'));
  assert.deepEqual(bindingLinesFor(resolved), lines, 'binding lines are byte-stable');

  // The foundry seats at most the pinned budget, sheets-first per label.
  const CAMP = 'camp-slot-cap';
  await db.media.clear();
  const labels = Array.from({ length: 16 }, (_, i) => `Soul ${i + 1}`);
  await db.media.bulkPut(labels.map((label, i) => ({
    assetHash: `anchor-${i + 1}`, cacheKey: `k-${i + 1}`, campaignId: CAMP, kind: 'paint', label, variant: 'bust',
    originTurnHash: null, mime: 'image/png', createdAt: i + 1, blob: new Blob([`A${i + 1}`], { type: 'image/png' })
  })));
  const before = paintCallsLength();
  const foundry = new Foundry({ campaignId: CAMP, tier: 'illuminated' });
  await foundry.enqueue({ kind: 'paint', prompt: 'A crowded hall.', cacheKey: 'cap-1', options: { kind: 'scene', referenceLabels: labels } });
  const crowdedCall = lastPaintCall();
  assert.equal(crowdedCall.references.length, 14, 'the wire carries at most the pinned 14 references');
  assert.ok(before < paintCallsLength(), 'the ask reached the wire');
  await db.media.clear();

  // The adapters hold the same pins at their own seats.
  const gemini = read('server/adapters/gemini.js');
  assert.ok(gemini.includes('maxReferenceImages: 14'), 'the Gemini seat declares the pinned capability');
  assert.ok(gemini.includes('references.slice(0, 14)'), 'the Gemini seat carries the full budget');
  assert.ok(gemini.includes("if (kind === 'portrait' || kind === 'scene') return '3:4'"), 'the Gemini seat pins the vertical frame');
  assert.ok(gemini.includes("if (kind === 'sheet') return '1:1'"), 'the Gemini seat pins the square sheet');
  const openai = read('server/adapters/openai.js');
  assert.ok(openai.includes("'1024x1536'"), 'the OpenAI seat pins the vertical frame');
  assert.ok(openai.includes("kind === 'sheet' ? '1024x1024'"), 'the OpenAI seat pins the square sheet');

  console.log('PASS — the slot law: pinned budgets, a deterministic seating plan, byte-stable bindings, the cap held at the wire.');
}

// Tiny helpers so gate 2 reads the SAME capture gate 1 fed.
function paintCallsLength() { return paintCalls.length; }
function lastPaintCall() { return paintCalls.at(-1); }

console.log('OK sheets.test.mjs — the reference sheet law and the slot law hold keyless.');
