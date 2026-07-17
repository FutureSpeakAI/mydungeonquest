---
name: MyDungeon genesis first-word law
description: Genesis sequencing — DM pour dispatches before any paint; parallel foundries; pre-genesis lanes in wire-order courts
---

# The first-word law (genesis sequencing)

**The rule:** at genesis (new chronicle AND next volume) the DM request
must leave the page before any paint request. A pure sequencer takes
`pour` and `paint` lanes; the pour exposes a dispatch signal fired at
fetch INITIATION (client-side, deterministic); the easel kicks on
`race(dispatched, pourSettled)` so a pour that snags pre-signal still
paints; the caller awaits the pour's outcome only; turn media gates on
the settled easel (anchors exist before scenes cite them; no double
mint under one cache key).

**Why:** awaiting easels before the pour cost ~21s of silence at
genesis (measured); the cure took it to ~250ms (sampling floor).
Sequencing is proven by an ordered-ledger eval over the REAL sequencer
(25 deterministic jittered rounds + snagged/silent/fallen lanes), not
by timing luck.

**Parallel foundries clobber absolute meters.** When two foundries
count concurrently (prologue easel + turn media), every landing must
merge spend as a DELTA over its own foundry's construction base into
the live row (functional setState). An absolute `spend: foundry.spend`
write silently clobbers the sibling's tally — found twice (prologue
merge, scene landing).

**Wire-order courts must drain pre-genesis lanes first.** The forge
paints ephemeral previews whose bodies carry the SAME lane marks
(keyart, portrait) as foundry paints — payload cannot discriminate. A
preview straggler initiating just after the tap red-flagged a lawful
run. The court fix: drain the lane before the tap (requests initiated
== settled, held quiet ~1s to outlast debounce), then assert the order
law ABSOLUTELY (no paint of any lane between tap and dm), naming
violators by lane mark.

**How to apply:** any new genesis-like door (import, restore-and-begin,
re-forge) must walk the sequencer, never serial awaits; any new landing
that writes the meter merges deltas; any new wire-order assertion in a
court starts with a lane drain.
