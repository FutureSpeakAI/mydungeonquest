// ------------------------------------------------------------
// THE SAGA at the table — a world outlives its tale (Directive V).
//
// The engine owns the law (fatescript/saga): the packet, the crossing,
// the interlude. This file owns the house's wiring: the wax writes the
// packet onto the record (seal type 'legacy'); openNextVolume consumes
// the sealed packet — rebuilt for elder tales sealed before this law —
// and forges Volume II inside the same world, bridging the stated span
// as client-sealed tick rows. The model never writes the gap, so the
// protocol does not move.
//
// Sealing rides an injected `seal(campaignId, type, payload)` (the
// App passes its chained sealer so vault whispers and fork redirects
// hold); the default below is the same envelope, hash-only, with every
// crypto step OUTSIDE the Dexie transaction (the premature-commit law).
// ------------------------------------------------------------
import { buildLegacyPacket, openNextTale, interludeTicks, spanLine, sagaManifestOf } from 'fatescript/saga';
import { mockStorySmith, sealSpineMint } from 'fatescript/storySmith';
import { applyStoryUpdates, romanNumeral } from 'fatescript/story';
import { db, saveCampaign, campaignJournal } from './db.js';
import { makeEnvelope } from './seal.js';

// A small deterministic seed for the volume mint — fnv1a over the saga's
// own words, so the same world forges the same floor spine every time.
const seedOf = (text) => {
  let hash = 0x811c9dc5;
  for (const ch of String(text)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash;
};

async function sealRecord(campaignId, type, payload) {
  const campaign = await db.campaigns.get(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  const i = campaign.turnCount || 0;
  const record = await makeEnvelope({ type, i, prevHash: campaign.headHash || null, payload, signer: null });
  await db.transaction('rw', db.campaigns, db.journal, async () => {
    await db.journal.put({ campaignId, ...record });
    await db.campaigns.update(campaignId, { headHash: record.recordHash, turnCount: i + 1, signatureStatus: campaign.signatureStatus === 'signed' ? 'signed' : 'hash-only', updatedAt: Date.now() });
  });
  return record;
}

// The packet as the wax would write it — deterministic in the campaign.
export function legacyPacketOf(campaign) {
  return buildLegacyPacket({
    codex: campaign.codex,
    hero: campaign.hero || null,
    worldTitle: campaign.saga?.worldTitle || campaign.title,
    covenant: campaign.saga?.covenant || campaign.covenant || '',
    taleIndex: campaign.saga?.taleIndex ?? 0,
  });
}

// The volume closes ONTO THE RECORD: one 'legacy' row, everything the
// next tale must honor and nothing it may rewrite.
export async function sealLegacy(campaign, { seal = sealRecord } = {}) {
  const packet = legacyPacketOf(campaign);
  await seal(campaign.id, 'legacy', packet);
  return packet;
}

// The story smith's carryover contract (Directive XIX, Article II): the
// next volume is forged from what the last one left unpaid. Derived from
// the SEALED packet when one stands — the record outranks working memory.
export async function volumeCarryover(campaign) {
  const journal = await campaignJournal(campaign.id).catch(() => []);
  const sealedPacket = [...journal].reverse().find((row) => row.type === 'legacy')?.payload || null;
  const packet = sealedPacket || legacyPacketOf(campaign);
  return {
    openThreads: packet.openThreads || [],
    openAmbitions: packet.openAmbitions || [],
    standings: packet.standings || []
  };
}

// Open the next volume at the table: the world door is skipped, the
// sealed packet is consumed (rebuilt for elder tales — mercy, not a
// loophole: the same codex writes the same packet), legacy souls arrive
// with exact voices and locked canon, the dead arrive dead, and the
// stated span is bridged as sealed client record before the first word.
// Task 64: every volume seats ONE minted spine (bespoke when a courted
// parcel rides in, the shelf's floor otherwise — fail-closed, the shelf
// mint cannot fail), and the volume's FIRST sealed word is its genesis —
// the citation of its elder's head seal, with the manifest so far.
export async function openNextVolume(campaign, { years = 3, spineId = null, seal = sealRecord, bespoke = null } = {}) {
  if (!campaign?.sealedAt) throw new Error('only a sealed tale hands on its legacy — the wax comes first');
  const journal = await campaignJournal(campaign.id).catch(() => []);
  const sealedPacket = [...journal].reverse().find((row) => row.type === 'legacy')?.payload || null;
  const packet = sealedPacket || legacyPacketOf(campaign);
  const spine = spineId || campaign.spineId || 'classic-epic';
  // THE VOLUME MINT (Directive XIX, Article I) — once per volume, attested.
  const carryover = {
    openThreads: packet.openThreads || [],
    openAmbitions: packet.openAmbitions || [],
    standings: packet.standings || []
  };
  const mintSeed = Number(bespoke?.seed) || seedOf(`${packet.worldTitle || campaign.title}:volume:${packet.taleIndex + 2}`);
  const shelfMint = () => {
    const floorPool = mockStorySmith({ covenant: campaign.covenant || '', tone: campaign.tone || '', carryover, seed: mintSeed });
    return sealSpineMint(null, { spine: { id: spine }, rumors: floorPool.rumors, source: 'shelf', seed: mintSeed });
  };
  let minted = bespoke && bespoke.spine
    ? sealSpineMint(null, { spine: bespoke.spine, rumors: bespoke.rumors, source: bespoke.provider === 'anthropic' ? 'smith' : 'mock', seed: mintSeed, provider: bespoke.provider || null, model: bespoke.model || null })
    : shelfMint();
  if (!minted.ok) minted = shelfMint();
  const spineMint = minted.ok ? minted.mint : null;
  // THE POSSESSIONS CUT: the hero walks on carrying the forge keepsake, so
  // the next volume's codex seeds the same trove row the journal will
  // replay — working memory and record agree at the first word of every
  // volume, not only the first. (A v2 packet's trove outranks the seed —
  // the record's rows seat whole.)
  const { codex: opened, saga } = openNextTale({ packet, spineId: spineMint ? spineMint.spine : spine, seed: campaign.hero?.keepsake ? { keepsake: { name: campaign.hero.keepsake, holder: campaign.hero.name } } : {} });

  // THE MANIFEST GROWS BY ONE — the sealed elder joins the bound volumes.
  const priorEntry = { index: campaign.saga?.taleIndex ?? 0, title: campaign.title, headHash: campaign.headHash };
  const nextVolumes = [...(campaign.saga?.volumes || []), priorEntry];

  const next = {
    id: crypto.randomUUID(),
    title: `${saga.worldTitle || campaign.title} — Volume ${romanNumeral(saga.taleIndex + 1)}`,
    covenant: campaign.covenant, tone: campaign.tone, lines: campaign.lines, veils: campaign.veils,
    styleBible: campaign.styleBible, homeRegion: campaign.homeRegion,
    spineId: spineMint ? spineMint.spine.id : spine, spineMint,
    hero: campaign.hero ? { ...campaign.hero } : null, // the hero walks on — exact voice kept (Cast Law)
    codex: opened, logs: [], combat: null, pendingRoll: null,
    turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending',
    completed: false, readOnly: false, keyArtHash: null, heroBustHash: null,
    mediaTier: campaign.mediaTier === 'cinema' ? 'illuminated' : campaign.mediaTier,
    spend: { images: 0, music: 0 },
    saga: { id: campaign.saga?.id || campaign.id, worldTitle: saga.worldTitle, covenant: saga.covenant ?? (campaign.covenant || ''), taleIndex: saga.taleIndex, legacy: packet, volumes: nextVolumes },
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await saveCampaign(next);

  // THE GENESIS CITATION (Directive XIX, Article II) — the volume's first
  // sealed word cites its elder's head seal and carries the manifest so
  // far, so the desk can walk the whole saga the way it walks a chain.
  await seal(next.id, 'genesis', {
    kind: 'genesis', version: 1,
    saga: { id: next.saga.id, worldTitle: next.saga.worldTitle, covenant: next.saga.covenant, taleIndex: saga.taleIndex },
    priorVolume: { campaignId: campaign.id, ...priorEntry },
    manifest: sagaManifestOf({ worldTitle: saga.worldTitle || campaign.title, covenant: saga.covenant ?? (campaign.covenant || ''), volumes: nextVolumes })
  });

  // THE INTERLUDE — the years between, as record: bounded batches at
  // synthetic turns, ops only, sealed like any other row. Client ticks;
  // the model never writes the gap.
  let codex = next.codex;
  const logs = [];
  for (const entry of interludeTicks(codex, { years, taleIndex: packet.taleIndex })) {
    codex = applyStoryUpdates(codex, entry.dm.story, { turn: entry.turn });
    const record = await seal(next.id, 'tick', { story: entry.dm.story, storyAfter: codex, interlude: true, turn: entry.turn });
    logs.push({ ...entry, recordHash: record.recordHash });
  }
  const settled = await db.campaigns.get(next.id);
  const volume = { ...next, codex, logs, headHash: settled.headHash, turnCount: settled.turnCount, signatureStatus: settled.signatureStatus, updatedAt: Date.now() };
  await saveCampaign(volume);
  return { campaign: volume, span: spanLine(years) };
}
