// THE TERMINAL ANSWER (Task 54 Move One) — the harvest polls the SEALED
// RECORD, never the shelf. Every paint ask ends in exactly one of THREE
// lawful terminals, all written as media attestations in the journal:
//
//   FULFILLED — an attestation whose warden passed, stood floor, or is
//               absent; the shelf holds bytes under the attested hash.
//   REFUSED   — warden.warden === 'refused', sealed under the dropped
//               bytes' hash. No media row exists, BY LAW — the refused
//               bytes are hashed and dropped.
//   ANCHORED  — warden.warden === 'fallback' (iteration 54.2's lesson):
//               the likeness would not hold twice and the blessed anchor
//               stood in. The attestation names the ask, but NO row is
//               minted for it — the anchor's own row already holds those
//               bytes under its own name. For a need that requires a
//               DISTINCT plate, anchored is terminal NON-delivery.
//
// Task 53 closed red because the old wait read the SHELF and mistook a
// lawful refusal's silence for eternal pending. The record already spoke;
// the harvest just could not read. This module is the reading lesson —
// never a marker row, never synthetic media: the record itself speaks.

export interface AttestationPointer { i: number; recordHash: string | null }

export interface PaintResolution {
  terminal: 'fulfilled' | 'refused' | 'anchored';
  cacheKey: string | null;
  label: string | null;
  variant: string | null;
  subtype: string | null;
  assetHash: string | null;
  originTurnHash: string | null;
  warden: any;
  attestation: AttestationPointer;
  /** fulfilled is only DELIVERED when the shelf holds the attested bytes. */
  bytesOnShelf: boolean;
}

/** Classifies raw journal rows (record.json shape — payload carried on the
 * row) into paint resolutions. Non-paint rows and non-attestations are
 * ignored. The shelf set holds the assetHashes that exist as media rows
 * WITH bytes; refusals never appear there, by law. */
export function classifyAttestations(journalRows: any[], shelf: Set<string>): PaintResolution[] {
  const out: PaintResolution[] = [];
  for (const row of journalRows || []) {
    if (row?.type !== 'media_attestation') continue;
    const payload = row.payload;
    if (!payload || payload.kind !== 'paint') continue;
    const refused = payload.warden?.warden === 'refused';
    const anchored = payload.warden?.warden === 'fallback';
    out.push({
      terminal: refused ? 'refused' : anchored ? 'anchored' : 'fulfilled',
      cacheKey: payload.cacheKey ?? null,
      label: payload.label ?? null,
      variant: payload.variant ?? null,
      subtype: payload.subtype ?? null,
      assetHash: payload.assetHash ?? null,
      originTurnHash: payload.originTurnHash ?? null,
      warden: payload.warden ?? null,
      attestation: { i: row.i, recordHash: row.recordHash ?? null },
      bytesOnShelf: !!payload.assetHash && shelf.has(payload.assetHash),
    });
  }
  return out;
}

export interface HarvestNeed {
  what: string;
  /** How many FULFILLED-with-bytes resolutions satisfy this need (default 1). */
  min?: number;
  matches(resolution: PaintResolution): boolean;
}

const describeResolution = (r: PaintResolution) =>
  `${r.terminal}${r.bytesOnShelf ? '+bytes' : ''} ${r.subtype || '?'} label=${r.label ?? '—'} variant=${r.variant ?? '—'} cacheKey=${r.cacheKey ?? '—'} (attestation #${r.attestation.i})`;

/** Polls the sealed record until every need is FULFILLED with bytes on the
 * shelf. A REFUSED resolution matching any need fails IMMEDIATELY and
 * loudly — a refusal of a required plate is a game defect, not a timeout
 * (HARVEST-REFUSED). Only true silence — neither terminal within the
 * measured cap — is HARVEST-STARVED. The read source is injected so the
 * same law can be proven in seconds by the teeth. */
export async function waitForResolutions(
  read: () => Promise<PaintResolution[]>,
  needs: HarvestNeed[],
  options: { capMs: number; pollMs?: number; sleep?: (ms: number) => Promise<void> },
): Promise<PaintResolution[]> {
  const { capMs, pollMs = 5_000 } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((tick) => setTimeout(tick, ms)));
  const deadline = Date.now() + capMs;
  let resolutions: PaintResolution[] = [];
  for (;;) {
    resolutions = await read();
    for (const need of needs) {
      const refusal = resolutions.find((r) => r.terminal === 'refused' && need.matches(r));
      if (refusal) {
        throw new Error(
          `HARVEST-REFUSED — ${need.what}: the sealed record holds a refusal attestation for this required artifact — ${describeResolution(refusal)}`
          + `${refusal.warden?.reason ? `; reason: ${refusal.warden.reason}` : ''}. A refused required plate is a game defect, never a timeout.`,
        );
      }
      // (iteration 54.2's lesson) An anchor-fallback is equally terminal for a
      // distinct-plate need: the foundry mints NO row for the ask (the anchor's
      // own row already holds those bytes under its own name), so waiting on
      // the shelf-for-this-ask is waiting on a thing that lawfully never comes.
      const anchoredHit = resolutions.find((r) => r.terminal === 'anchored' && need.matches(r));
      if (anchoredHit) {
        const drift = Array.isArray(anchoredHit.warden?.drift) && anchoredHit.warden.drift.length
          ? ` Drift: ${anchoredHit.warden.drift.join(' / ')}.` : '';
        throw new Error(
          `HARVEST-ANCHORED — ${need.what}: the ask fell to its blessed anchor (the likeness would not hold twice) and no distinct plate was minted — ${describeResolution(anchoredHit)}.${drift} A required distinct plate that ships its anchor is a game defect, never a timeout.`,
        );
      }
    }
    const unmet = needs.filter((need) =>
      resolutions.filter((r) => r.terminal === 'fulfilled' && r.bytesOnShelf && need.matches(r)).length < (need.min ?? 1));
    if (!unmet.length) return resolutions;
    if (Date.now() >= deadline) {
      throw new Error(
        `HARVEST-STARVED — ${unmet[0].what}: neither fulfillment nor refusal reached the sealed record within the measured cap (${capMs}ms). `
        + `Unmet: ${unmet.map((n) => n.what).join('; ')}. Resolutions seen: ${resolutions.length ? resolutions.map(describeResolution).join(' | ') : 'none'}.`,
      );
    }
    await sleep(pollMs);
  }
}
