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
import { buildLegacyPacket, openNextTale, interludeTicks, spanLine } from 'fatescript/saga';
import { applyStoryUpdates, romanNumeral } from 'fatescript/story';
import { db, saveCampaign, campaignJournal } from './db.js';
import { makeEnvelope } from './seal.js';

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

// Open the next volume at the table: the world door is skipped, the
// sealed packet is consumed (rebuilt for elder tales — mercy, not a
// loophole: the same codex writes the same packet), legacy souls arrive
// with exact voices and locked canon, the dead arrive dead, and the
// stated span is bridged as sealed client record before the first word.
export async function openNextVolume(campaign, { years = 3, spineId = null, seal = sealRecord } = {}) {
  if (!campaign?.sealedAt) throw new Error('only a sealed tale hands on its legacy — the wax comes first');
  const journal = await campaignJournal(campaign.id).catch(() => []);
  const sealedPacket = [...journal].reverse().find((row) => row.type === 'legacy')?.payload || null;
  const packet = sealedPacket || legacyPacketOf(campaign);
  const spine = spineId || campaign.spineId || 'classic-epic';
  // THE POSSESSIONS CUT: the hero walks on carrying the forge keepsake, so
  // the next volume's codex seeds the same trove row the journal will
  // replay — working memory and record agree at the first word of every
  // volume, not only the first.
  const { codex: opened, saga } = openNextTale({ packet, spineId: spine, seed: campaign.hero?.keepsake ? { keepsake: { name: campaign.hero.keepsake, holder: campaign.hero.name } } : {} });

  const next = {
    id: crypto.randomUUID(),
    title: `${saga.worldTitle || campaign.title} — Volume ${romanNumeral(saga.taleIndex + 1)}`,
    covenant: campaign.covenant, tone: campaign.tone, lines: campaign.lines, veils: campaign.veils,
    styleBible: campaign.styleBible, homeRegion: campaign.homeRegion, spineId: spine,
    hero: campaign.hero ? { ...campaign.hero } : null, // the hero walks on — exact voice kept (Cast Law)
    codex: opened, logs: [], combat: null, pendingRoll: null,
    turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending',
    completed: false, readOnly: false, keyArtHash: null, heroBustHash: null,
    mediaTier: campaign.mediaTier === 'cinema' ? 'illuminated' : campaign.mediaTier,
    spend: { images: 0, music: 0 },
    saga: { id: campaign.saga?.id || campaign.id, worldTitle: saga.worldTitle, covenant: saga.covenant ?? (campaign.covenant || ''), taleIndex: saga.taleIndex, legacy: packet },
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await saveCampaign(next);

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
