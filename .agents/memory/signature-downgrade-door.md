---
name: Signature-status downgrade must be refused on evidence
description: Envelope verifiers that trust a caller-declared signature status allow tamper + re-hash + claim-unsigned laundering; evidence in the envelope must force the court.
---

**The rule:** In any signed-envelope format where the header declares its own signature status (signed / hash-only), the verifier must NOT treat that declaration as authority. If the envelope carries signature evidence anywhere — a public key in the header, or a signature on any record — a hash-only claim must be refused as a downgrade; the signature court sits whenever the claim OR the evidence says signed.

**Why:** hash chains are forgeable by construction (tamper, re-hash the suffix, re-crown the head); only signatures are not. A verifier that lets the header opt out of the signature court hands the forger exactly the opt-out he needs as his last move. An architect review caught this live: the import door checked chain + head seal, then copied the caller's `signatureStatus` verbatim.

**How to apply:**
- Verify at ONE seat: chain law, head seal, downgrade door, signature court in one function both exporter and importer call (mirrored partial checks WILL drift — one side had the court, the other didn't).
- The honest residual: a TOTAL burn (key + every signature stripped) is indistinguishable from a born-unsigned envelope. Don't pretend otherwise — guarantee instead that the imported record derives its status from what was PROVEN, so the forger's prize visibly says unsigned; the signed claim itself can never be laundered. Provenance beyond the envelope belongs to an out-of-band pin (manifest/keeper).
- Keep the legacy door open: no claim + no evidence + true chain must still import (unsigned formats predate keys).
- Preserve provenance across restore: store the PUBLIC key with the imported copy (marked cannot-sign) so re-exports still carry the evidence and verify whole.
- Regression-gate the exact laundering path end to end: tamper + re-hash + re-crown + claim-unsigned refused by every mouth; total burn imports but seats visibly unsigned.
