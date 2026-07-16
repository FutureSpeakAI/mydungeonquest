// ------------------------------------------------------------
// THE HEARTH at the table — the Hearth Law (Directive V, Phase 1).
//
// The record's home is the house; a device is a chair by the hearth.
// The ENGINE owns the law (fatescript/hearth): append-only, idempotent
// by content hash, stale heads and broken links refused, and a fork's
// one rule — the hearth's head wins, and the losing turn returns to
// its device as an UNSENT DEED, never as a lost one.
//
// This file owns the house's chair: the adapter between the Quiet
// Record's envelopes ({type, i, prevHash, payload, ts, recordHash})
// and the hearth's rows ({i, prev, hash, payload}); the tamper court
// that recomputes an envelope's own hash through makeEnvelope before
// anything is offered to the fire (the same canonical-hash law the
// vault's ingest already enforces server-side); and the deed-return —
// a refused 'turn' row gives back the player's exact words.
//
// The Floor never needs a hearth: keyless play is local, as it always
// was. All crypto runs OUTSIDE any Dexie transaction (premature-commit
// law); this module performs no Dexie writes at all.
// ------------------------------------------------------------
import { createHearthClient, createMemoryVault } from 'fatescript/hearth';
import { makeEnvelope } from './seal.js';

// An envelope, seated as a hearth row. The whole envelope rides as the
// row's payload so any chair replays the record byte-true.
export function hearthRow(envelope) {
  return { i: envelope.i, prev: envelope.prevHash ?? null, hash: envelope.recordHash, payload: envelope };
}

// THE TAMPER COURT — the envelope's hash is recomputed from its own
// unsigned fields through the same press that made it. One changed
// byte and the row never reaches the fire. (Signatures are the
// device's affair; the hash law binds signed and hash-only alike.)
export async function attestEnvelope(envelope) {
  if (!envelope || typeof envelope.recordHash !== 'string') return false;
  try {
    const again = await makeEnvelope({ type: envelope.type, i: envelope.i, prevHash: envelope.prevHash ?? null, payload: envelope.payload, ts: envelope.ts, signer: null });
    return again.recordHash === envelope.recordHash;
  } catch {
    return false;
  }
}

// THE DEED RETURN — a refused 'turn' row hands back the player's exact
// words so the winning table can offer them again, unsent. Ops rows
// (ticks, attestations, seals) have no deed; they return null and are
// simply superseded by the hearth's head.
export function unsentDeedOf(refused) {
  const envelope = refused?.row?.payload || refused?.payload || refused || null;
  if (!envelope || envelope.type !== 'turn') return null;
  const words = envelope.payload?.visiblePlayer ?? envelope.payload?.player ?? null;
  return typeof words === 'string' && words.trim() ? words : null;
}

// THE CHAIR — the house's client over the engine's law. Every offering
// passes the tamper court first (crypto outside, always); the engine
// then answers known / merged / refused, and every refusal carries its
// deed home. `vault` is any object honoring the hearth contract — the
// in-memory reference for evals, the house's transport in the app.
export function houseChair({ campaignId, vault = createMemoryVault() }) {
  const chair = createHearthClient({ vault, campaignId });
  return {
    head: () => chair.head(),
    pull: (fromIndex = 0) => chair.pull(fromIndex),
    // One sealed envelope, offered as it lands. Tampered rows are
    // refused at the chair — the fire never sees them.
    async pushSealed(envelope) {
      if (!(await attestEnvelope(envelope))) return { ok: false, reason: 'tampered', deed: unsentDeedOf(envelope) };
      return chair.push(hearthRow(envelope));
    },
    // A whole local journal, reconciled. Reports honestly: what the
    // hearth already knew, what merged, what was refused — and every
    // refused row's deed, so nothing is ever lost, only unsent.
    async syncSealed(envelopes = []) {
      const lawful = [];
      const refused = [];
      for (const envelope of envelopes) {
        if (await attestEnvelope(envelope)) lawful.push(hearthRow(envelope));
        else refused.push({ row: hearthRow(envelope), reason: 'tampered', deed: unsentDeedOf(envelope) });
      }
      const report = chair.sync(lawful);
      const allRefused = [...refused, ...report.refused.map((r) => ({ ...r, deed: unsentDeedOf(r) }))];
      return { known: report.known, merged: report.merged, refused: allRefused, head: report.head, unsentDeeds: allRefused.map((r) => r.deed).filter(Boolean) };
    },
    // Resume on any chair: the hearth's chain IS the tale, byte-true.
    resume() {
      const { head, rows } = chair.resume();
      return { head, envelopes: rows.map((row) => row.payload) };
    },
  };
}
