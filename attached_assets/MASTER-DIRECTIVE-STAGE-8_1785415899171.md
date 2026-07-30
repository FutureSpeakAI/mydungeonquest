# MASTER DIRECTIVE — STAGE 8

## Verification Debt, and the Decision That Unblocks Everything After

Stage 7 landed seven phases. Five of them proved something adjacent to the property they claimed. This stage closes that gap rather than adding features, because the alternative is building the server on top of checks that do not check.

It ends with the architecture decision that Stage 9 needs and cannot start without.

---

## 0. THE PATTERN

Five instances, same shape: a test that passes without exercising the thing it certifies.

| Claim | What was actually proven | What was not |
|---|---|---|
| Layout fixes hold | The stylesheet contains a rule | That the rule survives to render |
| L6, the repair loop works | The source describes an escalation chain | That escalation happens at runtime |
| L4, cross-campaign reads are structurally impossible | Results are correctly filtered | That foreign rows are never read |
| L0, the context pack does not overflow | It fits under a keyless 30-turn mock | That it fits under real content across 15 chapters |
| L2, the craft target sits inside the band | Template literals embed `NARRATION_FLOOR` | That an independently stated target agrees |

Rule 30 was written for the first row. It stopped source-level checks from closing rendered-output defects. The other four are the same failure wearing different clothes: a mock standing in for real load, a read standing in for a run, a result standing in for a mechanism, a value standing in for itself.

### Rule 31 — A test must exercise the property under the conditions where it fails

A check is only evidence if it runs where the defect would occur.

- A property that fails **under load** is not proven by a fixture below that load.
- A property that fails **at runtime** is not proven by reading source.
- A property about a **mechanism** is not proven by asserting the mechanism's output.
- A value derived from the thing it is compared against proves nothing. If the comparison cannot fail, it is not a test.
- A property that fails **with real providers** is not proven in mock mode.

When a property cannot be exercised under its failure conditions, say so and name what would be required. An unprovable property honestly labelled is worth more than a green test that certifies the wrong thing.

---

## 1. THE CONTRADICTION

Stage 6.6 reported the context pack exceeding its 7,000-character window by turn 10. Stage 7 L0 reported no overflow existed.

Those cannot both be right, and the difference is roughly threefold.

Two details argue against closing this as a bad proxy:

**L1 shipped a `[DROPS]` block for when "briefing famine drops cast."** If nothing overflows, that path exists for conditions the march does not reach. Famine is real; the march just is not hungry.

**L0 question 2 was never answered.** Is the 7,000-character budget enforced anywhere, or only declared? If `buildContextPack` accepts a budget parameter and nothing measures the assembled result against it, then not overflowing is luck rather than safety, and it will stop being lucky under real content.

---

# STAGE M

## Phase M0 — Resolve the contradiction

No fix. Answer four questions in writing.

1. **Which measurement was wrong, and by what mechanism?** If 6.6's proxy was bad, say exactly what it measured and why it read roughly 3x high.
2. **Is the budget enforced or declared?** Point at the code that measures the assembled pack against 7,000. If none exists, say so plainly. That is a Rule 23 finding of the same shape as the narration floor.
3. **What conditions trigger briefing famine?** L1 built the drop path. Name the conditions that reach it, and state whether the march reaches them.
4. **What else does the march measure by proxy?** If the context proxy was off by 3x, every other proxy in the march is now suspect. Inventory them: which metrics are measured directly, which are inferred, and what each inference assumes.

**Done when:** all four are answered, and the march's proxy metrics are labelled as proxies wherever they are reported.

---

## Phase M1 — Prove the context pack under real load (Rule 31)

The keyless march understates growth twice over: the mock DM produces less content per turn than a real model, and 30 turns is a fraction of a 15-chapter campaign.

### Build a load fixture

A campaign representative of real play at depth:

- 15 chapters of turns, not 30 turns
- narration at the **ceiling** of each band, not the mock's output
- 12 or more carded souls, each carrying a realistic `known_facts` list
- 4 or more regions
- an accumulated chronicle at realistic length
- ticks, act changes, combat, and repaired turns distributed through it

Generate it deterministically so it is reproducible, and commit it.

### Then measure

Assemble the real prompt at chapters 1, 4, 8, 12, and 15. Report total size and per-block size, exactly as L0 was asked to.

If it overflows, L1's fix is incomplete and this stage found the live defect. If it holds, the context work is genuinely done and 6.6's alarm is retired with evidence rather than assertion.

**Test `contextUnderLoad`:** the load fixture's assembled prompt stays within budget at every measured chapter; the scene floor is never trimmed; every trim emits a record; famine conditions, if reached, are reported.

---

## Phase M2 — Actually run the escalation chain (Rule 31)

L6's violation detection across 8 classes is the valuable half and it is real. The other half is untested: the chain is 2 Anthropic attempts, then 2 OpenAI attempts, then `safeFallbackTurn`, and keyless mode has neither provider, so there is nothing to escalate between.

### Build failing stub providers

Two stubs that satisfy the provider interface and fail on command:

- fail with a validator violation, so the repair path fires
- fail with a transport error, so the provider path fails over
- succeed on the Nth attempt, so escalation can be stopped at each stage

### Assert the runtime behavior

- a violation on attempt 1 produces a repair turn naming the specific deficiency
- a second violation moves to the second provider, not to the fallback
- exhausting the second provider reaches `safeFallbackTurn`
- `safeFallbackTurn` satisfies the narration floor
- the escalation is recorded in the ledger and **nothing about it renders to the player**, per Rule 22

### Also measure the cost

Four model attempts before fallback is significant latency. The march's worst turn was 39.7 s against a 12.85 s average, which is roughly what a full escalation costs.

Report the wall clock of a full escalation. If it is what it appears to be, the question of whether four attempts is the right number belongs in a later stage, but the number should be known now.

**Test `escalationRuntime`:** with stub providers, each stage of the chain is reached and exits correctly; the fallback satisfies the floor; no escalation detail reaches a player surface; the full-escalation wall clock is recorded.

---

## Phase M3 — Complete the instrumentation, then re-run the march

### The inventory

L3 instrumented three silent catch sites. The counter was also meant to be an inventory of them, and three is low for a codebase this size.

Enumerate every `catch` block in `src/` and `server/`. Classify each:

- **handles** — recovers meaningfully and the caller can proceed
- **reports** — rethrows, logs with context, or increments a counter
- **swallows** — neither

Every swallow either becomes a report or is justified in writing. The inventory goes in the log.

### The re-run

Stage 6.6 Part 1 asked for all thirteen failure metrics with actual counts. Stage 7 L3 lit the two dark ones. Neither report has been produced.

Re-run the march and report the full table: metric, ceiling, actual. Plus the four supplementary measurements, now that the proxy question from M0 is settled.

**Test:** assert the catch inventory is complete and that no site classified as swallowing remains uninstrumented.

---

## Phase M4 — Two small forward-looking fixes

### M4.1 — Index the isolation query

L4's `.and(row => row.campaignId === this.campaignId)` is a JS-side predicate. Dexie evaluates it per row during iteration, so foreign rows are read off disk and rejected in memory. Correct results, but not "structurally impossible," and it will not scale to a shared table.

Use `.where('campaignId').equals(...)` so the index does the work. Confirm the index exists in the schema; add it if not.

**Test:** extend `isolationAtQuery` to assert the query plan uses the index, or that row reads scale with matching rows rather than with table size.

### M4.2 — Put `worldId` in the asset key path now

L5's key path is `{PRIVATE_OBJECT_DIR}/plates/{campaignId}/{assetHash}`, which is correct for today.

When persistent worlds land, every asset needs re-keying. Adding a `worldId` segment now, with one world per campaign and no UI, costs a path segment and saves a migration over every asset ever stored.

Same argument as the record schema: decide the shape now, populate it trivially, expand later.

**Test:** assets resolve through a key path containing both world and campaign scope; cross-world dedupe remains impossible.

---

## Phase M5 — The server architecture decision

A written deliverable, not code. Stage 9 cannot start without it, and it should not be decided implicitly by whoever writes the first schema.

### The question

**Does the device become a cache, or does the server become a mirror?**

That single choice determines offline behavior, conflict resolution, what the seal is for, and how much of the existing client changes.

### Produce an options document

For each of these three, state the cost, the failure modes, and what it does to the existing client:

1. **Server authoritative, device caches.** The record lives on the server. The client holds a working copy. Simplest conflict story, hardest offline story.
2. **Device authoritative, server mirrors.** Closest to today. The client keeps writing the record; the server holds a copy for durability, sync, and publishing. Easiest migration, real conflict problems the moment two devices touch one campaign.
3. **Server authoritative with an offline queue.** Turns queue locally when offline and replay on reconnect. Best experience, most work, and the append-only chain makes replay more tractable than it usually is.

### Answer these alongside it

- **What happens on a plane?** The honest answer might be "you cannot play," and that is a legitimate product decision if stated deliberately.
- **What is the seal for now?** "Your device, your key" no longer applies. The candidate purpose is proving a published or shared chronicle was not edited after the fact. If that is the answer, the signing key moves and the notary becomes a real feature. If there is no answer, say so — an unjustified mechanism should be retired, not carried.
- **Does the record schema get a `worldId` now?** Same reasoning as M4.2. A field costs nothing today and saves a migration across every campaign ever played.
- **What does account separation require?** The isolation work has been campaign-scoped. Accounts add a layer above worlds, and every scoped query needs to account for it.

### Recommend, do not decide

End with a recommendation and its reasoning. The decision is Stephen's.

**Done when:** the options document exists with costs, failure modes, and a recommendation, and the four questions have written answers.

---

## 2. CONSTRAINTS

- Code and documentation move in the same commit. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change.
- Push at the close of every phase.
- Do not modify `src/lib/seal.js`. M5 decides its purpose; nothing changes its behavior this stage.
- M1 may not adjust the budget to make the load fixture pass. If it overflows, that is the finding.
- M2 may not weaken a validator check to make a violation reachable.
- M3's catch inventory may not classify a site as "handles" without naming what it recovers.
- Rule 30 and Rule 31 both stand. Where a property cannot be exercised under its failure conditions, label it unproven rather than passing.
- One phase per checkpoint.

## 3. ORDER OF WORK

**M0, M1, M2, M3, M4, M5.**

M0 first: it is four written answers, it resolves a live contradiction, and question 4 determines how much of the march's existing reporting can be trusted.

M1 next: it either finds the live defect or retires a false alarm with evidence. Both outcomes are worth having before the server work starts.

M2 before M3, because the escalation stubs will likely surface catch sites the inventory should include.

M4 is small and can slot anywhere.

M5 can run in parallel with all of it, since it is writing rather than code. It should be finished by the end of the stage regardless, because Stage 9 opens with it.

## 4. VERIFICATION

Per Rule 31, each phase names the conditions under which its property would fail and demonstrates the test runs under them.

M1's success condition is a real-content fixture at chapter 15 within budget, not a smaller number than before.

M2's success condition is each stage of the chain observably reached at runtime, not described in source.
