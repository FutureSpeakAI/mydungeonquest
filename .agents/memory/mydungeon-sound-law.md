---
name: MyDungeon Sound Law
description: Owner's absolute audio directive (July 2026) — voices first, music as punctuation, never overlapping; procedural audio exiled from play.
---

# The Sound Law (owner directive, July 2026)

The owner ("the weird procedural music and whispering voices need to stop") set an absolute audio policy, canonized in `EXPERIENCE-DIRECTIVE.md` §2:

- **Voices:** ElevenLabs for narrator + cast. Exactly one voice at a time.
- **Music:** ElevenLabs phrases only (~8–20s), never looped, **never under/over a voice**. Only at: arrival first-touch, cinematic cards, chapter closes, the Sealing, podcast transitions.
- **SFX:** small curated one-shots, fired only in voice gaps, dropped if no gap.
- **Silence is the canvas.** Keyless/provider-down play = silent text. Never audible mock/procedural audio for players; browser speechSynthesis is banned.
- **Procedural audio is eval-only.** Mock adapters stay for the keyless proving ground; the client must refuse mock-provenance audio at the delivery layer (response headers AND stored media rows — live narration blobs play before any DB row exists).

**Why:** the shipped experience had a persistent WebAudio drone, a looping stinger bed under narration, per-beat 20s music briefs, an uninterlocked speechSynthesis fallback, and harmonic mock TTS tones — heard as "weird music and whispering voices." GAME_NOTES' "generated media only upgrades the procedural floor" law is formally amended for audio: **the audio floor is silence** (art keeps its procedural floor).

**How to apply:** all playback routes through one Audio Director (voice > sfx > music lanes, hard interlock, gap scheduler); no other code touches Audio elements or AudioContexts. Any mixer/export (podcast, audiobook) obeys the same law — sequence with gaps, never mix music under voice. Never reintroduce ambient/looping beds, browser TTS, or audible procedural tones, even as fallbacks. Verify current code before assuming the directive has landed.
