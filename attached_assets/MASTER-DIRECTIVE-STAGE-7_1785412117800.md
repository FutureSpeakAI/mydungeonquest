# MASTER DIRECTIVE — STAGE 7

## Context, Correctness, and the First Server Move

The march produced one live defect that degrades every turn after turn 10, three gaps in things believed closed, and an architectural decision that removes four open items outright.

Six phases. The first is the most valuable work available right now. The last is the beginning of the server migration, scoped to the one piece that pays for itself immediately.

---

## 0. WHAT CHANGED

### 0.1 Local-first was inherited, not chosen

The cLaws were written for a different project, where the device as sole custodian was the point. This game is becoming a SaaS with a smartphone client, and the content is fiction and illustration.

That retires four open items: **F1** (storage quota), **#145** (eviction), most of **P11**'s severity, and **H8**'s vault repair UI drops from necessary to nice.

It retires nothing else. The single door, the validator, pure reducers, entropy accounting, Canon Lock, Anchor Law, Cast Law, and Tenor Law all exist because a probabilistic model should not write directly to state a player cares about. That argument is identical whether the record sits in IndexedDB or Postgres.

The hash chain and Ed25519 seal need a new justification, since "your device, your key" no longer applies. The mechanism survives with a different purpose: a shared or published chronicle that provably was not edited after the fact. That makes it a **publishing feature**, not a storage foundation. The Commons staging namespace and the notary already point at this. Stage 8 decides it; Stage 7 does not touch the seal.

### 0.2 Accounts raise the stakes on isolation

Every unclosed isolation item becomes cross-account data separation the moment two people share a server. E3 items 2 and 5 have been unaccounted for across four stages, and J1 filters at the exit rather than the query.

Close them before the server lands. Phase L4.

---

## 1. FINDINGS FROM THE MARCH

### F-1 — The context pack exceeds its budget by turn 10 (live, degrading)

The march measured the context pack proxy over the 7,000-character window from turn 10 onward, in a 30-turn run. Campaigns are 15 chapters.

**From turn 10 to the end of every campaign, the DM is losing context on every turn.** This plausibly explains defects already chased: thin turns, NPCs dropping out of the codex, characters behaving as though they have forgotten what they know.

Graph Law says the scene floor is never trimmed, one-hop ties stay full, the villain is always present, and the rest slims or drops. At three times over budget, "the rest" is most of the pack.

This is the highest-value fix on the board and it is currently filed as a supplementary measurement.

### F-2 — Two failure metrics are not instrumented

The march reports ten counters at zero, one at 2 of a ceiling of 4, and two that are "not instrumentable from outside."

Those two are almost certainly swallowed exceptions and boundary throws, which are exactly the two the march exists to catch. Not instrumentable *from the browser* is not the same as not instrumentable: a counter incremented inside the app and read at the end covers both.

Until they are lit, the silent-failure count has a hole precisely where the silence is.

### F-3 — The repair loop has never been exercised (#144)

Core law, never once run in a keyless march. P10 was a floor that detected without enforcing; an untested repair path is where the next P10 lives.

### F-4 — Gap 2 remains open in `lawsAgree`

Court ⑩ now builds turns at floor, ceiling, and midpoint from real prose. That subsumes gaps 1 and 3 by demonstration, which is the right instrument.

But the craft target is taken as the band's midpoint. **A midpoint derived from the band can never disagree with the band.** E5's defect was the prompt asking for 60 to 140 while the validator enforced 180 to 400. The assertion must read the craft target out of `systemPrompt.js` and check it sits inside the validator's band.

### F-5 — Performance, for the record

- **Turn latency:** 12.85 s average, 39.7 s worst. Not addressed this stage, but the number is now known.
- **DOM growth:** linear at ~38 nodes per turn, 106 to 1,214 over 30 turns. A 150-turn campaign reaches ~6,000 nodes. Worth watching, not yet urgent.
- **Storage:** 82 MB over 30 turns, ~2.7 MB per turn. Retired by the architecture change, and Phase L5 removes most of it anyway.

---

# STAGE L

## Phase L0 — Diagnose the context pack overflow

No fix in this phase. Produce a written diagnosis.

### Measure the real thing

The march measured a *proxy*. Measure the actual assembled prompt, byte for byte, as sent to the model.

For turns 1, 5, 10, 15, 20, 25, and 30, capture:

- total assembled prompt size
- size of each block: `[STATE]`, `[STORY]`, `[MEMORY]`, `[ENTROPY]`, `[RESOLUTION]`, `[PLAYER]`
- within `[STORY]`, size of each contract key: `beat`, `evil_design`, `cast`, `regions`, `memoir`, `wounds`, `directives`, `scene`
- how many souls are in `cast`, and the size of the largest three
- how many `known_facts` entries the largest soul carries
- how many entries `chronicle` holds

### Answer

1. **Which sections grow without bound?** The likely candidates are `cast` (every soul ever carded), `known_facts[]` per soul, `chronicle`, and `regions`. Name them with numbers.
2. **Is the 7,000-character budget enforced anywhere, or only declared?** If `buildContextPack` takes `{budget=7000}` and nothing measures the result against it, the budget is decorative. That would be a Rule 23 violation of the same shape as the narration floor: a constraint that detects nothing because nothing checks it.
3. **What does the trimmer actually drop, in what order, at turn 20?** Print the before and after.
4. **Does the scene floor alone exceed the budget at any point?** If the never-trimmed portion outgrows the budget, no drop order can save it and the fix is different.

**Done when:** the diagnosis is written with real numbers, and question 2 has a yes or no.

---

## Phase L1 — Fix the context pack

Shape of the fix, adjusted to what L0 finds.

### Enforce the budget

Measure the assembled pack and assert it against the budget at assembly time. If it exceeds, trim and re-measure until it fits. A budget that is not measured is not a budget.

### Cap every unbounded section

Every list gets a cap and a stated selection rule, not just an overall trim:

- **Cast:** present souls in full, then souls by bond and recency, capped. A soul carded twenty turns ago and unseen since does not need full presence in every prompt.
- **`known_facts` per soul:** cap, and summarize the overflow rather than dropping it.
- **Chronicle:** the Chronicler already compresses within a campaign. Use it. Older chronicle becomes a compressed passage; recent chronicle stays verbatim.
- **Regions:** the current region in full, others by a one-line standing state.

### Selection, not just recency

Weight by relevance to the scene, not by turn index alone. A soul mentioned in this turn's player input matters more than one who happened to appear two turns ago.

### Report what was dropped

Per Rule 27, trimming is a refusal. Emit a structured record naming what was dropped and why, so a future thin turn can be traced to a trim rather than guessed at.

**Test `contextBudget`:** a 30-turn fixture campaign's assembled prompt stays within budget at every turn; the scene floor is never trimmed; every trim emits a record; a soul present in the scene is never dropped.

**Test `contextGrowth`:** across turns 1 through 30, no section grows without bound; the pack size at turn 30 is within 10% of the pack size at turn 15.

---

## Phase L2 — Close gap 2 in `lawsAgree`

Small. Read the craft target out of `src/lib/systemPrompt.js` — the actual number the model is instructed to aim for — and assert, for every band, that it sits inside the validator's enforced range with margin at both ends.

Do not derive the target from the band. That is the tautology that leaves this open.

**Test:** extend `lawsAgree` with a court asserting the prompt's stated craft target for each band is a subset of that band's enforced range.

---

## Phase L3 — Light the two dark metrics (F-2)

Instrument from inside the app rather than from the browser.

- **Swallowed exceptions:** every `catch` block increments a counter with the module and error name. A `catch` that neither rethrows nor reports is the defect class, so the counter is also an inventory of them.
- **Boundary assertion throws:** every isolation assertion, render-door refusal, and provenance rejection increments on refuse.

Expose both on `window` under a debug namespace so the march can read them at the end, and include them in the structured refusal records from Rule 27.

Then re-run the march and report all thirteen.

**Test:** assert both counters exist, increment on a forced failure, and are read by the march.

---

## Phase L4 — Isolation at the query, before accounts (F-2 of section 0.2)

Three items, all unaccounted for across multiple stages, all more serious once accounts exist.

1. **J1's filter.** Confirm whether reference selection filters at the query or only asserts at the exit. If it only asserts, a foreign anchor still gets selected and the throw kills the paint, which is P13's failure mode through a new door. Move the filter to the query and keep the assertion as a backstop.
2. **E3 item 2.** Every retrieval feeding the DM prompt filters by campaign id at the query, not after.
3. **E3 item 5.** Sweep or evict pre-existing unscoped cache entries so they cannot be served.

Write these as if a second account already exists, because the point is that soon one will.

**Test `isolationAtQuery`:** two fixture campaigns in one store; assert every selection returns zero foreign candidates *before* any assertion fires; assert the assertion still throws on an injected foreign id.

---

## Phase L5 — Plates to object storage

The first server move, and the one that pays for itself immediately.

### Why this first

- Removes ~82 MB per 30-turn campaign from the client.
- Removes base64's ~33% encoding overhead. Roughly 27 MB of that 82 is encoding.
- Enables dedupe, which cuts generation cost.
- Speeds every repeat view through a CDN.
- **Unlocks the persistent-world idea.** Once anchors and reference sheets live server-side addressed by world, a second campaign in Larkspur Crossing reuses Maren's face rather than regenerating her.

### The work

- Plates, busts, reference sheets, and region plates move to object storage behind a CDN.
- The record stores a reference, not bytes. Attestation binds to that reference exactly as it binds to the asset today; the render door's checks do not change.
- Store as native image bytes, not base64.
- Migrate existing campaigns' embedded assets, or accept that old campaigns keep their inline plates and new ones do not. Either is fine; choose explicitly and write it down.

### The trap

**Content-addressed keys are exactly the mechanism that caused P17.** A key derived from cue text, subject name, or style descriptor without a campaign or world scope is how the lantern and the bell crossed campaigns.

If content addressing is used for dedupe, the scope stays in the key path. Dedupe within a world is the feature; dedupe across worlds is the bug that cost two stages. Assert this rather than intending it.

**Test `assetStorage`:** assets resolve from object storage; the record holds references rather than bytes; attestation still binds and the render door still refuses a tampered reference; two campaigns in different worlds with identical cues do not share an asset.

---

## Phase L6 — Exercise the repair loop (#144)

The chain is Anthropic, then a repair turn, then the OpenAI understudy, then `safeFallbackTurn`. It is core law and has never run in a march.

Build an adversarial turn generator that deliberately violates, one at a time:

- narration below the floor
- narration above the ceiling
- a dead soul speaking
- a canon contradiction
- entropy consumed out of order or unaccounted
- a malformed combat op
- missing or malformed `voice_card` on `cast_add`
- suggestions violating count or length

For each: assert the repair turn fires once with the specific deficiency named, that a second failure reaches the understudy, that a third reaches `safeFallbackTurn`, and that `safeFallbackTurn` itself satisfies the floor.

Then add the adversarial pass to the march so the repair path is exercised on every run rather than never.

**Test `repairLoop`:** every violation class triggers exactly one repair naming the deficiency; the escalation order holds; the fallback satisfies the narration floor; no violation class silently passes.

---

## 2. NOT THIS STAGE

Named so they are not forgotten, and so nobody starts them by accident.

- **The full server migration.** Records, accounts, sync. Needs an architecture decision first: does the device become a cache, or does the server become a mirror? That determines offline behavior, conflict resolution, and what the seal is for. Stage 8 opens with that decision as a written deliverable, not with code.
- **Turn latency.** 12.85 s average is now measured. Addressing it is likely the image tempo work (F7), which is cheap, plus streaming and prefetch, which are not.
- **DOM virtualization.** Linear growth is known and not yet urgent.
- **Persistent worlds and multiplayer.** Pinned, post-release. L5 moves toward them without committing to them.

---

## 3. CONSTRAINTS

- Code and documentation move in the same commit. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change.
- Push at the close of every phase.
- Do not modify `src/lib/seal.js`. The seal's purpose is under review; its behavior is not changing this stage.
- L1 may not trim the scene floor. Graph Law stands.
- L2 may not resolve a disagreement by changing the validator alone. `NARRATION_FLOOR` remains the one canonical seat.
- L5 keeps world or campaign scope in every asset key path. Dedupe across worlds is forbidden.
- L6 may not weaken any validator check to make a violation reachable. If a violation class cannot be constructed, that is a finding, not a reason to relax the check.
- Rule 30 stands: no rendered-output defect closes on a source-level check.
- One phase per checkpoint.

## 4. ORDER OF WORK

**L0, L1, L2, L3, L4, L5, L6.**

L0 and L1 first: the context overflow is live, it degrades every turn past 10, and it is the most likely cause of defects already being chased by other means.

L2 is ten minutes and closes a gap that has survived two attempts.

L3 before L4 and L6, so that both are observed rather than reported.

L4 before L5, because the server work should not begin with an isolation defect still open.

L6 last, because it is the largest, and because the adversarial pass is most useful once the march can see all thirteen counters.

## 5. VERIFICATION

L1 is verified by re-running the march and reporting context pack size at the same turn markers as F-1. The success condition is that turn 30's pack is within budget, not merely smaller.

L3 is verified by re-running the march and reporting all thirteen failure metrics with actual counts, per Stage 6.6 Part 1.
