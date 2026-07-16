// ------------------------------------------------------------
// THE SAGA GATE (game) — Directive V, Phase 2.
//
// A world outlives its tale. This gate proves the WIRING at the
// house's own table: the wax writes a legacy packet onto the record
// (seal type 'legacy'); openNextVolume consumes the sealed packet and
// forges Volume II inside the same world — legacy voiceIds byte-equal,
// locked canon crossing untouched, the dead arriving dead and refused
// by the validator's own snapshot; the interlude bridges the stated
// span as client ticks sealed like any other record, deterministic in
// (codex, span); an elder tale sealed before this law still opens by
// the same packet, rebuilt. Headless: node + fake-indexeddb, no keys.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDmTurn } from 'fatescript/protocol';
import { initCodex } from 'fatescript/story';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { db, campaignJournal } = await import('../src/lib/db.js');
const { legacyPacketOf, sealLegacy, openNextVolume } = await import('../src/lib/saga.js');

// The finished first volume: two souls with exact voices, one of them
// in the ground; a hero with a voice of their own; a scarred world.
function firstVolume(id) {
  const codex = initCodex('classic-epic');
  codex.blight = 2;
  codex.cast = [
    { id: 's-mira', name: 'Mira', role: 'ally', visual: 'A silver-braided hunter with a scar over one brow.', voice: 'Low and even, like banked coals.', goal: 'Guard the vale.', secret: 'She buried the old king.', status: 'active', bond: 2, last_seen: 'The ford', known_facts: ['Knows the pass', 'Owes the hero a life'], introduced_turn: 2, voiceId: 'voice-mira-11' },
    { id: 's-edda', name: 'Edda', role: 'mentor', visual: 'A stooped chronicler in ink-stained grey.', voice: 'Paper-dry, precise.', goal: 'Finish the annals.', secret: 'The annals lie once.', status: 'dead', bond: 1, last_seen: 'The archive fire', known_facts: ['Died in the archive'], introduced_turn: 1, voiceId: 'voice-edda-3' },
  ];
  codex.regions = (codex.regions || []).length ? codex.regions : [{ name: 'Larkspur Vale', description: 'A cold green cleft of rivers.' }];
  return {
    id, title: 'The Ashen Vale', covenant: 'A vale where oaths outlive their makers.', tone: 'Mythic', lines: [], veils: [],
    styleBible: 'Oil and gold leaf.', homeRegion: 'Larkspur Vale', spineId: 'classic-epic',
    hero: { name: 'Rook', className: 'Warden', mark: 'a burn-scarred jaw', voiceId: 'voice-hero-9', sigil: '✦' },
    codex, logs: [], combat: null, pendingRoll: null, turnNumber: 6, turnCount: 6, headHash: null,
    signatureStatus: 'pending', completed: true, readOnly: false, sealedAt: 1700000000000,
    mediaTier: 'parchment', spend: { images: 0, music: 0 }, createdAt: 1, updatedAt: 2,
  };
}

// 1. THE WAX WRITES THE PACKET — seal type 'legacy' on the record, exact
//    voices and locked canon inside, the dead still dead within it.
const one = firstVolume('saga-one');
await db.campaigns.put(one);
await sealLegacy(one);
{
  const journal = await campaignJournal('saga-one');
  const row = journal.find((r) => r.type === 'legacy');
  assert.ok(row, 'the volume closes onto the record itself');
  assert.equal(row.payload?.kind, 'legacy');
  assert.equal(row.payload.souls.find((s) => s.name === 'Mira').voiceId, 'voice-mira-11');
  assert.equal(row.payload.souls.find((s) => s.name === 'Edda').status, 'dead');
  assert.equal(JSON.stringify(row.payload), JSON.stringify(legacyPacketOf(one)), 'the sealed packet is the packet — byte-stable');
}

// 2. VOLUME II OPENS IN THE SAME WORLD — the packet is consumed; legacy
//    holds; the hero walks on with their exact voice; the span is spoken.
const opened = await openNextVolume(one, { years: 3 });
const two = opened.campaign;
{
  assert.equal(opened.span, 'Three winters pass.');
  assert.notEqual(two.id, one.id, 'a new spine, not a rewrite');
  assert.match(two.title, /Volume II/, 'the volume wears its number');
  assert.equal(two.saga.worldTitle, 'The Ashen Vale');
  assert.equal(two.saga.taleIndex, 1);
  assert.equal(two.saga.id, one.id, 'the saga remembers where it began');
  assert.equal(two.saga.legacy?.kind, 'legacy', 'the consumed packet rides the schema');
  assert.equal(two.completed, false);
  assert.equal(two.hero.voiceId, 'voice-hero-9', 'the hero\u2019s exact voice crosses');
  const mira = two.codex.cast.find((s) => s.name === 'Mira');
  assert.equal(mira.voiceId, 'voice-mira-11', 'legacy voiceIds are byte-equal');
  assert.equal(mira.legacy, true, 'legacy souls arrive marked');
  assert.equal(mira.visual, one.codex.cast[0].visual, 'locked canon survives the crossing');
  assert.equal(mira.voice, one.codex.cast[0].voice);
  assert.equal(two.codex.cast.find((s) => s.name === 'Edda').status, 'dead', 'the dead arrive dead');
  assert.equal(two.codex.blight, 2, 'the blight is inherited, not reset');
}

// 3. THE INTERLUDE IS RECORD — client ticks, sealed like any other row,
//    marked as the gap, never the model's to write.
{
  assert.equal(two.logs.length, 3, 'three winters, three batches');
  for (const entry of two.logs) {
    assert.equal(entry.kind, 'tick');
    assert.ok(entry.interlude, 'interlude rows wear the mark');
    assert.ok(entry.recordHash, 'each batch took the wax');
  }
  const journal = await campaignJournal(two.id);
  const ticks = journal.filter((r) => r.type === 'tick');
  assert.equal(ticks.length, 3, 'the gap is on the chain');
  assert.ok(ticks.every((r) => r.payload?.interlude), 'sealed as interlude, honestly');
}

// 4. THE VALIDATOR'S SNAPSHOT READS LEGACY — a dead soul of volume one,
//    offered as a speaker in volume two, is refused by name.
{
  const validation = validateDmTurn({ narration_blocks: [{ speaker: 'Edda', text: 'I still have notes.' }] }, [], { cast: two.codex.cast });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((e) => /the dead do not speak/.test(e) && /Edda/.test(e)), 'the grave holds: Edda cannot be given dialogue');
}

// 5. THE SAME PACKET OPENS THE SAME WORLD — determinism in (codex, span);
//    only the new spine's name differs.
{
  const again = await openNextVolume(one, { years: 3 });
  const stripe = (c) => JSON.stringify({ codex: c.codex, saga: { ...c.saga }, stories: c.logs.map((l) => l.dm?.story) });
  assert.equal(stripe(again.campaign), stripe(two), 'the crossing is deterministic');
}

// 6. ELDER MERCY — a tale sealed before this law has no legacy row; the
//    packet is rebuilt from the same codex and the volume still opens.
{
  const elder = firstVolume('saga-elder');
  await db.campaigns.put(elder);
  const openedElder = await openNextVolume(elder, { years: 1 });
  assert.equal(openedElder.span, 'A winter passes.');
  assert.equal(openedElder.campaign.saga.taleIndex, 1);
  assert.equal(openedElder.campaign.codex.cast.find((s) => s.name === 'Mira').voiceId, 'voice-mira-11');
}

// 7. THE WIRING — the wax writes the packet at the press, the table has
//    the door, and the engine's own openNextTale is what turns the key.
{
  const saga = read('src/lib/saga.js');
  assert.ok(saga.includes('openNextTale'), 'the engine turns the key');
  assert.ok(saga.includes("'legacy'"), 'the volume closes as a sealed type');
  const app = read('src/App.jsx');
  assert.ok(app.includes('sealLegacy('), 'the press writes the packet');
  assert.ok(app.includes('openNextVolume('), 'the table opens the next volume');
  assert.ok(read('src/components/Ceremony.jsx').includes('onNextVolume'), 'the ceremony offers the road on');
}

console.log('PASS — the saga gate (game): the wax seals a legacy packet onto the record, Volume II opens in the same world with voiceIds byte-equal and canon untouched, the dead arrive dead and the validator refuses their voices, the interlude is sealed client record deterministic in its span, and an elder tale still crosses by a rebuilt packet.');
