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
// ------------------------------------------------------------

export interface MarkEvidence {
  plate: string;
  assetHash: string | null;
  markVisible: boolean;
  attestedLack: boolean;
}

export type MarkRuling =
  | { verdict: 'pass'; note?: string }
  | { verdict: 'yellow'; note: string }
  | { verdict: 'fail'; reason: string };

export function markLaw({ plate, assetHash, markVisible, attestedLack }: MarkEvidence): MarkRuling {
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
  return {
    verdict: 'fail',
    reason: `${plate}: the mark is not visible and the sealed record carries NO media_attestation with warden.signature === false for assetHash ${assetHash} — the attestation path (foundry attest → journal → exported record) is the defect`
  };
}
