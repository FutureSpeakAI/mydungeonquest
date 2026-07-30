# WORK ORDER — PARALLEL CLEANUP

## Five Items, While Playtesting Happens

**This is not a stage.** It is cleanup that runs while a human plays the game and produces real findings. Do not treat it as the main thrust, do not expand its scope, and do not start a new stage from its results.

Each item closes something reported complete that is not, or answers a question whose answer changes a decision. All five are small.

---

## Item 1 — Redo the M5 recommendation with the roadmap as an input

`docs/SERVER_ARCH.md` recommends Option 2, device authoritative with the server mirroring. That recommendation was made against today's tree. It did not account for features already committed to.

### What was missing

Three things are on the roadmap and every one of them wants server authority:

- **Multiplayer.** Two devices cannot both be authoritative over one campaign. That is not a harder version of Option 2, it is a different option.
- **Persistent worlds.** A world outlives its campaigns and is shared across them. That is server-shaped data by definition.
- **Ordinary SaaS behavior.** A player replacing a phone, or using a phone and a tablet, is not an edge case. Device authority turns that into conflict resolution.

Paid seats also need server-side enforcement regardless of any of the above.

### The comparison to make instead

Not "which is cheapest to build now," but **migration cost now plus re-migration cost later.** Option 2 is cheap today and gets undone when the pinned features arrive. Option 3 is expensive today and does not.

### Deliver a conditional recommendation, not a single one

The deciding variable is **when multiplayer ships**, and that is a business input nobody has supplied. So do not pick one option. Produce a recommendation keyed on the timeline:

- If multiplayer is within roughly 6 months → recommendation and reasoning
- If 6 to 18 months → recommendation and reasoning
- If beyond 18 months, or uncertain → recommendation and reasoning

State the re-migration cost explicitly in each branch: how many campaigns, how many assets, how much client rewrite, and whether it can be done without downtime.

That turns an architecture decision into a single question Stephen can answer.

---

## Item 2 — Report the context headroom curve

M1 reported 6,482 of 7,000 characters at chapter 15 with 12 souls, no famine, no trim events. That is 93% utilization and 518 characters of headroom.

93% with zero margin reported as "no overflow" is thinner than it reads. The question is not whether 12 souls fits. It is where the curve crosses.

### Measure

Run the load fixture at chapter 15 with:

- 12 souls (the existing baseline, for comparison)
- 16 souls
- 20 souls
- 12 souls with a saga chained from a prior volume
- 12 souls with heirs present

Report assembled prompt size for each, and per-block size where it changes materially.

### Answer

1. **At what soul count does the pack first exceed budget?** If it crosses at 14, the Stage 6.6 alarm was premature rather than false, and the distinction matters for how much confidence M1 earned.
2. **Does a chained saga push it over on its own?** Sagas cite a prior volume by head seal, so the memory block may carry material the single-campaign fixture never had.
3. **Is 12 souls typical, or is it the middle of the range?** If real campaigns routinely card 15 or 20, the baseline was optimistic.

---

## Item 3 — Fire the famine path

L1 built briefing famine and the `[DROPS]` block. M1 reported zero trim events. So the famine path has never executed in any test.

Under Rule 31 that is unproven code, and it is precisely the code that runs when the thing you were worried about happens.

### Build a fixture that overflows on purpose

Whatever Item 2 finds as the crossing point, go past it. Then assert:

- famine fires
- **the scene floor is never trimmed**, per Graph Law
- the villain is retained, per Graph Law
- souls present in the scene are retained
- the `[DROPS]` block emits and names what was dropped, per Rule 27
- **nothing about the famine reaches a player surface**, per Rule 22
- the assembled pack after trimming is within budget

That last one matters most: a trimmer that runs and still overflows is worse than no trimmer, because it reports success.

**Test:** extend `contextUnderLoad` with a famine court, or add a sibling gate. Name it so the coverage is legible.

---

## Item 4 — Audit the `escalationRuntime` courts

Court ⑪ reportedly "required using the unique post-loop return form as the search anchor rather than the import." Search anchors are how you match source text, not how you drive a running provider.

### Answer plainly

For each of the 11 courts, state whether it:

- **runs** — drives stub providers and observes the chain's behavior at runtime
- **reads** — inspects source, structure, or exports

Both are legitimate. Only the first proves escalation happens.

### Then act on the answer

If the majority run and one or two read, note the reading ones as structural checks and move on.

If most read, the phase's central claim is unproven and needs rebuilding: stub providers that fail on command, each stage of the chain observably reached, the fallback measured against the narration floor.

Report the wall clock of a full four-attempt escalation either way. That number was requested in M2 and has not been reported, and it likely explains the 39.7-second worst turn in the march.

---

## Item 5 — Classify the remaining catch blocks

M3 reports 199 total catch blocks, 33 comment-justified, 8 instrumented as swallowing, 0 completely empty. That leaves 158 unaccounted for.

### What the inventory asked for

Every catch classified as one of three:

- **handles** — recovers meaningfully, and the recovery is named. "Returns a default" is only handling if the default is correct behavior rather than a shrug.
- **reports** — rethrows, or logs with enough context to act on, or increments a counter
- **swallows** — neither

### The trap to avoid

**Zero completely empty is not zero swallows.** A catch that logs a line and neither recovers nor rethrows is a swallow with a console message. The caller proceeds as though nothing failed, which is the exact defect class that hid P12, P13, and the plate drops.

Classify by what the *caller* experiences, not by whether the block has statements in it.

### Deliver

The full classification in the log, and every site classified as swallowing either instrumented or justified in writing. If the count of genuine swallows is much higher than 8, that is the finding.

---

## CONSTRAINTS

- These five are cleanup. If a playtest finding arrives, it outranks all of them.
- Item 1 produces a document. Do not implement any option.
- Item 3 may not adjust the budget to make famine fire, and may not adjust it to make the trimmed result fit.
- Item 4 may not relabel a reading court as running. If it reads, say it reads.
- Item 5 may not classify a site as "handles" without naming what it recovers.
- Rules 30 and 31 stand.
- Push at the close of each item.

## ORDER

**Item 2, Item 3, Item 4, Item 5, Item 1.**

Items 2 and 3 are paired: the curve tells you where to put the famine fixture.

Item 4 is an audit and may turn into a rebuild. Knowing which, early, is useful.

Item 5 is mechanical and can absorb whatever time is left.

Item 1 last, because it is a document rather than code, and because the timeline input it depends on may arrive from Stephen while the other four are running.
