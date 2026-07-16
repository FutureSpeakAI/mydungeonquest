// ------------------------------------------------------------
// THE ANNALS at the table — the Long Memory Law (Directive V, Phase 3).
//
// Year two must remember year one, and memory is derived from the
// record alone. When an act closes (and when the tale seals), the
// Chronicler composes an ANNAL over that act's sealed turns — the
// engine owns the template and the court (fatescript/memoir): nothing
// invented, nothing contradicted, nothing embellished; quotes verbatim
// or contraband. The game owns the seat: which turns feed the digest,
// how the annal rides the journal (sealed type 'annal', the tick
// pattern), and the LADDER that feeds [MEMORY] — annals newest-first,
// the latest in full, elders compressed to their headline line.
//
// This module is PURE: no Dexie, no crypto. Persistence and sealing
// arrive as injected hands (save, reload, seal) so the table and the
// eval bench sit at the same law. The court's refusal is honest
// silence — a contraband annal is never sealed, and the tale simply
// carries no digest for that act.
// ------------------------------------------------------------
import { composeAnnal, assertAnnalLawful, annalEntry } from 'fatescript/memoir';

// The act's own turns: spoken rows only, redactions out (the redaction
// law outranks memory — a struck turn feeds no digest), annals and
// ticks excluded so memory never digests memory.
export function actSlice(campaign, actNumber) {
  const beats = campaign?.codex?.spine?.beats || [];
  const actOf = (log) => beats[log?.beatIndex ?? 0]?.act || 1;
  return (campaign?.logs || []).filter((log) => !log.redacted && !log.kind && log.dm && actOf(log) === actNumber);
}

// Compose one act's annal and hold it to the court. Returns
// { text, verdict } — callers seal only on verdict.ok. A spine may
// carry a decorative act name the record never spoke; the court would
// rightly call that a smuggled name, but a decoration must not cost
// the whole digest — so a refused named head retries nameless, and
// only a nameless refusal is final.
export function composeActAnnal(campaign, actNumber) {
  const entries = actSlice(campaign, actNumber);
  const actIndex = actNumber - 1;
  const record = { entries, codex: campaign.codex, hero: campaign.hero };
  const attempt = (actName) => {
    const text = composeAnnal({ entries, codex: campaign.codex, hero: campaign.hero, actIndex, actName });
    return { text, verdict: assertAnnalLawful(text, record) };
  };
  const named = campaign?.codex?.spine?.acts?.[actIndex]?.name || '';
  const first = attempt(named);
  if (first.verdict.ok || !named) return first;
  return attempt('');
}

// THE CHRONICLER'S SEAT — an act closed; digest it, court it, seal it.
// The tick pattern exactly: log row first, journal seal, recordHash
// back onto the log. All hands injected; compose is injectable so the
// bench can prove the refusal path (a lying digest is never sealed).
export async function chronicleActClose(campaign, actNumber, { seal, save, reload, compose = composeActAnnal } = {}) {
  if (!campaign || !seal || !save || !reload) throw new Error('the Chronicler needs a tale and three hands');
  const { text, verdict } = compose(campaign, actNumber);
  if (!verdict?.ok || !String(text || '').trim()) return { campaign, annal: null, refused: verdict?.errors || ['empty digest'] };
  const turn = campaign.turnNumber || campaign.logs?.length || 0;
  const beatIndex = campaign.codex?.beatIndex ?? 0;
  const row = annalEntry(text, { turn, actIndex: actNumber - 1, beatIndex });
  let next = { ...campaign, logs: [...(campaign.logs || []), row] };
  await save(next);
  const record = await seal(campaign.id, 'annal', { annal: text, actIndex: actNumber - 1, beatIndex, turn });
  const settled = await reload(campaign.id);
  next = { ...next, headHash: settled.headHash, turnCount: settled.turnCount, signatureStatus: settled.signatureStatus };
  next.logs[next.logs.length - 1] = { ...row, recordHash: record.recordHash };
  await save(next);
  return { campaign: next, annal: text, refused: null };
}

// THE LADDER — what [MEMORY] drinks: annals newest-first, the freshest
// two in full, elders compressed to their headline line (the first
// sentence — an annal's head names its act). The budget governs in
// bytes of the JSON that will ride the prompt; the newest annal is the
// floor and rides even alone. Deterministic in (logs, budget).
export function memoryLadder(campaign, { budget = 1400 } = {}) {
  const annals = (campaign?.logs || []).filter((log) => log.kind === 'annal' && !log.redacted && String(log.annal || '').trim());
  if (!annals.length) return [];
  const newestFirst = [...annals].reverse();
  const headline = (text) => { const t = String(text).trim(); const dot = t.indexOf('. '); return dot > 0 ? t.slice(0, dot + 1) : t; };
  const ladder = [];
  newestFirst.forEach((log, at) => { ladder.push(at < 2 ? String(log.annal).trim() : headline(log.annal)); });
  while (ladder.length > 1 && JSON.stringify(ladder).length > budget) ladder.pop();
  return ladder;
}
