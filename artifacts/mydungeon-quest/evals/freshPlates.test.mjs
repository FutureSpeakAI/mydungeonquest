// ---- Fresh plates & the seen ledger ----
//
// Locks four laws from "deal fresh art every turn":
//   1. ONE TURN, ONE PAINTING — scene paints are keyed to the turn's own seal
//      (salted cacheKey), so two turns described in IDENTICAL words get two
//      different paintings, while re-queuing the SAME turn reuses its painting
//      (a reopen or a refused pour never wastes a repaint).
//   2. THE BRIEF VARIES, THE FACES HOLD — same cue, different turn: the brief
//      differs (prose slice + framing wheel) while the subjects' appearance
//      canon stays wired into every variant.
//   3. THE REVEAL LAW & THE FRESH PLATE LAW (XVII) — the chapter card deals
//      its OWN art only: the beat's keyed cover, or this very turn's plate.
//      A seen cover is never re-dealt, and another moment's painting is
//      NEVER borrowed — the honest gradient (null) is the last resort.
//      Replays are exempt. The seen ledger records FIRST showings only.
//   4. THE DEED LINE & THE PLATE MARK — a turn where the player acted rather
//      than spoke (a die, the X-card) still shows in sequence, marked apart
//      from spoken words; a painted plate records itself as seen on render.
// Headless: node + fake-indexeddb + react-test-renderer, no AI keys.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
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

const { db } = await import('../src/lib/db.js');
const { markRevealed, revealSet, listReveals } = await import('../src/lib/reveals.js');
const { scenePrompt, sceneFraming } = await import('../src/lib/cinema/prompts.js');
const { Foundry } = await import('../src/lib/cinema/foundry.js');
const { resolveAssets } = await import('../src/components/Cinematic.jsx');
const { beatKeys } = await import('../src/lib/cinema/lookahead.js');
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

// ---------------------------------------------------------------------------
// 1. ONE TURN, ONE PAINTING — identical words, two turns, two paintings; the
//    same turn re-queued repaints nothing.
// ---------------------------------------------------------------------------
{
  let paintCalls = 0;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: (name) => (name === 'X-Media-Provider' ? 'test-brush' : name === 'X-Media-Model' ? 'test-model' : null) },
    blob: async () => new Blob([`plate-${++paintCalls}`], { type: 'image/png' })
  });

  const CAMP = 'camp-fresh-plates';
  await db.media.clear();
  const foundry = new Foundry({ campaignId: CAMP, tier: 'illuminated' });
  const prompt = 'A ruined gate under cold rain.'; // the SAME words, twice

  const a = await foundry.enqueue({ kind: 'paint', prompt, cacheKey: `scene:${CAMP}:turn-A`, options: { kind: 'scene' } });
  const b = await foundry.enqueue({ kind: 'paint', prompt, cacheKey: `scene:${CAMP}:turn-B`, options: { kind: 'scene' } });
  assert.equal(paintCalls, 2, 'two turns in similar words must paint twice, never collapse');
  assert.notEqual(a.assetHash, b.assetHash, 'each turn owns its own painting');
  assert.equal(a.cacheKey, `scene:${CAMP}:turn-A`, 'the salt rides the row');

  const again = await foundry.enqueue({ kind: 'paint', prompt, cacheKey: `scene:${CAMP}:turn-A`, options: { kind: 'scene' } });
  assert.equal(paintCalls, 2, 'the same turn re-queued (reopen, refused pour) must not repaint');
  assert.equal(again.assetHash, a.assetHash, 'the turn finds its OWN painting again');

  await db.media.clear();
  console.log('PASS — one turn, one painting: identical words never collapse; the same turn never repaints.');
}

// ---------------------------------------------------------------------------
// 2. THE BRIEF VARIES, THE FACES HOLD — same cue on two turns: prose and
//    framing differ the brief; the appearance canon stays in every variant.
// ---------------------------------------------------------------------------
{
  const campaign = {
    styleBible: 'Muted candlelit oils.',
    codex: {
      blight: 1,
      cast: [{ name: 'Mara', visual: 'storm-grey eyes, ash-blonde braid, patched green cloak' }],
      regions: [{ name: 'The Fen', visual: 'drowned willows', state: 'uneasy' }],
      arc: {}
    }
  };
  const cue = { kind: 'scene', mood: 'tension in the dark corridor', subjects: ['Mara'], region: 'The Fen' };

  const turnOne = scenePrompt(campaign, cue, { prose: 'Mara presses her back to the stone as the torch gutters.', seed: 'seal-1' });
  const turnTwo = scenePrompt(campaign, cue, { prose: 'The far door opens onto a hall of standing water.', seed: 'seal-2' });
  assert.notEqual(turnOne, turnTwo, 'the same cue on different turns must brief differently');
  for (const [label, brief] of [['turn one', turnOne], ['turn two', turnTwo]]) {
    assert.ok(brief.includes('storm-grey eyes'), `${label}: the appearance canon must stay wired in`);
    assert.ok(brief.includes('Composition:'), `${label}: the framing wheel must deal a composition`);
    assert.ok(brief.includes('reference images'), `${label}: the anchor clause must survive`);
  }
  assert.ok(turnOne.includes('torch gutters'), 'the turn\u2019s own prose reaches its brief');

  // The wheel is deterministic: the same seed always deals the same frame.
  assert.equal(sceneFraming('seal-1'), sceneFraming('seal-1'), 'same seed, same frame');
  const dealt = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(sceneFraming));
  assert.ok(dealt.size > 1, 'the wheel must actually turn across seeds');

  console.log('PASS — the brief varies by turn (prose + framing) while the faces hold their canon.');
}

// ---------------------------------------------------------------------------
// 3. THE REVEAL LAW — the card ladder skips seen art rung by rung; replays
//    are exempt; the ledger records first showings only.
// ---------------------------------------------------------------------------
{
  const CAMP = 'camp-reveal-law';
  const campaign = { id: CAMP, codex: { beatIndex: 0, cast: [] } };
  const keys = beatKeys(CAMP, 0);
  await db.media.clear();
  await db.media.bulkPut([
    { assetHash: 'beat-cover', cacheKey: keys.still, campaignId: CAMP, kind: 'paint', subtype: 'beat-still', label: 'Beat', originTurnHash: null, createdAt: 3, blob: new Blob(['B'], { type: 'image/png' }) },
    { assetHash: 'scene-own', cacheKey: 'scene:own', campaignId: CAMP, kind: 'paint', subtype: 'scene', originTurnHash: 't-own', createdAt: 2, blob: new Blob(['P2'], { type: 'image/png' }) }
  ]);

  const first = await resolveAssets(campaign, 'no-such-turn', 0);
  assert.equal(first.still?.assetHash, 'beat-cover', 'the beat\u2019s own keyed cover wins while unseen');
  await markRevealed(CAMP, 'card', 'beat-cover', { beatIndex: 0 });

  // THE FRESH PLATE LAW (XVII, Article III) — the borrow rungs are STRUCK:
  // a seen cover never falls to another moment's painting, however many
  // unseen plates the shelf holds. The honest gradient (null) stands.
  const second = await resolveAssets(campaign, 'no-such-turn', 0);
  assert.equal(second.still, null, 'a seen cover is never re-dealt, and another moment\u2019s plate is NEVER borrowed — the gradient is the honest last resort');

  // This very turn's OWN painting remains lawful — fresh art of the moment
  // the card crowns, not a recycled ambient plate.
  const own = await resolveAssets(campaign, 't-own', 0);
  assert.equal(own.still?.assetHash, 'scene-own', 'the card may still take THIS turn\u2019s own plate');

  const replay = await resolveAssets(campaign, 'no-such-turn', 0, { replay: true });
  assert.equal(replay.still?.assetHash, 'beat-cover', 'a replay is a re-view, not a new reveal — nothing is skipped');

  // First-showing timestamps hold; kinds are recorded apart.
  const before = (await listReveals(CAMP)).find((row) => row.assetHash === 'beat-cover');
  await new Promise((resolve) => setTimeout(resolve, 12));
  await markRevealed(CAMP, 'card', 'beat-cover', { beatIndex: 0 });
  const after = (await listReveals(CAMP)).filter((row) => row.assetHash === 'beat-cover' && row.kind === 'card');
  assert.equal(after.length, 1, 'a re-show is not a new reveal');
  assert.equal(after[0].ts, before.ts, 'the FIRST showing\u2019s timestamp is the record');
  await markRevealed(CAMP, 'plate', 'beat-cover', { logId: 'x' });
  const kinds = await revealSet(CAMP, 'plate');
  assert.ok(kinds.has('beat-cover'), 'plate and card showings are recorded apart');

  await db.media.clear();
  console.log('PASS — the reveal law: seen covers never re-dealt, stale plates never borrowed; replays exempt; first showings kept.');
}

// ---------------------------------------------------------------------------
// 4. THE DEED LINE & THE PLATE MARK — deeds show in sequence, marked apart
//    from speech; a painted plate records itself as seen when it renders.
// ---------------------------------------------------------------------------
{
  const CAMP = 'camp-deed-lines';
  const campaign = { id: CAMP };

  // A spoken turn: the player's words, under "You".
  {
    const log = { id: 'log-said', player: 'I push the gate open.', ts: 1, dm: { narration_blocks: [{ text: 'The gate holds.', speaker: null }] }, imageUrl: null };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    const lines = collectClass(root.toJSON(), 'player-line');
    assert.equal(lines.length, 1, 'a spoken turn shows its player line');
    assert.ok(textOf(lines[0]).includes('I push the gate open.'), 'the words themselves are shown');
    assert.ok(textOf(lines[0]).includes('You'), 'speech is labeled as the player\u2019s own');
    await act(async () => { root.unmount(); });
  }

  // A deed turn (a die resolved): shown in sequence, marked apart.
  {
    const log = { id: 'log-deed', player: null, deed: 'The d20 falls 14 \u2014 success.', ts: 2, dm: { narration_blocks: [{ text: 'The gate holds.', speaker: null }] }, imageUrl: null };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    const tree = root.toJSON();
    const deeds = collectClass(tree, 'deed');
    assert.equal(deeds.length, 1, 'a deed turn shows its deed line in sequence');
    assert.ok(textOf(deeds[0]).includes('The d20 falls 14'), 'the deed itself is shown');
    assert.ok(!textOf(deeds[0]).includes('You'), 'a deed is never dressed as speech');
    await act(async () => { root.unmount(); });
  }

  // A painted plate records itself as seen when it actually renders.
  {
    const log = { id: 'log-plate', player: null, ts: 3, dm: { narration_blocks: [{ text: 'Rain.', speaker: null }] }, imageUrl: 'data:image/png;base64,AA==', imageAssetHash: 'plate-seen-1' };
    let root;
    await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    const seen = await revealSet(CAMP, 'plate');
    assert.ok(seen.has('plate-seen-1'), 'a rendered painted plate lands in the seen ledger');
    await act(async () => { root.unmount(); });
  }

  console.log('PASS — deeds show in sequence marked apart from speech; rendered plates mark themselves seen.');
}

// ---------------------------------------------------------------------------
// 5. THE CHAINED CARDS — a DM card and an act card born of the SAME turn
//    (same campaign, same turn hash, same beat) mount as two card instances;
//    the second must re-consult the ledger and take DIFFERENT art — under
//    the fresh-plate law (XVII), that different art is the turn's OWN plate,
//    never an ambient borrow. (In the app, the per-card key on <Cinematic>
//    forces exactly this remount even though the chained close batches its
//    two state updates.)
// ---------------------------------------------------------------------------
{
  const Cinematic = (await import('../src/components/Cinematic.jsx')).default;
  const CAMP = 'camp-chained-cards';
  const campaign = { id: CAMP, codex: { beatIndex: 0, cast: [] } };
  const keys = beatKeys(CAMP, 0);
  await db.media.clear();
  await db.media.bulkPut([
    { assetHash: 'chain-cover', cacheKey: keys.still, campaignId: CAMP, kind: 'paint', subtype: 'beat-still', label: 'Beat', originTurnHash: null, createdAt: 2, blob: new Blob(['C1'], { type: 'image/png' }) },
    { assetHash: 'chain-scene', cacheKey: 'scene:chain', campaignId: CAMP, kind: 'paint', subtype: 'scene', originTurnHash: 't-chain', createdAt: 1, blob: new Blob(['C2'], { type: 'image/png' }) }
  ]);

  // Both cards ride the SAME turn hash, as the app's chained close does.
  const mountCard = async (card) => {
    let root;
    await act(async () => {
      root = TestRenderer.create(h(Cinematic, { cinematic: card, dialogue: null, campaign, reduceMotion: false, turnRecordHash: 't-chain', beatIndex: 0, onClose: () => {} }));
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
    await act(async () => { root.unmount(); });
  };

  await mountCard({ type: 'boss_reveal', title: 'The Drowned Choir', subtitle: 'It sings.', palette: ['#0d0b14', '#4c465e', '#d4a24e'] });
  const afterFirst = (await listReveals(CAMP)).filter((row) => row.kind === 'card').map((row) => row.assetHash);
  assert.deepEqual(afterFirst, ['chain-cover'], 'the DM card marks the beat cover it showed');

  await mountCard({ type: 'act', title: 'Act II', subtitle: 'The world unravelling.', palette: ['#0d0b14', '#4c465e', '#b8541f'] });
  const afterSecond = (await listReveals(CAMP)).filter((row) => row.kind === 'card').map((row) => row.assetHash);
  assert.deepEqual(afterSecond, ['chain-cover', 'chain-scene'], 'the chained act card re-consults the ledger and deals the turn\u2019s OWN plate — different art, lawfully sourced');

  await db.media.clear();
  console.log('PASS — chained cards from one turn deal different art: the second card consults the ledger.');
}

console.log('PASS — fresh plates: one turn one painting, varied briefs with held faces, the reveal law, and the deed line.');
