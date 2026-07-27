# MASTER DIRECTIVE — STAGE 1

## Playability, Opening, Creation, and UI

This directive batches four bodies of work. Do them in the stated order. Stage A unblocks play, Stage B fixes the opening experience, Stage C rebuilds character and world creation, Stage D fixes UI across all screens.

This document is written in plain language deliberately. Keep literary voice in narration, dialogue, and the Book. UI controls, labels, errors, and setup instructions use plain English.

---

## HOW TO WORK

- One phase per checkpoint. Do not batch phases.
- After each phase: run that phase's test, then adjacent tests, then `pnpm run check`, then `pnpm run muster`.
- Every test passes with zero API keys.
- `features.mjs` and `docs/FEATURES.md` move in the same commit, regenerated with `--write-doc`.
- Passing test count only grows. Never weaken or delete a test to get green.
- Diagnose each bug to root cause before fixing. Do not patch symptoms.

---

## BUG REGISTER

Print this block at the top of `muster` output until each item is closed.

### Play-blocking (P)

- **P1** — Plates generated during gameplay turns are refused by the render door and show an empty frame reading "The painting offered here belongs to another moment." The session counter shows images being spent (23/80), so generation is succeeding and delivery is failing. Codex subject art (characters, regions) renders correctly.
- **P2** — Narration and dialogue per turn are too short. Turns lack substance.
- **P3** — Rendered narration is being retracted and replaced on the opening turn. The player sees text, then it disappears, then a chapter card loads in its place.
- **P4** — The chapter title card prints the beat's design directive as player-facing copy: "Establish the hero, home, and what deserves protection." That is guidance for the model, not text for the player.
- **P5** — Every campaign opens the same way regardless of the world the player created. Chapter I is identical across worlds.
- **P6** — The opening takes too long with no progress indication. The app appears broken during the first load.

### UI (T)

- **T1** — The Book prints DM room-plan directives to the player, including a character's secret goal ("Keep her daughter fed, safe, and coming home, no matter how"). Also ships a malformed string: `no matter how )`.
- **T2** — Internal field names in player copy: `gold_delta`, bare `turn 0` / `turn 3` labels, "the old ledger lane."
- **T3** — Clock disagreement. The HUD says "Day 1 · deep night" while the Book says "Day 1, morning" one minute later.
- **T4** — Derived surfaces disagree. The Cast tab lists three characters and omits the hero. The relationship graph plots the hero plus one character, omits two, and draws zero edges under a four-type legend.
- **T5** — Malformed campaign title: "The Tale of Opens Doors."

### Creation flow (F)

- **F1** — Creation asks before it shows. Seven entry points on the world screen, three on the hero screen, zero images at decision time.
- **F2** — Portrait selection renders three text chips (`hearthlight`, `dawn`, `candle`). The copy says to pick a face. There are no faces.
- **F3** — Identity is asked three times: a presentation dropdown, a free-text pronoun field, and an unfiltered ten-voice list. Three inputs, no reconciliation.
- **F4** — TTS provider voice names ship to players (Charlotte, Daniel, Elli, Domi, Arnold, Josh, Adam, Bella, Alice, Callum). Also leaking: "the casting session reads the finished card."
- **F5** — The mode selector renders below the fields it controls.
- **F6** — Preset world descriptions are ungrammatical template output. Shipped example: "A ring of border keeps that trade sleep like grain against the long watch."
- **F7** — Field and value disagree: "Where they come from" contains "Human."
- **F8** — Hero creation layout breakage: a button overlapping its own caption, two unlabeled placeholder elements, and a dice button with no accessible name.

---

## RULES

Each rule needs a code enforcement point and a test.

1. **Nothing private reaches the player.** No prompt directive, beat design note, editor note, reducer note, validator note, internal field name, or unrevealed secret renders on any player surface.
2. **Rendered text is never retracted.** Nothing displays as narration until it is sealed. Loading states are explicitly loading states, not draft text.
3. **A plate belongs to its turn or it does not render.** Late-arriving art attaches to the turn that requested it, not to the turn that happens to be current.
4. **Show options before asking questions.** Every creation step opens with three finished, selectable things.
5. **One linear creation flow.** Customization expands in place. No method selector.
6. **Nothing opens blank.** Expanding any step prefills every field from current state.
7. **Generate only on player input.** Fixed option sets ship as bundled art. Controls that generate name their image cost in the button label.
8. **Ask for identity once.** One control, one answer, covering presentation and pronouns. Voice options filter from it. No code path infers identity from prose.
9. **Irreversible actions say so in the button.**
10. **One verb per action, plain English.** Choose, Shuffle, Customize, Import, Start. Remove: Spin, Cast, Cast again, Cast the Bones, Forge, Forge by Hand, Deep Forge, Oracle, Dowry, Bless.
11. **Keyless mode does everything** with the same tap count and honest labels.
12. **All pre-game text is hand-written.** No template output reaches a player before turn one.
13. **Nothing hides under chrome.** Sticky headers, composers, and floating badges declare their height; scroll containers reserve it.
14. **One frame, one ratio** for every card image.
15. **No native browser controls** reach the player.
16. **Empty surfaces shrink to their content.**
17. **Derived surfaces agree.** Cast, graph, chart, party, and HUD replay one record and never contradict.
18. **Zero em dashes in UI strings**, not only in narration.
19. **Nothing truncates mid-word.**
20. **Setup speaks plainly.** Full definition in Stage C, Phase C10.

---

# STAGE A — PLAYABILITY

## Phase A1 — Diagnose the plate delivery failure (P1)

Do not write a fix in this phase. Produce a written diagnosis first.

Instrument the full gameplay plate path end to end and log, per attempt: the turn index at cue mint, the cue hash, the attestation payload, the turn index at plate arrival, the current head turn index at arrival, the render door's refusal reason, and elapsed milliseconds.

Then compare that path against the codex subject-art path, which works, and write down every place they diverge.

Test the leading hypothesis explicitly: **the plate is attested to turn N, arrives after the record has advanced past N (because of a tick entry, an act change, or paint latency exceeding turn duration), and the render door correctly refuses it as belonging to another moment.**

Also check:

- whether tick entries shift the index the plate is compared against
- whether the cue is minted before or after the turn is sealed
- whether a second turn can be submitted while a paint is in flight
- whether the refusal is silent in logs

Deliverable: a written root cause in `LOOP_LOG.md` naming the exact divergence, with the instrumented run attached.

**Test `plateTrace`:** every plate attempt emits a structured record containing cue turn, arrival turn, head turn, and outcome. No attempt exits without one.

## Phase A2 — Fix plate delivery (P1)

Fix the cause found in A1. Expected shape of the fix, adjust to the actual diagnosis:

- A plate is bound to the turn that requested it, by turn id, not by position or by comparison against the current head.
- A plate arriving after its turn is no longer current still attaches to its own turn's entry and renders there. It does not render in the current turn's frame and it is not discarded.
- Ticks and act changes do not invalidate an in-flight plate.
- If a plate legitimately cannot be placed, the frame states the actual reason in plain language and the failure is logged with the reason.
- The empty-frame message stops appearing for correctly attested art.

Keep the render door fail-closed. Do not loosen attestation to make plates appear. Fix the binding, not the check.

**Test `plateBinding`:** a fixture campaign requests a plate at turn N, advances the record by a tick and by a turn before the plate resolves, and asserts the plate renders on turn N's entry, that no plate renders on any other turn, and that the door still refuses a plate whose attestation was tampered with.

## Phase A3 — Substance floors for narration (P2)

The DM must return more prose per turn.

- Raise the target length in the DM prompt and state it as a floor with a range, not a suggestion. Specify a minimum count of narration blocks and a minimum total length per turn, with beat-aware ranges (a quiet scene runs shorter than a turning point, but never below the floor).
- Add the floor to the validator. A turn returning below the floor is sent back once with a specific instruction naming what was thin (too few blocks, no dialogue, no sensory ground, no consequence stated). Keep the existing single-retry-then-fallback structure. Do not add a second retry.
- Update the Editor's measure band per beat to match the new ranges so the editor does not fight the floor.
- Require at least one spoken line from a present character on any turn where a character is present, unless the scene is explicitly solitary.
- Keep the fallback turn honest. If the model fails twice, the fallback still meets the floor by design, not by padding.

Make the floor a named constant in one place, not a number scattered across prompt strings.

**Test `substanceFloor`:** a fixture turn returning below the floor triggers exactly one repair request naming the deficiency; a second failure produces the honest fallback; the fallback itself meets the floor; a turn with a present character and no dialogue is flagged.

## Phase A4 — Close the curtain, everywhere (P4, T1, T2)

Delete the scriptorium block from the player-facing Book. If it has diagnostic value, put it behind a dev flag that is off in production and renders nothing when the flag is absent. Fail closed.

Separate beat data into two fields:

- `beat.directive` (private, model-facing): "Establish the hero, home, and what deserves protection."
- `beat.opening` (player-facing, hand-written per spine and adapted to the world's premise): a line that sets the scene for the player.

The chapter title card renders `beat.opening` only. `beat.directive` never leaves the prompt.

Add a `sanitizeSurface(text)` pass over every player-facing string that refuses:

- internal field names matching `/\b[a-z]+_[a-z]+\b/`
- bare `turn \d+` outside a chronicle citation
- any string sourced from a character card's `secret` field
- any string sourced from `beat.directive` or from room-plan data

Rewrite the leaking copy:

- `+10 reconciled from the old ledger lane — stake and gold_delta rows, folded once` becomes `+10 recovered, an old debt settled and added to the purse.` Keep the turn reference as a small right-aligned citation chip labeled `Turn 3`.
- `Aster Vale (turn 0)` under KEEPSAKE becomes `Carried from the start.`

Fix the orphan parenthesis bug at its source and reject any rendered string containing ` )`, ` ,`, or an unclosed `(`.

**Test `curtainSurface`:** across a fixture campaign at turns 1, 3, and 26, no rendered player string contains a field name, a secret-sourced substring, a beat directive, or room-plan data.

## Phase A5 — No retraction (P3)

Find why opening narration renders and is then replaced. Likely candidates: a draft rendering before seal, an optimistic render replaced by the sealed version, or the chapter card mounting late and displacing content already on screen.

Fix so that:

- Nothing renders in the narration slot until it is sealed.
- Streaming, if kept, appends only. It never rewrites or clears what is already on screen.
- The chapter card reserves its space before it loads, so it does not push or replace narration when it arrives.

Keep the existing mutation-observer detector and extend it to cover the opening sequence specifically, which appears not to be covered today.

**Test `noRetraction`:** a fixture opening sequence runs with a slow paint and a slow chapter card; the detector asserts zero removals or replacements of rendered narration nodes from first paint through turn one sealed.

---

# STAGE B — THE OPENING

## Phase B1 — Distinct openings (P5)

Every campaign currently opens with Chapter I identical across worlds.

- Chapter I's opening text is derived from the player's world premise, home region, and tone, not from a fixed string. The spine's beat structure stays fixed; the words do not.
- The opening scene is grounded in the created world's specifics: its home region name, its tone, and the hero's carried item and class.
- Add variation at the structural level too. The opening turn should differ in shape (arriving somewhere, being interrupted, being asked for something, witnessing something) selected deterministically from the world seed, so two players with similar worlds do not get the same beat shape.
- Preserve determinism. The same seed and the same world produce the same opening.

**Test `openingVariety`:** ten fixture worlds produce ten distinct opening texts with no shared sentence over eight words; the same world seed run twice produces byte-identical output; every opening references at least two specifics from the created world.

## Phase B2 — The first sixty seconds (P6)

The opening must visibly work.

- Replace blank loading with named progress the player can read: preparing the world, painting the opening scene, casting voices, and so on. Each step shows as it happens.
- Show the chapter card immediately with its text and a reserved image area. The art fills in when ready. The card does not appear late and does not displace anything.
- If art is slow, the turn still proceeds. The player reads and acts while paint completes, and the plate attaches to its own turn when it lands (this depends on Phase A2).
- Set a visible ceiling: if any step exceeds its budget, say so in plain language and continue. Never sit silent.
- The first turn's suggestions and input are enabled as soon as narration is sealed, not after art completes.

Loading labels are plain sentences (see Phase C10):

- "Building your world."
- "Painting the opening scene."
- "Casting voices."
- "Preparing your first chapter."

Over budget: "The artwork is taking longer than usual. Your story will start without it and the illustration will appear when it is ready."

**Test `openingFlow`:** with a fixture that delays paint past the turn budget, the opening reaches a playable state (narration sealed, input enabled) within the stated budget; every loading state renders a named label; zero blank periods over two seconds occur without a visible indicator.

## Phase B3 — Fix the campaign title generator (T5)

"The Tale of Opens Doors" is a template collision. A campaign title must be a noun phrase. Add a validator that rejects a title whose second word is a finite verb form, and regenerate on rejection.

**Test `titleShape`:** one hundred generated titles across fixture worlds all pass the noun-phrase check; known bad forms are rejected.

---

# STAGE C — CREATION REBUILD

Replace the world and hero creation flow. This is a replacement, not a cleanup.

## New shape: five steps, five taps minimum

Progress bar pinned under the header: `World · Class · Face · Voice · Name`. Completed steps are tappable to go back. Confirmed choices display as confirmed, not re-offered.

### Step 1, World

Swipeable deck of three world cards, one visible at a time on mobile, image at 4:5 full bleed. Each card: title, one-sentence premise, tone label.

Buttons in order:

- `Choose this world` (primary)
- `Shuffle` (secondary, draws three new)
- `Customize` (text link, expands in place)

Below the deck, one field: "Or describe your world in a sentence." Submitting generates a fourth card and seats it first. That is the only image spend in Step 1. The three defaults are bundled art tied to hand-written fixtures and never generate.

Expanded: premise, tone, home region name, story shape, all editable, each with a right-aligned dice button on its own row. Show the detected story shape as a small label ("Story shape: Classic Epic. We detected this from your description."). Editing the premise enables `Regenerate image (1)`. Nothing regenerates automatically.

### Step 2, Class

Six bundled class cards, 2-column grid, 4:5 crop. Each: art, class name, one line on role, one line on starting gear. No generation on this step ever. One tap selects.

Expanded: full class list, stat array by class priority with per-stat reroll, equipment from the SRD tables, array total visible and locked at 72.

### Step 3, Appearance

Identity row at top, prefilled from class:

- `Ancestry` (this replaces the mislabeled "Where they come from")
- `Presentation and pronouns` as one control with one answer, including a "Describe it yourself" option that then asks pronouns explicitly
- `Anything else the artist should know` (one line, optional)

Below it, three generated portraits. Same person, same outfit, same build, lighting is the only variable. Lighting name as a caption under each face. Tap to enlarge, tap again to select.

Button: `Use this portrait. This is permanent.` The reference sheet generates from the selected portrait, not before.

Expanded: six appearance fields (hair, eyes, skin, build, clothing, carried item), each prefilled from the highlighted portrait's own description, each with a right-aligned dice button. Editing enables `Regenerate portraits (3)`.

### Step 4, Voice

Three options, not ten, filtered deterministically from the single identity answer through the existing tenor lexicon. Described by sound, never by provider name: "Low, weathered, slow to warm." Tap to play, tap to select. `Shuffle` draws three more from the same register.

Expanded: full register, still described by sound, plus a label naming the register.

### Step 5, Name

One field prefilled with a generated name, dice button beside it. Below it, the finished character card: portrait, name, class, world, voice, one-line summary. One button: `Start the campaign.`

### Import

Not a peer option. A small text link at the foot of Step 1: `Import a saved campaign`.

---

## Phase C1 — Remove the old structure, build the step router (F1, F5)

Delete the four world method options and the three hero method options as selectors. Delete both selector blocks entirely.

Build the five-step router with a sticky labeled progress bar, back navigation to completed steps, and a hard limit of two screens of vertical scroll per step.

Rename every control per Rule 10 and grep the creation flow for the removed verbs, failing on any match.

**Test `oneRoad`:** exactly five creation routes exist; no route renders a method selector; the fast path from entry to `Start the campaign` completes in five selection taps against a fixture; zero removed verb strings render anywhere in creation.

## Phase C2 — World deck (F1, F6)

Three bundled world images tied to hand-written fixtures. Custom description generates a fourth and seats it first. Move every preset world string into a fixture file and remove the template generator from this path.

**Test `worldDeck`:** the deck renders three cards before any question is asked; defaults resolve to bundled assets with zero generation calls; a custom description triggers exactly one.

**Test `writtenFirst`:** every player-visible string before turn one resolves to a fixture; a grammar check (subject-verb agreement, orphan conjunctions, doubled determiners) rejects any failing pre-game string.

## Phase C3 — Class deck (Rules 4, 7)

Six class cards, bundled art, 2-column grid, one tap to select. Expanded view carries the full list, stat array, and SRD equipment.

**Test `classDeck`:** zero generation calls fire in Step 2 on any path; every card resolves a bundled asset; the expanded array sums to 72 along class priority.

## Phase C4 — Single identity input (F3, F7, Rule 8)

Merge presentation and pronouns into one control returning one identity object carrying gender, pronouns, and voice register. "Describe it yourself" takes free text, then asks pronouns as an explicit separate question. No parsing pronouns out of prose.

Rename the mislabeled field to `Ancestry` and bind it to ancestry data. If birthplace is also wanted, it is a separate field with its own label.

Write the identity answer into the hero's `voice_card` at creation time so the hero enters the record with stated identity rather than inferred identity.

**Test `forgeIdentity`:** exactly one identity control exists in creation; `voice_card` is fully populated from stated input on confirmation; no creation path reads identity from prose; a fixture hero declaring feminine identity produces zero masculine-register voice candidates. Chain into the existing `tenor` test and do not relax it.

## Phase C5 — Portrait selection with actual portraits (F2, F8)

Generate three portrait candidates from world plus class plus stated identity. Identical identity across all three, lighting the only variable, lighting names as captions, no text rendered inside images.

Tap enlarges using the lightbox rebuilt in Phase D4. Second tap selects. Button label carries the permanence. The reference sheet generates from the selected portrait only; nothing is minted before selection.

Fix F8 in this phase: the button overlapping its caption, the two unlabeled placeholder elements, and the unlabeled dice button.

**Test `sittingFaces`:** Step 3 renders three image candidates and zero text-only options; all three carry identical identity fields; no reference sheet exists in the record before the selection event; the anchor is created exactly once on selection; the selection button's accessible name includes the permanence warning.

## Phase C6 — Voice audition (F4)

Three candidates described by sound, provider names never rendered. `Shuffle` advances within the same register. Expanded view lists the full register, still described by sound.

Grep the creation flow for machinery strings, including "the casting session reads the finished card."

**Test `auditionVoice`:** Step 4 renders exactly three candidates; no rendered string matches any provider voice name in the ensemble table; every description is generated from the register lexicon; candidates are a subset of the stated identity's register.

## Phase C7 — Customize behavior (Rules 5, 6)

`Customize` expands the current card in place. It never navigates away, never resets the step, and never shows an empty required field. Every field prefills from current state. Closing preserves edits. Dice buttons are right-aligned on the field's own row and never share a text baseline with the label.

**Test `deepDoor`:** expanding any card produces zero empty required fields against a fixture at every step; expand-then-collapse with no edits leaves state byte-identical; no dice button shares a baseline with its label.

## Phase C8 — Keyless creation (Rule 11)

Every step completes with no API keys. World and class art are bundled and unaffected. Portrait selection falls back to three procedural candidates with an honest label. Voice audition falls back to three named registers with a note that audio is unavailable at this table. Tap count is identical to the full path.

**Test `forgeFloor`:** the full five-step flow runs keyless and completes; selection-tap count matches the full path exactly; every placeholder carries its honest label.

## Phase C9 — Generation budget (Rule 7)

Declare the creation flow's budget. Default path spends zero images. Custom world spends one. Portraits spend three. Regeneration spends three. Every generating control names its image count in its own label and shows remaining session capacity.

**Test `forgeSpend`:** the default path triggers zero generation calls; total creation spend never exceeds seven images on any path; every generating control names its image count in its accessible name.

## Phase C10 — Plain language in setup (Rule 20)

### Rule 20 in full

Every player-facing string in the creation flow (all five steps, plus any confirmation, error, empty state, tooltip, or loading label inside it) must be:

- **A complete sentence** when it instructs, with a subject and a verb and a period. Not a fragment, not a poetic phrase.
- **Literal.** It says what the control does and what happens when the player uses it.
- **Free of invented vocabulary.** No house term appears in setup unless the same string also defines it in ordinary words.
- **Answerable.** Every field label names the thing being asked for, not a metaphor for it.
- **Consequence-first** when something is permanent, costs an image, or cannot be undone. State that plainly in the control itself.

Labels for input fields are the one exception to the complete-sentence rule: they are short noun phrases (`Name`, `Ancestry`, `Class`). Everything else that instructs is a sentence.

**Where literary voice stays:** narration, character dialogue, the chapter cards, the Book, the Chronicler, the storybook, and the podcast. Those are the story. Setup is not the story, it is the door into it. Do not carry the voice across that line.

### Rewrite table, Step 1 (World)

| Current | Replace with |
|---|---|
| "Speak the world into being." | "Create your world." |
| "A sentence is enough, or a single tap. Every question tells you where its answer lands." | "Choose one of these worlds, or describe your own in a sentence below." |
| "Spin the World / One tap. The dice write it; keep spinning until it sings." | "Shuffle" (button) |
| "The Oracle / Answer three questions; the world takes shape around them." | Removed. Method selectors are deleted in Phase C1. |
| "Deep Forge / Every field yours, with a die beside each." | "Customize" (link) |
| "The Dowry / Pages from an elder table, carried in, judged, and blessed by hand." | "Import a saved campaign" (link at the foot of Step 1) |
| "A READY WORLD" | "Ready to play" |
| "Tell the game your world" | "Describe your world" |
| "One sentence is enough. This is the promise of this world, and Chapter One opens inside it." | "One sentence is enough. Your first chapter will begin inside the world you describe." |
| "How it feels" | "Tone" |
| "The shape of the promise, Classic Epic / Read from the promise's own words, never asked." | "Story shape: Classic Epic. We detected this from your description. Tap Customize to change it." |
| "Nothing is final ink. The Deep Forge door holds every field if you want your hands on them." | "You can change any of this later. Tap Customize to edit every detail." |
| "Spin again" | "Shuffle" |
| "Forge the hero" | "Create your character" |

### Rewrite table, Steps 2 and 3 (Class and appearance)

| Current | Replace with |
|---|---|
| "HERO FORGE / Give the world someone to remember. / The Unwritten Road is waiting." | "Create your character. Your world, The Unwritten Road, is ready." |
| "A face waiting to be painted" | "No portrait yet." |
| "Paint their face" | "Generate three portraits (3 images)" |
| "Cast the Bones / A whole soul from one throw, then answer only what you care to." | Removed. Method selectors are deleted in Phase C1. |
| "Forge by Hand / Every stat and sentence yours, with dice on call." | "Customize" (link) |
| "Cast again" | "Shuffle" |
| "Their name" | "Name" |
| "Where they come from" (holding "Human") | "Ancestry" |
| "Their calling" | "Class" |
| "How they present" + "What words fit them" | "Presentation and pronouns" (one control, per Phase C4) |
| "Heard as they choose" | Show the actual pronouns the player selected. |
| "The looking glass / Six strokes of the portrait. Your ink is sovereign, and the painting reads every word." | "Appearance. Fill in any of these details, or leave them blank and we will fill them in. The portrait will match what you write." |
| "Their eyes?" | "Eyes" |
| "Their skin?" | "Skin" |
| "How are they built?" | "Build" |
| "What do they wear?" | "Clothing" |
| "What rides with them?" | "Carried item" |
| "The mark that sets them apart" | "Distinguishing mark" |
| "What they carry from home" | "Keepsake" |
| "Spin the whole look" | "Shuffle all" |

### Rewrite table, Step 3 (Portrait selection)

| Current | Replace with |
|---|---|
| "The Sitting, a face is accepted, not assigned" | "Choose your portrait" |
| "Three chairs, one identity, only the light differs. Bless one; the blessing is final, and every later painting answers to the face you accept. No sheet is minted before the blessing." | "All three are the same character in different lighting. Your choice is permanent. Every later illustration in your campaign will match the face you pick." |
| "hearthlight / dawn / candle" as selectable chips | Keep the words as captions under the three portraits. They label the lighting, they are not the choice itself. |
| (missing) | "Use this portrait. This is permanent." (button) |

### Rewrite table, Steps 4 and 5 (Voice and name)

| Current | Replace with |
|---|---|
| "WHICH VOICE IS THEIRS" | "Choose a voice" |
| "Charlotte, cool and composed" (and all nine others) | "Cool and composed." Provider names never render. |
| "Ten voices wait. Tap to hear and bless one. Unblessed, the casting session reads the finished card." | "Tap a voice to hear it, then choose one. If you skip this step, we will pick a voice that matches your character." |
| "Begin the chronicle" | "Start the campaign" |

### Test `plainSpeech`

For every player-facing string in the five creation routes plus the opening sequence, assert:

1. Any string longer than four words ends in terminal punctuation and contains a finite verb. Field labels registered in an allowlist of noun-phrase labels are exempt.
2. No string matches the house-term lexicon (`bless`, `blessed`, `blessing`, `forge`, `forged`, `cast the bones`, `spin`, `oracle`, `dowry`, `sitting`, `chronicle`, `soul`, `promise`, `ink`, `vellum`, `minted`, `door`) unless that string also appears in the plain-definition allowlist. Build the lexicon as a named constant so it can grow.
3. No string contains a rhetorical question addressed to the player. Field labels are not questions.
4. Every control that costs images, is permanent, or cannot be undone names that fact in its own accessible name.
5. Every loading state has a label naming the step in progress.
6. Zero provider names render, chained to the existing `auditionVoice` check.

Run `plainSpeech` alongside `chromeVoice` and `writtenFirst`. The three together cover plain language, no em dashes, and hand-written fixtures across the entire pre-game surface.

**Scope guard:** `plainSpeech` runs against creation routes and the opening sequence only. It must not run against narration, dialogue, chapter card body text, the Book, the Chronicler, the storybook, or the podcast. Scope the probe by route so a future refactor cannot accidentally flatten the story voice, and add that scoping assertion to the test itself.

---

# STAGE D — UI ACROSS ALL SCREENS

## Phase D1 — Safe insets (Rule 13)

Settings headings are sliced by the sticky header. The Book's tab rail scrolls away. On the table, narration's last line sits behind the composer, HUD chips overlap narration's first line, and section headings are cut by the viewport edge. The dev badge covers the bottom-right of every screen.

Define `--chrome-top`, `--chrome-bottom`, and `--badge-safe` as measured values. Apply `padding-top: calc(var(--chrome-top) + env(safe-area-inset-top))` and `padding-bottom: calc(var(--chrome-bottom) + env(safe-area-inset-bottom) + var(--badge-safe))` to every scroll container. Add `scroll-padding-top: var(--chrome-top)`. Make the Book's tab rail sticky beneath the modal header with an opaque background. Reserve the badge zone on every screen.

**Test `safeInsets`:** a DOM probe walks every route and asserts no heading, button, or link intersects the header, composer, or badge safe zone at 360, 390, and 430 widths.

## Phase D2 — Tab rail (Rule 19)

Six tabs currently behave three ways: wrapping into ragged rows on one tab, scrolled with the first three invisible and no affordance on another.

Pick one: a single horizontally scrollable rail with scroll snap, 44px minimum height, 12px gap, edge fade masks that appear only when scroll is available, and `scrollIntoView({inline: 'center'})` on selection. Active state is fill plus a 2px underline plus `aria-selected`, never color alone.

**Test `tabRail`:** exactly one tab rail implementation exists; the active tab is always within the visible scroll window after selection; every tab meets the 44px target.

## Phase D3 — HUD and composer (T3, Rules 13, 19)

**HUD:** restructure as a fixed two-row grid (row one: avatar, title chips, icon rail; row two: state chips). Never wrap to three rows. `white-space: nowrap` on every chip, horizontal overflow with a fade. Wire the hero avatar to the selected portrait with the emoji as an explicitly labeled fallback, not a silent default. The red sphere reads as an error state; restyle it as a die and give it a label. Add accessible names to the door, book, and gear buttons. Fix the `DAY 1` pill wrapping onto two lines.

**Composer:** rebuild as one grid, `[icon] [textarea] [send]`, with secondary actions beneath the field inside the same container. The quill currently breaks out of its container. Send is the only high-emphasis control; demote the flag. Hide the native scrollbar on the suggestion chip row, add edge fades, cap chips at two lines with proper ellipsis, and never cut mid-word. Long chips open a sheet with full text. Give the ledger line its own block with clearance.

**Test `hudFit`:** the HUD renders at 320px with the longest fixture strings at a fixed height, zero overlap with narration, and a non-empty accessible name on every interactive element.

**Test `composerFit`:** every composer child sits inside the container's bounding box; exactly one element carries primary emphasis; no chip's rendered text ends mid-word.

## Phase D4 — Images and the lightbox (Rule 14)

Cast cards currently mix treatments: one shows a 2x2 reference sheet, others show full scene plates. Region cards show reference sheets where a standing plate belongs. The Packs section renders a portrait at full bleed with no frame, name, or caption.

Card images: one crop at 4:5, `object-fit: cover`, focal point on the face. Region cards: standing plate at 16:9. The Packs: framed card at 4:5 with owner name and caption.

The lightbox is broken outright: the image overflows the viewport at native size, the panel behind bleeds through with stray fragments, the close button floats detached at top-left while every other close is top-right, and there is no backdrop. Rebuild: fixed overlay, opaque backdrop at 85%, `max-width: 100vw`, `max-height: 100dvh`, `object-fit: contain`, pinch zoom, close at top-right matching every other modal, Escape and backdrop tap both close, focus trapped, body scroll locked.

**Test `frameLaw`:** every card image resolves to its declared ratio; no image exceeds the viewport in the lightbox; the lightbox traps focus and restores it on close.

## Phase D5 — House controls (Rule 15)

Settings ships raw browser checkboxes in system blue against a gold and ink theme, plus a default blue range input. Foundry tier options communicate selection through border color alone. Checkboxes float mid-paragraph against four-line descriptions.

Replace every checkbox with a styled switch (44x44 hit area, `role="switch"`, `aria-checked`). Replace the range with a styled slider with discrete labeled stops. Foundry tier and tempo become radio cards with a visible selected mark plus `aria-checked`, never color alone. Align controls to the top of the row with the label, not centered against the description.

**Test `houseControls`:** zero `input[type=checkbox|radio|range]` render with default UA styling; every control exposes state to assistive tech.

## Phase D6 — Empty states (Rule 16)

The Traveler's Chart is a tall box holding one small node with roughly 600px of void beneath it. The relationship graph is worse: two unfilled circles in an even taller box, zero edges, under a four-type legend describing relationships that do not exist.

Chart and graph containers: `height: auto` with a `min-height` no greater than 240px until node count exceeds four. Center the cluster. Below five nodes, render a simple centered list instead of a canvas. Render only the relationship types actually present in the record. If node size means something, label it; if not, make every node the same size. Stack the empty-frame caption instead of the ragged two-column layout. Render the three rumors as a list, one per line, not a middot-joined italic run-on.

**Test `emptyFit`:** no surface renders a container more than 2x the height of its rendered content; legend entries are a subset of present edge types.

## Phase D7 — Derived surface agreement (T3, T4, Rule 17)

Build cast, graph, chart, and party from one selector over the record. If the hero belongs in the graph, the hero belongs in the cast. Route both clocks through one `currentClock(record)` function, then diagnose which surface was reading genesis instead of head. The "no scene set" banner must not render when a scene plate is present; bind it to the same predicate that gates the plate. Reconcile "The hero travels alone" in the HUD with three characters marked "walks the tale" in the cast.

**Test `surfaceParity`:** for a fixture campaign, cast roster, graph nodes, and party roster derive from one selector; the HUD clock string equals the Book clock string; the no-scene banner and the scene plate are mutually exclusive.

## Phase D8 — Copy and type (Rule 18)

Sweep every UI string for em dashes and replace with commas, colons, parentheses, or line breaks. Extend the existing dash check to cover chrome, not only narration. Arabic numerals for chapter counts: `Chapter 1 of 15`, not `CHAPTER I OF XV`. Route all pronouns through the tenor layer; "their goal" on a character with stated feminine identity is a tenor violation. Label the bond meter and show its value (`Bond 0 of 4`) with filled pips and a legend. Replace the repeated "The trail is quiet." on every card with each character's actual last-seen fact. Raise all body text to at least 4.5:1 contrast. Cap italic serif runs at three lines and break the long Settings paragraphs into a summary plus a disclosure.

**Test `chromeVoice`:** zero em dashes in any rendered UI string; zero roman numerals in counts; no pronoun conflicting with a stated `voice_card`; no two cast cards sharing an identical status line.

## Phase D9 — Destructive and terminal actions (Rule 9)

`Seal the Tale` currently sits mid-page above other content at ordinary button weight with no confirmation. Move it to the bottom of its tab behind a divider, restyle as a bordered low-fill terminal action, and require a confirmation sheet naming what happens and what is produced, with the confirm button labeled with the action rather than "OK."

Settings: session caps become two labeled meters, not fractions in a row. The cellar states what it does, how much it frees, and what is never touched, with the button naming the consequence. The toll-house renders one state at a time; if the seat is "friend of the house," do not render purchase copy at all, greyed or otherwise. The beta report block gets `overflow: auto` with top padding so the first line clears. Copy is primary, Send is secondary.

**Test `terminalDoor`:** the seal control is the last interactive element in its surface and cannot fire without an explicit second confirmation.

**Test `settingsClarity`:** no surface renders two mutually exclusive billing states simultaneously; every destructive control names its consequence in its own label or adjacent line.

## Phase D10 — Apply D1, D5, and D8 to the creation screens

The creation screens were outside the original UI pass. Run `safeInsets`, `houseControls`, and `chromeVoice` across all five creation routes at 360, 390, and 430 widths. Fix the clipped `HERO FORGE` heading, replace the native selects on class and identity, and normalize the ragged voice buttons to full width.

**Test `forgeChrome`:** the three probes pass on all five creation routes at all three widths.

---

## CONSTRAINTS

- Do not modify: `server/dm.js` core structure, `seal.js`, `rules.js`, the Audio Director interlock, Foundry cache keys, the Chronicler rules, Anchor Law logic. `protocol.js` is additive only.
- Phase A3 changes prompt content and validator thresholds, not the single-door structure or the retry count.
- Phase A2 fixes attestation binding. It does not loosen the attestation check. The render door stays fail-closed.
- `forgeRolls.js` stays pure and tested. Add rollers; do not rewrite existing ones to make a step pass.
- No test may be weakened. `tenor` is extended, never relaxed.
- Everything passes with zero API keys.
- `features.mjs` and `docs/FEATURES.md` move together with `--write-doc`.
- One phase per checkpoint.
- Passing test count only grows.

## ORDER OF WORK

A1, A2, A3, A4, A5, B1, B2, B3, then C1 through C10, then D1 through D10.

Do not start Stage C until Stage B is green. D4 must land before C5, which depends on the rebuilt lightbox; pull D4 forward and note the reordering in `LOOP_LOG.md`.

## IMPORT VERIFICATION

Setup passes, all existing tests green, and `muster` prints the bug register with P1 through P6, T1 through T5, and F1 through F8 above the work order, each marked open or closed.
