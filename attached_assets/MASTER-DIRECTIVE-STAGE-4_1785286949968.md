# MASTER DIRECTIVE — STAGE 4

## Diagnosis, Observability, and the Browser Harness

Stage 3 G1 through G4 and G6 landed. This stage closes the diagnosis that was skipped, fixes a live bug the G2 work probably only half-solved, converts a class of silent failure into loud failure, and finally builds the browser harness that everything else has been waiting on.

Plain language throughout. Literary voice belongs in narration, dialogue, and the Book.

---

## 0. WHAT STAGE 3 LEFT OPEN

### 0.1 P11 was never diagnosed

G1 Step 1 was: triage the dead campaign and report its state before writing a fix. Does the chain verify? At which entry does it first fail? Does the load path throw, and where?

That report does not exist. Resilience was built around the crash without root-causing it. The resilience is good and it stays. But the cause determines which follow-up is urgent, and right now that is a guess.

**Phase H0 produces the diagnosis, and the diagnosis reorders the rest of this directive.**

### 0.2 A guard is not a migration

G1 Step 5 was migrations for the Stage C identity shape, the E3 key change, and the E5 narration bounds. What landed was an `onOpen` guard.

The guard means a shape-drift throw no longer strands a player on the title screen. It does not mean the campaign loads correctly. Old campaigns are still broken; they now fail more gracefully. That is a real improvement and it is not the thing Step 5 asked for.

### 0.3 Two gates were not accounted for

G1 named `loadNeverThrows` and `exportAlwaysWorks`. The completion report names `plateBindingLive` and `harnessHonest`. Confirm whether the other two exist, and if not, whether the properties they were meant to hold are held by anything.

### 0.4 The Stage 1 and Stage 2 UI work remains unverified

`harnessHonest` correctly established that layout tests in the Node suite are CSS source checks. A CSS source check confirms the stylesheet says the right thing. It does not confirm the rendered result is right.

T6 (chips overlapping narration), T7 (avatar rendering a reference sheet), and T10 (region banner clipped and mistiled) are reported fixed and unconfirmed. So are the Stage 1 D-phase claims: safe insets, frame ratios, empty-state heights, HUD fit, composer containment. None of it is verified until Phase H4 lands.

### 0.5 The documentation backlog is partly cleared

G6 landed `docs/CLAWS.md` with Rules 21 through 26, restored the doc-sync rule in `CONTRIBUTING.md`, and regenerated `docs/FEATURES.md`. Good.

Not mentioned: CHANGELOG entries for Stages 1 through 3 (G6 Step 3), and the directive paper trail (G6 Step 2). The `soulsWeb` pin moved from 646228 to 646337 without a changelog entry, which the chronicle rule forbids.

---

## 1. BUG REGISTER

### P14 — Audio may stop after the first segment (suspected, verify first)

Mobile autoplay permission attaches to the specific `Audio` element that played during a user gesture. It does not attach to the page.

If narration reuses one element and swaps `.src` per segment, every segment plays. If each segment constructs `new Audio()`, only the first plays; the rest are constructed from an `ended` handler, which is not a gesture, and fail silently.

`primeNarration()` fixes the first segment either way. So if this bug exists, it presents as voice working and then cutting off after one line, which is easy to read as a content problem rather than a playback problem.

The `AuditionRow.play()` fix is correct for auditions, where one tap plays one clip. The narration path plays a chain from one tap and needs the element-reuse pattern instead.

**Verify before fixing.** Play a turn on a real phone that has narrator prose followed by a character line, and watch whether the character line follows.

### P15 — Refused assets fail silently

The G3 root cause is the shape of this: the E3 isolation assertion fired correctly, and the visible result was every in-narrative plate silently vanishing. The assertion was doing its job. Nobody could tell.

An enforcement point that refuses an input without surfacing the refusal is half-enforced. It protects correctness and destroys observability, and it cost two stages of debugging on P13.

This is a class, not an instance. Every boundary assertion, every render-door refusal, every provenance rejection, every quota catch, and every validator branch either surfaces its refusal to a log with enough context to act on, or it is invisible in exactly the same way.

### P16 — `recordHash || logId` can reopen the plate bug

The new scene plate key is `scene:${campaign.id}:${turnRecord.recordHash || logId}`.

The fallback is the risk. If a plate is minted before the turn seals, `recordHash` is absent and the key uses `logId`. If the lookup happens after the seal, `recordHash` exists and the key uses that. Mint and lookup then produce different keys, which is the bug that was just fixed, re-entering through the fallback branch.

Confirm `recordHash` exists at mint time. If it does not, the key must use whichever identifier is stable across the seal boundary, and the fallback must be removed rather than left as a trap.

---

## 2. NEW RULES

### Rule 27 — A refusal is a loud failure

Any code path that refuses, drops, skips, or discards an input must emit a structured record naming what was refused, why, and what the caller should do about it. A refusal that produces only an absence is indistinguishable from a bug and will be debugged as one.

This does not change any refusal decision. Every fail-closed door stays closed. It changes what the door says on its way to closing.

### Rule 24, clarified — a guard is not a migration

Rule 24 says the record survives the code. Catching a throw satisfies the letter of that and not its purpose. A campaign that loads with its data intact is surviving. A campaign that loads to an error state without crashing the app is not.

Where a shape changed, a migration exists. A guard is the floor beneath the migration, not a substitute for it.

---

# STAGE H

## Phase H0 — Diagnose P11 and reconcile what landed

Do not fix anything in this phase. Produce two reports.

### Report 1, the dead campaign

Open the IndexedDB store for the crashed campaign and answer:

1. Does the campaign row exist and is it intact?
2. How many journal rows are present?
3. Does the chain verify? If not, at which entry index does verification first fail?
4. Does the head hash match the last journal row?
5. Does the load path throw? With what error, at which entry, in which module, on which field?
6. What is `navigator.storage.estimate()` reporting for this origin now, and is there any evidence of a write failure around the crash?

Then classify the cause: shape drift, unguarded reducer throw, chain break, quota exhaustion, or something else. Name it explicitly.

**This classification sets the order of the rest of this directive.** See section 4.

### Report 2, the gate reconciliation

Confirm whether `loadNeverThrows` and `exportAlwaysWorks` exist. For each:

- If it exists, state what it asserts and against which fixtures.
- If it does not, state whether any other gate holds that property, and if none does, say so plainly.

Also confirm `exportRawJournal` has a gate. A function whose entire purpose is working when everything else is broken needs a test that runs it against broken inputs.

**Done when:** both reports are written to `LOOP_LOG.md`, the P11 cause is classified, and the phase order in section 4 is confirmed or amended in writing.

---

## Phase H1 — The narration audio chain (P14)

### Step 1, verify on a real device

Play a turn on a phone with narrator prose followed by at least one character line. Record what happens: does the character line play, does it fail silently, does anything appear in the console.

Do this before reading code. If every segment plays, close P14 as not-a-bug and move on.

### Step 2, if it fails, find the pattern

Locate the narration playback loop. Determine whether each segment constructs a new `Audio` element or reuses one and swaps the source.

### Step 3, the fix

Reuse a single unlocked element for the chain. Create and prime it inside the gesture handler, then set `.src` per segment as the chain advances. Never construct a new element from an `ended` handler or any other non-gesture context.

If the architecture requires separate elements (for crossfade or preloading), unlock each one during the same gesture that starts the chain, before any await.

### Step 4, catch the rejection

Every `play()` call has a rejection handler that logs the error name and the segment identity. An unhandled `play()` rejection is what made this class of bug invisible through two stages.

### Anti-patterns

- Do not fix this by muting the failure or hiding the control mid-chain.
- Do not reach for `speechSynthesis`. It is banned outright.
- Do not declare it fixed from a green Node suite. The Node suite has no audio. This is verified on a device.

**Test `narrationChain`:** deferred to Phase H4, where it can actually run. Until then, verification is a recorded device test with the observation written down.

---

## Phase H2 — Make refusals loud (P15, Rule 27)

### Step 1, inventory

Find every path that refuses, drops, skips, or discards an input. At minimum:

- the E3 campaign-isolation boundary assertions
- the render door's attestation check
- the Audio Director's provenance refusal
- the validator's rejection branches
- the quota catch added in G2
- the `onOpen` guard added in G1
- any reducer that skips a malformed entry

### Step 2, give each a structured record

Every refusal emits: what was refused (identity, not just type), why (the specific check that failed), the expected value and the actual one where both exist, and what the caller can do.

Keep this out of the player's face. Rule 22 stands: repair and validator detail is ledger-only. This is developer-facing observability, not player-facing copy.

### Step 3, make the pattern the default

Add a shared refusal helper so a new fail-closed door gets loud reporting by construction rather than by remembering. A door that has to remember will eventually forget.

### Anti-patterns

- Do not change any refusal decision. Every door that closes today still closes.
- Do not surface refusal detail to the player.

**Test `refusalsAreLoud`:** for each inventoried path, a fixture that triggers the refusal produces a structured record containing the refused identity and the failing check. A refusal producing only an absence fails the test.

---

## Phase H3 — Close the `recordHash` fallback (P16)

Determine whether `recordHash` is populated at plate mint time or only after seal.

**If it exists at mint,** remove the `|| logId` fallback. A fallback that can produce a different key than the lookup is a trap, and it is the exact trap that was just paid for.

**If it does not exist at mint,** the key must use an identifier stable across the seal boundary. Pick one, use it in both mint and lookup, and remove the conditional entirely.

Either way the key expression must be identical at mint and at lookup, ideally by calling one shared function rather than by two expressions that happen to match.

**Test `plateKeyStable`:** a fixture mints a plate pre-seal and looks it up post-seal; the mint key and lookup key are asserted equal; the key is produced by a single shared function; no conditional exists in the key expression.

---

## Phase H4 — The Playwright browser suite

This is the phase everything else has been waiting on.

### Step 1, stand up the harness

Add Playwright as a second suite, separate from the keyless Node suite. The Node suite stays exactly as it is and remains the keyless floor. The browser suite is additive and may require keys.

### Step 2, cover what Node cannot

**Layout.** Real geometry at 360, 390, and 430 widths: safe insets, overlap, truncation, container heights, frame ratios, tap target sizes, and behavior at maximum text scale.

**Audio.** Actual playback: the narration chain from H1, the audition path, gesture-context handling, and the Audio Director's provenance refusal end to end.

**Storage.** Real IndexedDB: quota behavior under a stubbed limit, transaction atomicity, and the export path against a corrupted store.

### Step 3, split the ledger

`BUILD_STATUS` gains a column naming which suite holds each gate, Node or browser. A reader must be able to tell at a glance which gates can observe what they claim.

### Anti-patterns

- Do not merge the suites.
- Do not make the keyless floor depend on a browser.
- Do not port the CSS source checks into Playwright unchanged. Rewrite them as real geometry assertions; that is the entire point.

**Test `harnessSplit`:** every geometry, playback, and storage assertion lives in the browser suite; the Node suite still passes keyless; `BUILD_STATUS` names a suite for every gate.

---

## Phase H5 — Verify the unverified

With H4 in place, confirm what Stages 1 through 3 claimed.

Run real geometry assertions against T6 (chip row versus narration), T7 (HUD avatar resolves to a single-face asset at 1:1), and T10 (region banner versus HUD), plus every Stage 1 D-phase claim: safe insets on all routes, card ratios, empty-state heights, HUD fit at 320 with longest fixture strings, composer containment, and no mid-word truncation.

Report the result honestly, item by item, as confirmed or still broken. Some of these will not have been fixed, because a CSS source check cannot tell you whether a rule is being overridden, whether an element is outside its container, or whether a value is being applied to the wrong node.

Fix what the report finds still broken, in the same phase.

**Test:** the Stage 1 and Stage 2 UI gates, reimplemented as real geometry in the browser suite, replacing their CSS-source predecessors.

---

## Phase H6 — Real migrations (Rule 24)

Enumerate every field whose shape changed in Stage C (identity), E3 (cache keys), and E5 (narration bounds). For each, write a migration that upgrades an older campaign on load.

Where a field cannot be reconstructed, supply a documented default and record on the campaign that the default was applied. Where it can be derived from the sealed record, derive it.

The `onOpen` guard stays as the floor beneath the migrations.

Confirm the back-compat gate walks a save from before each of these changes, not only a pre-possessions save.

**Test `migrationsLand`:** fixture campaigns sealed under each pre-change shape load with their data intact, not merely without throwing; the back-compat gate covers each shape; a campaign that received a default records that fact.

---

## Phase H7 — Storage quota (G5, deferred from Stage 3)

Now testable, because H4 exists.

Query `navigator.storage.estimate()` at campaign start and before each media write, and surface real usage in Settings rather than a session counter. Define the policy: warn threshold, stop-painting threshold, and automatic eviction order under pressure using the cellar's existing order. Wrap every seal transaction so a quota failure is caught, named, and leaves no partial write.

Evaluate storing media as Blobs rather than base64. Base64 costs roughly a third more space and is the common reason for hitting quota early.

**Test `quotaSafety`:** in the browser suite, a stubbed quota failing at a known threshold leaves the record consistent, names the failure plainly, degrades to text-only rather than crashing, and admits no partial write.

---

## Phase H8 — Vault repair, as a player surface

`exportRawJournal` gives the capability. This gives the player a way to reach it.

When a campaign fails to load, the player sees a plain explanation and two honest options: export everything as it stands, or continue from the last point where the chain verifies. Truncation is recorded in the journal as an event, consistent with journal law, which strikes rather than erases.

This surface's entire job is working when everything else is broken, so it must not depend on the replay path, the render door, the Foundry, or any derived surface. Build it as close to the raw store as possible.

**Test `vaultRepair`:** in the browser suite, a campaign whose chain breaks at entry K offers continuation from K-1 and a working export; the truncation is recorded as a journal event; the resulting chain verifies; the surface renders with the replay path stubbed to throw.

---

## Phase H9 — Clear the documentation backlog

G6 landed `docs/CLAWS.md`, the doc-sync rule, and a regenerated `docs/FEATURES.md`. Two steps remain.

**CHANGELOG.** Entries for Stages 1, 2, and 3, and specifically for the `soulsWeb` pin move from 646228 to 646337, which the chronicle rule requires and which shipped without one.

**The directive paper trail.** The repository root holds `EXPERIENCE-DIRECTIVE.md` and `EXPERIENCE-DIRECTIVE-III.md` and nothing between or after. Land the Stage 1 through Stage 4 directives, unedited, in the existing numbering scheme. Where an intermediate directive exists only in chat, note the gap rather than papering over it.

Also add Rule 27 and the Rule 24 clarification to `docs/CLAWS.md`, with enforcement points and gates named.

**Test `docsCurrent`:** extend the existing gate so a pin move without a changelog entry fails it.

---

## 3. CONSTRAINTS

- Code and documentation move in the same commit. `features.mjs` and `docs/FEATURES.md` regenerate together with `--write-doc`. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change.
- Push at the close of every phase.
- Do not modify `src/lib/seal.js`, `src/lib/rules.js`, `src/lib/chronicler.js`, or the Audio Director interlock. H8 builds a repair path around the seal; it does not change the seal.
- H2 changes what refusals report. It changes no refusal decision.
- H1 fixes the playback path. It does not relax the Sound Law, and `speechSynthesis` stays banned.
- H5 may replace a CSS-source gate with its real-geometry equivalent in the browser suite. That is a strengthening, not a removal, and it is the only sanctioned replacement. Nothing else is removed.
- The Node suite stays keyless and remains the floor.
- One phase per checkpoint.

## 4. ORDER OF WORK

**Default order: H0, H1, H2, H3, H4, H5, H6, H7, H8, H9.**

H0 first because it is cheap, it is blocking, and it decides everything after it.

H1 through H3 before H4 because each is small, each is a live defect, and none needs the browser harness to fix, only to test.

H4 before H5 through H8 because none of those can be verified without it.

### The H0 branch

The P11 classification reorders this:

- **Quota exhaustion** → H7 moves immediately after H4. The crash will recur, and every campaign in play is exposed.
- **Shape drift** → H6 moves immediately after H4. Every campaign created before Stage C is at risk, and the guard only makes the failure quieter.
- **Chain break or partial write** → H8 moves immediately after H4. Repair is the only path back for the campaign already lost and any that follow it.
- **Unguarded reducer throw** → default order holds; the G1 guard already covers it and H6 completes it.

Record the branch decision in `LOOP_LOG.md` with the reasoning.

## 5. VERIFICATION

H1 is verified on a real mobile device before H4 exists, with the observation written down, and re-verified in the browser suite afterward.

H5's report is written item by item as confirmed or still broken. A phase that reports everything already fixed should be treated as suspect: CSS source checks and rendered geometry disagree often, and finding nothing usually means the assertions are not measuring what they claim.
