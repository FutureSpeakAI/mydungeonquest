---
name: MyDungeon multi-voice narrator
description: Invariants for the cast-performance narrator (per-character voices) and the scene-cue lever for character consistency.
---

# Multi-voice narrator (cast performance)

A turn is read as an ordered SEQUENCE of voiced segments, not one clip: the
narrator voice reads prose + a short hand-off ("…and that is when Mara said,"),
then each character's OWN voice reads only their dialogue. Segments are generated
lazily (one at a time), cached per segment+voice, and chained on `onended`.

## The inter-segment gap invariant (this bit is subtle and cost us a review round)
Between one segment ending and the next arriving there is a gap. During it the
finished element still exists and — like every ended media element — reports
`paused === true`. Rules that MUST hold or two voices overlap / an orphan plays:

- **Never infer pause state from `element.paused`.** Track an explicit pause
  intent flag. Reading the element makes a pause-tap "resume" the finished
  segment, and then the arriving next segment starts a second Audio.
- **A segment generated while paused is staged, not played** — create the Audio
  but only `.play()` it on resume.
- **Only one live element at a time**: retire (unwire + pause) the previous
  element before assigning the next; `stopNarration` must be able to silence
  whatever is live with no orphan.

**Why:** the merged concurrency eval only used single-segment turns (`onended`
never fired), so it did NOT cover the gap; multi-segment overlap slipped through
until an architect review. There is now a multi-segment gap test in
`evals/narratorConcurrency.test.mjs` — keep it.

**How to apply:** any change to the narrator playback controller (`narrator.js`)
must keep the session-token guard AND the gap rules above; run the full
`narratorConcurrency.test.mjs`, which asserts "at most one voice, no orphan"
under both rapid-switch races and a pause landing inside the gap.

## Sound Law additions (the Quieting, July 2026)
- **Segments carry provenance.** A segment asset is `{blob, provider}`; mock or
  missing provenance is SKIPPED silently (chain advances to the next segment,
  keyless reading = silence). Never "play the placeholder just this once."
- **The narrator holds the Director's voice gate for the whole reading** —
  including inter-segment gaps — via its state emit (active && !paused), so
  punctuation music can never sneak into a gap mid-reading. Ending/stopping the
  reading is what releases the gate.
- **No bed, ever.** The old per-turn stinger-bed pattern is deleted; the eval
  asserts zero bed elements even when legacy music rows exist in db.media.

# Casting resolution (the Casting Law, July 2026)
Playback voice = `resolveVoiceId(soul, name)`: the persisted `voiceId` first
(cast by reading the card once, at first introduction, in the story reducer),
falling back to the legacy name-hash `castVoiceId` ONLY for pre-law cards that
carry no voiceId. Never recast an existing card and never reorder the legacy
pools — sealed replays and cross-session identity depend on both. Death retires
a voice from new lines (the dead do not speak) but replays keep it.

# Character consistency lever
Cross-scene character consistency is driven by the scene image cue's `subjects`:
`scenePrompt` keys each subject's appearance-canon AND its sealed reference
portrait off that list. An empty `subjects` (e.g. a synthesized fallback cue when
the DM returns `image_cue: null`) paints faces from scratch every turn — the root
of "characters look different between scenes". Always populate `subjects` from
the cast actually present in the turn (speakers + names in the prose).

Global art direction (LOTR/GoT preproduction painting) is enforced by an
`ART_DIRECTION` clause appended in `scrubPrompt`, so every image/video shares one
hand regardless of the per-campaign `style_bible`.

# The One Throat (autoplay law, July 2026)
Browser autoplay blessing is per-ELEMENT and gesture-scoped: a fresh `new Audio()`
created after async work is refused (NotAllowedError) even when a gesture began
the turn. Rules:
- ONE persistent HTMLAudioElement, never discarded — blessing survives src swaps.
  Retiring a segment = unwire + pause, KEEP the element.
- `primeNarration()` plays a tiny silent WAV data-URI synchronously INSIDE every
  gesture handler that can lead to a reading (begin/send/roll/redact); the play
  call itself performs the blessing.
- A refused `play()` (any non-AbortError) stages the take as `blocked` — never a
  silent failure; the Listen button becomes a pulsing invitation, and the tap
  plays the STAGED take (no regeneration) while blessing the throat for the rest
  of the session.
- A `takeSession` stamp on the staged src (not element flags) gates toggle-resume:
  the persistent element outlives stop, so flags alone would replay a previous
  turn's audio.
**Why:** per-segment elements meant unprompted reads silently never started —
players had to press Play every turn.
**How to apply:** never construct extra Audio elements in the narrator; wire
`primeNarration()` into any NEW gesture entry point that can trigger a reading.

# Hero voice + alias restraint (July 2026)
The hero (`id:'hero'`, absent from codex.cast) is cast deterministically from the
forge card (`heroVoiceCard` → `castHeroVoice`; `resolveHeroVoiceId` honors a
persisted voiceId first) — persisted at creation, back-cast on open for writable
campaigns, resolved in memory for read-only spines (no writes). Speaker→hero
matching is `speakerIsHero`: the full name always; a bare FIRST name only when no
cast soul could also claim it — ambiguity touches nobody, a voice is never
guessed. Shared by the live narrator and the podcast so they always agree.
