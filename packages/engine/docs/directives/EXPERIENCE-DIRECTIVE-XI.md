# EXPERIENCE-DIRECTIVE XI — THE WRITER'S ROOM

**Task 58 · Release 0.9.0 · Ratified before any code, per the Series Preamble's directive-first law.**

The verifiable preconditions held before a line was written: HEAD `5c535b6`
({PRIOR_HASH} exactly), CHANGELOG top 0.8.0, keyless check exit 0 at
precisely 106. This is the last new architecture before 1.0.

One author under law fights canon drift; nothing yet fights dull prose,
retracted words, or orphaned captions. Playtests convict the telling of
three crimes the record cannot see: prose that echoes itself beat after
beat because no one reads yesterday's pages before writing today's;
narration the player watched being written and then watched being UNSAID —
the reconsidering retraction, an author erasing ink in front of the reader;
and captions that are not sentences at all but 90-character knife-cuts of
narration, orphaned mid-clause under plates they do not describe. This
directive seats three minds behind the same single door and hangs a curtain
in front of all of them.

**THE SEATS.** The Director (once per beat: intent and measure), the Voice
(the standing dm_turn author, unchanged in station), the Editor (every
draft, behind the curtain), the Art Director (only when a plate is due).
`server/room.js` orchestrates the seats; the `/api/dm` door remains the one
door.

**THE DOOR LAW.** However many minds deliberate, exactly one validated
`dm_turn` enters the record per turn — and the player sees nothing until it
has. The Art Director's work merges INTO that one turn before the validator
sits; no seat writes to the record on its own.

**THE INHERITANCE.** The briefing already carries the calendar, the watch,
the ground, the party, the elsewhere, the wealth, the threads, and the
battle state. Every seat reads the whole world through that one object. NO
NEW CONTEXT PLUMBING IS SANCTIONED — a seat that wants more world than the
briefing carries is asking for a different task.

If the build must deviate, this file is amended in the same commit with a
one-line reason.

---

## SECTION 1 — THE CURTAIN LAW (governs all stages)

## LAW I — THE CURTAIN

**The law.** The player sees only sealed prose. The draft, the Editor's
judgment, any revision, the Art Director's work, the validator's court, and
the repair loop all complete behind the curtain; only the sealed turn
reaches the client, where it is poured as a performance — strict growth,
reduced motion honored, the pour reading from sealed bytes alone.

**Enforcement.** The `/api/dm` door abolishes its pre-seal vocabulary: the
`narration` and `retract` SSE events die at the door. The stream speaks
heartbeat comments (to hold the wire open) and then exactly one `turn`
event carrying the sealed result. `mockWithNarration`'s pre-seal slicing
retires with the events it fed. The client pour becomes a client-side
performance over sealed text: progressive rendering with strict growth,
instant under reduced motion, deterministic on the mock tier.

**Gate.** `evals/curtain.test.mjs` (stage one).

## LAW II — NO RENDERED NARRATION IS EVER UNSAID

**The law.** The client state machine loses its `reconsidering` state
entirely, and no state that retracts, replaces, or blanks rendered story
text may exist. **The removed states, named:** `reconsidering` (the
`retract` event handler and its status line "The Dungeon Master reconsiders
the telling…") and the pre-seal `weaving` partial-narration render (text on
screen before validation). What remains is: considering (no story text
shown), pouring (sealed text performing, strictly growing), idle.

**The player's veto stands apart.** The X-Card's redaction strikes SEALED
pages from the record at the player's own command. The curtain binds the
HOUSE, not the player: the house never unsays its telling; the player may
always strike the record. The retraction detector's harvested session pours
without X-Card use, and the X-Card courts of Directive VI stand untouched.

**Enforcement.** G5's strict-growth assertion moves to the pour, and G5
gains THE RETRACTION DETECTOR: a MutationObserver armed across a full
harvested session that fails the court if any narration text node is ever
removed or replaced after render.

**Gate.** G5 (re-aimed), tooth 19 proving the detector's own eyes.

## LAW III — THE HONEST TRADE, PINNED

**The law.** The first word of a turn now arrives when the turn is
finished. The trade is stated in measured numbers, not sentiment, at the
`/api/dm` door itself — mock tier, keyless, N=15 genesis pours, the
instrument being `tests/e2e/tools/measure-first-word.mjs`:

- **BEFORE (on {PRIOR_HASH} `5c535b6`):** first pre-seal word median **7ms**
  (max 393ms); sealed turn median **731ms** (max 1118ms).
- **AFTER (on the curtain's bytes, same instrument, N=15, amended by this
  law's own command):** first SEALED word median **5ms** (max 323ms) — the
  sealed arrival IS the first word. The instrument now throws on any
  `narration` event at the door: a pre-seal byte is a curtain breach, not
  a datum. The verdict of the trade: the pre-seal theater WAS the door's
  latency — retiring it moved the sealed page from 731ms to 5ms median at
  the mock tier. The player waits for nothing and is never lied to.

G5's bound is re-pinned: the number holds at `FIRST_WORD_PINNED_MS = 12000`
and its MEANING tightens — from first pre-seal byte to first SEALED word
(5ms median / 323ms max measured at the mock door; ≈37× headroom on the
max, sized for full-suite contention). The same figure bounding a stricter
event is a tightening, and the bar may only tighten from here. THE FIRST
WORD LAW of 54C is untouched at genesis: the prologue REQUEST still leaves
the page before any paint request — dispatch order is law; arrival time is
the trade. G5 also seats THE RETRACTION DETECTOR: a MutationObserver holds
the adventure log for the whole sitting, and any narration node removed or
rewritten to anything but a strict extension of what stood is a named
violation — the empty ledger is asserted at the sitting's end.

**Gate.** G5 (re-pinned), G24 criterion 6 (p50 within the bound).

---

## SECTION 2 — STAGE ONE: THE DIRECTOR AND THE MEASURE

## LAW IV — THE DIRECTOR'S SEAT

**The law.** The Director runs ONCE PER BEAT. Given the briefing, the
thread ledger, and the spine, it produces `beat_intent` as strict JSON,
exactly these keys:

- `intent` — one sentence, 12–200 characters;
- `secrets_held` — array (0–4) of strings the narration may know but not say;
- `threads_to_touch` — array (0–3) naming open threads overdue for payoff,
  each a thread the ledger actually holds;
- `forbidden_repeats` — array (0–5) naming motifs recently overused;
- `measure` — exactly one of `lean` | `standard` | `rich`.

**The measure mapping, stated as law:** quiet connective beats run lean;
most beats run standard; arrivals, revelations, and act turns run rich.

**The cache.** The sealed `beat_intent` rides the turn's metadata into the
record; the client returns it inside the briefing; the Director sits ONLY
when the standing beat index has no carried intent. A cache hit costs
nothing and counts nothing.

**The mock Director is deterministic** — seeded by beat index and spine
label, byte-stable across runs.

**BUDGET LAW.** At most ONE Director call per beat;
`room_ledger.director_calls` in the turn metadata proves it (see LAW XI).

**Enforcement.** `server/room.js` (the orchestrator; new file). The door
in `server/index.js` remains the one door.

**Gate.** `evals/director.test.mjs`.

## LAW V — THE MEASURE LAW

**The law.** The Voice is instructed by the measure. A paragraph is one
`narration_blocks` entry. The bands, in numbers:

| measure | paragraphs (narration blocks) |
|----------|-------------------------------|
| lean | 1–2 |
| standard | 3–5 |
| rich | 6–8 |

The server token ceilings rise to make rich beats possible: Anthropic
`max_tokens` 2200 → **3200**; OpenAI 2400 → **3400**. The measure directs
richness and never licenses filler — the echo and cliche gates of stage two
govern every measure equally. **RHYTHM IS LAW:** consecutive rich beats are
the exception, not the habit — the Director assigns rich to consecutive
beats only across an act turn, and the mock Director never does.

**Enforcement.** `room.js` folds the measure instruction into the Voice's
dynamic blocks; the Editor's measure check (LAW VI) judges the sealed count
against the band.

**Gate.** `evals/director.test.mjs` asserts mapping, bands, and rhythm on
the mock walk; the measure check itself is asserted in stage two's corpus.

**Stage-one gates, keyless — the pin rises 106 → 108 (+2), the G13
assertion moving in the same commit:**
1. `evals/director.test.mjs` — one PASS line: schema including measure,
   cache behavior (a carried intent seats no Director), deterministic mock,
   budget counter.
2. `evals/curtain.test.mjs` — one PASS line: the door speaks sealed turns
   only (no `narration`/`retract` events anywhere in a streamed mock pour),
   the `reconsidering` state absent from the client machine, pour
   determinism on the mock tier.

---

## SECTION 3 — STAGE TWO: THE EDITOR

## LAW VI — THE PRE-PASS (deterministic, free, every draft)

**The law.** The Editor judges every drafted turn behind the curtain,
before the validator. Its deterministic pre-pass costs zero calls:

- **THE ECHO CHECK.** Fold case and punctuation; any 8-word run of the
  draft's narration shared verbatim with the narration of the last 20
  sealed turns raises flag `echo`. The threshold is pinned: ONE shared run
  flags.
- **THE CLICHE CHECK.** A pinned lexicon (a fixture data file — instrument
  matter, not prompt law; LISTLESS LEGISLATION stands untouched) with a
  pinned density ceiling: more than 2 lexicon hits per 1,000 narration
  characters raises flag `cliche`.
- **THE SUGGESTION-SAMENESS CHECK.** Token-set Jaccard ≥ 0.80 between any
  two suggestions of the draft, or between any draft suggestion and any of
  the prior turn's suggestions, raises flag `sameness`.
- **THE MEASURE CHECK.** A sealed paragraph count outside the beat's
  assigned band raises flag `measure`; below a rich band it is named
  `under-measure`.

**Enforcement.** Pure functions in `server/room.js`; no provider, no dice.

## LAW VII — THE JUDGED PASS (on a flag, or at the sampling law)

**The law.** Only on a pre-pass flag, or at the pinned sampling rate —
every 7th turn (`turnNumber % 7 === 0`), deterministic — does the judged
pass run: one temperature-zero call returning strict JSON
`{ verdict: 'ship' | 'revise', reasons: [...] }`, judged on voice
consistency per the cards, stakes drift against the `beat_intent`,
freshness, and under-measure (thin prose on a beat assigned rich). A
cheaper model is sanctioned. The rubric question passes the calibration
probe to perfect separation — sealed good pages, planted bad pages — before
its court sits, and its final text is pinned byte-stable.

## LAW VIII — ONE REVISION MAXIMUM

**The law.** A `revise` verdict buys exactly one redraft. A twice-refused
draft SHIPS, its flags and verdict attested in the turn metadata — the room
may not stall the table, and because of the curtain, the player never
witnesses any of it.

**BUDGET LAW.** At most two extra calls on the worst turn (one judged pass,
one revision draft), at most one typical; `room_ledger.editor_calls`
proves it.

**Stage-two gates, keyless — the pin rises 108 → 110 (+2), G13 moving in
the same commit:**
3. `evals/editorEcho.test.mjs` — one PASS line: the echo gate against a
   fixture corpus (planted violations caught, clean pages pass), WITH the
   measure check asserted in the same corpus.
4. `evals/editorCliche.test.mjs` — one PASS line: the cliche gate against
   the corpus (planted density caught, clean pages pass), with the
   suggestion-sameness check asserted beside it.

---

## SECTION 4 — STAGE THREE: THE ART DIRECTOR AND THE CAPTION

## LAW IX — THE ART DIRECTOR'S SEAT

**The law.** The third seat runs ONLY when a plate is due under the
existing cadence — the cadence law itself does not move. It reads the
SEALED prose of the approved draft plus the briefing, and produces strict
JSON: the `image_cue` with subjects ordered principal-first under the frame
laws of 0.7.3, the crowd allowance, and the region; the `moment` line — the
exact prose the plate illustrates, which becomes the text the
moment-coherence court judges against; and the `caption` (LAW X). Its
output merges into the single `dm_turn` BEFORE the validator: the door law
holds, and every cue it writes faces the same living-and-present court as
any other. A cheaper model is sanctioned. The mock Art Director is
deterministic.

**BUDGET LAW.** At most ONE Art Director call per due plate;
`room_ledger.art_director_calls` proves it.

**THE TOLLGATE, NAMED.** The Art Director moves the paint-law hash BY
DESIGN, so the harvest crosses the tollgate fresh, and THE MINT LAW of the
standing series governs every fresh mint it requires.

**Gate.** `evals/artDirector.test.mjs`.

## LAW X — THE CAPTION LAW

**The law.** A caption is AUTHORED, never sliced. It is one or two complete
sentences describing what the plate depicts, grounded in the sealed prose.
The deterministic shape law at the door:

- begins with a capital letter;
- ends in terminal punctuation (`.` `!` `?`);
- sits within the band **40–220 characters**;
- contains one or two sentences, no more;
- contains no truncation marks (no `…`, no `..`, no mid-word cuts);
- and is NEVER a substring slice of the turn's narration: the caption,
  whitespace-folded, must not appear as a contiguous substring of the
  whitespace-folded narration.

The calibrated caption court of the standing instrument law then judges
the caption against the FINISHED IMAGE itself, so a caption that names an
absent figure or a wrong action fails on the plate, not on the prose.
Legacy plates poured before this law keep their sliced captions in REPLAY
only; every newly due plate carries an authored caption.

**Enforcement.** Shape law at the door in the room (server-side, before
the validator; the additive `caption` rides the cue into the one turn);
the caption court sits in the proving loop (G24 criterion 4).

**Stage-three gates, keyless — the pin rises 110 → 113 (+3), G13 moving in
the same commit:**
5. `evals/artDirector.test.mjs` PASS line one: the seat — schema,
   deterministic mock, runs-only-when-due, budget counter.
6. `evals/artDirector.test.mjs` PASS line two: the merge — one `dm_turn`
   through the one door, the cue facing the standing frame courts, the
   moment line binding the coherence court's text.
7. `evals/caption.test.mjs` — one PASS line: the shape law's full matrix,
   including the never-a-slice assertion, byte-stable on the mock tier.

---

## LAW XI — THE ROOM'S LEDGER (the budget law's proof)

**The law.** Every sealed turn carries `room_ledger` in its metadata — an
additive field, absent on every turn poured before this directive:

```
room_ledger: {
  beat_index:          integer,
  director_calls:      0 | 1,
  editor_calls:        0 | 1 | 2,
  art_director_calls:  0 | 1,
  revisions:           0 | 1,
  flags:               [ 'echo' | 'cliche' | 'sameness' | 'measure' ... ],
  editor_verdict:      'ship' | 'revise' | null
}
```

The counters are written by the room as the calls are spent, never
reconstructed after the fact. The gates read the ledger; the budget laws
are proven by it, per turn, on every tier including mock. The protocol
stays additive: older campaigns load and play untouched.

---

## SECTION 5 — THE CRITERIA AND THE TEETH

**G24 — THE PROSE COURT** joins the proving loop:
1. the deterministic checks pass on every shipped page across a harvested
   mock transcript AND a live short session;
2. every shipped page sits within its assigned measure band;
3. the judged rubric over the harvest, cached under the freshness law,
   returns `ship` on every shipped page;
4. every caption in the harvest passes the shape law and the calibrated
   caption court against its own plate;
5. the retraction detector of LAW II runs the full session clean;
6. turn latency p50 stays within the re-pinned bound of the curtain trade.

**TOOTH 10 — THE SLOP TOOTH** takes its reserved seat and bites twice:
- a planted awful page — repeated phrasing, near-identical suggestions,
  cliche-dense prose — must be flagged by the pre-pass AND judged `revise`
  with at least two named reasons;
- a planted thin page on a beat assigned rich must be judged `revise` with
  `under-measure` among its named reasons.

**TOOTH 19 — THE RETRACTION TOOTH:** run the detector against a synthetic
page that swaps a narration node mid-pour and assert it FAILS. A curtain
whose watchman cannot see a retraction is decoration.

**CEILING:** twelve iterations across the three stages. Each stage proves
keyless before the next begins. Close with the ritual and the report per
the preamble.
