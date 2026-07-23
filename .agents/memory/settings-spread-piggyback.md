---
name: Settings-spread piggyback
description: Per-campaign fields must never ride a shared settings object through a generic persistence door — stale values piggyback on unrelated toggles and cross campaigns.
---
The rule: a field that belongs to ONE record (a campaign's cadence, tier, etc.) must not be written by a generic settings mirror (`persistSettings(next)` style), because every control's onChange spreads the WHOLE settings object — any unrelated toggle carries whatever stale per-record value the shared object still holds, silently rewriting the open record, and worse, a DIFFERENT record opened later.

**Why:** the tempo-law review caught exactly this: a cadence chosen at table A would have ridden a reduce-motion toggle into table B via the shared spread — a back-compat hole (pre-tempo saves written without an explicit choice) invisible to every fixture walk, because it lives in the React persistence seam, not the pure court.

**How to apply:** give per-record fields their own door — a dedicated handler with an explicit-change guard — and keep them out of the settings object entirely; that kills the class structurally, and a source gate can prove the absence (shared door body never speaks the field, nothing reads `settings.<field>`, the surface writes through its own prop). The house's older, weaker pattern — re-seating the field from the record at the render door (`settings={{...settings, mediaTier: current.mediaTier}}`) — only masks the shared copy; prefer the own-door cure for new fields. Gate-slice trap from the same round: when asserting a door's body does NOT contain a word, bound the slice at the door's own closing brace, not at the next landmark — the neighbor's comment may lawfully speak the forbidden word.
