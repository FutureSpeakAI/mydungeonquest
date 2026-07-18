---
name: Vision-judge calibration framework
description: Laws for LLM-vision judged test suites with byte-keyed replay caches — excision, two-sitting quarantine, probe ritual, pairing-scoped boundaries, court recusal.
---

The framework, earned across seven red iterations of a proving loop:

**Replay cache = stability, not dice.** With a byte-keyed verdict cache (sha over bytes+id+protocol) and temp-0 judges, a "re-roll" of an excised entry that returns byte-identical wrong answers twice is NOT variance — it is the judge's stable perceptual boundary on that material. Stop re-rolling; requalify the control.
**Why:** two rounds of identical 0.62/0.55 crossings after excision proved re-rolls were not dice.
**How to apply:** first crossing on fair material → surgical excision + one re-roll; second identical crossing → the control itself fails qualification (two-sitting law).

**Surgical excision.** Cut crossed verdicts by scanning cache CONTENT (criterion+id), never by razing stores — a raze re-rolls every sealed verdict downstream.

**The probe ritual.** The cache makes offline calibration BINDING: roll a candidate control under its exact sitting id/criterion in a throwaway test, inspect the verdict, then delete the test — the sealed verdict replays in the real sitting. Measure every new control seat this way BEFORE spending a loop iteration; a seat backfilled by slice() after a quarantine is an UNMEASURED die.

**Boundary entries key the WHOLE pairing.** Quarantine keys must be `kind:sha256(bytes):sha256(prose)` — never bytes alone. Stores alias the same image bytes across pairings (a caption control wearing a page plate's bytes), byte-only keys over-exclude controls whose verdicts under other question classes are sealed green, and — the review-round half — the judge's question EMBEDS the prose, and deterministic mock paints can reproduce identical bytes under moved prose, silently carrying an attestation to a pairing it never earned.

**Courts recuse where benches quarantine — under custody.** Downstream courts judging the store whole hit the same boundary material the bench quarantined. Keep the boundary ledger in ONE shared lib (bench filters + court recusals import it); courts RECUSE loudly — attestation logged per row, a coverage assertion (judged + recused == roster) — and a court standing down WHOLE must assert custody: the bench's perfect-separation table present, on the standing protocol, for this very store (a naked pass on zero judged rows is a skip wearing a robe). Convictions must come from decisive reads; tolerance must never be silent. The bench stays custodian via a stale-entry gate so ledger entries die with the store (or prose) that earned them.

**Read the WHOLE failure table.** A multi-row separation failure block can hide a second crossing below the visible fold; excising only the seen failure costs an iteration re-discovering the hidden one.
