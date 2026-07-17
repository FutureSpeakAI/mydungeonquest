// ------------------------------------------------------------
// THE MARK LAW — Move One's a3/a4 disjunction, pure and testable.
//
// At scene distance the hero's mark is allowed to hide — but only on
// the record's say-so. A hero-bearing scene passes if the mark is
// VISIBLE (the proving judge saw it), OR if its lack is ATTESTED in
// the sealed record: a media_attestation row whose payload.assetHash
// is the sha256 of the very plate bytes and whose
// payload.warden.signature === false — the engine's soft-signature law
// writing the lack down at paint time. Both at once is a WARDEN
// DISAGREEMENT: the plate passes, flagged yellow. NEITHER is a defect
// in the attestation path (foundry attest → journal → exported
// record), and it fails BY NAME. Tooth 7 proves this law can bite.
//
// (Iteration 54.5 found the unenumerated case; the review round set
// its verdict.) Markless WITH an attestation that says SEEN —
// warden.signature === true — is the MIRROR disagreement: the record
// is not silent, it is CONTRADICTED. It still FAILS — widening a
// failing case to yellow would widen acceptance, and that is a
// weakening this law is forbidden to make (a first draft did exactly
// that and the review round caught it). What the cure keeps is only
// the TRUTHFUL reason: the contradiction is named as a warden–judge
// contradiction, never as an attestation-path defect — an accusation
// the sealed rows disprove. The attestation-path red stays reserved
// for TRUE SILENCE: no signature-bearing attestation at all.
// ------------------------------------------------------------

export interface MarkEvidence {
  plate: string;
  assetHash: string | null;
  markVisible: boolean;
  attestedLack: boolean;
  /** An attestation exists for this hash with warden.signature === true —
   * the record claims the mark is seen. Optional: absent means unknown,
   * and the law treats it as no claim (older callers keep a4's red). */
  attestedSeen?: boolean;
}

export type MarkRuling =
  | { verdict: 'pass'; note?: string }
  | { verdict: 'yellow'; note: string }
  | { verdict: 'fail'; reason: string };

export function markLaw({ plate, assetHash, markVisible, attestedLack, attestedSeen }: MarkEvidence): MarkRuling {
  if (markVisible && attestedLack) {
    return {
      verdict: 'yellow',
      note: `warden disagreement on ${plate}: the proving judge sees the mark the sealed record attested missing (warden.signature === false) — the plate passes, flagged yellow`
    };
  }
  if (markVisible) return { verdict: 'pass' };
  if (attestedLack) {
    return {
      verdict: 'pass',
      note: `${plate}: the mark is not visible and the sealed record says so — media_attestation { assetHash: ${assetHash}, warden.signature: false } — the attested lack is lawful`
    };
  }
  if (attestedSeen) {
    return {
      verdict: 'fail',
      reason: `${plate}: WARDEN–JUDGE CONTRADICTION — the sealed record attested the mark SEEN (warden.signature === true) where the proving judge finds none (assetHash ${assetHash}); the plate fails until the contradiction is resolved. This is not silence and not an attestation-path defect — the record spoke and was contradicted.`
    };
  }
  return {
    verdict: 'fail',
    reason: `${plate}: the mark is not visible and the sealed record carries NO signature-bearing media_attestation for assetHash ${assetHash} — the attestation path (foundry attest → journal → exported record) is the defect`
  };
}
