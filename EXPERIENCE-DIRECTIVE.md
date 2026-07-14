# EXPERIENCE-DIRECTIVE.md — The Experience Cut

**Status:** Active directive, July 2026. The third cut of MyDungeon.Quest: after the engine cut (HANDOFF-REPLIT) and the visual cut (REMAKE-DIRECTIVE), this is the cut where the whole thing becomes *an experience* — one rhythm, one sound law, one brand, and an ending that hands the player their own tale as a bound storybook and a produced podcast.

This document does two things: it describes **how the experience should be** (the target), and it lays out **the plan to get there from the code we have** (the phases). Where the current code already embodies the target, that is said plainly; nothing working is rebuilt for sport. An architect review has been run against the codebase and its corrections are folded in.

---

## 1. The Promise

**MyDungeon.Quest is an illuminated chronicle: a master storyteller and a master illuminator bind your life into a book while you live it — and the book is really yours.**

Every design decision serves that one image:

- The DM narrates like a novelist; the client rules like a referee (Asimov's cLaws — unchanged).
- The pictures are plates in your manuscript, not loading screens.
- The sound is a reader by candlelight: one voice at a time, music only as punctuation, silence as the canvas.
- The journal is a wax-sealed chronicle, cryptographically true, living only on your device.
- And when the tale ends, you don't get a "game over" — you get **the book**: an illustrated storybook of what actually happened, and a **podcast episode** of your saga, voiced by your cast.

The brand concept in three words: **candlelit, bound, yours.**

## 2. The Sound Law *(owner directive — absolute)*

The procedural score and every whispering artifact are retired from play, permanently.

1. **Voices first.** The narrator and every cast member speak through ElevenLabs. Exactly **one voice sounds at any moment** — segments chain, never overlap (this part already holds in `narrator.js`).
2. **Music is punctuation, not wallpaper.** ElevenLabs-generated phrases of **~8–20 seconds**, **never looped, never under a voice**. Music may sound only at: the arrival screen's first touch, cinematic cards, chapter closes, the Sealing, and podcast transitions. Then silence returns *before* any voice begins. (The music adapter currently clamps requests to 15–30s — Phase 0 lowers the floor.)
3. **SFX are single deliberate accents.** A small curated vocabulary — die rattle, wax-seal press, page turn, sword ring at combat start, discovery chime — fired **only in gaps between voice segments**. If no gap arrives in time, the accent is dropped, not overlapped.
4. **Silence is the canvas.** No ambient bed, no drone, no browser `speechSynthesis`. If ElevenLabs is unavailable, the experience degrades to **silent text** — with dignity, not with oscillators.
5. **Procedural audio is exiled to the proving ground.** The mock music/SFX/TTS adapters remain (the keyless eval floor depends on them), but no audio of mock provenance may ever reach a player-facing `play()`. Provenance is enforced **at the delivery layer**: the Foundry already reads `X-Media-Provider` on every media response and records it on `db.media` rows — the Audio Director checks it on *both* paths, including live narration blobs from `/api/speak` that play before any DB row exists. Procedural *art* is unaffected — Parchment tier's engraving-style plates are a feature, not a fallback.
6. **One arbiter.** Every `play()` in the app goes through a single **Audio Director** with three lanes — voice > sfx > music — and a hard interlock. Nothing else may touch an `Audio` element or `AudioContext`. This includes the cinematic card's current `<audio autoPlay>` in `Cinematic.jsx`, which is rerouted.

**What this retires, by name:** the persistent WebAudio drone (`src/lib/cinema/score.js` `startScore`, including its combat/HP intensity coupling), the 20-second stinger bed looped at 0.16 volume beneath narration (`narrator.js` `bedBlob`), the per-beat 20-second stinger briefs in `lookahead.js` (music is briefed only for upcoming punctuation moments), the `window.speechSynthesis` path in `voice.js`, the `<audio autoPlay>` in `Cinematic.jsx` (rerouted through the Director), and every audible mock tone. The podcast mixer inherits the same law (see §8).

**Law amendment, stated plainly:** GAME_NOTES' standing law — "generated media only upgrades the procedural floor" — is hereby **amended for audio: the audio floor is silence.** The floor law still holds for art. Phase 0 updates GAME_NOTES.md, the root README, and the artifact README in the same change, so the repo's canon documents never contradict the shipped behavior. The keyless proving ground keeps asserting the mock *adapters* (server-side floor); new evals assert the *client* never plays them.

## 3. The Player's Journey — the exact sequence

### 3.1 Arrival

A dark room. A single candle flickers alight and warms the title: **MyDungeon.Quest** — *a tale that is actually yours*. No sound until the player touches; the first touch earns one page-turn and one short musical phrase, then quiet. The Chronicle Shelf sits below: past tales as book spines, each stamped with its palette and — if finished — its wax seal.

### 3.2 Genesis (Session Zero)

1. **The world** — four painted spine-cards (Classic Epic, Mystery, Heist, Horror Survival — the four spines that already live in `spines.js`), each promising a shape: "a tale of three acts." Or whisper your own premise.
2. **The covenant** — one quiet page: lines, veils, tone, the PG-13 charter. Signed, it becomes law (it already is — the validator enforces it).
3. **The character forge** — four beats: origin, calling, bond, flaw. While the last answers are given, the Foundry paints the character's portrait.
4. **The portrait reveal** — the first magic moment. This face is anchored (the Anchor Law) and will be *this* face on every plate to the last page.
5. **The genesis seal** — the journal's first block signs. A wax press, one seal SFX, and the first chapter card rises: **Chapter I — [beat title]**, with its three-color palette.

### 3.3 The Heartbeat — every ordinary turn

The player learns this rhythm like a pulse: **Speak → Story → Voice → Vision → Choice.**

1. **Speak.** Type freely, or take one of three suggestion chips — the third one always slightly unexpected (contract law).
2. **Story.** The DM's prose streams in as illuminated text — drop cap when the scene changes. Text is *never* blocked by media; it is the spine of the experience.
3. **Voice.** The narrator reads; registered cast voices take their own dialogue lines, chained one at a time. Auto-listen if enabled, else the Listen button. During voice: nothing else sounds.
4. **Vision.** The painted plate for this beat fades in *beneath the prose* when it lands (the settled order: text → Listen → plate below). Until then, the chapter's laddered backdrop — the most recent painted scene, dimmed — holds the mood. No spinners, no placeholders.
5. **Choice.** Three fresh chips, the free-text quill, and contextual verbs when they apply.

Along the right edge, the state rail (HP, conditions, inventory, threads) updates with small delta glints as reducers apply the validated turn — the mechanics visibly belong to the client, not the narrator.

### 3.4 The rituals — turns that break rhythm on purpose

- **The dice ritual.** When the outcome is uncertain the DM *stops* — the law forbids it resolving its own tension — and hands the player the die. The overlay dims the table; the die rattles onto parchment (one SFX, in a voice gap); the DC is shown honestly; the result glows; only then does the story resume, and `state_updates` stayed `null` the whole time the roll hung (law, already enforced).
- **Combat.** Initiative rail across the top; three candlelit range rings (engaged / near / far); each combatant a portrait chip whose HP is a guttering candle. One sword-ring accent at combat start — in a gap — then voices only.
- **Cinematic beats.** At true structural moments — the seven types: `chapter`, `boss_reveal`, `discovery`, `ominous`, `level_up`, `death`, `victory` — a full-bleed card: title, subtitle, three-color palette wash. This is one of the few places music is *guaranteed*: a single ~8–20 second phrase, then silence, then the voice.
- **Chapter close.** Each spine beat that ends a chapter closes with a sealed page: "The tale so far" — a short chronicle summary written by the Chronicler (§7), countersigned into the journal, pressed with wax.

### 3.5 Acts and the approach of the end

The spine's acts become visible: **Act I — the world as it was. Act II — the world unravelling. Act III — the world remade.** Chapter numbers are explicit (Chapter I…N mapped from beat index), the codex shows the arc's progress, and the DM is steered (via the `[STORY]` block it already receives) to *advance* threads, never meander. When the final beats near, the prose knows it — the `nearEnd` directive already exists; the UI finally honors it.

### 3.6 The Sealing — how a tale ends

A tale ends two ways: the final spine beat resolves (`completed: true` — exists today, but today it only changes a shelf badge), or the player chooses **"Seal the Tale"** from the journal (new — an honored early ending: the DM is directed to bring the current thread to a denouement within a few turns, then the seal).

Either way, the ending is a **ceremony**, not a shutdown:

1. The final cinematic plays (victory, death, or bittersweet — the tale's own truth).
2. **Denouement turns** — quiet, combat-free; farewells, consequences, the road home.
3. **The Sealing screen**: the journal's final block signs the whole chronicle; the wax seal presses (one SFX, one closing musical phrase); a verification badge in green wax — *"This tale is true: N turns, M rolls, every one verifiable."*
4. And then the offer, which is the whole point: **"Your tale is told. Bind it."**

### 3.7 The Keepsakes

The Epilogue Forge offers three bindings of the *actual* sealed record:

- **The Storybook** — an illuminated, chaptered retelling of what really happened (§8.1), readable in-app as a page-turning book, exportable as a print-quality PDF and a standalone HTML keepsake that carries its own seal and verifier link.
- **The Podcast** — a produced audio episode of the saga (§8.2), narrated and cast-voiced, downloadable as MP3 with cover art.
- **The Chronicle** — the raw `.chronicle.json` + offline verifier (exists today; unchanged) for anyone who wants to check the wax.

Finished tales return to the Shelf as sealed spines. A new tale may begin in the same world — the codex carries the canon forward as sequel hooks.

## 4. The Picture Policy — when images appear

| Image | When | Rule |
|---|---|---|
| **Portrait (bust)** | The first time a cast member enters a scene | Painted once, anchored forever (Anchor Law); shown inline at first entrance, then lives in the codex and combat chips |
| **Scene plate** | Once per beat, after the prose | Fades in below the text when ready; the story never waits for it |
| **Chapter card** | Cinematics only | Full-bleed, palette-washed, title + subtitle |
| **Backdrop** | Always | The ladder: most recent painted scene for the current place, dimmed behind the table |
| **Never** | — | No spinners in the prose column, no blocking, no mid-voice interruptions, no "weird" placeholder art — absence is handled by the backdrop, not by noise |

Parchment tier renders the same policy with procedural engravings (owned aesthetic: woodcut, not "fallback"). Illuminated tier paints.

## 5. The Four Threads of Consistency

1. **Face.** The Anchor Law (exists, in `foundry.js`): the first bust/plate painted for any labeled entity is stored and passed as the base64 `reference` to every future painting of that entity. Extended to locations (region anchors already exist as `subtype`s).
2. **Voice.** Every cast member is cast once, at first introduction, into a **curated** ElevenLabs voice — pools organized by age/temperament/gender, selection persisted on the cast card (today: a name-hash into gendered pools in `casting.js`; stable, but casting should read the card — a gravelly smith should not draw a reedy tenor). Locked until death.
3. **Fact.** The codex is canon: names, roles, goals, secrets, status, bonds (`codex.cast` — exists). Promoted canon facts (deaths, oaths, true names, artifacts) ride every prompt; the memory lane (BM25 scene recall — exists) supplies episodic texture. One hard law joins the validator: **the dead do not speak** — dialogue attributed to dead cast is an invalid turn.
4. **Light.** Each chapter's three-hex palette (already mandated by the cinematic law) tints its cards, its plate briefs, and its storybook chapter — one chapter, one light.

## 6. The Cast — how NPCs live

The cast card is the single source of truth per character. Today's `codex.cast` entry already carries `id, name, role, visual, voice, goal, secret, status, bond, last_seen`; the Experience Cut extends it:

```
id, name, role, visual (anchored), voice (cast + locked), goal, secret,
status (enum: active | dead | missing — today a free string defaulting 'active'),
bond (-3..+3) + bond arc history (new: when it changed, why, turn refs),
known_facts[] (new), introduced_turn (new), last_seen
```

- New speaker ⇒ explicit cast entry with a full card — no anonymous voices.
- The bond arc records *when* dispositions changed and why (turn refs), so the storybook can narrate relationships truthfully.
- Death is a sealed event: status flips, voice retires, portrait dims to memorial in the codex. No resurrection retcons — the validator holds the line.
- **The Cast page**: the codex overlay grows into a gallery — portraits, bond threads to the player, known facts, last-seen. "What does the world remember?" is a page the player can always open.

## 7. The Chronicler — a second, smaller harness

The Storybook and the Podcast need connective retelling prose — and retelling is exactly the kind of work a model will embellish. So the retelling gets its own harness, built like the DM's but smaller: **the Chronicler**.

- One forced tool call (`chronicle_passage`) against a dedicated endpoint (`/api/retell`), reusing the DM harness pattern from `server/dm.js`.
- **Its own three laws:** it may not invent (every passage cites the sealed turn range it retells; names must exist in the codex); it may not contradict (claims are checked against sealed events: deaths, rolls, outcomes); it may only retell (no mechanics, no new dialogue — quoted lines come *verbatim* from sealed turns).
- Client-side validator, repair-retry once, then fall back to the plain sealed text (the tale is always tellable keyless — the storybook degrades to the beautiful raw chronicle, never to nothing).
- The Chronicler also writes each chapter-close "tale so far" summary during play, so by the Sealing, most of the book already exists — sealed as it was written.

This keeps `dm_turn` law **untouched** except for one amendment (the dead do not speak), honoring the amendment rule: schema, prompt, validator, in lockstep. Note the plumbing: `validateDmTurn` today sees only payload + entropy, so the amendment threads a codex snapshot (cast names + status) into the validation context on *both* the client path and the server repair-retry path.

## 8. The Keepsakes — specifications

### 8.1 The Storybook

**What exists:** a first storybook already ships — `src/lib/storybook.js` (`buildStorybook`) binds campaign + journal + media into a self-contained HTML book, opened from the wax-seal button, with PDF export via `/api/bind-pdf` (Playwright, `data:` URIs only) and a standalone HTML download. The bones are real; the Experience Cut illuminates them.

- **Structure:** cover (title, subtitle, palette, wax seal) → dramatis personae (portraits + one-line fates) → chapters (one per spine beat/chapter): full-bleed opening plate, illuminated drop cap, the Chronicler's retelling threaded with the player's own words as quoted speech, dice moments as margin marginalia (*"Here the die showed 19."*), portraits in margins at entrances → the final page: the seal, the verification statement, the tale's dates.
- **Readable in-app** as a page-turn book on the Shelf, forever (today's overlay iframe grows into the reader).
- **PDF** print-quality via the existing binder; Letter and A5 page CSS.
- **Standalone HTML keepsake**: one self-contained file — book + embedded chronicle + verifier link — shareable proof that this tale happened this way.

### 8.2 The Podcast

- **Form:** one produced episode, 10–18 minutes. Cold open — the tale's single best sealed line, voiced by its character. Title sting. The narrator retells the saga act by act, cast voices re-speaking their finest lines *verbatim from the sealed record*. Closing theme under nothing. Sign-off: *"Sealed, and true."*
- **Script:** compiled from the Chronicler's passages + selected sealed dialogue (selection heuristics: cinematic-adjacent turns, high-stakes rolls, bond swings).
- **Sound Law applies to the mix.** The existing `/api/quest-audio` endpoint already normalizes clips to 44.1kHz and concatenates via ffmpeg — but it `amix`es a music bed at 0.16 under narration, which is now unlawful. The mixer becomes a **sequencer**: voice segments concatenated with breathing gaps; musical phrases only *between* voice sections; loudness-normalized; 160k MP3 with chapter markers per act and cover art (the final plate or the portrait, palette-framed).
- Keyless: the podcast forge honestly declines — *"The podcast needs voices. Add a key, or keep the book."* No mock audio, ever.

## 9. Brand & Interface

- **Look:** illuminated manuscript × candlelight cinema. Parchment-and-ink at rest; Illuminated tier deepens to candlelit dark with gold-leaf accents. Chapter palettes tint, never shout.
- **Type:** a display serif with illuminated drop caps for story; a quiet humanist sans for chrome. Numbers (DCs, HP) in tabular figures — mechanics look like a ledger, story looks like a book.
- **The seal is the brand.** One mark unifies cryptographic truth and fantasy: the wax seal — on sealed turns, chapter closes, the verification badge, book spines, the podcast cover. `verify.html` styles as a notary's desk. (The wax-seal button already in the nav becomes this system's anchor.)
- **Motion:** slow and deliberate — fades, page turns, ember drift. Nothing bounces, nothing spins.
- **Copy voice:** quiet confidence, second person, lightly archaic, never cosplay. *"The die is yours."* — *"Your tale is told. Bind it."* — *"This tale is true."*
- **Sound identity:** §2. The brand *sounds* like a reader by candlelight: one voice, a page, a seal, and silence.

## 10. The Upgrade Plan

Sequenced so each phase ships and proves alone. The keyless proving ground stays green throughout (`run check` — mock adapters remain the eval floor).

### Phase 0 — The Quieting *(first, non-negotiable)*
**Target:** the Sound Law, entire. **Current:** `startScore` drone always-on; `bedBlob` loops music under narration; `lookahead.js` briefs a 20s stinger every beat; `speechSynthesis` can overlap the narrator; `Cinematic.jsx` autoplays its own `<audio>`; mock tones audible keyless.
- Build the **Audio Director** (`src/lib/cinema/audioDirector.js`): three lanes, hard interlock, gap scheduler. Route **every sink** through it: the narrator chain, live `/api/speak` narration blobs, `Cinematic.jsx` (autoplay removed), SFX one-shots, and any future source. Delete the `startScore` drone and `bedBlob` bed; remove the `speechSynthesis` path entirely.
- **Provenance refusal at the delivery layer:** the Director refuses audio whose provider is `mock`, checked from the `X-Media-Provider` response header (Foundry already reads it) and from `db.media.provider` for stored rows — covering both live-blob and DB-replay paths. Keyless play = silent text; the Listen button explains itself.
- **Music becomes punctuation:** lookahead briefs phrases only for upcoming cinematics/chapter closes (never per-beat); the ElevenLabs music adapter's 15–30s clamp is retuned to ~8–20s.
- **Docs amended in the same change:** GAME_NOTES.md ("the audio floor is silence"), root README, artifact README — canon never contradicts behavior.
- **Evals:** extend `narratorConcurrency` into an `audioDirector` suite: never two sounds at once; music requested during voice is deferred-or-dropped; mock provenance never reaches a player-facing `play()`; keyless run is silent.

### Phase 1 — The Four Threads
**Target:** §5–6. **Current:** Anchor Law and `codex.cast` exist; voice = name-hash into gendered pools; status is a free string; no dead-speaker law; codex UI is minimal.
- Curated voice pools + casting-by-card at first introduction; persist to `codex.cast.voice`; migration keeps existing campaigns' hash-derived voices (no recasting mid-tale).
- Cast card extensions (`known_facts[]`, bond arc, `introduced_turn`, status enum `active|dead|missing`); Cast gallery page.
- **Law amendment (one):** the dead do not speak — schema note, prompt clause, validator check, in lockstep; codex snapshot threaded into `validateDmTurn` context on client *and* server repair paths.
- **Evals:** validator rejects dead-cast dialogue; casting stability across sessions; migration leaves old campaigns' voices untouched.

### Phase 2 — Acts, Chapters, and Endings
**Target:** §3.5–3.6. **Current:** 4 spines with explicit acts (12–15 beats); `completed: true` exists but only badges the shelf; no early ending; no chapter numerals; `nearEnd` directive exists but the UI ignores it.
- Explicit Chapter I…N from beat index; act interstitials; thread tracker in codex; `nearEnd` honored in UI pacing.
- "Seal the Tale" (journal) → denouement directives through `[STORY]` → the **Sealing ceremony screen** → Epilogue Forge shell.
- **Evals:** completion flow reducer tests; early-seal path produces a lawful sealed ending.

### Phase 3 — The Chronicler
**Target:** §7. **Current:** nothing retells; chapter closes unsummarized.
- `/api/retell` + `chronicle_passage` tool + client validator (citations, codex-name check, contradiction guards) + repair-retry + raw-chronicle fallback.
- Chapter-close "tale so far" pages, sealed as written.
- **Evals:** Chronicler validator suite (invented name → reject; missing citation → reject; keyless → raw text fallback).

### Phase 4 — The Storybook
**Target:** §8.1. **Current:** `buildStorybook` already binds an HTML book with PDF (`/api/bind-pdf`) and HTML export behind the wax-seal button — but it binds raw journal text: no Chronicler retelling, no citations, no dramatis personae, no palette-chaptered layout, no page-turn reader.
- Book compiler v2 (sealed journal + Chronicler passages + `db.media` plates → the illuminated book model); page-turn reader on the Shelf; A5/Letter print CSS; standalone HTML keepsake with embedded verifier link.
- **Evals:** compiler on a sealed fixture campaign — every passage cites; every image is a `data:` URI; keyless build succeeds with raw text + procedural plates.

### Phase 5 — The Podcast Forge
**Target:** §8.2. **Current:** `/api/quest-audio` concatenates via ffmpeg but `amix`es a music bed under voice (unlawful under §2).
- Script compiler (Chronicler + verbatim sealed lines); rework the endpoint into the **sequencer** (gaps, stings between sections, loudness-normalize, chapter markers, cover art); Forge UI with honest keyless decline.
- **Evals:** script contains only sealed/Chronicler text; the mix plan is verifiably non-overlapping (assert the ffmpeg graph has no voice-music overlap).

### Phase 6 — The Brand Pass
**Target:** §9. **Current:** strong bones (tiers, palettes, cinematic cards, the wax-seal button), no unified arrival/shelf/seal identity.
- Arrival screen; Shelf as spines with seals; wax-seal motif unification; copy voice pass; verify-as-notary; type & motion audit.
- **Evals:** visual/e2e smoke; the keyless first-run experience end-to-end in silence.

### What does not change
Client authority over mechanics; the append-only hash-linked seal; Asimov's cLaws and the amendment rule; the keyless-green proving ground; the Anchor Law; procedural *art* as the Parchment aesthetic; local-only persistence; no keys in the client.

### Risks worth naming
- **ElevenLabs music/SFX latency & cost** at cinematics — mitigated by the existing lookahead (pre-brief the next punctuation moment's phrase, not every beat) and by the law itself (short phrases, few moments).
- **Chronicler drift** — mitigated by citations + contradiction checks + the raw-chronicle fallback (the book always exists).
- **Long-campaign podcast length** — selection heuristics cap the script; the episode is a retelling, not a replay.
- **Production deploys** — the keepsake binders lean on server-side ffmpeg (`/api/quest-audio`) and Playwright/Chromium (`/api/bind-pdf`); Phases 4–5 must verify both exist in the production image, not just dev.
- **Migration** — existing campaigns keep hashes, anchors, and sealed history untouched; new laws apply forward only (sealed history is never rewritten).
