// THE ERA DOOR'S ONE WRITE (Directive XII §IV.5) — a legacy tale landing
// WRITABLE gets its old-lane figure sealed ONCE as a real purse movement,
// cited to the turns that earned it. From then on the tale is purse-law
// whole. Read-only, restored, completed, and unplayed tales are never
// written: their figures derive at read time through the same era door.
// An unplayed tale meets the purse law at its genesis pour instead —
// writing a stake here would double the forge's floor.
import { db, saveCampaign } from './db.js';
import { appendEvent } from './seal.js';
import { redirectSpine } from './vault.js';
import { oneCoinFigure } from './ledger.js';
import { applyStoryUpdates } from 'fatescript/story';

export async function reconcileLegacyPurse(campaign) {
  try {
    if (!campaign?.id || campaign.readOnly || campaign.completed || campaign.sealedAt) return campaign;
    const snapshotLogs = Array.isArray(campaign.logs) ? campaign.logs : [];
    if (!snapshotLogs.some((row) => row && !row.redacted && row.kind !== 'tick' && row.kind !== 'span')) return campaign;
    const id = redirectSpine(campaign.id);
    const keyRow = await db.keys.get(id).catch(() => null);
    if (keyRow?.restoredFromVault) return campaign; // restored spines continue hash-only and unwritten

    // THE FRESH READ: eligibility is judged on the row as PERSISTED NOW,
    // never only the caller's snapshot — two landings racing through this
    // door must meet one truth, not two copies of it. A tale the shelf has
    // never held (the harness's in-memory forgeries) is judged as passed.
    const fresh = (await db.campaigns.get(id).catch(() => null)) || campaign;
    if (fresh.readOnly || fresh.completed || fresh.sealedAt) return campaign;
    const logs = Array.isArray(fresh.logs) ? fresh.logs : [];
    if (logs.some((row) => row && row.kind === 'reconciliation')) return fresh; // the door already opened once — hand back the sealed truth
    const figure = oneCoinFigure(fresh);
    if (figure.era !== 'legacy' || !(figure.coin > 0)) return campaign; // zero moves nothing — the tale stays read-derived
    const heroName = fresh.hero?.name || 'hero';
    const turn = fresh.turnNumber || 0;
    const movement = {
      holder: heroName, delta: figure.coin,
      reason: 'reconciled from the old ledger lane \u2014 stake and gold_delta rows, folded once'
    };
    const citations = figure.entries.map((entry) => entry.turn);
    // Seal FIRST, save once after — a failed seal leaves no unsealed row
    // behind, and the tale simply derives at read time until the next landing.
    // ONCE is enforced inside the seal's own transaction: a second hand at
    // this door meets the journal's standing record and takes no ink.
    const record = await appendEvent(id, 'reconciliation', {
      purse: [movement], citations, derivation: 'opening stake + gold_delta lane (Directive XII \u00a7IV.5)'
    }, { once: true });
    if (!record) return (await db.campaigns.get(id).catch(() => null)) || campaign; // another hand sealed mid-flight — the sealed row is the truth
    const row = {
      id: `reconciliation:${id}`, kind: 'reconciliation', turn, ts: Date.now(),
      redacted: false, recordHash: record.recordHash, citations,
      dm: { story: { purse: [movement] } }
    };
    const codex = applyStoryUpdates(fresh.codex, { purse: [movement] }, {});
    const next = {
      ...fresh, id, logs: [...logs, row], codex,
      headHash: record.recordHash, turnCount: (fresh.turnCount || 0) + 1,
      signatureStatus: record.signature ? 'signed' : 'hash-only'
    };
    await saveCampaign(next);
    return next;
  } catch (error) {
    console.error('The reconciliation held its hand:', error);
    return campaign; // the era door still derives at read time — never a wedge
  }
}
