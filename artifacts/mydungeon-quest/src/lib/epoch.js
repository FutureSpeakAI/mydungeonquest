// ------------------------------------------------------------
// THE ELDER MEMORY at the table — Experience Directive XX, Law VII.
//
// When an act closes, the same close that writes the annal distills
// the act into a sealed EPOCH: the illuminated Chronicler when a real
// voice answers and the engine's courts seat it, the deterministic
// keyless floor otherwise — always labeled for what it is. Epochs are
// machinery for the DM's mind (empty dm envelope, the annal pattern):
// never the book, never the podcast, never the feed.
//
// The engine owns every law (fatescript/epoch): the floor template,
// the citation court, the quote court, the ladder assembly, the row
// shape. The game owns the seat: idempotence, the tick pattern through
// the house's one seal door, and which sealed summaries feed the
// ladder (an act without an epoch rides its annal — that too is a
// sealed summary). This module is PURE of Dexie and crypto: all hands
// (seal, save, reload, illuminate) are injected so the table and the
// eval bench sit at the same law.
//
// The whole module rides a LAZY door in App.jsx — act-close machinery
// and the epoch road never weigh on the sync closure (the lean door
// has one kilobyte of headroom; this is how it keeps it).
// ------------------------------------------------------------
import { epochSummary, validateEpochSummary, epochLadder, epochEntry } from 'fatescript/epoch';
import { memoryLadder } from './memoir.js';

export const EPOCH_KIND = 'epoch';

const recordOf = (campaign) => ({ entries: campaign?.logs || [], codex: campaign?.codex, hero: campaign?.hero });

// Compose the keyless floor for one closed act and hold it to its own
// court. Callers seal only on verdict.ok — a floor that cannot cite
// itself seals nothing (honest silence, the annal manner).
export function composeActEpochFloor(campaign, actNumber) {
  const record = recordOf(campaign);
  const text = epochSummary(record, actNumber - 1);
  return { text, verdict: validateEpochSummary(text, record, actNumber - 1) };
}

// THE SEAT — an act closed; distill it, court it, seal it, label it.
// THE SEAL LEADS, THE ROW FOLLOWS (review cure): the journal seal lands
// before any log row is saved, so a seal door that fails leaves the
// working record CLEAN — no unsealed epoch ever feeds [MEMORY], no
// ghost row blocks the lawful reseal. A crash between seal and save
// leaves only an orphan journal row: machinery a re-close reseals,
// and the newest seal wins its rung by ladder law. Idempotent: one
// epoch per act, ever — a retry re-entering the close seals nothing
// twice, and a struck epoch stays struck. The illuminated candidate is
// courted HERE against the table's own record no matter what the
// server claimed — the client's court is the seal law; a second
// refusal falls to the labeled floor.
export async function sealActEpoch(campaign, actNumber, { seal, save, reload, illuminate = null } = {}) {
  if (!campaign || !seal || !save || !reload) throw new Error('the elder memory needs a tale and three hands');
  const actIndex = actNumber - 1;
  const already = (campaign.logs || []).some((log) => log.kind === EPOCH_KIND && log.actIndex === actIndex);
  if (already) return { campaign, epoch: null, label: null, refused: null };
  const record = recordOf(campaign);
  let text = null;
  let label = 'floor';
  if (typeof illuminate === 'function') {
    try {
      const lit = await illuminate({ campaign, actIndex });
      const candidate = String(lit?.summary || '').trim();
      if (candidate && validateEpochSummary(candidate, record, actIndex).ok) { text = candidate; label = 'illuminated'; }
    } catch { /* a dark road to the seat is not a refusal of memory — the floor stands */ }
  }
  if (!text) {
    const floor = composeActEpochFloor(campaign, actNumber);
    if (!floor.verdict?.ok || !String(floor.text || '').trim()) return { campaign, epoch: null, label: null, refused: floor.verdict?.errors || ['empty epoch'] };
    text = floor.text;
    label = 'floor';
  }
  const turn = campaign.turnNumber || campaign.logs?.length || 0;
  const beatIndex = campaign.codex?.beatIndex ?? 0;
  const row = epochEntry(text, { turn, actIndex, beatIndex, label });
  const sealed = await seal(campaign.id, EPOCH_KIND, { epoch: text, label, actIndex, beatIndex, turn });
  const settled = await reload(campaign.id);
  const next = {
    ...campaign,
    headHash: settled.headHash, turnCount: settled.turnCount, signatureStatus: settled.signatureStatus,
    logs: [...(campaign.logs || []), { ...row, recordHash: sealed.recordHash }]
  };
  await save(next);
  return { campaign: next, epoch: text, label, refused: null };
}

// The road to the illuminated seat: the act's spoken rows, trimmed to
// what the charge and the courts read, posted to the house's own door.
// Every disappointment is a null — the caller's floor answers for it.
export async function askIlluminatedEpoch(campaign, actNumber) {
  const actIndex = actNumber - 1;
  const beats = campaign?.codex?.spine?.beats || [];
  const actOf = (log) => beats[log?.beatIndex ?? 0]?.act || 1;
  const entries = (campaign?.logs || [])
    .filter((log) => log && !log.redacted && !log.kind && log.dm && actOf(log) === actNumber)
    .map((log) => ({
      turn: log.turn, beatIndex: log.beatIndex, player: log.player, redacted: false,
      dm: { narration_blocks: log.dm.narration_blocks || [], story: log.dm.story || null, dialogue_cue: log.dm.dialogue_cue || null }
    }));
  if (!entries.length) return null;
  const record = {
    entries,
    codex: { spine: { beats: beats.map((beat) => ({ act: beat?.act || 1 })) }, beatIndex: campaign?.codex?.beatIndex ?? 0 },
    hero: { name: campaign?.hero?.name || '' }
  };
  const response = await fetch('/api/epoch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: campaign.id, actIndex, record }) });
  if (!response.ok) return null;
  const result = await response.json();
  if (result?.declined || !String(result?.summary || '').trim()) return null;
  return { summary: result.summary, provider: result.provider };
}

// THE LADDER, epoch-aware — what [MEMORY] drinks once epoch seals
// stand: the freshest act raw, every earlier act by its sealed summary
// (its epoch when one stands, its annal when only that does), one
// fixed total budget however long the tale grows. A tale with NO epoch
// rows walks today's road byte-identical — this door simply hands the
// question to the standing ladder, so the two can never disagree.
export function memoryEpochLadder(campaign) {
  const logs = campaign?.logs || [];
  const epochs = logs.filter((log) => log.kind === EPOCH_KIND && !log.redacted && String(log.epoch || '').trim());
  if (!epochs.length) return memoryLadder(campaign);
  const sealedByAct = new Map();
  for (const log of logs) {
    if (log.kind === 'annal' && !log.redacted && Number.isInteger(log.actIndex) && String(log.annal || '').trim() && !sealedByAct.has(log.actIndex)) {
      sealedByAct.set(log.actIndex, { actIndex: log.actIndex, text: String(log.annal).trim() });
    }
  }
  // Epochs before elders: an epoch seal outranks the act's annal.
  for (const log of epochs) {
    if (Number.isInteger(log.actIndex)) sealedByAct.set(log.actIndex, { actIndex: log.actIndex, text: String(log.epoch).trim() });
  }
  return epochLadder(recordOf(campaign), [...sealedByAct.values()]);
}
