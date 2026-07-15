> **SUPERSEDED** — kept for history. Current law: EXPERIENCE-DIRECTIVE.md and EXPERIENCE-DIRECTIVE-III.md at the repo root.

# REMAKE DIRECTIVE — MyDungeon.Quest: THE VISUAL CUT

You are working with the existing codebase in `artifacts/mydungeon-quest`. Do not rebuild from scratch. The architecture underneath (protocol validator, sealed journal with redaction, media attestations, Foundry cache, reducers) is sound — **keep all of it**. This directive remakes the experience on top of it around one principle:

> **Visual storytelling leads. The game is watched first, read second. No technical language ever reaches a player's eyes.**

Work the phases in order. Keep `pnpm build` and the eval green after each phase.

---

## PHASE 0 — THE TWO FATAL FIXES (do these before any visuals)

**0.1 Give the DM its memory back.** `server/dm.js` currently sends ONE user message per call — the model never sees its own prior narration, so prose continuity is impossible. Restructure:
- The **system prompt becomes static per campaign**: identity + the 21-rule contract + narrative craft (below) + covenant + hero sheet + the full spine with beat goals. Nothing that mutates per turn. Mark it `cache_control: ephemeral`. Remove `STORY:` from it entirely.
- Maintain a **rolling message history** (client keeps it, sends it): alternating user/assistant turns, assistant content = the narration text of prior turns, capped at the last 30 messages. Mark the last message with `cache_control` so the conversation prefix caches incrementally.
- The current turn's user message carries the dynamic blocks exactly once: `[STATE] [STORY] [MEMORY] [ENTROPY] [RESOLUTION?] [PLAYER]`.
- Add **narrative craft** to the contract (currently missing — this is why prose will read flat): second person, present tense, concrete and sensory; 60–140 words; vary rhythm; end every turn on a hook, a choice, or the moment of the roll; dialogue as its own blocks with exact speaker names; suggestions terse and one always unexpected. Add explicit **[SESSION ZERO] orchestration**: register the villain (full appearance canon, felt not confronted), one family/home figure, the home region, starting gear, the quest hook, a chronicle line, and fire a `chapter` cinematic titled "Chapter I — …", then narrate the ordinary world with one small wrongness.

**0.2 Stream the narration.** Support `?stream=1` on `/api/dm` with SSE passthrough of the tool-use deltas. Client accumulates `input_json_delta.partial_json` and renders narration text progressively with a caret (a tolerant scanner that extracts completed+in-flight `"text"` values inside `narration_blocks` is ~40 lines). Mechanics still apply only after the full payload validates — the existing validator stays the gate. Keep the current non-streaming path as fallback.

---

## PHASE 1 — THE PROLOGUE RENDER (the forge becomes a title sequence)

The player's 60–90 seconds in World Forge + Hero Forge is free render time. Use it.

- The moment the covenant text stabilizes (debounced) and the spine/tone are chosen, the Foundry begins the **Prologue package**: campaign **key art** (16:9, from covenant + style-bible seed), and after Hero Forge submits: **hero portrait**, then at session zero: **villain portrait, home-region plate**.
- **Hero Forge shows the portrait materializing live** beside the sheet — shimmer frame → generated face. The forge is now a visual ritual, not a form.
- **Chapter I opens on the key art**, full-bleed, with the generated title typography over it. First impression = painted world, not gradient.
- Every chronicle stores its key art hash; regenerate a key-art **variant at each act boundary** (Act II darker, Act III at maximum stakes) so the cover of your save evolves with the story.

## PHASE 2 — CINEMATICS CONSUME THE PIPELINE (the biggest visible gap)

`Cinematic.jsx` currently renders only a procedural SVG. Rewire it as a **three-tier ladder**, best available wins:
1. **Film** — the generated video clip for this beat, if delivered (the `/api/video` pipeline already exists server-side; it currently reaches nothing on screen).
2. **Animatic** — layered Ken-Burns/parallax over the *generated stills* relevant to the moment (region plate as backdrop, subject portrait as midground on boss_reveal/discovery), palette wash, particle field by mood, animated Cinzel title with the gold rule. This is the common case and must be gorgeous alone.
3. **Procedural** — the current SVG, last resort only. **Remove the baked-in `<text>` from the SVG art** — titles are typography layers, never pixels in the art.
- **Lookahead**: the spine is known. When beat N begins, brief beat N+1's package (video prompt from its goal + current cast/region canon, music stinger by act, ambience bed). Session zero pre-briefs Chapter I.
- **Multi-lane Foundry**: split the single `running` lane into three (image / video / audio) so a 30-second video poll never blocks portraits. Keep caps and cache as-is.
- **Upgrade-in-place**: if a cinematic fires before its film exists, play the Animatic and silently attach the film for Codex replay.
- Add **dialogue + score to the moment**: the `dialogue_cue` line speaks *during* the cinematic in that soul's cast voice (Phase 4), subtitled; the music stinger (or the adaptive score swelling) runs under it; skip on tap always.

## PHASE 3 — THE IMAGE-FIRST TABLE

- **Raise illustration cadence**: an illustration panel for every beat advance, every new soul (their portrait panel, captioned with their name only), and every new region (its plate). `image_cue` remains for extra moments. Panels render **full-bleed edge-to-edge on mobile**, 16:9, with the blur-arrive animation kept.
- **Codex becomes a gallery**: soul cards show generated portraits (monogram only until delivery); region cards show their current-state plates; beat replays open the cinematic. Big art, small text.
- **Region strip** becomes a true parallax band of the current region's plate (already partially wired) that visibly darkens with blight.
- Log typography: keep the drop caps and gold speaker tags; player lines shrink (smaller, dimmer); the world's images and the DM's prose dominate.

## PHASE 4 — SOUND IDENTITY

- **Persistent adaptive score** (WebAudio, no deps): campaign-name-keyed root drone + minor-pentatonic motif; intensity from act/HP/blight/combat; a tritone leitmotif whenever the villain is on stage. Toggle in Settings; starts on first user gesture. (The current 6-second swell plays only inside cinematics — replace it with this engine and let cinematics swell it.)
- **Voice casting law**: each soul is cast ONCE, deterministically — hash of name picks from the device's `speechSynthesis.getVoices()`, pitch/rate derived from their canon `voice` line via keyword heuristics. The mentor never changes voice. Narrator gets its own fixed cast. Server TTS remains the opt-in upgrade using the same locked casting.
- Haptics: roll resolve, crit, death's door.

## PHASE 5 — DE-TECH EVERY PLAYER SURFACE (ruthless)

Players see fantasy. Builders see cryptography. Separate them:
- **Delete the fixed `seal-status` hash bar.** Replace with a small **wax-seal glyph** in the header that presses closed (one subtle animation) each time a turn seals. Tapping it opens the Book & Seal overlay — hashes, verify link, and export live *there*.
- The busy status line becomes diegetic and art-directed: "The Dungeon Master considers…" — never "Mock DM · hash-only · 14 records", never provider names, never record counts.
- Strip the `law-note` explainer boxes from the forge; the forge speaks only in-world ("Speak the world into being"). Move architecture talk to a single "About the Craft" page linked from the title footer and the Book overlay.
- Rewrite `index.html` meta: title `MyDungeon.Quest — Any world. Any hero. Real dice.`; description game-first, zero jargon ("Forge any world in a sentence. Live one complete epic — painted, scored, and yours to keep."). Words like *sovereign, client-authoritative, hash, attestation, provider, mock* are **banned from every player-facing string**. Grep and purge.

## PHASE 6 — THE FACE (title screen and first contact)

- Title screen = **full-bleed key art**, slow Ken-Burns, letterboxed; the wordmark set huge over it; one line ("Any world. Any hero. Real dice."); **one primary action: "Begin your legend."** The shelf slides up beneath on scroll/tap.
- With no chronicles yet, cycle **3–4 bundled pre-generated key arts** (generate once with the style bible of the seed worlds, commit the images to `public/keyart/`) so first launch is already cinematic — never an empty gradient.
- **Chronicle cards wear their key art as covers** (art on top, title band below, seal glyph bottom-right). Delete the monogram-on-gradient card style.
- An idle **attract mode**: after 30s untouched on the title, drift through key arts with epigraph lines from the seed covenants.

## PHASE 7 — THE BOOK, FINISHED

- Add the **film-strip spread**: one keyframe per beat cinematic (the attested asset), captioned with beat titles — the whole epic at a glance.
- Embed Cinzel + Crimson Pro as data-URL fonts in the book HTML so the PDF matches the game's face; cover uses the campaign key art full-bleed behind the title.
- Region plates render in the World's Wounds spread in their **final** state; portraits already embed — keep.

---

## ACCEPTANCE (all with the mock providers, keyless)
1. New campaign: by the time Chapter I's cinematic fires, key art exists and the cinematic plays as an **Animatic over generated stills** — never the bare SVG.
2. Ten turns in: the DM references a detail it narrated in turn 2 *in its own prior words* (history restored); narration visibly streams.
3. A boss_reveal cinematic shows the boss's portrait in the composition, speaks its `dialogue_cue` line in a voice different from the narrator's, over music.
4. No player-visible string anywhere contains a banned word; the hash bar is gone; the wax seal animates on turn commit and opens the Book overlay.
5. Title screen with zero saves is full-bleed art with one button. Chronicle cards show covers.
6. The bound PDF opens with key-art cover and contains the film-strip spread.
7. `pnpm build` and the eval still pass; the seal chain still verifies green in `verify.html` after all of it.
