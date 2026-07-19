// THE COMMONS, from the device's side — publishing is a deliberate act on
// a SEALED tale, and the public page is derived by pure law from the same
// bytes the desk verifies.
//
// The pure core (publishable, publishRecordFrom, fellStruck,
// publicPageModel) is eval-judged in evals/publishRules.test.mjs; the
// fetch shell below it is the thin courier the Ceremony and the public
// page share.
//
// THE STRIKE LAW at the commons (Directive XV §III.6): the published
// record keeps the struck bytes — the chain law forbids rewriting
// history — but the PAGE re-derives every strike and a struck scene's
// words appear NOWHERE in the page model. Felling here binds by
// recordHash (each log row carries the hash of its own turn record,
// Task 58C), never by array ordinal — tick rows interleave with turn
// rows in the log, so ordinals lie where hashes cannot. (The vault's
// applyStrikes in lib/vault.js aligns pulled SNAPSHOTS, which is an
// ordinal court over turn-typed records; this one is the page's court.
// Two courts, two alignments, cross-noted in both files.)
import { exportChronicle } from './seal.js';
import { canonicalize } from 'fatescript/canonical';

// ------------------------------------------------------------- pure laws
// Only a sealed tale may enter the commons: the journal itself must carry
// the sealing block — a mutable snapshot flag is nobody's proof.
export function publishable(journal) {
  return Array.isArray(journal) && journal.some((row) => row && row.type === 'sealing');
}

// The publish record IS the export envelope with the blobs lifted out:
// the desk (engine verifyChronicle) judges header + journal only, so the
// stripped record verifies byte-for-byte at the same court the author's
// own export would. Volatile object URLs are scrubbed (they die with the
// session that minted them), and the seen ledger never rides — it lives
// in its own table and no export has ever carried it.
export function publishRecordFrom(chronicle) {
  const media = (Array.isArray(chronicle.media) ? chronicle.media : [])
    .filter((row) => row && row.assetHash)
    .map(({ blob: _blob, ...meta }) => meta);
  const logs = (chronicle.campaign?.logs || []).map(({ imageUrl: _i, videoPosterUrl: _p, videoUrl: _u, ...log }) => log);
  // The four-field envelope, EXPLICITLY — header and journal ride whole
  // (the desk must sit on those bytes), campaign rides whole minus the
  // volatile log URLs, media rides as names. Nothing else ever boards:
  // if a future export grows a fifth field, it must argue its way onto
  // the public record here, by name.
  return { header: chronicle.header, campaign: { ...chronicle.campaign, logs }, journal: chronicle.journal, media };
}

// Fell every struck scene from a log roll, by hash. A row falls when the
// journal's redaction blocks name its turn record OR the snapshot already
// wears the mark (the journal outranks the snapshot; the union never
// resurrects). A felled row keeps its seat and its stamp — and NOTHING
// else: no prose, no art hooks, no dialogue. The struck words must not
// exist in the page model at all.
export function fellStruck(logs, journal) {
  const struck = new Set(
    (Array.isArray(journal) ? journal : [])
      .filter((row) => row && row.type === 'redaction')
      .map((row) => row.payload?.targetRecordHash)
      .filter(Boolean),
  );
  return (Array.isArray(logs) ? logs : []).map((log) => {
    if (!log) return log;
    const felled = log.redacted || (log.recordHash && struck.has(log.recordHash));
    return felled ? { id: log.id, turn: log.turn, recordHash: log.recordHash, redacted: true } : log;
  });
}

// The whole public page, derived by pure law from the published record.
// A revoked page is a refusal and ONLY a refusal — no title, no prose,
// no cast rides out with the tombstone.
export function publicPageModel(record, { revokedAt = null } = {}) {
  if (revokedAt) return { refused: true, reason: 'The author has taken this tale down.' };
  if (!record || typeof record !== 'object' || !record.header) {
    return { refused: true, reason: 'This tale cannot be read.' };
  }
  const journal = Array.isArray(record.journal) ? record.journal : [];
  const logs = fellStruck(record.campaign?.logs || [], journal);
  const campaign = { ...(record.campaign || {}), logs };
  return {
    refused: false,
    title: campaign.title || 'An untitled tale',
    campaign,
    cast: campaign.codex?.cast || [],
    hero: campaign.hero || null,
    mediaIndex: Array.isArray(record.media) ? record.media : [],
    headHash: record.header.headHash || null,
    signatureStatus: record.header.signatureStatus || 'hash-only',
    turnCount: journal.length,
    struckCount: logs.filter((log) => log?.redacted).length,
    episodes: logs
      .filter((log) => log && !log.redacted && log.dm)
      .map((log) => ({ id: log.id, turn: log.turn, recordHash: log.recordHash || null })),
  };
}

// THE DISPLAY-COHERENCE COURT (Directive XV §III.4, amended at the 61.2
// bench): the chain court vouches for the JOURNAL's bytes — but the page
// SHOWS the campaign's display copy. Tooth 17's laundering sitting proved
// the chain court alone stays green when only the display copy is forged,
// so the badge must also answer for the words the reader actually sees:
// every DISPLAYED row (unstruck, with a dm) must cite a journal record by
// its own recordHash and match it canonically — both the teller's words
// (dm) and the player's (sent). A citeless displayed row, a cite the
// journal does not know, or one diverged byte fells the badge whole.
// Meta stays presentation (title/shelf face may move without a reseal —
// the vault's meta-push law); the STORY's words are the chain's or they
// are nothing. Fail-closed: an unreadable record is incoherent.
export function displayCoherence(record) {
  try {
    if (!record || typeof record !== 'object') return { coherent: false, reason: 'this record cannot be read' };
    const journal = Array.isArray(record?.journal) ? record.journal : [];
    const cited = new Map();
    for (const row of journal) {
      if (row && typeof row.recordHash === 'string' && row.payload && typeof row.payload === 'object') {
        cited.set(row.recordHash, row.payload);
      }
    }
    const logs = fellStruck(record?.campaign?.logs || [], journal);
    for (const log of logs) {
      if (!log || log.redacted || !log.dm) continue; // felled rows display nothing — their journal bytes stand lawfully
      if (typeof log.recordHash !== 'string' || !log.recordHash) {
        return { coherent: false, reason: 'a displayed page carries no citation into the chain' };
      }
      const payload = cited.get(log.recordHash);
      if (!payload) {
        return { coherent: false, reason: 'a displayed page cites a record the chain does not hold' };
      }
      if (canonicalize(log.dm) !== canonicalize(payload.dm ?? null)) {
        return { coherent: false, reason: 'a displayed page\u2019s words diverge from the chain\u2019s own' };
      }
      if (canonicalize(log.sent ?? null) !== canonicalize(payload.player ?? null)) {
        return { coherent: false, reason: 'a displayed page\u2019s spoken deed diverges from the chain\u2019s own' };
      }
    }
    return { coherent: true };
  } catch (error) {
    return { coherent: false, reason: `the coherence court could not read the record (${error?.message || 'unreadable'})` };
  }
}

// ------------------------------------------------------------ the courier
export async function publishStatus() {
  try {
    const response = await fetch('/api/publish/status');
    if (!response.ok) return { live: false, patron: false };
    return await response.json();
  } catch { return { live: false, patron: false }; }
}

export async function minePages() {
  const response = await fetch('/api/publish/mine');
  if (!response.ok) return [];
  const { pages = [] } = await response.json();
  return pages;
}

// Publish the sealed tale. The record travels as RAW TEXT and is stored
// verbatim — the reader's desk will sit on these exact bytes.
export async function publishTale(campaignId) {
  const chronicle = await exportChronicle(campaignId);
  if (!publishable(chronicle.journal)) {
    throw new Error('Only a sealed tale may enter the commons — press the wax first.');
  }
  const record = publishRecordFrom(chronicle);
  const response = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(record),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) {
    const standing = new Error(body.error || 'This tale already has a living page.');
    standing.code = 409;
    standing.publishId = body.publishId || null;
    throw standing;
  }
  if (!response.ok) throw new Error(body.error || `The commons refused (${response.status}).`);
  return body; // { publishId, url, listed }
}

export async function revokeTale(publishId) {
  const response = await fetch(`/api/publish/${encodeURIComponent(publishId)}/revoke`, { method: 'POST' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `The commons refused (${response.status}).`);
  return body;
}

export async function setTaleListing(publishId, listed) {
  const response = await fetch(`/api/publish/${encodeURIComponent(publishId)}/listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listed: listed === true }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `The commons refused (${response.status}).`);
  return body;
}

// The public page's whole fetch: meta, then the raw record — and the
// desk's verdict is rendered ON THE PARSED COPY OF THOSE EXACT BYTES in
// the reader's own browser. Every outcome is a spoken status, never a
// silent wedge (the async-door law).
export async function fetchPublicTale(publishId) {
  let meta;
  try {
    const metaResponse = await fetch(`/api/public/tale/${encodeURIComponent(publishId)}`);
    if (metaResponse.status === 410) return { status: 'gone' };
    if (metaResponse.status === 404) return { status: 'missing' };
    if (!metaResponse.ok) return { status: 'error', detail: `the commons answered ${metaResponse.status}` };
    meta = await metaResponse.json();
  } catch (error) {
    return { status: 'error', detail: error.message };
  }
  try {
    const recordResponse = await fetch(`/api/public/tale/${encodeURIComponent(publishId)}/record`);
    if (recordResponse.status === 410) return { status: 'gone' };
    if (!recordResponse.ok) return { status: 'error', detail: `the record door answered ${recordResponse.status}` };
    const raw = await recordResponse.text();
    let record;
    try { record = JSON.parse(raw); }
    catch { return { status: 'error', detail: 'the record is not readable' }; }
    const { verifyChronicle } = await import('fatescript/desk');
    let verdict;
    try { verdict = await verifyChronicle(record); }
    catch (error) { verdict = { ok: false, reason: `the desk stumbled (${error.message})` }; }
    if (verdict?.ok) {
      // The chain holds — now the words the page will SHOW must be the
      // chain's own (the display-coherence court; §III.4 amended).
      const coherence = displayCoherence(record);
      if (!coherence.coherent) verdict = { ok: false, reason: coherence.reason };
    }
    return { status: 'ok', meta, raw, record, verdict };
  } catch (error) {
    return { status: 'error', detail: error.message };
  }
}
