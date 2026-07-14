---
name: MyDungeon turn presentation
description: User-approved reading order for story turns, and the cinematic-backdrop fallback ladder (why it exists, how to pick scene art).
---

# Turn reading order (user-approved decision)
A sealed turn renders: narration TEXT first → the Listen control immediately
under it → the painted scene plate BELOW → film/rendering figures → roll stamp.
Plates are tap-to-expand (full-screen lightbox with focus management).

**Why:** the user explicitly directed "text first, then the image (below) and
narrate buttons asap afterward." Paint arrives seconds after text; with the
plate below, a paint landing mid-read never shoves the paragraph the player is
on, and the words are never blocked by generation.

**How to apply:** keep this order for anything added to a turn entry (new media
kinds, badges). Anything that arrives async should slot in BELOW the text, not
above it. Don't re-introduce a plate-above-text layout.

# Cinematic backdrop fallback ladder
The chapter/cinematic card fires the instant a turn seals — BEFORE that turn's
paint lands — so a beat-key/turn-hash lookup often misses and used to drop to a
flat procedural gradient (looked like a gold wash with a star, badly undercuts
"cinematic"). The still ladder is now: beat-key still → this turn's paint →
campaign's latest painted SCENE → any paint → procedural gradient (true last
resort). Locked by an eval case ("early chapter card borrows the latest painted
scene").

**Why:** generation is slower than the UI; any fallback ladder keyed to "this
turn's asset" must consider arrival order and borrow the newest prior art.

**How to apply:** media rows all share `kind: 'paint'` for images. New rows
carry `subtype` ('scene' | 'portrait' | 'region' | 'keyart' | 'beat-still');
older rows lack it — the heuristic is that scene plates are the only paint jobs
enqueued with no label/variant. Prefer `subtype`, keep the heuristic for old
rows. A backdrop should be a place (scene), not a character bust.
