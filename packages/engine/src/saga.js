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
// Version 2 (Task 64, the Saga Law): the carryover is a PURE FOLD — the
// trove and purses as written, the open threads whole, and the contract
// seats for the standings, the open clocks, and the open ambitions (empty
// until their laws land; the packet's shape will not move again for them).
// Rows ride WHOLE — spread verbatim, never rebuilt field by field.
export function buildLegacyPacket({ codex, hero = null, worldTitle = '', covenant = '', taleIndex = 0 } = {}) {
  if (!codex) throw new Error('a legacy packet is written from a codex');
  return {
    kind: 'legacy',
    version: 2,
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
      voiceId: soul.voiceId ?? null,                      // the exact cast voice — byte-stable
      memorial: soul.memorial ?? false                    // a memorial keeps its stone across volumes (Task 64)
    })),
    regions: (codex.regions || []).map((region) => ({ ...region })),
    worldFacts: (codex.memoir || []).slice(-8),
    trove: (codex.trove || []).map((row) => ({ ...row })),
    purses: (codex.purses || []).map((row) => ({ ...row })),
    openThreads: (codex.threads || []).filter((thread) => thread && thread.status === 'open').map((row) => ({ ...row })),
    standings: (codex.standings || []).map((row) => ({ ...row })),
    openClocks: (codex.clocks || []).filter((clock) => clock && clock.status === 'open').map((row) => ({ ...row })),
    openAmbitions: (codex.ambitions || []).filter((ambition) => ambition && ambition.status === 'open').map((row) => ({ ...row }))
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
  // THE CARRYOVER FOLD (v2, additive — a v1 packet owes none of this):
  // the record's rows are the truth when they rode the packet; they seat
  // whole. Carried threads are annotated — origin kept, nothing rewritten.
  if (Array.isArray(packet.trove) && packet.trove.length) codex.trove = packet.trove.map((row) => ({ ...row }));
  if (Array.isArray(packet.purses) && packet.purses.length) codex.purses = packet.purses.map((row) => ({ ...row }));
  if (Array.isArray(packet.openThreads) && packet.openThreads.length) {
    codex.threads = packet.openThreads.map((row) => ({ ...row, carried: row.carried || { fromVolume: packet.taleIndex + 1 } }));
  }
  if (Array.isArray(packet.standings) && packet.standings.length) codex.standings = packet.standings.map((row) => ({ ...row }));
  if (Array.isArray(packet.openClocks) && packet.openClocks.length) codex.clocks = packet.openClocks.map((row) => ({ ...row }));
  if (Array.isArray(packet.openAmbitions) && packet.openAmbitions.length) codex.ambitions = packet.openAmbitions.map((row) => ({ ...row }));
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

// ------------------------------------------------------------
// THE SAGA MANIFEST (Task 64, Article II) — volumes bound in order.
// The manifest is a pure shape: {kind:'saga', version, worldTitle,
// covenant, volumes:[{index,title,headHash}]}. The court below is the
// one seat both the table and the desk read; refusals speak by name.
// Indexes run ascending and contiguous from the FIRST bound volume —
// an elder saga whose earliest volumes predate this law may bind from
// where its knowledge starts, but it may not skip or shuffle.
// ------------------------------------------------------------
export const SAGA_MANIFEST_VERSION = 1;
const MANIFEST_KEYS = ['kind', 'version', 'worldTitle', 'covenant', 'volumes'];
const VOLUME_KEYS = ['index', 'title', 'headHash'];
const HEAD_HASH_RE = /^[0-9a-f]{64}$/;

export function sagaManifestOf({ worldTitle = '', covenant = '', volumes = [] } = {}) {
  return {
    kind: 'saga',
    version: SAGA_MANIFEST_VERSION,
    worldTitle: String(worldTitle || ''),
    covenant: String(covenant || ''),
    volumes: (Array.isArray(volumes) ? volumes : []).map((volume) => ({
      index: volume.index, title: volume.title, headHash: volume.headHash
    }))
  };
}

export function validateSagaManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['a saga manifest must be an object'] };
  }
  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.includes(key)) errors.push(`the manifest carries a stranger key: ${key}`);
  }
  if (manifest.kind !== 'saga') errors.push(`the manifest's kind must be 'saga'`);
  if (!Number.isInteger(manifest.version) || manifest.version < 1) errors.push('the manifest version must be a positive integer');
  if (typeof manifest.worldTitle !== 'string' || !manifest.worldTitle.trim() || manifest.worldTitle.length > 160) {
    errors.push('the manifest names its world in 1–160 characters');
  }
  if (typeof manifest.covenant !== 'string' || manifest.covenant.length > 2000) {
    errors.push('the manifest carries its covenant as a string of at most 2000 characters');
  }
  if (!Array.isArray(manifest.volumes) || manifest.volumes.length === 0) {
    errors.push('a manifest binds at least one volume');
    return { ok: false, errors };
  }
  const base = manifest.volumes[0]?.index;
  manifest.volumes.forEach((volume, seat) => {
    const name = `volume ${seat + 1}`;
    if (!volume || typeof volume !== 'object' || Array.isArray(volume)) { errors.push(`${name} is not a volume entry`); return; }
    for (const key of Object.keys(volume)) {
      if (!VOLUME_KEYS.includes(key)) errors.push(`${name} carries a stranger key: ${key}`);
    }
    if (!Number.isInteger(volume.index) || volume.index < 0) errors.push(`${name} carries no lawful index`);
    else if (Number.isInteger(base) && volume.index !== base + seat) errors.push(`${name} is out of order — index ${volume.index} where ${base + seat} belongs`);
    if (typeof volume.title !== 'string' || !volume.title.trim() || volume.title.length > 200) errors.push(`${name} names its title in 1–200 characters`);
    if (typeof volume.headHash !== 'string' || !HEAD_HASH_RE.test(volume.headHash)) errors.push(`${name} carries no lawful head seal`);
  });
  return { ok: errors.length === 0, errors };
}

// ------------------------------------------------------------
// THE HEIR LAW (Task 64, Article III) — the succession fold, pure.
// The world's record continues untouched: regions, blight, memoir,
// trove, and purses do not move. The fallen seat in the cast as a
// memorial row (dead for a fall, missing for a retirement — and the
// cast law already makes dead permanent); every open thread becomes
// the heir's INHERITED WEATHER, annotated and cited to the fall —
// the FIRST citation stands forever, append-only in spirit. The Book
// notes the chapter break through the standing notes lane.
// ------------------------------------------------------------
const SUCCESSION_REASONS = ['fell', 'retired'];

export function foldSuccession(codex, { fallen, heir, turn = 0, reason = 'fell' } = {}) {
  if (!codex) throw new Error('a succession folds over a codex');
  const fallenName = typeof fallen?.name === 'string' ? fallen.name.trim() : '';
  const heirName = typeof heir?.name === 'string' ? heir.name.trim() : '';
  if (!fallenName || !heirName) throw new Error('a succession names the fallen and the heir');
  if (!SUCCESSION_REASONS.includes(reason)) throw new Error(`a succession's reason is 'fell' or 'retired'`);
  const at = Number.isInteger(turn) && turn >= 0 ? turn : 0;
  const next = structuredClone(codex);

  const verb = reason === 'retired' ? 'Retired' : 'Fell';
  const memorialFact = `${verb} on turn ${at}; ${heirName} rose as heir.`;
  const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  next.cast = next.cast || [];
  const seated = next.cast.find((soul) => sameName(soul.name, fallenName));
  if (seated) {
    // A belt for odd tales where the name already sits at the table: the
    // memorial marks the standing row; dead stays dead (the cast law's own
    // permanence), a retirement leaves the record as the tale last wrote it.
    if (reason === 'fell') seated.status = 'dead';
    seated.known_facts = [...(seated.known_facts || []), memorialFact].slice(-10);
    seated.memorial = true;
  } else {
    next.cast.push({
      id: `fallen-${fallenName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hero'}`,
      name: fallenName,
      role: 'hero of this tale',
      visual: `The ${fallen.className || 'hero'} who carried this tale's covenant until turn ${at}.`,
      voice: '', goal: '', secret: '',
      status: reason === 'retired' ? 'missing' : 'dead',
      bond: 4,
      last_seen: reason === 'retired' ? 'The road home' : 'Where the road ended',
      known_facts: [memorialFact],
      bond_arc: [],
      introduced_turn: at,
      memorial: true,
      gender: null, age_band: null, timbre: null,
      voiceId: fallen.voiceId ?? null
    });
  }

  next.threads = (next.threads || []).map((thread) => {
    if (!thread || thread.status !== 'open') return thread;
    if (thread.inherited) return thread; // the origin citation never rewrites
    return { ...thread, inherited: { from: fallenName, turn: at, reason } };
  });

  next.notes = next.notes || [];
  next.notes.push(reason === 'retired'
    ? `${fallenName} lays down the road on turn ${at}; ${heirName} rises as heir — the world holds, and the debts stand.`
    : `${fallenName} falls on turn ${at}; ${heirName} rises as heir — the world holds, and the debts stand.`);
  return next;
}
