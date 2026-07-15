// THE SAGA GATE — the Saga Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { buildLegacyPacket, openNextTale, interludeTicks, spanLine } from '../src/saga.js';
import { fixtureCodex, HERO } from './fixtures.mjs';

const codex = fixtureCodex();
const args = { codex, hero: HERO, worldTitle: 'The Ashen Vale', covenant: 'No fire may be quenched by command.', taleIndex: 0 };

// The packet carries exact voices and locked canon, and nothing invented.
const packet = buildLegacyPacket(args);
assert.equal(packet.kind, 'legacy');
assert.equal(packet.blight, 2);
const mira = packet.souls.find((soul) => soul.name === 'Mira');
assert.equal(mira.voiceId, 'voice-mira-11');
assert.equal(mira.visual, codex.cast[0].visual);
assert.equal(mira.voice, codex.cast[0].voice);
const edda = packet.souls.find((soul) => soul.name === 'Edda');
assert.equal(edda.status, 'dead');
assert.ok(packet.souls.every((soul) => (soul.known_facts || []).length <= 6), 'the packet carries the sharpest facts, not the whole ledger');
assert.equal(JSON.stringify(packet), JSON.stringify(buildLegacyPacket(args)), 'the same tale seals the same packet');
assert.throws(() => buildLegacyPacket({}), /codex/);

// The next volume opens the same way twice; legacy holds; the dead arrive dead.
const first = openNextTale({ packet, spineId: 'classic-epic' });
const second = openNextTale({ packet, spineId: 'classic-epic' });
assert.equal(JSON.stringify(first), JSON.stringify(second), 'the same packet opens the same world');
assert.equal(first.saga.taleIndex, 1);
assert.equal(first.saga.worldTitle, 'The Ashen Vale');
assert.ok(first.codex.cast.every((soul) => soul.legacy === true), 'legacy souls arrive marked');
assert.equal(first.codex.cast.find((soul) => soul.name === 'Edda').status, 'dead', 'the dead of volume one arrive dead in volume two');
assert.equal(first.codex.cast.find((soul) => soul.name === 'Mira').voiceId, 'voice-mira-11', 'the exact legacy voice crosses the gap');
assert.equal(first.codex.blight, 2, 'the blight is inherited, not reset');
assert.throws(() => openNextTale({ packet: { kind: 'turn' } }), /legacy/);

// The interlude bridges the same way every time — ops only, capped, no villain.
const bridgeA = interludeTicks(first.codex, { years: 3, taleIndex: 0 });
const bridgeB = interludeTicks(first.codex, { years: 3, taleIndex: 0 });
const opsOf = (entries) => JSON.stringify(entries.map((entry) => entry.dm.story));
assert.equal(bridgeA.length, 3);
assert.equal(interludeTicks(first.codex, { years: 9, taleIndex: 0 }).length, 3, 'the interlude is capped — years pass, the record stays bounded');
assert.equal(opsOf(bridgeA), opsOf(bridgeB), 'the same packet bridges the same way');
for (const entry of bridgeA) {
  assert.equal(entry.kind, 'tick');
  assert.ok(entry.interlude, 'interlude rows are marked');
  assert.ok(entry.turn >= 1_000_000, 'synthetic turns collide with nothing');
  const story = entry.dm.story;
  assert.ok(story && Array.isArray(story.cast_update) && !story.cast_add, 'the gap is ops-only');
  for (const op of story.cast_update) {
    assert.ok(op.fact_add && op.fact_add.startsWith('Offscreen \u2014 '), 'facts wear the offscreen mark');
    assert.ok(!('status' in op) && !('bond' in op), 'nothing in the gap may kill or bond');
    assert.notEqual(op.name, 'Brannoc', 'the villain never walks in the interlude — the design clock governs him');
  }
  assert.equal(entry.dm.state_updates, null);
  assert.equal(entry.dm.combat, null);
}

// The span, spoken for the table.
assert.equal(spanLine(1), 'A winter passes.');
assert.equal(spanLine(3), 'Three winters pass.');

console.log('PASS \u2014 the saga gate: the packet carries exact voices and locked canon, the dead arrive dead, the interlude bridges the same way twice, and the world outlives its tale.');
