# EXPERIENCE-DIRECTIVE VI — THE POSSESSIONS CUT (0.7.0, Task 55)

The sixth filed directive of the series on disk (IV and V precede it; older
code comments citing "Directive VI, Phase N" refer to a prior internal
numbering and are not this file). Written BEFORE any code, per the series
preamble. If the build deviates, this file is amended in the same commit.

Standing law inherited without restatement: the protocol is additive (old
campaigns load untouched); the mock tier is sovereign; the single door holds
(one validated `dm_turn` per turn; nothing writes to the record except
through the validator and the reducers); LISTLESS LEGISLATION (no example
enumerations in prompt-law strings; the poison sweep's relics stay
byte-stable); no new dependencies; missing keys are a hard stop.

---

## LAW 1 — The four operations, and only through the door

`story` gains four operations. Each is an ARRAY on the story object, like
every story op before it. Unknown story keys remain ignored (additive law).

- `item_add`: `{ name, kind, holder, note? }` — name 3–60; kind one of the
  five kinds declared structurally in the tool schema and enforced by the
  validator; holder 1–60; note absent or 1–90 (an empty string is refused:
  a note that says nothing is not a note).
- `item_transfer`: `{ name, from, to }` — name 3–60, from/to 1–60,
  `from !== to`. Lawful only if the record shows `from` CURRENTLY holding
  that name.
- `item_remove`: `{ name, holder, reason? }` — lawful only against a current
  holding by that holder; reason absent or 1–90.
- `purse`: `{ holder, delta, reason }` — holder 1–60; delta an integer in
  −999…999 and never 0 (a coin that does not move is not a movement);
  reason 3–90, required.

**Counting law.** At most THREE item operations per turn across add,
transfer, and remove combined; at most TWO purse operations per turn.

**Enforcement point:** `packages/engine/src/protocol.js` —
`validateTrove(story, context, errors)` and
`validatePurse(story, context, errors)`, called from `validateDmTurn`,
built on the same `assert`/`noUnknown` pattern as `validateThreads`.

**Gate:** the trove gate (validator matrix: every field bound, unknown keys
refused, counting law, kind law) and the purse gate (delta bounds, zero
refused, reason required).

## LAW 2 — The overdraft law

The Dungeon Master may not spend coin a soul does not hold.

- **Validator court:** when the context CARRIES purse state
  (`Array.isArray(context.purses)` — presence, not emptiness: an empty
  array is the caller attesting that nobody holds coin), a purse operation
  that would take any holder below zero is REJECTED by name. The turn's
  own purse operations fold sequentially: the second op is judged against
  the balance the first op left.
- **Reducer court:** the reducer clamps to zero REGARDLESS, and writes a
  note into the refusal channel (`codex.notes`) naming the holder, the
  refused depth, and the reason — so even a turn that bypassed a
  purse-blind context cannot mint negative coin, and the DM hears the
  refusal in the next briefing's wounds.

**Enforcement points:** `protocol.js#validatePurse` (reject);
`story.js#applyStoryUpdates` (clamp + note).
**Gate:** the purse gate proves both layers on the same record.

## LAW 3 — Context rides exactly as threads ride

`validateDmTurn(payload, entropyPool, context)` gains `context.trove` and
`context.purses`, threaded through the SAME call sites that carry
`context.threads` today:

1. the App turn path (`src/App.jsx`, the landing court after the stream) —
   passes `base.codex.trove` and `base.codex.purses`;
2. the three server sites — all three provider courts (mock, Anthropic,
   OpenAI) judge through the single assembly point `server/dm.js#judgeTurn`,
   which gains `trove: input.story?.trove_state || []` and
   `purses: input.story?.purse_state || []`.

`storyBlock(codex)` gains `trove_state` (held items only, `{name, holder}`)
and `purse_state` (`{holder, coin}` in fold order), riding to the server
court the way `threads_state` rides.

**Transfer/remove legality gating:** enforced when the context carries the
trove (`Array.isArray(context.trove)` — presence-based, same reading as the
overdraft law). The record consulted is the PRE-TURN record: a thing added
this turn may not also be transferred this turn through the door (the
record must already show the giver holding it) — the same strictness
threads apply to same-turn swear-and-resolve. Bare-context callers (the
persona walk in `evals/run.mjs` passes only `cast`) remain lawful:
absent context, shape and counting law still bind; ledger legality waits
for a context that carries the ledger.

**Shape law:** `codex.purses` is an ARRAY of `{holder, coin}` (insertion
order — deterministic under replay), mirroring `codex.threads`; never an
object keyed by holder, so App context, server context, and gates all read
ONE shape.

**Gate:** the trove gate refuses a transfer against a non-holder at BOTH
layers (validator with context; reducer note without it).

## LAW 4 — The two ledgers (coexistence, stated once)

The house already counts a MECHANICAL lane: `hero.gold` and
`hero.inventory`, moved by `state_updates` (gold_delta, add_items), shown
on the Character Sheet, derived by `fatescript/ledger` for the till. That
lane is UNTOUCHED by this cut.

This cut adds the NARRATIVE lane: named things and per-holder coin, moved
ONLY by the four story operations, folded into `codex.trove` /
`codex.purses`, derived with provenance by `fatescript/trove`, shown on THE
TROVE page, and briefed to the DM as the wealth line. The DM is judged
(overdraft, transfer legality) against the NARRATIVE lane only.

The lanes do not merge, reconcile, or observe each other. The sheet counts
what the rules grant; the trove counts what the story registers. One thing
may lawfully appear in both (a sword gained as loot AND registered as a
named keepsake) — they are different books about different truths.

**Enforcement point:** none needed — separation is structural (different
op families, different folds, different pages).
**Gate:** the old purse gate (`evals/purse.test.mjs`, the game's till) keeps
passing untouched; the new gates never read `hero.gold`.

## LAW 5 — The derivations (journal truth vs working memory)

`packages/engine/src/trove.js` (surfaced to the game as `src/lib/trove.js`,
a compat shim `export * from 'fatescript/trove'`, seated exactly like
`threads.js`):

- `troveOf(campaign)` — replays `campaign.logs` in played order (ticks
  included, exactly as `threadsOf` replays), SKIPPING redacted rows;
  returns items with full provenance chains: every holder the thing has
  passed through, since which turn (log index, as threads cite), by what
  words (the turn's player line or deed, glossed to 90). Removed things
  stay in the ledger with status `gone`, their reason, and their last hand.
  The forge keepsake seed (LAW 6) is chain link zero.
- `purseOf(campaign, holder)` — folds the holder's deltas in played order
  with the SAME clamp law as the reducer; returns `{ coin, entries }`,
  each entry citing turn, delta, reason, and whether the clamp bit.
- Pure, deterministic, keyless; redacted turns contribute NOTHING.

**Strike law (inherited, applied):** journal strikes outrank snapshot
flags. `codex.trove`/`codex.purses` are the DM's working memory — a strike
does not rewind them (exactly as `codex.threads` keeps a struck swear).
The derivations and every player-facing page obey the journal. The gates
prove parity on unstruck records and strike-obedience on struck ones —
they do not pretend the two truths are one truth on a struck record.

**Enforcement point:** `trove.js` (replay); `story.js` (fold).
**Gates:** trove gate (provenance replay with citations; redaction seals
nothing); purse gate (fold parity reducer vs replay on a clean record;
clamp note parity).

## LAW 6 — The forge keepsake seeds the trove

- `rollHero(seed)` gains a deterministic `keepsake` (picked from the same
  pool the Oracle offers); `oracleHero({keepsake})` returns the chosen (or
  default) keepsake as a FIELD alongside the background sentence that
  already speaks it. A hand-forged hero states no keepsake and starts with
  an empty trove — an absence, honestly recorded, not a defect.
- `beginCampaign` carries `heroInput.keepsake` onto the hero (createHero
  whitelists; the carry is explicit, like bearing and mark) and passes it
  to `initCodex(spineId, { keepsake: { name, holder } })` — the LAWFUL INIT
  PATH. The seed becomes `codex.trove[0]`: kind `keepsake`, cited to turn
  zero, chain link "carried from the forge".
- `troveOf` reads the same seed from `campaign.hero.keepsake`, so journal
  and working memory agree from the first word.
- Every `initCodex` caller that seats a hero threads the seed: App's
  `beginCampaign`, the proving seeder (`src/lib/proving.js`), and the
  next-volume door (`openNextTale` already accepts `seed`; the App passes
  the carried hero's keepsake — the keepsake survives volumes because the
  hero does).
- G2's three-tap forge law is UNCHANGED: the seed adds no tap — the bones
  door mints the keepsake in the same throw.

**Enforcement point:** `forgeRolls.js`, `App.jsx` creation sites,
`story.js#initCodex`, `proving.js`.
**Gate:** trove gate (seed present, cited to turn zero, chain-zero link);
G2 unchanged in the loop.

## LAW 7 — The briefing wealth line

`buildBriefing` gains `hero_wealth`: one deterministic line — the hero's
coin from the narrative lane plus up to FOUR notable holdings (hero-held
trove items, most recently moved first). Present even when empty-handed
("X carries 0 coin."). It rides between the pack and the allegiances, and
the trim loop may NEVER drop it before `stated_allegiances` is empty; only
after the last allegiance falls may the wealth line fall. The existing
floors (calendar, beat, scene, open threads) outrank both, unchanged.

**Enforcement point:** `graph.js#buildBriefing` (line + trim order).
**Gate:** purse gate — wealth-line accuracy against the fold, and the trim
order proved at three budgets (roomy: both ride; squeezed: allegiances
gone, wealth rides; starved: both gone, floors hold). The existing
briefing gate keeps passing untouched.

## LAW 8 — The prompt law (LISTLESS) and the tool schema

`buildSystemPrompt` gains THREE rules continuing the numbered sequence
(26, 27, 28):

- 26 — register a named thing when it matters, via `story.item_add`; the
  trove is canon: a thing is in play because the record holds it.
- 27 — a held thing moves only by `story.item_transfer` from the hand the
  record shows, and leaves play only by `story.item_remove` with its
  honest reason.
- 28 — coin moves only by `story.purse` against the purse state the
  briefing shows; never spend coin a soul does not hold — the till
  refuses an overdraft.

LISTLESS LEGISLATION: no example enumerations, no pipes, no "e.g." in any
new prompt-law string. The five kinds are declared STRUCTURALLY, where
enums lawfully live: the `dm_turn` tool schema (`server/dm.js`) gains
declared shapes for the four new operations — full field constraints,
kind enum, delta bounds — on a `story` object that remains permissive to
its established keys (additive: nothing existing tightens). The schema is
what the model sees; a validator-enforced enum absent from the schema is
a trap, and the house does not build traps.

**Enforcement point:** `systemPrompt.js` (rules); `server/dm.js` (schema).
**Gate:** poison sweep stays green with relics byte-stable; the trove and
purse gates hold the validator to the same bounds the schema declares.

## LAW 9 — THE TROVE page

The Codex gains THE TROVE: the hero's ledger. Coin first — the current
figure and every delta with its reason and turn citation; then the
holdings — every named thing with its chain of hands (each hand: holder,
since-turn, by-what-words), removed things honestly marked. Rendered from
`troveOf`/`purseOf` (journal truth; strikes obeyed). Zero generation cost:
no paint, no providers, no new surfaces for the vision courts — the
cache-freshness law is undisturbed and the existing plates replay lawfully.

**Enforcement point:** `Overlays.jsx` Codex overlay, seated beside The
Open Threads in the house style.
**Gate:** G19 (DOM); G15's copy law already sweeps the Codex surface and
now covers the new page by construction.

## LAW 10 — The mock script bears the ops

The mock DM's genesis turn registers one item (`item_add`, with note) into
the hero's hand and grants one purse delta (positive — lawful against an
empty purse under the overdraft law), deterministically. Narration bytes,
paints, and every existing mock surface are untouched — the ops ride the
story object only, so no vision court's inputs move.

**Enforcement point:** `mockDm.js` (session-zero branch).
**Gate:** the persona walk (`run.mjs`) validates every turn as before;
the trove gate replays the mock genesis; the hooked-world capstone grows.

## LAW 11 — The gates grow by exactly two; the capstone grows

- New keyless gates (exactly TWO): `evals/trove.test.mjs` (the trove gate)
  and `evals/coinPurse.test.mjs` (the purse gate — the file is named
  `coinPurse` because `purse.test.mjs` is the OLD game-till gate, LAW 4;
  the PASS line names itself "the purse gate (story)"). One PASS line
  each; enrolled in the eval chain beside the threads gate.
- `evals/hookedWorld.test.mjs` (capstone) is SANCTIONED to grow: on one
  record, the briefing's wealth line, `troveOf`, and `codex.trove` agree.
  Its PASS count stays one.
- The pinned keyless count moves 94 → 96 in `g13-check.spec.ts`, in the
  SAME COMMIT that enrolls the gates, with the reconciliation noted in
  the pin's own comment.

## LAW 12 — G19 THE TROVE (the proving loop grows by one court)

A new DOM court, `g19-trove.spec.ts`, seated in the dom project, on the
seeded fixture EXTENDED thus: the genesis turn registers a document into
the hero's hand and counts the ferry-house purse (+30); the second turn
transfers the document to another hand and spends coin (−12, with reason).
The extension is additive to existing turns — no reordering, no narration
changes, no paint surfaces — so every sitting court's inputs are
undisturbed except where sanctioned.

Criteria, deterministic, no judge, no new teeth:
- **protocol:** the seeded record's `codex.trove`/`codex.purses` folded
  through the REAL primitives agree with `troveOf`/`purseOf` on the same
  campaign as read back from the database;
- **DOM:** THE TROVE page shows the coin entry with its reason and turn
  citation, the current figure (18), and the transferred item wearing
  BOTH hands in its chain;
- G15's copy law covers the new page (it already sweeps the Codex);
- G2's three-tap law is UNCHANGED.

The verdict's named-courts ledger and the pinned count move in the same
commit as the court is seated.

## LAW 13 — The ritual

Ceiling: EIGHT loop iterations (55.1 …). The extension law is available
only on its own terms. Close: keyless check green at 96 → three
CONSECUTIVE green proving runs (zero skips, teeth biting) → architect
review on the full diff, findings fixed or refuted on house law in
LOOP_LOG.md → CHANGELOG 0.7.0 → closing commit → ONE report in the house
idiom. The closing sentence is spoken only if every word of it is true.
