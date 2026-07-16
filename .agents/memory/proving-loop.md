---
name: MyDungeon proving-loop lessons
description: What a 25-iteration vision-judged e2e loop taught about paint-prompt law, warden enforcement, and suite design.
---

## Prompt law (paint briefs)
- **Poison words bake text.** "Readable", quoted beat titles, and quoted prose inside a paint brief summon painted lettering (title cards, map labels, prose written into cobblestones). Say "clear action", pass goals unquoted, and declare the telling's words to be stage directions, never set dressing. A poison-word sweep (grep readable/legible/inscrib/titled in prompt files) is a cheap arm-gate.
- **The text plague migrates surfaces.** Each named habit stayed cured once its noun entered the in-world silence clause — title cards, artist signatures, chart glyphs, face-up letters, map labels, carved epitaphs — but the model keeps finding new writable surfaces (the seventh was a gravestone). Cure by noun list converges asymptotically; budget iterations accordingly.
- **Written matter: stage the object, never the face.** Letters/maps/books as props with faces turned away satisfies both the moment law ("stage every named thing") and the cleanliness law (no script rows). The two laws collide only when the writing's face is visible.
- **Prompt-law budget is real.** Every added law dilutes the others. For a five-pixel feature (a facial mark at scene distance), wording plateaus at ~50% per run — enforcement beats eloquence.

## Warden enforcement
- **The enforcer's bar must be ≥ the gate's bar.** A warden accepting `same ≥ 0.65` launders takes that a 0.75 proving judge refuses. Align thresholds or the pipeline ships lawful failures.
- **Feature-repaint trades the person for the feature.** A note demanding a missing mark makes the painter re-roll the face. The note must pin identity explicitly: "the feature returns, the person does not change."
- **Coverage gaps hide where the wiki ends.** The hero lives outside the cast wiki, so bearing lookups by lead name returned null and hero-led scenes went unwardened for the loop's whole first half. When she leads, synthesize her bearing from her soul (noun + mark + canon).
- **The mark is soft law by constitution.** Engine design (eval-pinned): identity is hard law; a missing signature buys ONE repaint, then ships with the lack attested. Any outer gate that makes the mark HARD law will flap on the residual dice — that gap is design, not bug. Closing it means changing the engine's constitution, not tuning prompts.

## Suite & loop mechanics
- **Serial spec files starve their tails.** A mid-file flapper skips every later test in that file; nine vision criteria never executed once in 25 runs because two flappy gates sat upstream in the same file. Put volatile vision criteria last or in separate files.
- **Keep eval pins in lockstep with lawful strictenings.** Raising a threshold or rewriting an enforcement note is a strictening — but a stale eval pin (constant equality, note-substring) turns it into a red build in a chain you may not be running locally. Sweep ALL eval chains (engine package + artifact) after touching shared engine law.
- **View the flagged plates.** Every root cause in the loop's endgame was found by looking at the image, not the verdict JSON: the stranger with the loud mark, the epitaph on the memorial stone, the prose in the cobblestones.
