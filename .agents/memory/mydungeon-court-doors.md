---
name: MyDungeon court door manners
description: App door behaviors the saga/open-road-family courts must accept when walking shelves, seals, and forges
---
- **A continued elder opens straight to its keepsakes** — once a successor exists, opening the sealed elder raises the ceremony/keepsakes dialog on its own; courts accept a risen door (openKeepsakes helper in g35 spec) and knock only when owed.
- **No seal door hangs on an unstarted tale** — live tables offer wax only at nearEnd or completed (by design). Court device (the doom-court pattern): stage `completed: true` in the row, reload, walk the tale-told door or the auto-risen ceremony — the app's OWN press does the sealing; never hand-roll seal bytes.
- **Forge is two steps behind the Deep Forge tab** — world → "Forge the hero" → audition chip → "Begin the chronicle."
- **Pick campaigns by createdAt-max** — `db.campaigns.toArray()` rides uuid (primary-key) order, not insertion order.
- **Mint source sits at `attestation.source`** — no top-level `source` key exists on spine mints; premise asserts must read the attestation.

**Why:** each of these burned a full court ceiling as a "red" with ZERO app defects — the bench's failures were its own manners. Verify the door's real shape (error-context snapshot + call log) before theorizing app breakage.
