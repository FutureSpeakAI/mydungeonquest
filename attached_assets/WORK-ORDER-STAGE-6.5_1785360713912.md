# WORK ORDER — STAGE 6.5

## The First March

Three pieces of work. The first is small and must happen before the second. The second produces the most informative artifact currently available. The third closes a gap that is the E5 failure mode wearing different clothes.

---

## PART 1 — FIX THE BUDGET SEMANTICS BEFORE THE FIRST RUN

`k8-budget.json` does not exist yet. Good: it can be built correctly rather than corrected later.

As currently specified, the first run writes the budget from observation at an 80% floor. Two things are wrong with that.

### Problem 1, direction

A floor means the gate fails when a number goes *down*. For failure counters that is backwards: fixing a bug would break the build, and a steady state of brokenness would pass.

### Problem 2, laundering

Auto-writing a budget from observation **turns the current failure rate into the standard.** If the first march records 40 silent refusals and 6 swallowed `play()` rejections, an 80% floor enshrines 32 and 5 as permanently acceptable. That is precisely inverted for a check whose entire purpose is surfacing silent failure.

### The fix: two classes of metric

**Throughput metrics** — floor. Auto-writing from the first run is correct here.

- turns completed
- plates rendered
- voice segments played
- surfaces built without error
- ticks fired (where a tick was legitimately due)

These measure that the game did its work. If they drop, something stopped working.

**Failure metrics** — ceiling, and **set by hand before the run, from judgment, not observation.**

These measure silence. The first march's counts for these are a **finding to report**, not a baseline to adopt.

### Proposed hand-set ceilings

Write these into `k8-budget.json` before the first run. Adjust the numbers if you disagree, but set them from what the game should do, not from what it currently does.

| Metric | Ceiling | Reasoning |
|---|---|---|
| `play()` rejections | 0 | Any rejection is a segment the player did not hear |
| Plates refused by the render door | 0 | Attestation should never fail on a plate the game itself minted |
| Boundary assertion throws | 0 | A foreign campaign id reaching a boundary is a bug, not a condition |
| Swallowed exceptions | 0 | Every catch either handles or reports; silent catches are the defect class |
| Skipped journal entries on replay | 0 | Any skip means a malformed entry exists |
| Unresolved references | 0 | A reference that will not resolve should never have been selected |
| Quota warnings | 0 | In a 30-turn keyless march, quota should not be near |
| Narration floor breaches that shipped | 0 | Enforcement means enforcement |
| `safeFallbackTurn` invocations | 0 | The last resort should not fire in a clean march |
| Understudy invocations | ≤1 | Occasional is healthy; routine means the primary path is weak |
| Validator repair turns | ≤3 | Roughly 10%; repair is a working feature, not a failure |
| Ticks per advance | ≤4 | Standing tick law |
| Consecutive ticks, same soul | ≤1 | Rotation is required by tick law |

A ceiling of 0 that the first march exceeds does not mean the ceiling is wrong. It means there is work.

### File shape

Make the two classes structurally distinct so the assertion direction cannot be applied to the wrong metric:

```json
{
  "throughput": { "_direction": "floor", "turnsCompleted": null },
  "failure":    { "_direction": "ceiling", "playRejections": 0 }
}
```

Throughput values are `null` until the first run writes them. Failure values are hand-set and are never auto-written.

**Test:** assert the two classes carry opposite assertion directions; assert nothing in `failure` can be written by the run; assert an unrecognized metric fails rather than defaulting.

---

## PART 2 — RUN THE MARCH

Execute `k8-longmarch` against a live browser session with a running server, keyless, for the full 30 turns.

This has never been done. Every other Stage 6 phase produced an artifact by landing; this one produces nothing until it runs, because its value is entirely in the numbers from a real session.

### The report

Write it to `LOOP_LOG.md` and structure it in three parts.

**Every metric, with its ceiling or floor and whether it passed.** No summarizing. The interesting rows are the ones that fail.

**Every failure counter that fired, with detail.** For each: what was refused or caught, where, how many times, and whether the same thing fired repeatedly or many different things fired once. A single defect hitting 30 times and 30 distinct defects need different responses and look identical in a count.

**Anything the march could not do.** If it could not reach an act change, a combat, or a repaired turn in 30 turns, say so. Coverage gaps in the march are gaps in every check built on it.

### What to expect

The failure counts will probably be uncomfortable. That number is the current silent-failure rate, and it has been invisible for six stages. It is the finding, not an embarrassment.

Do not adjust ceilings to make the first run pass. Report the gap and let it set the next stage's priorities.

### Also capture, even though they are not pass or fail

- context pack size at turns 1, 10, 20, and 30, against the 7,000-character budget, and what gets dropped as it fills
- wall-clock per turn, and which step dominates
- `navigator.storage.estimate()` at start and end, which is the F1 quota question answered for free
- DOM node count at turns 1, 15, and 30, which is the F9 performance question answered for free

---

## PART 3 — CLOSE THE `lawsAgree` FEASIBILITY GAPS

Your own diagnosis is right: courts ⑤, ⑥, and ⑦ confirm each band's floor sits below its ceiling and that bands do not overlap. They do not confirm a real turn can land inside a band.

The missing check is not span width. It is **joint feasibility across words and blocks at once**, plus a third relationship nobody is checking.

### Gap 1, implied block length

A band constrains words and blocks simultaneously, so the real constraint is on the block length it forces:

- `minWords / maxBlocks` must be at or below a plausible maximum block length
- `maxWords / minBlocks` must be at or above a plausible minimum block length

Your own example proves it: `minWords: 200` with `maxBlocks: 2` forces every block to average 100 words. That passes all three existing courts and no model will satisfy it.

Add named constants for the plausible bounds (something like 15 and 120 words per block), state the reasoning next to them, and assert every band against both.

### Gap 2, the craft target must sit inside the enforced band

If the prompt asks for 60 to 140 words and the validator enforces 180 to 400, the model aims where it was told and fails every turn. That was half of the original E5 defect.

Assert, for every band, that the craft target range is a subset of the enforced range, with margin at both ends.

### Gap 3, span margin

Court ⑥ accepts `minWords: 60, maxWords: 61`. Assert a minimum span, so a band is a range rather than a point.

### Why this matters more with bands than it did before

E5 was two numbers disagreeing across three files. This is three bands times two dimensions plus a craft target across three files. The surface for silent unsatisfiability grew, and the gate did not grow with it.

**Test:** extend `lawsAgree` with three courts — implied block length within plausible bounds for every band, craft target inside the enforced band with margin for every band, and a minimum span per band.

---

## PART 4 — ACCOUNT FOR K0 THROUGH K5

The Stage 6 report headers K0 through K13 and details K6 through K13. Six phases have no line.

For each, state landed with the enforcing code named, or not landed:

- **K0.1** — does narration audio survive past the first segment. A phone check, carried across four directives.
- **K0.2** — safe insets on the table route. The HUD sliced through "Day 1, afternoon."
- **K0.3** — the HP chip reading "10/1", and the unexplained empty band.
- **K1** — does reference selection filter at the query, or only assert on exit? Plus E3 items 2 and 5, unaccounted for across three stages.
- **K2** — does `captionShape` include the no-substring-of-narration court?
- **K3** — plate framing verified in `j7-layout`.
- **K5** — the crash diagnosis. Carried across three directives. Still decides whether migrations or quota is urgent.

If the header was right and these landed, they need their lines. If it was optimistic, say so; that is more useful than a number.

---

## ORDER

**Part 1, then Part 4, then Part 2, then Part 3.**

Part 1 first because the budget file must be correct before it is written, and after that it is much harder to change.

Part 4 before the march because K0.1, K0.2, and K5 are cheap, and because K5's classification may change what the march should watch for.

Part 2 next. It is the most informative single artifact available right now and it will likely reorder Stage 7.

Part 3 can run in parallel with anything; it touches nothing the others touch.

## CONSTRAINTS

- Failure ceilings are set by hand and are never written by a run.
- The first march's counts are reported, not adopted.
- No ceiling is raised to make the first run pass.
- Part 3 may not resolve a band disagreement by changing the validator alone. All three sites move together, and `NARRATION_FLOOR` stays the one canonical seat.
- Push at the close of each part.
