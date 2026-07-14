# PASTE THIS TO REPLIT AGENT — EXPERIENCE-DIRECTIVE II: THE PLAYER'S CUT

You are continuing work on **MyDungeon.Quest**. The engine cut, the visual cut, and the Experience Cut are done and law. This is the fourth cut: **the player's person and the player's keepsakes** — a character forge worth lingering in (with true randomization), progression you can *see*, faces that never drift, and an ending package worth keeping.

## Before anything else
1. Read `EXPERIENCE-DIRECTIVE.md` at the repo root. It remains law — especially the Sound Law and the Chronicler's three laws. This directive extends it and amends it only where stated plainly below.
2. The game lives in `artifacts/mydungeon-quest`. `pnpm install` once at the root; work in the game folder.
3. Run `npm run check` BEFORE your first change. Count the PASS lines — that number may only grow. Never delete, weaken, or reorder an assertion to get green. New tests are appended as `evals/*.test.mjs` and chained into the `eval` script, matching the existing convention.

## Law amendments, stated plainly (update GAME_NOTES.md and both READMEs in the same change so canon never contradicts behavior)
1. **The naming of a hero joins the enumerated punctuation moments.** When a soul is blessed at the end of the forge, one short music phrase may sound through the Audio Director. Nothing else about the Sound Law moves: silence is still the floor, voices still outrank, mock audio still never reaches a player.
2. **Anchors may now be chosen.** The anchor law's "first bust" becomes "first *blessed* bust": at introduction, up to three candidates may be painted; the one the player (for the hero) or the engine (for NPCs, deterministically) blesses becomes the sole, permanent anchor. Unblessed candidates are deleted, not kept.
3. **Adapters may gain an edit door, additively.** Image-conditioned *edits* (anchor as base image, prompt describes only the change) may be added to paint adapters for wear and degradation. Chain/fallback semantics, provenance headers, and mock parity are untouched; keyless remains fully green.

## Phase 0 — Canon hygiene
Move `REMAKE-DIRECTIVE.md` and `HANDOFF-REPLIT.md` to `docs/archive/` and prepend each with a two-line status header: superseded by `EXPERIENCE-DIRECTIVE.md`, kept for history. Root keeps ONE canon: EXPERIENCE-DIRECTIVE (+ this file once executed). Fix any doc that still promises films, the procedural score, or Web Speech.

## Phase 1 — The Token Tables (the shared foundation; build first, everything downstream uses it)
A new `src/lib/identity.js`, client-side, keyless-complete, deterministic:
- **Structured identity tokens**: per-ancestry × covenant-idiom tables for `hair, eyes, skin, garb, silhouette, mark` (the *mark* is one unmistakable distinguishing feature — a split brow, a brass hand, a burn of frost). Composing tokens yields a `bearing` line compatible with the existing `heroSoul(form)` / `portraitPrompt` path.
- **The name forge**: syllable tables seeded by covenant vocabulary + ancestry, producing names in the world's idiom. Deterministic under a seed.
- **The destiny system**: a `destinyPhrase` (two evocative words + a check syllable) drives a seeded PRNG for everything "Cast the Bones" rolls — same phrase, same soul, forever. Separately, a `soulCode` (compact string) serializes ANY finished hero exactly for share/import, regardless of how they were made. Both survive round-trips; both refuse tampered input politely.
- Eval gate `identity.test.mjs`: phrase determinism (same phrase → deep-equal hero), name-forge determinism and idiom sensitivity, token tables always compose a paintable bearing, soulCode round-trip + tamper refusal.

## Phase 2 — The Forge of Souls (character creation, remade)
Rework Hero Forge into a short stepped ritual (mobile-first, same design system): **Name & Blood → The Calling → The Dice → Marks & Story → The Sitting**. Three doors in:
- **Forge by Hand** — the current path, enhanced: every field keeps manual entry, and every field gains a small die glyph that re-rolls just that field from the Token Tables.
- **Cast the Bones** — one tap forges a complete hero from a fresh destiny phrase (shown, tappable to re-cast): name, ancestry, calling, abilities, skills, bearing, background. A small chance (seeded) of an *invented* ancestry or calling built from covenant nouns, with legal hit die / saves / caster values. Re-cast per section or whole.
- **The Oracle's Three Questions** — three tappable questions ("What did you leave behind?" / "What do you reach for first?" / "What follows you?") whose answers weight the seeded tables. Fast, evocative, never blocking.
Ability scores offer exactly two methods: **Standard Array** (tap-to-swap assignment) and **4d6 drop lowest** — the latter rolled ON SCREEN through the existing dice overlay with haptics, six visible tumbles, drop-die dimmed. Hand-path rolls use true client entropy; Bones-path rolls replay the seeded values through the same overlay so the theater is identical. All stat math stays in `rules.js` — do not fork it.
- Eval gate `forge.test.mjs`: 4d6 pools legal (values 1–6, drop-lowest arithmetic), array assignment conserves the array, invented callings always carry legal mechanics, keyless full-random completes end-to-end.

## Phase 3 — The Sitting (the forge's finale)
When the hero is written, paint **three bust candidates** (existing `paintPreview` path; distinct seeds derived from the destiny phrase; keyless = three visibly distinct procedural busts). The player taps one to **bless** it: it becomes the sole anchor (`label: hero.name, variant: 'bust'`), the others are deleted from `db.media`. Then the naming plate: full-bleed blessed bust, the name in Cinzel, the destiny phrase beneath ("Speak this, and this soul returns"), one punctuation phrase via the Director (amendment 1). NPCs use the same machinery invisibly: generate three, bless deterministically (best = lowest seed), delete the rest — so the anchor law's guarantees now include *curation* for every soul.
- Eval gate `sitting.test.mjs`: exactly one bust row survives blessing; the blessed hash is the one later renders reference; NPC auto-blessing is deterministic; unblessed candidates are gone.

## Phase 4 — The Worn Road (progression made visible)
- **The Chronicle Ribbon**: a thin illuminated band under the header — closed chapters as tappable thumbnail plates (each chapter's plate from the reel `buildStorybook` already selects), the current beat a breathing gold pip, unlit pips ahead, and the villain's sigil creeping along it as blight rises. Tapping opens the Codex at that chapter.
- **The hero wears the road**: at each act boundary, repaint the hero's `dramatic` variant anchored to their blessed bust — through the edit door where a capable provider is configured, reference-conditioned otherwise. Act I fresh, Act II hardened, Act III mythic. Sheet shows the current-act face; all faces kept for the book.
- **Level-up joins the Ceremony grammar**: replace the plain overlay with the Sealing's ritual language — full-bleed current hero plate, the gained power written as one illuminated line, one Director phrase. XP renders as gold filigree filling around the hero's sigil; exact numbers on tap only.
- Eval gate `wornRoad.test.mjs`: ribbon derives purely from codex + journal (no new state), act variant jobs carry `referenceLabels: [hero.name]`, level ceremony fires exactly once per level.

## Phase 5 — The Faithful Face (consistency hardening)
- **Prompt front-loading**: `portraitPrompt` / scene prompts lead with identity tokens and repeat the *mark* once, prose after. Two anchored subjects maximum per plate; scenes naming three or more souls split into facing half-plates automatically.
- **The Warden**: after any delivered render containing a known soul, one image-understanding check against the anchor ("same person? yes/no + the telling detail") via the configured vision-capable provider. Fail → one re-roll with the mark emphasized; fail again → the procedural plate stands. Keyless = mock warden with scripted verdicts. Record verdicts on the media row (`wardenVerdict`) — provenance, not decoration.
- **Wear via edits**: wounded/corrupted/ashen states and region degradation route through the adapters' new edit door (anchor as base image) when available, falling back to today's reference path. Same cache keys, same attestations, plus the base image's hash in `referenceAssetHashes`.
- Eval gate `warden.test.mjs`: verdict path (pass / fail-reroll / fail-fail-procedural), half-plate split at 3+ subjects, edit door mock parity + provenance headers.

## Phase 6 — The Episode, mastered
- **The theme**: at session zero, generate ONE ~12-second motif from the style bible, seal it, cache it under a stable key. The podcast's title sting and final resolve are that theme (final resolve requested as "the same theme, softer"); the game's punctuation moments may reuse it. The saga gains a sound that is *its own*.
- **Mastering in the sequencer**: normalize each segment to a common program loudness (target ≈ −16 LUFS; an honest RMS + peak-guard (−1 dBFS) approximation is acceptable — say so in a comment), and shape the breaths: ~1.2s before chapter slates, ~0.5s within retells. No beds, no overlap — the Sound Law governs the mix.
- **Chapters in the file**: write ID3v2 `CTOC`/`CHAP` frames (hand-rolled is fine — they are simple) with per-chapter titles, timestamps, and each chapter's plate as embedded art; episode cover = key art with a title band.
- **Speak the colophon**: the episode ends with the notary line voiced — turns count, sealed date, "every word verified" — through the same liturgy templates.
- Eval gate `episode.test.mjs`: theme cached once and referenced twice, segment loudness within tolerance band, CHAP frames parse (count + monotonic timestamps), colophon is the final section.

## Phase 7 — The Bound Book, finished
- **Print craft** in the print stylesheet: running heads (campaign title verso / chapter title recto), folio numbers, `orphans:3; widows:3`, `break-inside: avoid` on figures, hyphenation on, and a third page preset: **6×9 in with 3mm bleed** beside Letter/A5, full-bleed act-opener plates.
- **The book carries its proof**: after Playwright renders, a post-pass (pdf-lib — one MIT server-side dependency is permitted here, likewise a small QR encoder) attaches the exported `.chronicle` file INSIDE the PDF and stamps the colophon with a QR to `verify.html` plus the head hash. The keepsake is its own evidence.
- **Dramatis personae, completed**: each soul's blessed bust, fate line, and their first and last *sealed* words (the quote court already knows them). Add **"The Hero, Thrice"** — a spread of the three act faces — whenever Phase 4's variants exist.
- Eval gate `bookFinish.test.mjs`: attachment present and byte-identical to the export, QR/hash stamp present, dramatis quotes are sealed quotes only, all three presets render, hero-thrice appears iff variants exist.

## Hard constraints — violating any is failure
1. **Do not modify**: `server/dm.js`, `src/lib/protocol.js`, `src/lib/seal.js`, `src/lib/rules.js`, the Audio Director's interlock semantics, the Foundry's `allowed()`/cache-key behavior, or the Chronicler's three laws. `story.js` may gain read-only helpers only. Adapters: additive edit door only (amendment 3).
2. **The Sound Law is absolute.** Every new sound — naming phrase, ceremony phrase, theme — plays through the Audio Director with lawful provenance. Silence remains the keyless floor, with dignity.
3. **The anchor law flows through everything new**: any render of a known face or place carries `referenceLabels`; no raw prompts, no direct `/api/paint` calls from components.
4. **Keyless first**: every phase fully works and fully proves with mocks. Banned words in player-facing strings stand: sovereign, hash, provider, mock, telemetry, IndexedDB (the colophon/notary surfaces keep their precise terms — they are documents).
5. **No new client dependencies. No frameworks.** React + the one stylesheet. Server-side: pdf-lib and a small QR encoder only, in the bind path.
6. **Surgical edits.** If a want requires touching a protected file, stop, note it in `BUILD_STATUS.md` under "Deferred", and continue.

## Working method
One phase per checkpoint, in order 0 → 7. After each: `npm run check` (PASS count grew or held — never shrank), verify that phase keylessly in the preview, commit with a one-line message naming the phase. Update `BUILD_STATUS.md` and the law documents when the cut closes.

## Definition of done
A new player can tap **Cast the Bones**, watch six real dice tumble, meet three faces of their hero, bless one, and hear its naming — in under two minutes, keyless. That blessed face hardens act by act, on a ribbon that shows the whole epic's shape at a glance. Every soul's portrait passes a warden or yields to honest engraving. The episode opens and closes on the saga's own theme, chapters in the file, colophon spoken. The book prints in three trims, wears running heads, and carries its own sealed proof inside its binding. And the PASS count only ever went up.
