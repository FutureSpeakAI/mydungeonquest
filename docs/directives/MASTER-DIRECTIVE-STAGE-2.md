# MASTER DIRECTIVE — STAGE 2 (v2)

## Regressions, Isolation, and Recommended Upgrades

Stage 1 shipped. This directive closes what did not land, fixes what Stage 1 broke, addresses cross-campaign contamination, and corrects two Stage 1 instructions that were written against wrong assumptions about the failure chain and the narration law.

Plain language throughout. Literary voice belongs in narration, dialogue, and the Book. UI controls, labels, errors, and setup instructions use plain English.

---

## 0. GROUND TRUTH

### 0.1 Commands

Build and full eval suite:

```
pnpm --filter @workspace/mydungeon-quest run check
```

Keyless verification, which is the one that matters, because the suite asserts the mock floor on purpose:

```
env -u ANTHROPIC_API_KEY -u OPENAI_API_KEY -u ELEVENLABS_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY \
  pnpm --filter @workspace/mydungeon-quest run check
```

Dev:

```
pnpm --filter @workspace/mydungeon-quest run dev
```

### 0.2 File map (verified against the repository)

The game lives at `artifacts/mydungeon-quest/`. All paths below are relative to that directory.

| Concern | Path |
|---|---|
| Rules authority, reducers, turn orchestration | `src/lib/rules.js`, `src/lib/story.js`, `src/App.jsx` |
| The validator (`validateDmTurn`) | `src/lib/protocol.js` |
| Entropy (`makeEntropy`) | `src/lib/protocol.js` |
| The DM contract (MANDATORY CONTRACT + THE CRAFT) | `src/lib/systemPrompt.js` |
| Anthropic tool schema, repair loop, SSE streaming | `server/dm.js` |
| The Foundry (paint and audio lanes, beat lookahead, cache keys) | `src/lib/cinema/` |
| The Audio Director | `src/lib/cinema/audioDirector.js` |
| The seal | `src/lib/seal.js`, `public/verify.html` |
| Local persistence (Dexie / IndexedDB) | `src/lib/db.js` |
| The Chronicler validator | `src/lib/chronicler.js` |
| Chronicler harness (`/api/retell`) | `server/retell.js` |
| Proving ground | `evals/` |

Known eval files: `run.mjs`, `castLaw.test.mjs`, `endings.test.mjs`, `cinematicClose.test.mjs`, `chronicler.test.mjs`, `storybook.test.mjs`, `podcastForge.test.mjs`, `mediaFallback.test.mjs`, `narratorConcurrency.test.mjs`, `audioDirector.test.mjs`, `arrival.test.mjs`.

### 0.3 The public repository is behind the running build

The public repo's README describes a feature surface with no possessions, party, armory, grimoire, story smith, sagas, faction standings, or Traveler's Chart, and lists eleven eval files. The running build has all of those and, per project documentation, roughly 136 courts against a keyless pin near 153.

**The working tree is authoritative, not the README and not this document's file map.** For every path named here:

1. Confirm it exists.
2. If it does not, locate the equivalent module and record the correct path in your phase notes.
3. If a module was split, renamed, or moved into an in-monorepo `fatescript` package, record that.

Report every path correction in the change log. Path drift is information about where the code went, not noise.

Two further consequences. First, the eleven eval files named above are a floor, not the current set; discover the real set before assuming a test does not exist. Second, if `docs/FEATURES.md`, `tools/muster/`, `LOOP_LOG.md`, or `BUILD_STATUS` are absent from the public tree but present in the working tree, use the working tree's versions and say so.

### 0.4 Evidence requirements

Every phase produces three artifacts before it is complete:

1. **A written diagnosis or change note** naming root cause where the phase is a fix, and naming every file touched.
2. **A test** in `evals/`, chained into the `eval` script, passing keyless, printing one `PASS — <name>` line.
3. **A verification run**: the phase test, then adjacent tests, then the keyless `check` command from 0.1, with output captured.

A phase with a passing test and no root cause written down is not complete. Several bugs in this register exist because a prior phase fixed a symptom.

### 0.5 Working rules

- One phase per checkpoint. Do not batch.
- Everything passes keyless.
- Never weaken, skip, or delete a test to get green. If a test blocks correct work, stop and say so.
- **Amending a law means changing all three places in lockstep**: the tool schema in `server/dm.js`, the prompt in `src/lib/systemPrompt.js`, and the validator in `src/lib/protocol.js`. Changing one is how a law becomes unsatisfiable. See E5, which exists because that happened.
- Loosening the validator to make a live failure pass is the forbidden move.
- Diagnose to root cause before fixing. Where a phase says "do not fix in this phase," produce the diagnosis and stop.

### 0.6 If the correct fix is fenced

If the correct fix requires touching a protected module or changing a law, stop and write the case: what the correct fix is, which constraint blocks it, and what the alternatives cost. Do not implement a worse fix silently because the better one was fenced.

---

## 1. CORRECTIONS TO STAGE 1

Two Stage 1 instructions were written against wrong assumptions. Correct them wherever they landed.

### Correction 1 — The failure chain has three stages, not two

Stage 1 Phase A3 said "keep the existing single-retry-then-fallback structure." The actual chain is:

```
Anthropic DM
  → repair turn (exact violations returned as a failed tool result)
    → OpenAI understudy (same schema, same validator; DM_FALLBACK=off disables)
      → safeFallbackTurn (generic prose, mechanically inert)
```

Any Stage 1 work that assumed two stages needs review. In particular, the narration floor must be enforced at every stage, including the understudy, and `safeFallbackTurn` must satisfy the floor or be replaced by one that does.

### Correction 2 — The narration law has a ceiling, and Stage 1 raised the floor above it

The standing law, stated in the README and enforced in all three places:

> **Narration:** 1–8 blocks, 20–180 words total (the craft asks for 60–140).

The leaked validator message from the current build says:

> too few words (49 of at least 200 required for rich)

**A 200-word floor against a 180-word ceiling is unsatisfiable.** A turn that satisfies the floor breaks the ceiling and fails validation. A turn that satisfies the ceiling breaks the floor. There is no legal turn in that window.

This is almost certainly the root cause of P10. If enforcement had been wired, every turn would deadlock into the understudy and then into `safeFallbackTurn`, so whoever implemented A3 made the floor advisory to keep the game moving. Detection without enforcement was the only way to ship an impossible constraint.

The fix is not to enforce the 200-word floor. The fix is to raise the ceiling in lockstep across schema, prompt, and validator, then enforce a floor that fits inside it. E5 covers this.

---

## 2. BUG REGISTER

Print this block at the top of the work order until each item is closed.

### P4 — Beat directive still rendering (carried, not closed)

The chapter title card renders the model-facing beat directive verbatim: "Establish the hero, home, and what deserves protection." Stage 1 Phase A4 specified splitting `beat.directive` (private) from `beat.opening` (player-facing). The card still shows the directive.

### P7 — Voice narration and character voices broken

Regression from Stage C. The LISTEN control renders but no audio plays. Narration and character lines are both affected.

**Read the Sound Law before diagnosing.** The Audio Director refuses any asset with mock or missing provenance at delivery, and `speechSynthesis` is banned outright. The TTS call may be succeeding and the Director may be refusing the segment at the door. Trace the refusal path, not only the resolution path.

### P8 — Validator repair instruction rendering to the player

The validator's repair message is pinned in the footer of every screen:

> "The road snagged: no dialogue: cast are present at the scene (The Pale Herald, Maren Voss) but no one speaks — give at least one line, or mark this a solitary scene; narration floor breach: too few words (49 of at least 200 required for rich) — add concrete sensory prose and at least one character line if cast are present"

Four violations in one string: private validator output rendered, a character named who the player has not met, internal thresholds exposed, em dashes present. It also persists across turns after the condition clears, so the footer holds stale state.

Introduced by Stage 1 Phase A3.

### P9 — Cross-campaign contamination

A new campaign's opening plate contains a lantern and a bell that are significant items from unrelated prior test campaigns. A comet appears in both the plate and the narration.

**Named hypothesis.** The Foundry runs beat lookahead: while beat N plays, beat N+1's still and music phrase are already briefed **under stable cache keys**. If "stable" means content-addressed by beat, subject, and style descriptor without a campaign id, then beat N+1 of a new campaign hits an asset briefed for beat N+1 of an old one. That is a designed optimization producing an isolation defect. Test this hypothesis first.

If contaminating material also appears in the DM prompt, the bleed is in context assembly rather than the Foundry, and that is a data separation defect. Escalate rather than continue.

### P10 — Narration floor detects but does not enforce

A 49-word turn reached the player. See Correction 2: the floor and the ceiling are mutually exclusive, which is why enforcement was never wired.

### T6 — Suggestion chips overlap narration and truncate

The chip row renders on top of prose and the third chip is clipped at the viewport edge with no scroll affordance.

Note: suggestions are already law at exactly 3, distinct, 6 words or fewer. The chips are legal. The container is not. This is a layout defect, not a content defect.

### T7 — HUD avatar renders a reference sheet

The hero avatar shows a multi-panel reference sheet cropped into a circle, displaying two faces. It should be a single-face portrait crop.

### T8 — Contradictory party chip

"Alone: 2 souls known" contradicts itself, uses a house term in chrome, and contradicts a scene with two characters visibly present.

### T9 — Mixed numerals

"CHAPTER 1 OF 15" on the card, "Chapter I" in the heading below it, "PLATE I" on the plate caption. Stage 1 D8 covered counters but not headings or captions.

### T10 — Region banner clipped and mistiled

The banner at the top of the table route is clipped by the HUD and renders as misaligned rectangular tiles.

### T11 — Plate captions are template output

"The staged moment: Tina and Maren Voss beneath an unnamed sky, as this page tells it." Identical phrasing appeared in a prior campaign with names substituted. "Beneath an unnamed sky" and "as this page tells it" carry no information.

---

## 3. NEW RULES

### Rule 21 — Campaigns are isolated

No asset, cache entry, context fragment, memory, graph node, reference sheet, style bible, or prompt fragment crosses a campaign boundary. Every cache key, every retrieval, and every context assembly is scoped by campaign id.

This is an isolation boundary, not a filter. A cross-campaign read must be structurally impossible, not cleaned up after it arrives.

### Rule 22 — Repair notes are ledger-only

Validator output, repair instructions, floor breach details, editor judgments, retry reasons, and reducer notes are written to the ledger and never rendered. If the player must be told something failed, they are told in plain language with no internal detail.

### Rule 23 — Detection implies enforcement

Any check that can fail must have a defined outcome for failure. A check that logs and proceeds is decoration. A check whose constraint is unsatisfiable is worse: it guarantees either a deadlock or a silent bypass. Before wiring enforcement on any check, prove the constraint is satisfiable.

---

# STAGE E — REGRESSIONS AND ISOLATION

## Phase E1 — Stop the leak (P8, Rule 22)

Do this first. A player is currently reading validator output.

### Locate

```
cd artifacts/mydungeon-quest
grep -rn "road snagged" src/ server/
grep -rn "of at least" src/ server/
grep -rn "solitary scene" src/ server/
```

Trace the value from the validator's return in `src/lib/protocol.js` through `src/App.jsx` to the DOM. Identify the component that renders it and the state that holds it.

### Fix

1. **Remove the render path structurally.** Repair output moves to a ledger-only channel with no component subscription. Not hidden with CSS, not conditionally rendered behind a flag. If a single turn-result object currently reaches both the ledger and the view, split it: the view receives a projection with no field capable of holding repair text.

2. **Replace the player-facing signal.** If a signal is warranted at all, use one fixed string with no interpolation: `"This turn came back thin and was sent back once."` Prefer no signal.

3. **Fix the persistence separately.** The note survived past the turn that produced it. Clear turn-scoped state on seal, and find out why it was not clearing. That is a second bug in the same place.

4. **Extend `sanitizeSurface`** (Stage 1 A4) to refuse:
   - any string matching `/\d+\s+of\s+at\s+least\s+\d+/`
   - any string containing a cast name whose reveal is not recorded in the reveals ledger
   - any string whose provenance traces to `protocol.js`, the editor, or the reducers

### Anti-patterns

- Do not add the string to a blocklist. The next repair message will read differently.
- Do not style the footer invisible.
- Do not assume the reveals check is unnecessary. The player had not met The Pale Herald. Presence in the record is not revelation to the player.

### Done when

No rendered string originates from the validator, editor, or reducers under any turn outcome, including understudy and `safeFallbackTurn`.

**Test `repairNotesHidden`:** a fixture turn breaches the floor and the dialogue rule and fails through to `safeFallbackTurn`. Assert zero rendered strings originate from validator or editor; the ledger holds the full detail; footer state is empty after seal; no cast name absent from the reveals ledger renders anywhere.

---

## Phase E2 — Diagnose the contamination (P9, Rule 21)

**Do not fix in this phase.** Produce a written diagnosis.

### Test the named hypothesis first

Open `src/lib/cinema/` and enumerate every cache key shape in use. For each, write down its exact composition. The README describes beat lookahead briefing beat N+1 "under stable cache keys." Determine what "stable" is stable across.

A key composed of beat index, subject name, region name, or style descriptor **without a campaign id** is the mechanism. Confirm or eliminate this before instrumenting anything else. It is the cheapest check and the most likely answer.

### Then reproduce and capture

Run a clean fixture campaign in an isolated storage profile with a world containing no lantern, bell, or comet in its premise, region, or hero description. Capture, for the opening turn:

- the exact prompt sent to the DM, in full, including all context blocks
- the exact cue sent to the painter, in full
- every reference image id attached to that paint call, and the campaign id each belongs to
- every cache key consulted, and its exact composition
- every memory, graph node, and context-pack fragment assembled, with source campaign id
- the style bible in effect and any anchor conditioning hashes applied

### Answer in writing

1. **Did the contaminating items appear in the prompt, the cue, or only in the returned asset?**
   - Only in the returned asset: cache collision. The named hypothesis is confirmed.
   - In the cue: reference selection is drawing foreign subjects.
   - In the prompt: context assembly is bleeding. **This is the serious case.** Mark it a data separation defect and stop for a decision before proceeding to E3.

2. **Which cache keys are campaign-scoped and which are not?** Enumerate all of them.

3. **Where does reference selection draw candidates from?** If the pinned subject selection queries a store not filtered by campaign, that is a second mechanism.

4. **Is the comet foreign?** If only the lantern and bell are foreign, the diagnosis narrows to the Foundry. If the comet is foreign and appears in narration, the bleed is in context and question 1 has already answered itself.

### Done when

A written root cause naming the exact mechanism and its layer, with all four questions answered and artifacts attached.

**Test `contaminationTrace`:** every paint call and every DM call emits a structured record listing the campaign id of every input consumed. No call exits without one. This instrumentation is permanent.

---

## Phase E3 — Enforce campaign isolation (P9, Rule 21)

Fix the mechanism from E2, then apply all of the following, because the others are latent versions of the same defect.

1. **Every Foundry cache key carries the campaign id.** No exceptions: anchors, reference sheets, region plates, style bibles, busts, scene plates, music phrases. The beat lookahead keeps working; its keys just stop being global.

2. **Every retrieval feeding the DM prompt filters by campaign id at the query**, not after. Post-filtering leaves the cross-campaign read possible and relies on the filter being correct.

3. **Reference selection draws only from subjects carded in this campaign's record.**

4. **Boundary assertions** at the edge of both the paint call and the DM call: every input carries a campaign id, and every id equals the active campaign. A mismatch throws. It does not warn, filter, or proceed.

5. **Sweep existing cache entries.** Unscoped entries in a developer's browser will keep reproducing the bug and mask the fix. Evict or migrate them.

### Cache posture warning

A campaign id is varying content. Prompt caching wants stable content first and varying content last. **Do not insert the campaign id ahead of stable prompt bytes.** If isolation requires it in the prompt at all, it goes at the end. Verify posture after this phase and record the result.

### Anti-patterns

- Do not clear the cache on campaign start. That hides the defect and costs every player their legitimate cache.
- Do not filter foreign assets out after retrieval. Make the read impossible.
- Do not scope only the layer where E2 found the bug.

**Test `campaignIsolation`:** two fixture campaigns run in sequence in the same store, with similar worlds and overlapping subject names. Assert no asset id, cache key, reference image, or context fragment from A appears in any call belonging to B; the boundary assertion throws on an injected foreign id; a pre-existing unscoped cache entry is never served.

**Test `cachePosture`:** no varying-content bytes precede stable content in any prompt or briefing assembled after this phase.

---

## Phase E4 — Diagnose and fix voice (P7)

Diagnose in writing, then fix.

### Trace two paths, not one

The hero and carded NPCs may resolve differently. Trace both.

For each, log: the speaker's voice card as stored in the record, the register resolved from it, the `voiceId` resolved from the register, the request body sent to `/api/speak`, the response, **the provenance stamped on the returned segment**, and **the Audio Director's accept or refuse decision at delivery**.

### Check these specifically

- **Director refusal.** The Sound Law refuses any asset with mock or missing provenance at delivery. If Stage C changed how segments are stamped, the Director is refusing real audio as though it were mock. Check `src/lib/cinema/audioDirector.js` and the provenance stamp before assuming TTS failed. This is the most likely cause given that both narration and character lines broke simultaneously.
- **Shape drift from C4.** The identity object changed shape. Confirm the fields written at creation are the fields the casting layer reads. A card populated with `presentation` where casting reads `gender` resolves to null silently.
- **Mapping loss from C6.** Provider names were removed from the surface. Confirm the mapping from a story description back to a concrete `voiceId` survives in the data layer. If the removal deleted the id alongside the name, that is the bug.
- **Hero id not written.** The blessing step moved in C5. Confirm the hero's `voiceId` is still written at creation.

### Fix and guard

Fix the cause. Add a resolution guard: an unresolvable `voiceId` falls back to the register default and logs loudly with the card contents attached. Silent null resolution is what let this ship.

**The fallback must carry real provenance or it will be refused by the Director**, which reproduces the bug with extra steps. If real audio cannot be produced, the honest outcome is silence, per the Sound Law.

The LISTEN control must reflect actual availability: absent, or present and disabled with a plain reason. An inert control is worse than no control.

### Anti-patterns

- Do not hardcode one default voice for everyone. That reintroduces the misgendered-mother class of bug.
- Do not relax `castLaw`.
- Do not reach for `speechSynthesis`. It is banned outright.

**Test `voicePath`:** a fixture campaign resolves a concrete `voiceId` for the hero and every carded character from stated identity alone; a populated voice card never resolves to null; a forced resolution failure produces a logged fallback and no inert control; the `/api/speak` request body matches the expected shape; a real segment carries provenance the Director accepts. Chain into `castLaw` and `audioDirector.test.mjs` without relaxing either.

---

## Phase E5 — Make the narration law satisfiable, then enforce it (P10, Rule 23)

Read Correction 2 first. This phase fixes an unsatisfiable constraint before it fixes enforcement.

### Step 1 — Establish the real window

Decide the narration window the game actually wants. The player reports turns are too thin, and the current ceiling of 180 words is genuinely short for a turn with dialogue and sensory ground. Pick a window with room in it, for example a floor around 180 and a ceiling around 400, with the craft asking for a range inside that.

Whatever numbers you pick, **the floor must sit comfortably below the ceiling**, with enough space that a model aiming at the craft target lands legally without precision.

### Step 2 — Amend the law in all three places, in lockstep

Per the standing amendment rule:

1. **The tool schema** in `server/dm.js` — the word and block bounds the model is taught.
2. **The prompt** in `src/lib/systemPrompt.js` — the MANDATORY CONTRACT word budget and THE CRAFT target.
3. **The validator** in `src/lib/protocol.js` — the enforced bounds.

All three move in the same change. A mismatch between any two reproduces this bug in a new place.

Also update the beat-aware ranges if the editor holds a measure band per beat, so the editor does not fight the new window.

### Step 3 — Enforce at every stage

The chain is Anthropic → repair → understudy → `safeFallbackTurn`. The floor applies at every stage:

- On breach, the repair turn names the deficiency specifically.
- The understudy is bound by the same window.
- **`safeFallbackTurn` must satisfy the floor.** If it currently emits short generic prose, it needs rebuilding: construct it deterministically from known facts, present characters, location, time, standing beat, last stated consequence, and the hero's carried item. Assembled, not padded.
- No path admits a sub-floor turn to the record. If every stage fails, that is a hard error with an honest failure state.

### Step 4 — Audit for the same shape

The defect class is "check whose constraint cannot be met." Inventory every check in the turn pipeline. For each, prove the constraint is satisfiable and confirm the failure branch is defined. Any check that is decorative gets a branch or gets removed, and stops being described as a law in the docs.

### Anti-patterns

- Do not enforce the 200-word floor against the 180-word ceiling. That deadlocks every turn into the fallback.
- Do not raise the validator's ceiling alone. The model will keep writing to the prompt's budget and the schema's bounds.
- Do not make the floor advisory again.

**Test `narrationWindow`:** the schema bounds, the prompt budget, and the validator bounds are mutually consistent; the floor is strictly below the ceiling with a stated margin; a turn at the craft target passes.

**Test `floorEnforced`:** a fixture model returning 49 words at every stage produces `safeFallbackTurn`; the fallback measures above the floor; no path admits a sub-floor turn to the record.

**Test `checksEnforce`:** every validator check has a defined failure branch and a satisfiable constraint. New checks must register both.

---

## Phase E6 — Close P4 properly

Verify the split from Stage 1 A4 exists in the data. If `beat.opening` was never authored, author it now: one hand-written player-facing line per beat, adapted to the world's premise per Stage 1 B1. Every beat in every shipped spine needs both fields.

Enforce the separation structurally. The chapter card renders `beat.opening`. Remove `beat.directive` from any object passed to a component; it travels from the spine to the prompt builder and nowhere else. If the current code passes the whole beat object to the view, split it at the boundary.

**Test `beatSplit`:** every beat in every shipped spine has both fields populated; no component receives an object containing a `directive` field; the rendered chapter card string never matches any directive string across all spines.

---

## Phase E7 — Chrome regressions (T6 through T11)

**T6, chips over narration.** First determine why the Stage 1 probes pass while this ships: either the table route is not covered, or the probes assert on the wrong element. Fix the coverage gap, then the layout. Reserve the chip row height in the narration container's bottom padding. Horizontal scroll with snap, edge fades that appear only when scroll is available, proper ellipsis, no mid-word cuts. The chips are legal at 3 and 6 words; the container is the defect.

**T7, HUD avatar.** Bind to a single-face crop of the hero's selected portrait. If only a multi-panel reference sheet exists, crop panel one at 1:1 on the face. Never render a multi-panel image inside a circle. Assert at the binding, not only in the test.

**T8, party chip.** One meaning per chip. Party size reads "Traveling alone" or "Party of 3." Cast known reads "3 characters known." Two facts get two chips. Remove "souls" and every other house term from chrome. Confirm the value agrees with the scene.

**T9, numerals.** Arabic in counts, headings, and captions: "Chapter 1 of 15," "Chapter 1: The Ordinary Flame," "Plate 1." Extend the chrome copy check to headings and captions, not only counters.

**T10, region banner.** Reserve the top chrome height on the banner element. The tiling suggests a partially loaded image being laid out in fragments or a background-size bug. Diagnose which. If it is a loading state, give it a placeholder at the correct ratio that does not shift layout on arrival.

**T11, plate captions.** Generate from the cue's actual content: who is present, where, what is happening. Remove "beneath an unnamed sky" and "as this page tells it." Omit unknown facts rather than naming their absence. The caption must carry information the image does not.

**Test `chromeRegressions`:** on the table route at 360, 390, and 430 widths, assert zero overlap between the chip row and narration; zero chips ending mid-word; the HUD avatar resolves to a single-face asset at 1:1; no chip string contains two contradictory facts; zero roman numerals in any heading, counter, or caption; the region banner does not intersect the HUD.

**Test `captionDistinct`:** ten fixture campaigns produce ten plate captions with no shared phrase over five words.

---

# STAGE F — RECOMMENDED UPGRADES

Not reported bugs. Problems the architecture will produce, ordered by cost of late discovery.

## F1 — Storage quota handling (highest unreported risk)

`src/lib/db.js` holds campaigns, journal, memory, and media in Dexie/IndexedDB. The only true copy is on the player's device, with no server-side saves by design. Illuminated tier allows 80 images per session. Eviction exists only as a manual "sweep the cellar" control the player must find in Settings and choose to run.

Mobile browsers enforce quotas aggressively. A `QuotaExceededError` inside a seal transaction, on a device-local vault with no mirror, loses a campaign with no recovery path. Nothing in the documentation addresses it.

**Build:** query `navigator.storage.estimate()` at campaign start and before each media write, and surface real usage in Settings rather than a session counter. Define a quota policy: warn threshold, stop-painting threshold, eviction order under pressure (the cellar's existing order is the right starting point, made automatic). Wrap every seal transaction so a quota failure is caught, named honestly, and leaves no partial write. The sealed record must survive a failed media write. Consider storing media as Blobs rather than base64, which costs roughly a third more space and is the common cause of hitting quota early.

**Test `quotaSafety`:** a fixture run with a stubbed quota failing at a known threshold asserts the record stays consistent, the failure is named in plain language, painting degrades to text-only rather than crashing, and no partial write enters the chain.

## F2 — Crash and interruption recovery

The turn pipeline ends in a seal. A tab close, backgrounded mobile browser, network drop, or OOM kill mid-turn leaves an indeterminate state with no described recovery.

**Build:** define the contract. A turn is fully sealed or absent; there is no partial turn. On startup, detect an interrupted turn and either discard it with a plain message or offer to resume from the player's last input. Confirm the seal transaction is genuinely atomic across the journal row and the head-hash update under interruption, not only under normal flow.

**Test `interruptionRecovery`:** kill the process at each stage of the pipeline in a fixture; assert the record is always valid on reload, the chain verifies, and no turn exists in a partial state.

## F3 — Full-campaign replay determinism

Stage 1 changed the prompt, validator, fallback, creation, identity, and voice. Stage 2 changes cache keys, context assembly, and the narration law itself. That is a large surface of change against a guarantee that every derived surface is a replay of the record.

**Build:** a gate that replays a long fixture campaign (30+ turns including ticks, act changes, combat, and a repaired turn) and asserts cards, graph, chart, party, standings, and the Book are byte-identical across two runs. Assert a pre-Stage-1 save still loads and replays.

**Test `replayStable`:** two full replays produce byte-identical derived surfaces; a pre-change save still loads.

## F4 — Per-turn latency feedback

Stage 1 B2 fixed the opening. Every turn after it has the same problem in smaller form.

**Build:** per-turn progress using the same named-step vocabulary as the opening. Disable the composer during a turn and say why rather than accepting input that will be discarded. Define and enforce a turn budget; if a step exceeds it, say so and continue.

**Test `turnFeedback`:** a fixture turn with delayed model and delayed paint renders a named progress state throughout; the composer is disabled with a stated reason; no blank period exceeds two seconds without an indicator.

## F5 — Player recourse, built on the X-card

The X-card already exists: redactions append events, the visible story bends to player consent, the audit trail does not. The composer's flag button is presumably its entry point, and the beta report shows "errata kept: 0."

Given that P10 let a 49-word turn reach a player, define recourse explicitly: what the flag records, whether a player can request a retry, and how a rejected turn interacts with the append-only chain. Follow the existing redaction shape rather than inventing a second mechanism. Confirm redacted turns still never reach the Chronicler.

## F6 — Verify the unexpected-suggestion clause is enforced

Suggestions are law: exactly 3, distinct, 6 words or fewer, **and one should be unexpected**. The first three constraints are mechanically checkable and presumably enforced in the validator. "One should be unexpected" is not mechanically checkable and is probably prompt-only.

Either give it a real definition the validator can hold (for example, one suggestion must not share a verb or object with the other two, or must not advance the standing beat), or move it out of the law and into the craft section where unenforceable guidance belongs. A law that cannot be enforced weakens the ones that can.

## F7 — Image tempo

Plate-per-turn is known-slow and Settings already exposes "The tempo of the brush." Building the other tempos (turning points only, chapter openings only) is the cheapest latency win available and reduces quota pressure per F1.

## F8 — Audio lifecycle

With voice fixed in E4, define its lifecycle within the Sound Law: what happens when a player taps LISTEN then submits a turn, whether new-turn narration preempts a playing line (the Law says voice preempts music instantly; voice over voice is the open question), whether audio preloads, and what happens on a backgrounded tab.

## F9 — Long-session rendering performance

A 26-turn campaign holds every turn's prose and inline images in the DOM. Measure at 30, 60, and 100 turns on a mid-range Android device, then virtualize if the numbers justify it.

## F10 — Text scale at maximum

Settings offers a text scale slider. Stage 1 D3 specifies a fixed-height HUD and single-line chips. Those collide at large scales. Test every layout at maximum scale and define which elements may grow.

## F11 through F16 — Bank these

- **F11 Screen reader flow.** New turns announce via a live region; narration, speaker attribution, and captions read in a sensible order.
- **F12 Browser back button.** Confirm it does not destroy campaign state or exit mid-turn on Android.
- **F13 Offline behavior.** The client is law and the vault is local. Define what a campaign does with no network.
- **F14 Campaign list and resume.** With no cloud mirror, the return path must be obvious and safe.
- **F15 Keepsakes.** `storybook.test.mjs` and `podcastForge.test.mjs` hold the law, but neither surface was exercised in these playtests. Verify by hand before beta widens.
- **F16 Reveals ledger coverage.** The Pale Herald appeared in a leaked string before the player met them. E1 patches one exit. Audit every surface that can name a character against the reveals ledger.

---

## 4. CONSTRAINTS

- **Do not modify:** `src/lib/seal.js`, `src/lib/rules.js`, `src/lib/chronicler.js` and the Chronicler's three laws, the Audio Director interlock in `src/lib/cinema/audioDirector.js`, Anchor Law logic. `src/lib/protocol.js` is additive only **except** in E5, where the narration bounds change in lockstep with schema and prompt.
- **`server/dm.js`** is modified in E5 only, and only for the narration bounds in the tool schema. The repair loop and streaming structure are untouched.
- **Foundry cache keys** are modified in E3 only, and only to add campaign scoping. The beat lookahead behavior is preserved.
- **E1 and E5** change where output goes and what happens on failure. They do not change the three-stage failure chain.
- **E3** tightens isolation. Do not relax any existing check to make it pass.
- **E4** fixes resolution and provenance. Do not relax `castLaw` or the Sound Law. `speechSynthesis` stays banned.
- No test weakened, skipped, or deleted. Everything passes keyless.
- One phase per checkpoint.

## 5. ORDER OF WORK

**E1, E2, E3, E4, E5, E6, E7**, then Stage F by agreement.

E1 first: a player is reading validator output, and the fix is small and contained.

E2 and E3 next: if E2 finds the bleed in context assembly rather than the Foundry cache, **stop and escalate**. That is a data separation defect and becomes a cross-account defect the moment there is more than one account.

E4 before E5: voice is a total feature outage; the floor is a quality failure.

E5 is the largest phase because it amends a law in three places. Budget accordingly and do not rush the lockstep.

E7 last within the stage: chrome regressions are visible but not corrupting.

## 6. IMPORT VERIFICATION

Setup passes, all existing tests green under the keyless command in 0.1, and the work order prints the bug register with P4, P7 through P10, and T6 through T11, each marked open or closed.

If any test is red on arrival, stop and report before starting E1. A red test means a Stage 1 phase regressed, and that changes what E-phase work is safe.
