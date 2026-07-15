// ------------------------------------------------------------
// THE SAGA — a world outlives its tales (Saga Law, Directive V).
//
// Sealing a tale no longer ends the world: it writes a LEGACY PACKET —
// every soul with its exact voice, locked canon, bond, and status; the
// regions as written; the blight as it stands. A new tale opens inside
// the same world, consumes the packet, and the years between are bridged
// by interlude ticks (client-generated: the model never writes the gap,
// so the protocol does not move). The dead of volume one do not speak in
// volume three; legacy souls keep their exact legacy voices — the Cast
// Law already promised this, the Saga Law collects on the promise.
// Deterministic in its inputs, keyless, pure.
// ------------------------------------------------------------
import { initCodex } from './story.js';
import { tickUpdates, tickLogEntry } from './livingWorld.js';

const LEGACY_FACTS = 6; // known_facts carried per soul — the sharpest, not the whole ledger

// The packet: everything the next volume must honor, nothing it may rewrite.
export function buildLegacyPacket({ codex, hero = null, worldTitle = '', covenant = '', taleIndex = 0 } = {}) {
  if (!codex) throw new Error('a legacy packet is written from a codex');
  return {
    kind: 'legacy',
    version: 1,
    worldTitle: String(worldTitle || ''),
    covenant: String(covenant || ''),
    taleIndex: Number.isInteger(taleIndex) ? taleIndex : 0,
    blight: codex.blight ?? 0,
    hero: hero ? { name: hero.name, className: hero.className, mark: hero.mark ?? null, voiceId: hero.voiceId ?? null } : null,
    souls: (codex.cast || []).map((soul) => ({
      id: soul.id, name: soul.name, role: soul.role,
      visual: soul.visual, voice: soul.voice,            // locked canon — as first written
      goal: soul.goal ?? '', secret: soul.secret ?? '',
      status: soul.status, bond: soul.bond ?? 0, last_seen: soul.last_seen ?? '',
      known_facts: (soul.known_facts || []).slice(-LEGACY_FACTS),
      introduced_turn: soul.introduced_turn ?? null,
      gender: soul.gender ?? null, age_band: soul.age_band ?? null, timbre: soul.timbre ?? null,
      voiceId: soul.voiceId ?? null                       // the exact cast voice — byte-stable
    })),
    regions: (codex.regions || []).map((region) => ({ ...region })),
    worldFacts: (codex.memoir || []).slice(-8)
  };
}

// Open the next volume: a fresh spine in the same world. Legacy souls are
// grafted with canon locked and `legacy: true`; the dead arrive dead, so
// the validator's cast snapshot refuses their voices before a word is said.
export function openNextTale({ packet, spineId = 'classic-epic', seed = {} } = {}) {
  if (!packet || packet.kind !== 'legacy') throw new Error('a new volume opens only from a legacy packet');
  const codex = initCodex(spineId, seed);
  codex.blight = packet.blight ?? 0;
  codex.cast = packet.souls.map((soul) => ({ ...soul, legacy: true, bond_arc: [], known_facts: [...(soul.known_facts || [])] }));
  codex.regions = packet.regions.map((region) => ({ ...region }));
  codex.memoir = [...(packet.worldFacts || [])];
  codex.notes.push(`Volume ${packet.taleIndex + 2} opens in ${packet.worldTitle || 'the same world'} — the legacy holds.`);
  return {
    codex,
    saga: { worldTitle: packet.worldTitle, covenant: packet.covenant, taleIndex: packet.taleIndex + 1 }
  };
}

// The gap between volumes, as record: bounded tick batches at deterministic
// synthetic turns. Ops only — fact_add and last_seen — nothing here may
// kill, bond, or spend. The same packet bridges the same way every time.
const INTERLUDE_BATCH_CAP = 3;
export function interludeTicks(codex, { years = 1, taleIndex = 0 } = {}) {
  const batches = Math.max(1, Math.min(INTERLUDE_BATCH_CAP, Math.floor(years)));
  const entries = [];
  for (let step = 0; step < batches; step += 1) {
    const turn = 1_000_000 * (taleIndex + 1) + step; // synthetic, collision-free, deterministic
    const updates = tickUpdates(codex, turn);
    if (updates) entries.push({ ...tickLogEntry(updates, turn, 0), interlude: true });
  }
  return entries;
}

// The span, spoken for the table — "Three winters pass."
const SMALL = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export function spanLine(years = 1) {
  const n = Math.max(1, Math.floor(years));
  const word = SMALL[n - 1] || String(n);
  return n === 1 ? 'A winter passes.' : `${word} winters pass.`;
}
