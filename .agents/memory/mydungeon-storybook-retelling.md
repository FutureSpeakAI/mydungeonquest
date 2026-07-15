---
name: MyDungeon storybook retelling
description: Laws for buildStorybook — played-order chapters, seen-only art, cite-proofed pages, stable hero face key
---
- Chapters are CONTIGUOUS RUNS of same-beat turns in log order (never sorted by beat index); numerals follow run order; a revisited beat is its own stretch, spans are disjoint.
- Chronicler pages bind to a run only when beatIndex matches, the cite range overlaps the run, AND every cited turn is bound by both courts — citeless or struck-cite pages fall whole (mirrors the podcast law; the storybook used to skip this check).
- Seen law: reel + chapter plates draw only from the reveals ledger (plate/card marks) in first-seen order, excluding reveals made on struck turns; a chapter plate seats with the stretch where the art was FIRST shown (card covers seat with the beat's first stretch). EMPTY ledger = elder tale → legacy paint-order binding, one plate per chapter sequentially (the old even-spread formula is dead — it landed early art on late chapters).
- Shelf door: media rows tagged with a different campaignId are refused inside buildStorybook even if a reveal mark vouches for them; untagged rows pass (legacy/export shapes, eval fixtures).
- Hero's original face: campaign.heroBustHash (set in prologueRender beside keyArtHash, seeded null at begin) — resolved by hash first everywhere (dramatis-personae hero-lead plate, bustFor, useHeroBust → CharacterSheet); fallback = OLDEST bust under the label (anchor law's choice), never the latest take; no lawful face → the sigil. Renames never orphan the face.
- Busts never ride the reel; keyart never seats as a chapter plate; cover keyart stays ambient (not seen-filtered).

**Why:** owner's directive — "the storybook retells the adventure as actually seen": unseen takes and cross-adventure art in books, beat-sorted chapter reshuffling, and rename-orphaned portraits were the specific complaints.

**How to apply:** any retelling surface (book, podcast, future exports) must consume the reveals ledger and these doors; the storybook and hero-anchor evals lock them. Face-lookup hooks must CLEAR state when a lookup finds no lawful row — a live prop update must never keep a stale portrait.
