// ------------------------------------------------------------
// THE RAVENS at the table — the Raven Law (Directive V, Phase 4).
//
// The world moves while the player is away, and on return it accounts
// for itself. The engine owns the arithmetic and the words
// (fatescript/ravens): one tick batch per elapsed day, capped — souls
// walk, they do not sprint — deterministic, ops-only, zero tokens.
// The game owns the seat: absence is measured from the LAST SEALED
// RECORD (never a settings save), each batch seals by the tick
// pattern with its hash on the log row, and the recap is composed
// from the very rows just sealed — every line traces to a sealed op
// by construction. Zero absence is zero noise; a completed or
// read-only tale keeps its rest — the world of a sealed book does
// not move.
//
// PURE like the Chronicler: no Dexie, no crypto. Persistence and
// sealing arrive as injected hands (seal, save, reload).
// ------------------------------------------------------------
import { absenceBatches, absenceDays, composeRecap } from 'fatescript/ravens';
import { applyStoryUpdates } from 'fatescript/story';

export { absenceDays };

// The freshest annal still standing — struck annals tell nothing.
export function latestAnnalOf(logs = []) {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const log = logs[i];
    if (log?.kind === 'annal' && !log.redacted && String(log.annal || '').trim()) return String(log.annal).trim();
  }
  return '';
}

// THE RETURN — called once when a tale is opened. Measures the days,
// walks the world one sealed batch per day, and brings the recap.
// Returns { campaign, recap } — recap is null when there is nothing
// honest to say.
export async function greetReturning(campaign, lastSealTs, { now = Date.now(), seal, save, reload } = {}) {
  if (!campaign || !seal || !save || !reload) throw new Error('the ravens need a tale and three hands');
  if (campaign.completed || campaign.readOnly) return { campaign, recap: null };
  if (absenceDays(lastSealTs, now) < 1) return { campaign, recap: null };

  const batches = absenceBatches({ codex: campaign.codex, lastSealTs, now, startTurn: campaign.turnNumber || 0 });
  if (!batches.length) return { campaign, recap: null };

  let next = campaign;
  const sealedRows = [];
  for (const row of batches) {
    const ticked = applyStoryUpdates(next.codex, row.dm.story, { turn: row.turn });
    next = { ...next, codex: ticked, logs: [...next.logs, row] };
    await save(next);
    const record = await seal(campaign.id, 'tick', { story: row.dm.story, storyAfter: ticked, absence: true, turn: row.turn });
    const settled = await reload(campaign.id);
    next = { ...next, headHash: settled.headHash, turnCount: settled.turnCount, signatureStatus: settled.signatureStatus };
    const sealedRow = { ...row, recordHash: record.recordHash };
    next.logs[next.logs.length - 1] = sealedRow;
    sealedRows.push(sealedRow);
    await save(next);
  }

  const recap = composeRecap({ tickEntries: sealedRows, annal: latestAnnalOf(next.logs) });
  return { campaign: next, recap: recap.lines.length || recap.text ? recap : null };
}
