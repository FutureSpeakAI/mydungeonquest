# WORK ORDER — STAGE 6.6

## The March Report, Two Questions, and Band Feasibility

The march ran to completion, which had never happened. This closes what it left open.

Four parts. Parts 1 through 3 are reporting and diagnosis, not code. Part 4 is the only build work.

---

## PART 1 — REPORT THE MARCH IN FULL

The march is not the artifact. The report is. Two failure metrics were named out of thirteen, and none of the four supplementary measurements.

If the run's output was retained, produce this from it. If not, re-run and produce it then.

### 1.1 — Every failure metric, with its ceiling and its actual count

Report all thirteen as a table. "Within budget" is not a report: a ceiling of 3 with 3 occurrences and a ceiling of 3 with 0 occurrences are both within budget and mean entirely different things.

| Metric | Ceiling | Actual |
|---|---|---|
| `play()` rejections | 0 | |
| Plates refused by the render door | 0 | |
| Boundary assertion throws | 0 | |
| Swallowed exceptions | 0 | |
| Skipped journal entries on replay | 0 | |
| Unresolved references | 0 | |
| Quota warnings | 0 | |
| Narration floor breaches that shipped | 0 | 0 |
| `safeFallbackTurn` invocations | 0 | 0 |
| Understudy invocations | ≤1 | |
| Validator repair turns | ≤3 | |
| Ticks per advance | ≤4 | |
| Consecutive ticks, same soul | ≤1 | |

### 1.2 — Detail on every counter that fired

For each nonzero failure counter: what was refused or caught, where, how many times, and **whether one thing fired repeatedly or many different things fired once each.**

A single defect hitting twenty times and twenty distinct defects hitting once look identical in a count and need opposite responses.

### 1.3 — The four supplementary measurements

None of these pass or fail. All four answer a standing open question for free.

- **Context pack size** at turns 1, 8, 16, and 24, against the 7,000-character budget, and what gets dropped as it fills.
- **Wall clock per turn**, and which step dominates. This is the F4 latency question with real numbers.
- **`navigator.storage.estimate()`** at start and end. This is the F1 quota question answered without building anything.
- **DOM node count** at turns 1, 12, and 24. This is the F9 long-session performance question.

### 1.4 — Coverage

State plainly which of these the march reached: an act change, a combat, a repaired turn, a level-up, a tick with rotation across multiple souls, a plate arriving after its turn sealed.

Anything it did not reach is a gap in every check built on the march, including the budget itself.

---

## PART 2 — WHY 24 TURNS

The march was specified at 30. The floor was written from a run of 24.

Answer which of these is true:

1. **The march is now 24 by design.** Say why, and confirm 24 still reaches the coverage in 1.4.
2. **It attempted 30 and stopped at 24.** Then the floor is written from a short run and bakes the shortfall in. Report why it stopped, raise the floor to 30, and re-run.

A throughput floor auto-written from a run that fell short of its own specification is the laundering problem in a different form.

---

## PART 3 — TWO QUESTIONS ABOUT THE FIXES

Both were filed as fixes. Both may be findings.

### 3.1 — The ritual overlay

The spec now clicks `.secondary-button` or the first button inside `.ritual` and waits for it to clear before each turn send, because the level-up overlay was "intercepting the send button indefinitely."

Which is true:

- **The overlay requires a dismissal click and the spec was not clicking it.** Then this is a test bug, the guard is correct, and nothing further is needed.
- **The overlay persisted without dismissal, or blocked input while visible with no obvious dismissal.** Then a player hits the same wall, and the app was worked around rather than fixed. That is a blocker, not a spec fix.

Answer by testing the overlay by hand on a device, not by reading the spec.

### 3.2 — `padWords`

A "`padWords` block-ceiling escape" was fixed. Two questions:

1. **What is `padWords` for, and where does it run?** Mock turn generation only, or any path that can reach a player?
2. **If it pads narration to satisfy the floor, then `narrationFloorBreaches=0` measures the padder rather than the game.** The march would report a clean floor even if every real turn came back thin.

If padding exists only to give the mock DM plausible bulk, that is fine, and it means the floor counter is not measuring what its name implies. Say so in the report and rename the metric.

If padding can reach a real turn, that is a live defect: the floor is being met by filler rather than by prose, which is what the floor exists to prevent.

---

## PART 4 — GENERALIZE COURT ⑩

Court ⑩ constructs a real turn and runs it through the validator. That is a better instrument than the arithmetic I originally asked for: it tests satisfiability by demonstration rather than by inference.

It currently covers one band at one point. Generalize it and it subsumes two of the three gaps outright.

### 4.1 — Every band, three points

For every band in `byMeasure`, plus the NONE band:

- construct a turn at the band's **floor** (`minWords`, `minBlocks`) and assert it validates
- construct a turn at the band's **ceiling** (`maxWords`, `maxBlocks`) and assert it validates
- construct a turn at the band's **craft target** and assert it validates

This closes gap 1 (implied block length) and gap 3 (span margin) without needing either as a separate arithmetic court. A band forcing 100-word blocks fails at construction or at validation, and it fails visibly.

### 4.2 — Construct without the padder

Build these turns from real prose fixtures at known word counts, not from `padWords`.

If the test uses the same padding the mock uses, it proves the padder can satisfy the band. That is not the question. The question is whether prose can.

### 4.3 — Gap 2, still open

**The craft target must sit inside the enforced band.** This caused half of the E5 defect: the prompt asked for 60 to 140 words while the validator enforced 180 to 400, so the model aimed where it was told and failed every turn.

For every band, assert the craft target range is a subset of the enforced range, with margin at both ends. Generalizing ⑩ to the craft target catches this directly, since a target outside the band produces a turn that will not validate.

**Test:** extend `lawsAgree` so every band is exercised at floor, ceiling, and craft target with real prose; assert every craft target range sits inside its enforced range with margin.

---

## ORDER

**Part 1, Part 2, Part 3, Part 4.**

Parts 1 through 3 are reading and answering, not building. Do them together and in one report.

Part 4 is small and independent.

## CONSTRAINTS

- No ceiling is raised, and no floor is lowered, to make a run pass.
- If Part 2 finds the march stopped short, the floor is rewritten from a full run, not kept.
- If Part 3.1 finds the overlay blocks a real player, that becomes the highest-priority item in the next stage and the spec guard stays as a workaround, clearly labeled as one.
- Part 4 constructs turns from prose fixtures, never from the padder.
- `NARRATION_FLOOR` stays the one canonical seat. All three enforcement sites move together or not at all.
- Push at the close of each part.
