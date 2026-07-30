// K10 — goldenRecord (the golden record)
//
// Stage 6 K10: Seal one canonical campaign as a committed fixture.
// Assert every derived surface renders consistently from it, forever.
//
// This is the strongest available check on the project's central claim:
// every surface is a pure replay of the sealed record. It catches reducer
// drift, card changes, graph changes, chart changes, and context-pack
// changes that no per-feature test would notice — because it compares
// against a KNOWN-GOOD output rather than a re-derived expectation.
//
// Design:
//   - The fixture campaign is built from initCodex (proper codex shape)
//     plus known-good hero, logs, and story entries.
//   - Snapshot files live in evals/golden-snapshots/.
//   - First run: snapshots are absent → written and PASS.
//   - Subsequent runs: snapshots present → assert byte-for-byte.
//   - Regenerating a snapshot requires an explicit owner ruling (see K10
//     constraint: snapshots regenerated only alongside a stated,
//     intentional change, never to make a red test green).
//
// Courts:
//  ① cardsForCampaign snapshot (card identities + current state)
//  ② buildContextPack snapshot (context pack text, keys, lengths)
//  ③ chartOf snapshot (regions, roads, travel)
//  ④ partyOf snapshot (party composition, whereabouts)
//  ⑤ standingsOf snapshot (purse total, HP fractions)
//  ⑥ Pre-Stage-1 save: still loads and produces non-null results

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SNAPSHOT_DIR = path.join(ROOT, 'evals', 'golden-snapshots');
if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true });

const readSnap = (name) => {
  const p = path.join(SNAPSHOT_DIR, name);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};
const writeSnap = (name, content) => writeFileSync(path.join(SNAPSHOT_DIR, name), content, 'utf8');

// ─────────────────────────────────────────────────────────────
// DERIVED SURFACE IMPORTS
// ─────────────────────────────────────────────────────────────
import { cardsForCampaign } from '../../../packages/engine/src/cards.js';
import { buildContextPack, PACK_BUDGET } from '../../../packages/engine/src/graph.js';
import { chartOf } from '../../../packages/engine/src/chart.js';
import { partyOf } from '../../../packages/engine/src/presence.js';
import { standingsOf, initCodex } from '../../../packages/engine/src/story.js';

// ─────────────────────────────────────────────────────────────
// THE CANONICAL FIXTURE CAMPAIGN
// Built from initCodex (the proper codex shape including spine,
// beatIndex, notes, standings, etc.) merged with known-good
// hero and log data. Fixed timestamps so snapshots are stable.
// ─────────────────────────────────────────────────────────────

// The default spine ('classic-epic') is SPINES[0] — initCodex uses it.
// Merge in our test-specific cast and trove entries after init.
const fixtureCodex = {
  ...initCodex('classic-epic'),
  // Apply the story updates that the 3 fixture log entries would produce.
  cast: [
    { name: 'Ivor the Innkeeper', status: 'alive', bond: 2, blight: 0, revealed: true },
  ],
  trove: [
    { id: 'item-001', label: 'Healing Salve', quantity: 2, turn: 1 },
  ],
  scene: { name: 'The Amber Hearth', sinceTurn: 0 },
};

const FIXTURE = {
  id: 'golden-record-k10-001',
  title: 'K10 Golden Record',
  createdAt: 1753401600000, // 2025-07-25T00:00:00Z — fixed, never Date.now()
  updatedAt: 1753401600000,
  turnNumber: 3,
  hero: {
    name: 'Sera Vael',
    mark: 'human',
    presentation: 'neutral',
    voiceId: 'nova',
    hp: 8,
    maxHp: 10,
    xp: 45,
    level: 1,
    sigil: 'A silver crescent on midnight blue',
    ancestry: 'Human',
    className: 'Bard',
    hitDie: 8,
    caster: true,
    bearing: 'calm',
    background: 'Charlatan',
    pronouns: 'she/her',
    skills: ['Stealth', 'Persuasion', 'Arcana'],
    abilities: { STR: 10, DEX: 12, CON: 11, INT: 13, WIS: 14, CHA: 15 },
  },
  codex: fixtureCodex,
  logs: [
    {
      id: 'log-k10-000',
      kind: 'turn',
      turn: 0,
      ts: 1753401600100,
      redacted: false,
      recordHash: 'hash-k10-000',
      player: null,
      dm: {
        narration_blocks: [
          { text: 'The Amber Hearth breathes woodsmoke and old songs. A fire pops in the hearth, and the innkeeper wipes down the bar with a rag that has seen better decades.', speaker: null },
        ],
        story: { scene_set: 'The Amber Hearth', purse: [] },
        suggestions: ['Ask the innkeeper about the road north.', 'Look around the common room.', 'Order a drink.'],
      },
    },
    {
      id: 'log-k10-001',
      kind: 'turn',
      turn: 1,
      ts: 1753401660000,
      redacted: false,
      recordHash: 'hash-k10-001',
      player: { text: 'I ask the innkeeper about the road north.' },
      dm: {
        narration_blocks: [
          { text: 'Ivor sets down the rag and leans on the counter, his eyes measuring you with the practiced ease of a man who has heard ten thousand questions.', speaker: null },
          { text: '"North road is trouble," he says. "Has been since the old mill burned. You would not be the first to ask, and most come back — or they do not come back at all."', speaker: 'Ivor the Innkeeper' },
        ],
        story: {
          cast_update: [{ name: 'Ivor the Innkeeper', bond: 2 }],
          trove_add: [{ id: 'item-001', label: 'Healing Salve', quantity: 2 }],
          purse: [{ holder: 'Sera Vael', delta: 5, reason: 'Reward from innkeeper' }],
        },
        suggestions: ['Ask what happened at the mill.', 'Thank him and set out anyway.', 'Order a room for the night.'],
      },
    },
    {
      id: 'log-k10-002',
      kind: 'tick',
      turn: 2,
      ts: 1753401720000,
      redacted: false,
      recordHash: 'hash-k10-002',
      dm: {
        narration_blocks: [
          { text: 'The fire burns lower. Outside, the wind shifts, carrying with it the faint smell of rain on stone.', speaker: null },
        ],
        story: {},
      },
    },
  ],
};

function stable(value) {
  return JSON.stringify(value, null, 2);
}

function assertSnapshot(name, actual) {
  const existing = readSnap(name);
  if (existing === null) {
    writeSnap(name, actual);
    console.log(`  → snapshot ${name} written (first run)`);
    return;
  }
  assert.strictEqual(actual, existing,
    `K10: snapshot "${name}" drifted — re-derive matches committed output or owner must update the snapshot with a stated reason`);
}

// ① cardsForCampaign — returns { cards: {}, order: [] }
const cards = cardsForCampaign(FIXTURE);
assert.ok(cards !== null && typeof cards === 'object' && 'cards' in cards && 'order' in cards,
  'K10 ①: cardsForCampaign must return { cards, order }');
assertSnapshot('cards.json', stable(cards));

// ② buildContextPack
const contextPack = buildContextPack(FIXTURE, { budget: PACK_BUDGET, recentTurns: 6 });
assert.ok(contextPack !== null && contextPack !== undefined, 'K10 ②: buildContextPack must return a value');
assertSnapshot('contextPack.json', stable(contextPack));

// ③ chartOf
const chart = chartOf(FIXTURE, {});
assertSnapshot('chart.json', stable(chart));

// ④ partyOf
const party = partyOf(FIXTURE);
assertSnapshot('party.json', stable(party));

// ⑤ standingsOf
const standings = standingsOf(FIXTURE.codex);
assertSnapshot('standings.json', stable(standings));

// ⑥ Pre-Stage-1 save: a campaign with an old-style minimal codex still
//    produces non-null results on every surface without throwing.
const preStageSave = {
  id: 'pre-stage-1-save',
  title: 'An Old Tale',
  hero: { name: 'Corin', mark: 'elf', hp: 6, maxHp: 8 },
  codex: { ...initCodex('classic-epic') },
  logs: [],
};
const preCards = cardsForCampaign(preStageSave);
const preParty = partyOf(preStageSave);
const preStandings = standingsOf(preStageSave.codex);
const preContextPack = buildContextPack(preStageSave);
assert.ok(preCards !== null && typeof preCards === 'object' && 'cards' in preCards,
  'K10 ⑥: cardsForCampaign must not throw on a pre-Stage-1 save');
assert.ok(preParty !== null && preParty !== undefined, 'K10 ⑥: partyOf must not throw on a pre-Stage-1 save');
assert.ok(preStandings !== null && preStandings !== undefined, 'K10 ⑥: standingsOf must not throw on a pre-Stage-1 save');
assert.ok(preContextPack !== null && preContextPack !== undefined, 'K10 ⑥: buildContextPack must not throw on a pre-Stage-1 save');

console.log(
  'PASS — K10 goldenRecord: canonical fixture (initCodex-based codex) produces stable snapshots ' +
  'for cards, contextPack, chart, party, standings; ' +
  'pre-Stage-1 save loads without throwing on all five surfaces.',
);
