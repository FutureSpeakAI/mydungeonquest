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
//
// THE MINT LAW (owner's ruling, 2026-07-18; effective 57.5) — in the
// proving harvest ONLY, a required plate whose ladder ends refused or
// anchored may re-lay the FULL ladder with fresh dice, at most THREE
// complete ladders per artifact per iteration (the in-play ladder counts
// as the first, so at most two re-lays). Every attempt is attested in the
// sealed trail exactly as today — the re-lay door drives the app's OWN
// foundry, never a marker row. Ladders are counted from the RECORD ITSELF
// (each completed ladder seals exactly one terminal attestation under the
// seat's cacheKey), so the count is replay-proof and per-iteration by
// construction. Task 54's doctrine stands AMENDED by the same ruling: a
// refused required plate is a game defect only when it survives the mint
// law's ladders or recurs under changed law bytes — under hash-identical
// paint law a single fall is variance ("paint budget, never truth
// budget"). No warden floor, court bar, or paint-law byte moves with it.

export interface AttestationPointer { i: number; recordHash: string | null }

export interface PaintResolution {
  terminal: 'fulfilled' | 'refused' | 'anchored';
  cacheKey: string | null;
  label: string | null;
  variant: string | null;
  subtype: string | null;
  assetHash: string | null;
  originTurnHash: string | null;
  /** The ask's own fingerprints, attested by the foundry since Task 54's
   * Move One enrichment. THE MINT LAW's fidelity proof reads these: a
   * re-laid ask must hash to the very same brief, or the door refuses. */
  promptHash: string | null;
  generationSpecHash: string | null;
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
      promptHash: payload.promptHash ?? null,
      generationSpecHash: payload.generationSpecHash ?? null,
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

/** THE MINT LAW's re-lay door. fire() re-lays ONE full ladder for the
 * fallen seat through the app's own foundry and resolves when the
 * ladder's terminal answer is sealed. It answers `capped` when the image
 * cap would be spent (a capped ask is never a ladder fall), `mismatch`
 * when the rebuilt ask failed the fidelity proof (a re-laid ask must BE
 * the fallen ask), and `infra` when the ladder's own door failed. When no
 * relay is passed, this wait's semantics are exactly the pre-mint-law
 * ones: the first refused or anchored match throws in the same poll. */
export interface MintRelay {
  fire(seat: PaintResolution): Promise<{ fired: boolean; capped?: boolean; mismatch?: string; infra?: string }>;
  /** Complete ladders per artifact per iteration, in-play ladder included. Default 3. */
  maxLadders?: number;
  /** Silence-deadline allowance added per fired ladder — one terminal ask
   * measured ≈132s worst (§2.3 arithmetic); rounded up. The silence bound
   * never shrinks, and never stretches without a real ladder running. */
  allowanceMs?: number;
}

const describeResolution = (r: PaintResolution) =>
  `${r.terminal}${r.bytesOnShelf ? '+bytes' : ''} ${r.subtype || '?'} label=${r.label ?? '—'} variant=${r.variant ?? '—'} cacheKey=${r.cacheKey ?? '—'} (attestation #${r.attestation.i})`;

/** The fall's own class, thrown with the amended doctrine (owner's ruling,
 * 57.5). doorNote names THE MINT LAW's answer when a door stood but would
 * not (or could not) re-lay; without a door the fall stands as sealed. */
function throwTerminal(need: HarvestNeed, seat: PaintResolution, doorNote: string | null = null): never {
  if (seat.terminal === 'anchored') {
    const drift = Array.isArray(seat.warden?.drift) && seat.warden.drift.length
      ? ` Drift: ${seat.warden.drift.join(' / ')}.` : '';
    throw new Error(
      `HARVEST-ANCHORED — ${need.what}: the ask fell to its blessed anchor (the likeness would not hold twice) and no distinct plate was minted — ${describeResolution(seat)}.${drift}${doorNote ? ` ${doorNote}.` : ''} A required distinct plate that ships its anchor is a game defect only when it survives THE MINT LAW's ladders or recurs under changed law bytes (owner's ruling, 57.5)${doorNote ? '' : ' — no re-lay door stands at this wait, so the fall stands as sealed'}, never a timeout.`,
    );
  }
  throw new Error(
    `HARVEST-REFUSED — ${need.what}: the sealed record holds a refusal attestation for this required artifact — ${describeResolution(seat)}`
    + `${seat.warden?.reason ? `; reason: ${seat.warden.reason}` : ''}.${doorNote ? ` ${doorNote}.` : ''} A refused required plate is a game defect only when it survives THE MINT LAW's ladders or recurs under changed law bytes (owner's ruling, 57.5)${doorNote ? '' : ' — no re-lay door stands at this wait, so the fall stands as sealed'}, never a timeout.`,
  );
}

/** Polls the sealed record until every need is FULFILLED with bytes on the
 * shelf. Without a relay door: a REFUSED or ANCHORED resolution matching
 * any need fails IMMEDIATELY and loudly, in the same poll that reads it
 * (HARVEST-REFUSED / HARVEST-ANCHORED). With a relay door (THE MINT LAW):
 * a fallen seat re-lays its full ladder with fresh dice while ladders
 * remain; a seat with any fulfilled ladder is redeemed history (§2.5 — a
 * refused ask lawfully re-asked and fulfilled is history, not a defect);
 * a seat that falls across all its ladders in one sitting is
 * blocker-grade (HARVEST-EXHAUSTED) and the hunt stops for an owner
 * report. Only true silence — no terminal within the measured cap — is
 * HARVEST-STARVED. The read source is injected so the same law can be
 * proven in seconds by the teeth. */
export async function waitForResolutions(
  read: () => Promise<PaintResolution[]>,
  needs: HarvestNeed[],
  options: { capMs: number; pollMs?: number; sleep?: (ms: number) => Promise<void>; relay?: MintRelay | null },
): Promise<PaintResolution[]> {
  const { capMs, pollMs = 5_000, relay = null } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((tick) => setTimeout(tick, ms)));
  const maxLadders = relay?.maxLadders ?? 3;
  const allowanceMs = relay?.allowanceMs ?? 150_000;
  let deadline = Date.now() + capMs;
  let resolutions: PaintResolution[] = [];
  for (;;) {
    resolutions = await read();
    let refired = false;
    for (const need of needs) {
      if (!relay) {
        const refusal = resolutions.find((r) => r.terminal === 'refused' && need.matches(r));
        if (refusal) throwTerminal(need, refusal);
        // (iteration 54.2's lesson) An anchor-fallback is equally terminal for a
        // distinct-plate need: the foundry mints NO row for the ask (the anchor's
        // own row already holds those bytes under its own name), so waiting on
        // the shelf-for-this-ask is waiting on a thing that lawfully never comes.
        const anchoredHit = resolutions.find((r) => r.terminal === 'anchored' && need.matches(r));
        if (anchoredHit) throwTerminal(need, anchoredHit);
        continue;
      }
      // THE MINT LAW path. A need already satisfied ignores its falls
      // entirely (§2.5 — the preflight courts' own doctrine): no ladder is
      // bought for a plate the harvest no longer requires.
      const hits = resolutions.filter((r) => need.matches(r));
      if (hits.filter((r) => r.terminal === 'fulfilled' && r.bytesOnShelf).length >= (need.min ?? 1)) continue;
      const seats = new Map<string, PaintResolution[]>();
      for (const hit of hits) {
        // (57 review, logged edit) The ladder count is only replay-proof
        // when every ladder of ONE artifact lands under ONE key: cacheKey
        // when the seat carries one (keyart, scenes); else the
        // generationSpec hash — the ask's own identity, which the fidelity
        // proof pins across every re-lay; else the promptHash. A terminal
        // attestation with NO identity at all cannot be counted, so it can
        // never ride the relay: it throws at the fall below, fail-closed,
        // exactly as a doorless wait would. (The old per-attestation
        // fallback gave each fall its own group, so the ceiling could
        // never trip for keyless seats — a fail-open hole, now shut.)
        const key = hit.cacheKey ?? hit.generationSpecHash ?? hit.promptHash ?? `#unidentified-${hit.attestation.i}`;
        if (!seats.has(key)) seats.set(key, []);
        seats.get(key)!.push(hit);
      }
      for (const [, ladder] of seats) {
        if (ladder.some((r) => r.terminal === 'fulfilled' && r.bytesOnShelf)) continue; // redeemed seat
        const falls = ladder.filter((r) => r.terminal === 'refused' || r.terminal === 'anchored');
        if (!falls.length) continue; // fulfilled attested, bytes not yet read back — pending, not a fall
        const latest = falls[falls.length - 1];
        if (falls.length >= maxLadders) {
          const trail = falls.map((r, i) => `ladder ${i + 1}: ${describeResolution(r)}${r.warden?.reason ? ` reason: ${r.warden.reason}` : ''}${Array.isArray(r.warden?.drift) && r.warden.drift.length ? ` drift: ${r.warden.drift.join(' / ')}` : ''}`).join(' | ');
          throw new Error(
            `HARVEST-EXHAUSTED — ${need.what}: THE MINT LAW laid ${falls.length} complete ladders for this seat in one sitting and every one fell — ${trail}. One fall under hash-identical law is variance (paint budget, never truth budget); a seat that falls across all ${maxLadders} ladders in one iteration is blocker-grade — the hunt stops for an owner report.`,
          );
        }
        if (!latest.cacheKey && !latest.generationSpecHash && !latest.promptHash) {
          // (57 review, logged edit) No identity, no ladder: a seat the mint
          // law cannot count is a seat it must never re-lay.
          throwTerminal(need, latest, 'THE MINT LAW cannot count ladders for a seat that carries no identity (no cacheKey, no generationSpecHash, no promptHash) — the fall stands');
        }
        // (57 review, logged edit) The door itself is hard-bounded: one
        // ladder's lawful worst is the allowance (§2.3 arithmetic), so a
        // fire that outlives its own allowance is an infrastructure fall —
        // never an open wait that outruns the measured cap. A real timer,
        // deliberately NOT the injectable sleep: the sleep models poll
        // cadence for the teeth; the door bound is plumbing, and a tooth's
        // instant sleep must never fake a door hang.
        const answer = await Promise.race([
          relay.fire(latest).catch((error: any) => ({ fired: false, infra: String(error?.message || error) })),
          new Promise<{ fired: boolean; infra: string }>((tick) => {
            const timer = setTimeout(() => tick({ fired: false, infra: `the re-lay door hung past its own allowance (${allowanceMs}ms) — infrastructure, never an open wait` }), allowanceMs);
            (timer as any).unref?.();
          }),
        ]);
        if (answer.fired) {
          // The ladder ran whole (fire resolves on the sealed terminal) —
          // buy its measured wall-clock back for the OTHER seats' silence
          // bound, then re-read the record before judging anything.
          deadline += allowanceMs;
          refired = true;
          continue;
        }
        const doorNote = answer.capped
          ? 'THE MINT LAW could not re-lay: the image cap is spent (a capped ask is never a ladder fall)'
          : answer.mismatch
            ? `THE MINT LAW refused the re-lay: ${answer.mismatch} — a re-laid ask must BE the fallen ask (promptHash and generationSpecHash proven equal) or the fall stands`
            : `THE MINT LAW's door failed: ${(answer as any).infra || 'unnamed door failure'}`;
        throwTerminal(need, latest, doorNote);
      }
    }
    if (refired) continue;
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
