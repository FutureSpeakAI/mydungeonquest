# WORK ORDER — THE CONTEXT BUDGET

## Cache the Canon, Derive the Number

The provenance answer settled it: 7,000 was never calculated. But raising it is the second-best fix. The first is noticing that most of what's in the pack doesn't vary, and is being paid for at ten times the necessary rate, every single turn.

Five parts. Part 2 is the one that matters.

---

## 0. THE ACTUAL FINDING

The diagnosis surfaced a number worth staring at:

- **System prompt: 23,468 characters.** Cached, $0.30/M.
- **`[STORY]`: 7,800 characters.** Uncached, $3/M, rewritten and repaid every turn.

The model receives three times more instruction than world, and the world is the expensive part.

**A character of system prompt costs a tenth of a character of `[STORY]`.** That ratio, not the budget number, is the thing to act on. Much of what sits in `[STORY]` is stable across many turns or permanent by law: cast canon is locked at first introduction by Canon Lock, region descriptions likewise, the covenant never changes, the style bible never changes, the spine is fixed at genesis.

All of that is being repurchased at premium rates every turn while competing for a budget it does not need to occupy.

If the stable portion moves behind a cache breakpoint, the budget question largely dissolves: the varying remainder is small, and the stable half can grow without meaningful cost.

---

## PART 1 — Consolidate the constant

Mechanical, do it first, it unblocks everything else.

The diagnosis found the budget hardcoded in nine places: `graph.js` (two defaults), `graph.test.mjs` (two), `contextUnderLoad.test.mjs`, `briefing.test.mjs`, `kinship.test.mjs`, `l0ContextDiagnosis.mjs`, `famineGate.test.mjs`, `headroomCurve.test.mjs`.

Export one constant from the engine. Every other site imports it. The briefing's `budget - 500` relationship becomes derived, not separately hardcoded.

Changing the budget should be a one-line edit. That is true regardless of what the value ends up being.

**Test:** assert no numeric budget literal exists outside the constant's definition.

---

## PART 2 — Split the pack across a cache breakpoint

This is the work.

### Step 1, verify the mechanics before designing around them

Check Anthropic's current prompt caching documentation and confirm:

- how many cache breakpoints are available, and how many are currently used
- the **minimum cacheable block size**, which is the constraint most likely to sink this — if the stable half is too small to cache, the split gains nothing
- cache write cost versus read cost, and how many turns a block must survive to pay for itself
- cache lifetime, and what happens when a player pauses mid-session
- whether cached content must be a contiguous prefix, which determines ordering

Report these before building. If the minimum block size exceeds the stable half, say so and stop; Part 4 alone is then the answer.

### Step 2, classify every field in the pack

Go through the pack's contract keys and classify each as **stable** or **varying**.

Likely stable, and worth confirming against the code:

- cast canon per soul: locked visual, locked voice, gender, age band, timbre, role, introduced turn
- region descriptions, locked at introduction by Canon Lock
- the covenant and world premise
- the style bible
- the spine and act structure
- `evil_design`, which changes rarely

Likely varying:

- `scene`: present souls, ties
- per-soul state: status, bond, last seen, last active
- recent `known_facts`
- `memoir` and recent chronicle
- `wounds`

**The cast is the hard case.** A soul card holds both stable identity and varying state in one object. The split requires separating them: canon fields into the cached block, state fields into the varying block, with the soul's identity carried in both so the model can join them.

Design that join carefully. A model that cannot tell which state belongs to which canon entry is worse off than one paying full price for both.

### Step 3, restructure

Stable content moves ahead of varying content in the message array, behind a cache breakpoint. Varying content stays in the final message.

This is the standing cache posture rule applied one level down: stable first, varying last. The rule already exists; it just was not applied inside `[STORY]`.

### Step 4, measure the result

Report, for the load fixture at chapter 15:

- stable block size, varying block size
- cost per turn before and after, at real pricing
- how many turns the stable block survives before something in it changes
- cache hit rate across a 30-turn march

**Test `cacheSplit`:** the stable block contains no field that changed during a 30-turn fixture; the varying block contains no field that stayed constant; the ordering places stable before varying; the join between canon and state is unambiguous for every soul.

---

## PART 3 — Derive the number, do not guess twice

Do not pick a new round number. Size it to a target.

### Step 1, define the target campaign shape

Write it down explicitly. Something like: 25 souls at chapter 15, with a chained saga, heirs present, six regions, and a full chronicle. Choose the shape by what real play should support, not by what currently fits.

### Step 2, measure the varying half at that shape

After Part 2, the budget applies to the varying block. Measure what the target shape actually needs.

### Step 3, add headroom and state it

Set the budget at the measured requirement plus a stated margin, 30% or whatever you can defend. **Write the derivation into a comment beside the constant**, so the next person to ask this question gets an answer instead of the archaeology you just did.

### Step 4, size the stable block honestly too

The stable half is cheap, not free. It still occupies context and still costs on the write. Give it a ceiling as well, with its own reasoning.

---

## PART 4 — Keep famine, and prove it sleeps

The trim loop, drop order, and kinship immunity are correct code. They should simply never fire in normal play.

An emergency path that activates on a chained saga is not an emergency path. That was the tell.

After Parts 2 and 3:

- verify famine does **not** fire for the target campaign shape
- verify it still fires, correctly, past the target shape, with all Graph Laws holding
- update `famineGate` and `headroomCurve` fixtures to overflow the new budget rather than the old one
- report the new crossing point in souls

The crossing point should sit comfortably beyond any campaign a player will realistically build. If it does not, Part 3's target shape was too modest.

---

## PART 5 — Re-run and report

Run the march. Report:

- context pack size at the same markers as before, stable and varying separately
- cost per turn, measured rather than modeled
- all thirteen failure metrics
- whether famine fired

---

## CONSTRAINTS

- Part 1 first. Every later part edits one constant instead of nine.
- Part 2 may not proceed if the minimum cacheable block size makes the split pointless. Report and stop.
- Part 3 may not set a round number without a derivation beside it.
- Part 4 may not adjust the budget to make famine sleep. The budget comes from Part 3's target shape; famine's behavior follows from it.
- The famine code is not deleted. Correct code that rarely runs is not dead code.
- Graph Law stands: the scene floor is never trimmed, the villain is always retained.
- Rule 27 stands: every trim emits a structured record.
- Rules 30 and 31 stand.
- Push at the close of each part.

## ORDER

**Part 1, Part 2, Part 3, Part 4, Part 5.**

Part 1 is mechanical and makes everything after it a one-line change.

Part 2 before Part 3, because the split determines what the budget is even measuring. Sizing the budget first and splitting after would mean sizing it twice.

Part 4 and Part 5 verify.

## A NOTE ON SCOPE

This is a cost and headroom fix. It does not touch what the model is told, only how it is paid for and how much room the world gets.

If Part 2's classification reveals that something in the pack is stale, redundant, or never read, that is a finding worth reporting — but fixing it belongs in its own task, not here.
