// ------------------------------------------------------------
// THE HEARTH — the Hearth Law (Directive V).
//
// The record's home is the house; a device is a chair by the hearth.
// This module is the LAW of syncing, transport-agnostic: an append-only
// vault interface plus a client that ships the local journal up and
// pulls the head down. The chain the Quiet Record already keeps earns
// its supper here as plumbing — the envelope hash is the idempotency
// key, the prev-link is the tamper check. Conflict under append-only is
// only ever a fork, and a fork has one rule: the hearth's head wins,
// and the losing turn returns to its device as an UNSENT DEED — never
// as a lost one. The Floor never needs a vault: keyless play is local,
// as it always was.
// ------------------------------------------------------------

// The reference vault: in-memory, same contract a Postgres/GCS vault
// serves in the house. Evals judge the law against this; production
// swaps the store, never the rules.
export function createMemoryVault() {
  const chains = new Map(); // campaignId → { rows: [], byHash: Map }
  const chainOf = (campaignId) => {
    if (!chains.has(campaignId)) chains.set(campaignId, { rows: [], byHash: new Map() });
    return chains.get(campaignId);
  };
  return {
    head(campaignId) {
      const chain = chainOf(campaignId);
      const last = chain.rows[chain.rows.length - 1] || null;
      return last ? { i: last.i, hash: last.hash } : { i: -1, hash: null };
    },
    append(campaignId, envelope) {
      const chain = chainOf(campaignId);
      if (!envelope || typeof envelope.hash !== 'string') return { ok: false, reason: 'malformed' };
      // Idempotent by content: the same sealed row lands once, answers twice.
      if (chain.byHash.has(envelope.hash)) return { ok: true, deduped: true, head: this.head(campaignId) };
      const head = this.head(campaignId);
      if (envelope.i !== head.i + 1) return { ok: false, reason: 'stale-head', head };
      if ((envelope.prev ?? null) !== head.hash) return { ok: false, reason: 'broken-chain', head };
      chain.rows.push(envelope);
      chain.byHash.set(envelope.hash, envelope.i);
      return { ok: true, head: { i: envelope.i, hash: envelope.hash } };
    },
    pull(campaignId, fromIndex = 0) {
      return chainOf(campaignId).rows.slice(Math.max(0, fromIndex));
    }
  };
}

// The chair by the fire. push() ships one envelope; sync() reconciles a
// whole local journal against the hearth and reports, honestly, what
// merged, what was already known, and what was REFUSED — refused rows
// are the caller's to restore as unsent deeds.
export function createHearthClient({ vault, campaignId }) {
  if (!vault || !campaignId) throw new Error('a chair needs a hearth and a tale');
  return {
    head: () => vault.head(campaignId),
    push: (envelope) => vault.append(campaignId, envelope),
    pull: (fromIndex = 0) => vault.pull(campaignId, fromIndex),
    sync(localRows = []) {
      const merged = []; const known = []; const refused = [];
      for (const row of localRows) {
        const result = vault.append(campaignId, row);
        if (result.ok && result.deduped) known.push(row);
        else if (result.ok) merged.push(row);
        else refused.push({ row, reason: result.reason, head: result.head });
      }
      return { merged, known, refused, head: vault.head(campaignId), rows: vault.pull(campaignId, 0) };
    },
    // Resume on any chair: the hearth's chain IS the tale.
    resume: () => ({ head: vault.head(campaignId), rows: vault.pull(campaignId, 0) })
  };
}
