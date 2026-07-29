# MASTER DIRECTIVE — STAGE 6

## Closing the Open Items, and Building Real Integrity Checks

Part A closes what is outstanding across Stages 3, 4, and 5. Most of it is small.

Part B is new. It builds the validation layer that would have caught nearly every bug of the last five stages before a playtest found it.

---

# PART A — CLOSE THE OUTSTANDING

## Phase K0 — The one-minute checks

Three of these need a phone and no code. Do them first, together, and write down what was seen.

### K0.1 — Does narration audio survive past the first segment (H1)

Carried across three directives, still unreported.

Play a turn with narrator prose followed by at least one character line. Watch whether the character line follows.

Mobile autoplay permission attaches to the specific `Audio` element that played during the gesture, not to the page. If narration constructs `new Audio()` per segment, only the first plays; the rest are constructed from an `ended` handler, which is not a gesture, and fail silently. `primeNarration()` fixes the first segment either way, so this presents as voice working and then stopping.

If it fails: reuse one unlocked element for the chain, set `.src` per segment, and put a rejection handler on every `play()` call.

### K0.2 — Safe insets on the table route

The HUD is sliced through "Day 1, afternoon" in multiple screenshots, with the avatar and icons clipped. Reported fixed in Stage 1, still broken.

### K0.3 — The HP chip and the empty band

The HP chip renders as "10/1" on every scrolled view: the chip row overflows with no scroll affordance. And roughly a third of the viewport sits empty between the plate caption and the tick block in several screenshots. Identify what occupies that space and whether it is rendering empty.

**Done when:** all three are observed and written down, per Rule 30.

---

## Phase K1 — Confirm J1 filters rather than only asserts

The J1 report describes an exit assertion on `resolveAnchors()`: every resolved anchor's `campaignId` must match the active campaign, with `logRefusal` and a throw on mismatch.

That is a guard at the exit, not a filter at the query. Two questions:

1. **Does selection still pull foreign anchors before the assertion sees them?** If so, the throw kills the paint and the player gets no plate. That is P13's failure mode arriving through a new door.
2. **Does `referenceScope` have a court running two campaigns in one store and asserting every reference in campaign B belongs to B?** If yes, the property is held and the assertion is belt-and-braces. If no, the property is untested.

Then close E3's remaining items, unaccounted for across three stages:

- **Item 2** — every retrieval feeding the DM prompt filters by campaign id at the query.
- **Item 5** — sweep or evict pre-existing unscoped cache entries so they cannot be served.

**Test:** extend `referenceScope` with a two-campaign court if it lacks one; assert selection returns zero foreign candidates rather than relying on the exit throw.

---

## Phase K2 — Confirm the caption is not sliced narration

J3 added word-boundary backtracking, which fixes the cut. Rule 29 also requires that a caption describe the image rather than repeat prose the player just read.

Confirm `captionShape` includes a court asserting no caption is a substring of its turn's narration. If it does not, add it, then fix what it catches.

---

## Phase K3 — Verify plate framing in the browser (P23)

J5 closed on "CSS already conforms," which Rule 30 forbids and which does not explain the evidence: the same Plate 6 rendered as a letterbox strip with a headless torso in one screenshot and a full composition in another. Unconditional CSS cannot produce two renders of one image.

Something else caused it: a parent's overflow, a fixed-height ancestor, the plate measured mid-load, or a container that differs by scroll position. The `j7-layout` project exists now; a plate court costs almost nothing.

**Test:** in `j7-layout`, assert a tall fixture plate renders at its declared ratio, is not cropped through its subject's face, and renders identically at the top of scroll and mid-scroll.

---

## Phase K4 — Write the Shared Sky into the constitution

The Shared Sky is a real feature with a Settings toggle: one seasonal omen hangs over every world, which the DM may read by a world's covenant or ignore entirely.

It crosses a campaign boundary by design. Rule 21 says nothing does. Unless the exception is written down with its scope, the next isolation audit either flags it as a bug or cites it as precedent for other traffic.

Add it to `docs/CLAWS.md` as a named, narrow exception: what may cross (a seasonal omen and nothing else), in which direction, under which toggle, and what remains forbidden. Name its enforcement point and its gate.

---

## Phase K5 — The crash diagnosis (H0)

Never produced. Still cheap. Still decides whether quota or migrations are urgent.

For the crashed campaign: does the campaign row exist, how many journal rows are present, does the chain verify and at which entry does it first fail, does the head hash match the last row, does the load path throw and where, and what does `navigator.storage.estimate()` report for the origin.

Classify the cause: shape drift, unguarded reducer throw, chain break, quota exhaustion, or other. The classification decides whether K7 or the quota work becomes urgent.

---

## Phase K6 — The `recordHash` fallback (H3)

The scene plate key is `scene:${campaign.id}:${turnRecord.recordHash || logId}`.

If a plate is minted pre-seal, `recordHash` is absent and the key uses `logId`. If lookup happens post-seal, the key uses `recordHash`. Mint and lookup then differ, which is P13 re-entering through the fallback branch.

Confirm whether `recordHash` exists at mint. Either way, remove the conditional: use one identifier stable across the seal boundary, produced by a single shared function called by both mint and lookup.

---

## Phase K7 — Real migrations (H6)

A guard is not a migration. The `onOpen` wrapper means a shape-drift throw no longer strands a player on the title screen. Old campaigns still fail, more quietly.

Enumerate every field whose shape changed in Stage C (identity), E3 (cache keys), and E5 (narration bounds). Write a migration for each. Where a field cannot be reconstructed, supply a documented default and record on the campaign that a default was applied.

Confirm the back-compat gate walks a save from before each change, not only a pre-possessions save.

---

# PART B — INTEGRITY INFRASTRUCTURE

Everything above is reactive: a playtest found it, a screenshot proved it, a directive fixed it. Part B builds checks that find these before a playtest does.

## Phase K8 — The instrumented long march

**This is the highest-value item in the directive.** Build it even if nothing else in Part B lands.

### What it is

A scripted 30-turn campaign that runs in the browser suite on every commit, start to finish: creation through turn 30, with plates, voice, ticks, an act change, a combat, and a repaired turn.

While it runs, it counts every one of these:

- every refusal (boundary assertions, the render door, the Audio Director, validator rejections)
- every fallback (repair turns, the understudy, `safeFallbackTurn`, register defaults, procedural art)
- every caught exception, including ones handled correctly
- every skipped entry, dropped asset, or unresolved reference
- every `play()` rejection
- every quota warning

Then it asserts those counts against a committed budget.

### Why this specifically

Every bug of the last five stages was silent rather than loud:

| Bug | How it presented | How the march catches it |
|---|---|---|
| P13, plates silently dropped | empty frame | refusal count jumps |
| P12, voice dead | inert control | `play()` rejection count nonzero |
| P8, validator leak | text in the footer | leaked string appears in the DOM |
| P10, thin turns shipping | short prose | floor-breach count nonzero |
| P21, tick spam | six identical blocks | tick count exceeds budget |
| P20, captions cut mid-word | visible truncation | caption court runs on real captions |
| P17, foreign references | wrong objects in art | refusal or reference-scope count moves |

Not one of them needed a new idea to detect. They needed something to be counting.

### The budget

The counts are committed to the repository as a file. A count that rises fails the build. A count that falls is a fix, and lowering the budget is part of that commit.

Zero is not the target for every counter. A repair turn firing occasionally is healthy. Forty silent refusals in thirty turns is not, whether or not anything visibly broke.

**Test `longMarch`:** the scripted campaign completes 30 turns; every counter is within budget; the record verifies at the end; every derived surface builds without error.

---

## Phase K9 — Schema, prompt, and validator agree, by gate

Stage 2 Phase E5 found a 200-word floor against a 180-word ceiling: an unsatisfiable law that could only ship by making enforcement advisory. It was caused by amending one of three places and not the other two.

Nothing currently prevents that recurring. The amendment rule is discipline, not enforcement.

Build a gate that reads the shared constraints out of all three sources — the tool schema in `server/dm.js`, the prompt in `src/lib/systemPrompt.js`, and the validator in `src/lib/protocol.js` — and asserts they agree numerically. Narration bounds, block counts, suggestion count and length, entropy accounting, and any other constraint stated in more than one place.

Additionally assert every constraint is **satisfiable**: floors strictly below ceilings, with a stated margin.

**Test `lawsAgree`:** every constraint appearing in more than one of the three sources holds the same value in all of them; every bounded constraint has a floor below its ceiling.

---

## Phase K10 — The golden record

Seal one canonical campaign. Commit it as a fixture. Assert every derived surface renders byte-identically from it, forever.

This is the strongest available check on the project's central claim: that every surface is a replay of the record. It catches reducer drift, card changes, graph changes, chart changes, and context-pack changes that no per-feature test would notice, because it compares against a known-good output rather than against a re-derived expectation.

Add a second copy sealed before Stage 1 and assert it still loads, replays, and exports. That is the back-compat promise under a season of law changes, and it pairs with K7.

**Test `goldenRecord`:** the canonical campaign's cards, graph, chart, party, standings, Book, and context pack match committed snapshots byte for byte; a pre-Stage-1 save still loads and replays.

---

## Phase K11 — Provenance sweep on every player-visible string

The curtain has now leaked three separate ways: the scriptorium block, the validator repair message, and the beat directive on the chapter card. Each was patched at its own exit.

Generalize it. Every string that reaches the DOM is checkable against two questions: which module produced it, and is that module allowed to speak to players.

Build an allowlist of speaking modules. Everything else is refused at the boundary rather than sanitized after the fact. Run it across every route in the browser suite, not only the ones that have leaked.

Fold the reveals check in: no string may name a character whose reveal is not recorded, on any surface. The Pale Herald leak was a reveals failure as much as a curtain failure, and the tick system leaked the same character's goal on a second surface afterward.

**Test `provenanceSweep`:** across every route with a fixture campaign at several turn depths, every rendered string traces to an allowlisted module and names no unrevealed character.

---

## Phase K12 — Differential keyless versus keyed

The keyless floor is load-bearing: it is the mock tier, the CI chain, and the proof the game runs without money. But no test asserts that key presence changes only *quality*, not *structure*.

Run the same scripted campaign twice with the same seed, once keyless and once keyed, and assert the sealed records are structurally identical: same turn count, same operations, same state transitions, same cast, same graph. Only asset provenance and content differ.

This catches any place where a provider's presence or absence changes game logic, which would mean the keyless floor is testing a different game than the one players play.

**Test `keylessParity`:** two runs of one seeded campaign, keyless and keyed, produce structurally identical records.

---

## Phase K13 — A written playtest protocol

Playtests are currently ad hoc: play, notice, screenshot. That found real bugs, but it finds different bugs each time and cannot tell you whether something that broke last month is still broken.

Write a protocol. A short, ordered checklist covering the paths that keep breaking: creation end to end, the first turn, the first plate, the first voice line and the second, a tick, an act change, the Book's six tabs, a save and reload, and an export.

Each item gets a pass or fail and a note. The result is comparable across sessions, and a regression shows up as a line that changed rather than as a thing someone happened to notice.

Keep it to one page. A protocol nobody runs is worse than none.

---

## Other checks worth knowing about, not scheduled here

**Property-based testing of the reducers.** Generate random valid operation sequences and assert the invariants hold: the chain verifies, no card loses its identity, no dead soul speaks, bond stays in range, the array sums to 72. Fixtures test the cases you thought of; generated sequences test the ones you did not.

**Visual snapshot diffing.** With Playwright present, snapshot every route and diff against committed images. Cheaper than writing per-property geometry assertions, and it catches layout regressions nobody thought to assert on. Noisy on generated art, so scope it to chrome.

**Context budget instrumentation.** The context pack has a 7,000-character budget. Nothing reports how close a long campaign runs to it, or what gets dropped when it fills. Worth a counter in the long march.

**Cold-eyes review.** The reviewer knowledge document suggests this has been done at least once. Worth repeating after Stage 6, since three stages of law changes have landed since.

---

## CONSTRAINTS

- Code and documentation move in the same commit. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change.
- Push at the close of every phase.
- Do not modify `src/lib/seal.js`, `src/lib/rules.js`, `src/lib/chronicler.js`, the Audio Director interlock, or Anchor Law logic.
- K1 tightens isolation. Do not relax any check to make it pass.
- K9 may not resolve a disagreement by changing the validator alone. All three move together.
- K10's snapshots are regenerated only alongside a stated, intentional change, never to make a red test green.
- No test weakened, skipped, or deleted. The Node suite stays keyless.
- Rule 30 stands: no rendered-output defect closes on a source-level check.
- One phase per checkpoint.

## ORDER OF WORK

**K0, K5, K1, K2, K3, K8, K9, K6, K7, K4, K10, K11, K12, K13.**

K0 and K5 first: they need a phone and a debugger, not a build, and K5's classification decides whether K7 or the quota work becomes urgent.

K1 through K3 next: each closes a Stage 5 item that is currently reported closed and unverified.

**K8 as early as the schedule allows.** Every phase after it gets a check that actually watches. Pulling it forward means the rest of this stage is verified rather than reported.

K9 before K6 and K7 because it is the cheapest structural protection in the list and prevents a whole defect class from recurring.

K10 through K13 are durable infrastructure with no external pressure behind them. They are also the difference between finding bugs by playing and finding them by building.

## VERIFICATION

Per Rule 30, every rendered-output item closes on a browser assertion or a recorded device observation.

K8's first run establishes the budget. Expect the initial counts to be higher than comfortable. That number is the current silent-failure rate, and it has been invisible until now.
