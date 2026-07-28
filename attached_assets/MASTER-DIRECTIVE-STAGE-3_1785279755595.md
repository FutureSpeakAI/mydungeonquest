# MASTER DIRECTIVE — STAGE 3

## Data Loss, Playback, Plate Delivery, and Structural Repair

Three new failures, two of which are severe, plus a set of structural findings from reviewing the repository. One of those findings suggests a portion of the Stage 1 UI test suite may be passing without testing anything.

---

## 0. FINDINGS FROM THE REPOSITORY REVIEW

### 0.1 None of Stage 1 or Stage 2 has been pushed

The public repository is at 82 commits with a byte-identical tree and README to its state before Stage 1 began. Every change from both stages exists only inside the Replit container.

That means the code has one copy and the campaign data has one copy, both of them single points of failure, and a playtest just destroyed a campaign. Pushing is the highest-value action available and it takes minutes.

**Do this before any other work in this directive.** Commit and push the current working tree, then push again at the close of every phase below.

### 0.2 The README is now substantially wrong

It is the entry-point document for the repository and for any agent reading the codebase cold. It currently states:

- A feature surface with no possessions, party, armory, grimoire, story smith, sagas, faction standings, or Traveler's Chart. All of those are in the running build.
- Eleven eval files. The build has roughly an order of magnitude more.
- **The narration law as 1 to 8 blocks, 20 to 180 words.** Stage 2 Phase E5 amended that window. The README now documents a law the code no longer holds.
- A file map that predates the Stage 1 and Stage 2 module changes.

A stale README is not cosmetic here. It is the document a fresh agent reads to learn the architecture, and it will teach the wrong narration law. Update it in the same commit as the push in 0.1.

### 0.3 The proving ground cannot see the bugs being reported

This is the most important structural finding.

The eval suite runs headless in Node, with an esbuild JSX loader, `react-test-renderer`, and `fake-indexeddb`. That environment has:

- **No audio.** No `Audio` element, no `AudioContext`, no autoplay policy, no playback. Every audio test exercises the Audio Director's decision logic, not whether a sound is ever heard. A playback failure is structurally invisible to the entire suite. This is consistent with voice being broken across two stages while `audioDirector.test.mjs` and `narratorConcurrency.test.mjs` stay green.

- **No layout engine.** `react-test-renderer` produces a component tree, not a rendered document. There are no bounding boxes, no computed styles, no viewport, no scroll. **Any Stage 1 test asserting that an element does not intersect the header, that a chip does not truncate mid-word, or that a container is not more than twice the height of its content cannot be measuring those things in this harness.** If `safeInsets`, `composerFit`, `frameLaw`, `emptyFit`, `hudFit`, `chromeRegressions`, or `forgeChrome` were written into the existing suite, verify what they actually assert. A test that passes because `getBoundingClientRect` returns zeros is worse than no test: it certifies a property it never checked.

  This is the likely reason T6 shipped with the chip row overlapping narration while the probes were green.

- **No real IndexedDB.** `fake-indexeddb` has no storage quota, no eviction, and no browser-specific transaction behavior. Quota and crash-recovery failures are invisible here too.

**Phase G4 addresses this.** Until it lands, treat every layout and audio test result as unverified.

---

## 1. BUG REGISTER

### P11 — A crash rendered a campaign permanently unplayable (blocker)

A playtest crashed and the campaign will no longer load. On a device-local vault with no server-side saves and no cloud mirror, this is unrecoverable data loss.

Severity is blocker for two reasons beyond the lost campaign. First, the failure mode is total: not degraded, not partial, gone. Second, if the campaign cannot load, the player cannot export it either, so there is no path to rescuing the data by hand.

Leading causes, in order of likelihood:

1. **Shape drift with no migration.** Stage 1 Phase C4 changed the identity object, E5 changed the narration bounds, E3 changed cache keys. A campaign sealed under the old shape, loaded by new code, hits a field that is now required and absent. Stephen imports zips repeatedly, so campaigns routinely outlive the code that made them.
2. **An unguarded reducer throw on replay.** Every derived surface is a replay of the record. If one malformed entry makes `applyStoryUpdates`, `applyStateUpdates`, or the card builder throw, and nothing catches per entry, the whole campaign is unloadable because of one bad row.
3. **Chain verification failing closed.** Correct behavior by design, with no repair path offered, which turns a recoverable situation into a total one.
4. **Quota exceeded mid-seal.** The seal writes the journal row and the head-hash update in one Dexie transaction. A quota failure inside that transaction, if partially applied or retried badly, leaves an inconsistent head.

### P12 — Voice still broken in both creation and gameplay

Stage 2 Phase E4 did not close it. Both the creation-time audition and gameplay narration fail.

**That both fail is the diagnostic.** They are different resolution paths with different inputs. What they share is the `/api/speak` endpoint, the ElevenLabs adapter, and the actual playback primitive. A cause in voice resolution would break one and not the other. A cause in the shared layer breaks both, which is what is happening.

**New leading hypothesis: lost user-gesture context.** If `play()` is called after `await fetch('/api/speak')` resolves, the browser's user-activation context is gone. Mobile Chrome and Safari reject the returned promise. If that rejection is unhandled, the failure is completely silent: the control renders, the tap registers, and nothing happens. This would break both paths identically, would have worked on desktop during development, and is invisible to the Node test suite per 0.3.

Second hypothesis: an `AudioContext` created in a suspended state and never resumed after a gesture.

Third: the provenance stamp is wrong and the Audio Director is refusing real segments at the door, per the Sound Law.

### P13 — Plates render everywhere except the narrative column

Codex art, creation art, and card art all work. In-narrative plates do not. This is the same split originally reported as P1, which means Stage 1 Phase A2 either did not fix it or Stage 2 Phase E3 broke it again.

**The narrative column is the only surface that requires turn attestation.** Codex and card art are attested to a subject, not to a turn. That is precisely why it is the only surface failing, and it means the defect has been in attestation binding from the beginning.

E3 changed every Foundry cache key to add campaign scoping. If the mint path and the lookup path were not updated together, plates now land under a key nothing reads.

The `plateTrace` instrumentation from Stage 1 Phase A1 should still be in place. Read it before writing any code.

---

## 2. NEW RULES

### Rule 24 — The record survives the code

A campaign sealed by an older version of the app must load, replay, and export under a newer one. Where a shape changed, a migration exists. Where no migration is possible, the load path degrades rather than throwing.

### Rule 25 — Export always works

Export is the player's escape hatch and it must not depend on the campaign being loadable, replayable, or chain-valid. A corrupted campaign still exports its raw sealed rows. A player never loses data because a surface would not render.

### Rule 26 — A test that cannot observe its property does not assert it

Any test claiming a layout, timing, or playback property must run in an environment capable of producing it. A test that would pass in an environment where the measured value is always zero or undefined is a false certificate and must either move to an environment that can see the property or be renamed to describe what it actually checks.

---

# STAGE G

## Phase G0 — Push, before anything else

Commit the current working tree and push to `github.com/FutureSpeakAI/mydungeonquest`.

Update the README in the same commit for every item of drift in 0.2:

- **The narration law.** The README states 1 to 8 blocks, 20 to 180 words, craft target 60 to 140. E5 amended that window. Replace with the current numbers, read from the validator, not from memory.
- **The feature surface.** Add possessions, party, battle with bestiary and doom, the armory, the grimoire, leveling, conditions, the story smith, sagas, heirs, progress clocks, faction standings, horizon rumors, and the Traveler's Chart. The current README describes a build roughly two seasons old.
- **The eval list.** The README enumerates eleven files by name. Either enumerate the current set or replace the list with a pointer to the directory and a count, so it cannot drift again.
- **The file map.** Correct any path changed by Stage 1 or Stage 2, including modules added for creation, isolation, and the repair loop.
- **The failure chain.** Confirm the three-stage chain (repair, understudy, `safeFallbackTurn`) still matches the code after E5.
- **The test-environment caveat.** Add a short, honest paragraph stating that the Node suite cannot observe layout, playback, or storage quota, and naming the browser suite that does once G4 lands.

Push again at the close of every phase in this directive.

**Done when:** the remote tree matches the working tree, and every law the README states matches the code that enforces it. Verify the narration law by reading the validator, not the README.

---

## Phase G1 — Recover the campaign, then make loss impossible (P11, Rules 24 and 25)

### Step 1, triage the dead campaign

Before changing anything, find out what state it is actually in. Open the IndexedDB store for the affected campaign and determine:

- Does the journal contain rows? How many?
- Does the chain verify? If not, at which entry does it first fail?
- Does the head hash match the last journal row?
- Does the load path throw? With what error, at what entry, in which module?
- Is the campaign row itself intact, or is it the journal that is damaged?

Report this before writing a fix. The answer determines whether this is shape drift, an unguarded throw, a chain break, or a partial write, and those have different fixes.

### Step 2, make the load path unable to throw

Every derived surface is a replay. Wrap the replay per entry. A malformed entry is skipped, recorded as skipped with its index and the reason, and surfaced to the player as an honest note. It never takes down the campaign.

This is the single change that converts total loss into partial loss, and it is worth doing regardless of what step 1 finds.

### Step 3, export works on a broken campaign

Build an export path that reads raw journal rows and writes them out without replaying, validating, or rendering anything. It must succeed on a campaign that cannot load.

This is the highest-value item in the phase. With it, no failure is ever total, because the player can always get their record out.

### Step 4, a vault repair tool

Verify the chain, find the last entry where it still verifies, and offer the player two honest options: continue the campaign from that point, or export everything and start fresh. Truncation is recorded in the journal as an event, consistent with existing journal law, which strikes rather than erases.

### Step 5, migrations for the Stage 1 and Stage 2 shape changes

Enumerate every field whose shape changed in Stage C, E3, and E5. For each, write a migration that upgrades an older campaign on load. Where a field cannot be reconstructed, supply a documented default rather than throwing.

Confirm the back-compat gate covers the new shapes. If it walks a save that predates possessions, it also needs to walk one that predates the Stage C identity change.

### Anti-patterns

- Do not fix this by clearing or resetting broken campaigns. That is the data loss, automated.
- Do not relax chain verification to make a broken campaign load. Truncate honestly instead.
- Do not make export depend on the replay path.

**Test `loadNeverThrows`:** fixture campaigns with a malformed entry, a missing required field, a shape from before each Stage 1 and Stage 2 change, and a broken chain all load; each surfaces an honest note; none throws.

**Test `exportAlwaysWorks`:** every one of those fixtures exports successfully, and the export contains the raw sealed rows.

**Test `vaultRepair`:** a campaign whose chain breaks at entry K offers continuation from K-1; the truncation is recorded as a journal event; the resulting chain verifies.

---

## Phase G2 — Fix playback (P12)

### Step 1, instrument before theorizing

Find every `play()` call and every `AudioContext` construction. At each, log: whether a user gesture is in progress, the context state, the provenance on the segment, the Audio Director's accept or refuse decision, and the resolution or rejection of the `play()` promise with its error name.

Then tap LISTEN on a real device and read the log. The answer will be in it.

### Step 2, the likely fixes

**If `play()` is rejecting with `NotAllowedError`,** the gesture context was lost across the await. Fix by creating and priming the `Audio` element synchronously inside the tap handler, before any fetch, then setting its source when the bytes arrive. Alternatively, unlock audio once on the first user gesture in the session and reuse the unlocked element.

**If an `AudioContext` is suspended,** call `resume()` inside a user gesture handler and confirm the state transitions.

**If the Director is refusing real segments,** fix the provenance stamp. Do not relax the Director. The Sound Law's refusal is correct; the stamp is wrong.

**In every case,** catch and log the `play()` rejection. An unhandled rejection here is why two stages of work did not find this.

### Step 3, honest controls

If audio cannot be produced or played, the LISTEN control is absent, or present and disabled with a plain reason. An inert control is the worst outcome and is what shipped.

### Anti-patterns

- Do not reach for `speechSynthesis`. It is banned outright.
- Do not relax the Sound Law or the Audio Director.
- Do not declare this fixed on the basis of a green Node test. Per 0.3, the suite cannot hear anything. This phase is verified on a real mobile device or it is not verified.

**Test `playbackReal`:** a browser-environment test (see G4) that asserts a segment actually plays, that a lost-gesture scenario is caught and logged rather than swallowed, and that an unplayable segment yields no inert control.

---

## Phase G3 — Fix plate delivery to the narrative column (P13)

### Step 1, read the existing trace

`plateTrace` from Stage 1 Phase A1 should be emitting cue turn, arrival turn, head turn, and outcome for every attempt. Read it for a failing in-narrative plate before writing code.

### Step 2, compare the two paths directly

Write down, side by side, how a codex subject asset and an in-narrative plate each move from cue to render: the key minted at cue time, the key used at lookup, the attestation written at delivery, and the check performed by the render door.

The narrative column is the only path requiring turn attestation. Confirm whether the mint and lookup key shapes still match after E3 added campaign scoping. A mismatch between mint and lookup is the most likely cause and the easiest to confirm.

### Step 3, fix the binding, not the door

The render door stays fail-closed. A plate is bound to the turn that requested it by turn id, renders on that turn's entry even if it arrives late, and is never discarded for arriving after the head moved.

**Test `plateBindingLive`:** a fixture requests a plate at turn N, advances the record by a tick and a turn before the plate resolves, and asserts the plate renders on turn N; the mint key and the lookup key are asserted equal by construction, not by coincidence; a tampered attestation is still refused.

---

## Phase G4 — Give the proving ground eyes (Rule 26)

This phase exists because 0.3 found that the suite cannot observe the properties several tests claim to check.

### Step 1, audit the existing tests

For every test added in Stage 1's D phases and Stage 2's E7, determine what it actually asserts in `react-test-renderer`. Any test measuring geometry, overlap, truncation, or container height is suspect. Report the audit before changing anything.

Rename or remove every test that certifies a property it cannot observe. Do not leave them passing.

### Step 2, add a browser environment

Add a headless browser harness (Playwright or equivalent) as a second suite, separate from the keyless Node suite, which stays exactly as it is.

The browser suite covers what Node cannot:
- Layout, overlap, truncation, safe insets, at 360, 390, and 430 widths.
- Audio playback, including the gesture-context path.
- Real IndexedDB behavior including quota, under a stubbed quota where needed.

### Step 3, keep the floor honest

The Node suite remains the keyless floor and must still pass with zero keys. The browser suite is additive. Do not merge them, and do not make the keyless floor depend on a browser.

**Test `harnessHonest`:** every test in the Node suite is checkable in Node; every geometry, playback, or storage assertion lives in the browser suite.

---

## Phase G5 — Storage quota (carried forward from F1, now urgent)

P11 makes this concrete rather than theoretical. With the browser harness from G4 in place, this is now testable.

Query `navigator.storage.estimate()` at campaign start and before each media write. Surface real usage in Settings. Define the quota policy: warn threshold, stop-painting threshold, and automatic eviction order under pressure using the cellar's existing order. Wrap every seal transaction so a quota failure is caught, named honestly, and leaves no partial write.

Consider storing media as Blobs rather than base64 strings, which costs roughly a third more space and is the common cause of hitting quota early.

**Test `quotaSafety`:** in the browser harness, a stubbed quota failing at a known threshold leaves the record consistent, names the failure plainly, degrades to text-only rather than crashing, and admits no partial write.

---

## Phase G6 — Documentation repair

Three stages of work have landed with no corresponding movement in the documentation. Under the standing rule, a law is stated in the docs, enforced in code, and held by a gate. Rules 20 through 26 currently exist only in directive files that are not in the repository, which means they are enforced but not stated, and a fresh reader cannot learn them.

This phase closes that. It is last in the stage because the code must settle first, and it is not optional.

### Step 1, land the laws in the constitution

Rules 20 through 26 from Stages 1, 2, and 3 need a home in the repository, alongside the existing cLaws and the Sound Law:

- **Rule 20** — setup speaks plainly
- **Rule 21** — campaigns are isolated
- **Rule 22** — repair notes are ledger-only
- **Rule 23** — detection implies enforcement, and a constraint must be satisfiable
- **Rule 24** — the record survives the code
- **Rule 25** — export always works
- **Rule 26** — a test that cannot observe its property does not assert it

For each, state it plainly, name its enforcement point by file, and name the gate that holds it. A rule with no gate named is not a law yet; say so explicitly rather than implying coverage.

### Step 2, restore the directive paper trail

The repository root holds `EXPERIENCE-DIRECTIVE.md` and `EXPERIENCE-DIRECTIVE-III.md` and nothing between or after. The directives are supposed to ship as the record of how the thing was built.

Land the Stage 1, Stage 2, and Stage 3 directives in the repository, unedited, in whatever numbering scheme the existing two establish. If intermediate directives exist only in chat, note the gap rather than papering over it.

### Step 3, CHANGELOG

`artifacts/mydungeon-quest/CHANGELOG.md` needs entries for Stage 1, Stage 2, and Stage 3. Under the chronicle rule, no pin, version, or law-byte moves without its changelog entry. Three stages of law changes have moved without one.

Write the entries now, then never let it fall behind again.

### Step 4, the feature roll and the gate count

If `features.mjs`, `docs/FEATURES.md`, `LOOP_LOG.md`, and `BUILD_STATUS` exist in the working tree, bring each current and confirm they are in the pushed tree. The public tree's `docs/` directory contains only `archive/`, so at least one of these is either absent or unpushed.

`BUILD_STATUS` additionally needs a new column after G4: which suite holds each gate, Node or browser. A reader must be able to tell at a glance which gates can see what they claim to check.

### Step 5, GAME_NOTES

Reconcile `GAME_NOTES.md` with the current build the same way as the README.

### Step 6, restore the standing rule

Add the doc-sync rule to whatever file carries the working conventions, so this phase does not need to exist again:

> Code and documentation move in the same commit. `features.mjs` and `docs/FEATURES.md` are regenerated together with `--write-doc`. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change. A law changed in code and not in docs is an incomplete change, not a shipped one.

**Test `docsCurrent`:** every law named in the README and the constitution resolves to a named enforcement point that exists in the tree; the narration bounds stated in documentation equal the bounds in the validator; every rule listed as having a gate names a gate that exists.

---

## 3. CONSTRAINTS

- G0 first, always. Unpushed work is the largest structural risk in the project right now.
- **Code and documentation move in the same commit.** `features.mjs` and `docs/FEATURES.md` regenerate together with `--write-doc`. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change. This rule was carried by Stages 1 and 2, was dropped from the first draft of Stage 3, and is restored here. G6 exists to clear the backlog it accumulated in the meantime.
- Do not modify `src/lib/seal.js`, `src/lib/rules.js`, `src/lib/chronicler.js`, or the Audio Director interlock. G1 adds a repair path around the seal; it does not change the seal.
- G2 fixes the playback path and the provenance stamp. It does not relax the Sound Law.
- G3 fixes key binding. The render door stays fail-closed.
- G4 may rename or remove tests **only** where they certify a property they cannot observe, and every removal is replaced by an equivalent test in the browser suite. This is the one sanctioned exception to "tests only grow," and it applies to nothing else.
- The Node suite stays keyless.
- One phase per checkpoint. Push at the close of each.

## 4. ORDER OF WORK

**G0, G1, G2, G3, G4, G5, G6.**

G0 first because everything else is unbacked.

G1 next because it is active data loss and step 3 alone (export on a broken campaign) means no future failure is ever total.

G2 and G3 are the two features currently broken in front of players.

G4 before G5 because G5 cannot be tested without it, and because G4 tells you which of the Stage 1 UI fixes actually landed.

G6 last because the code must settle before the documentation describing it can be written once rather than twice. Last does not mean optional: three stages of law changes are currently unstated, and the doc-sync rule restored in the constraints only prevents new drift, it does not clear the existing backlog.

## 5. VERIFICATION

For G2 and G3, a green Node suite is not sufficient evidence. Both are verified on a real mobile device, and the verification is recorded with what was observed.

For G1, verification includes loading a campaign sealed before Stage 1, one sealed mid-Stage-2, and the crashed campaign itself.
