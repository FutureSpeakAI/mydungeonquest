# Changelog

## 0.6.5 — The First Word

**The prologue pours before the paint (Task 54C §1).** At genesis — a new chronicle or a next volume — the Dungeon Master's request now leaves the page BEFORE any paint request, always: a pure sequencer (`src/lib/genesis.js`) dispatches the pour, kicks the easel on the wire signal itself (never on the pour's completion), and lets both genesis doors (`beginCampaign`, `openNext`) walk through it. Narration streams on first byte; key art and the hero's bust mint in parallel and take as long as they take; late anchors merge into the LATEST telling by functional update; the turn's own media holds at the bench until the easel settles, so the hero's face exists before any scene cites it and the act's cover is never asked for twice. A snagged pour never starves the easel; a fallen easel never starves the bench; the caller owns the pour's outcome, never the paint's. **Measured:** solo first byte 21.5s → ~250ms (the sampler's floor); dm on the wire +90–203ms after the Begin tap, first genesis paint trailing it by 10–15ms.

**The meter settles once, as a delta.** Two foundries now count in parallel lanes at genesis, so the spend meter — absolute before, and able to clobber the prologue's tally — was rebuilt under architect review: `queueMedia` merges ONE delta over its foundry's construction base after EVERY lane in the batch lands or falls (riding the scene landing lost counts on cache-hit and refused-scene paths); the prologue easel merges its delta unconditionally (a refused anchor still cost its mint — hashes, though, only land with an asset); and the sequencer contains a pour that throws at the very door, so the easel and the media gate are never starved by a synchronous fall.

**One new keyless gate, one stricter court.** `firstWord` (gates 93 → 94) drives the real sequencer through 25 deterministically-jittered rounds against an ordered request ledger — the pour leads every one — plus snagged, silent, and fallen lanes, and renders the app's own turn group mid-paint to prove a late plate slots BELOW its words, byte-for-byte untouched, wearing no entrance animation. G5 gained the wire ledger (every /api/dm and /api/paint at initiation), a forge-lane drain before the tap (iteration 54C.3 caught a preview straggler reading as a false paint — the court's defect, not the cure's), the ABSOLUTE first-word law (no paint of any lane between tap and dm), a pinned first-byte bound (12s ≈ 48× the solo median, 2.5× tighter than the 30s window it always owned), and an easel-settled re-read of the order law over the live feed.

*Gates 93 → 94 as enrolled here. The loop ran .1 ✓ .2 ✓ .3 ✗ .4 ✓ at a
ceiling of four — three greens, not three CONSECUTIVE; the sole red was
the court instrumentation amended above. LOOP_LOG.md and
test-results/report-54C.md say so plainly; the closing ruling is the
owner's.*

## 0.6.4 — The Honest Instrument

**The proving instruments earn their verdicts (Task 54B).** Task 54 closed red with two residual classes wearing instrument smells, and 54B fixed the instruments without widening a single lane. THE MAGNIFIED LOOK: the mark question leaves the single-look brief — a new pure law module (`fatescript/magnifier`) that both doors share verbatim: the server warden and the court judge each ask for the subject's box, cut the same deterministically-clamped crop (padding and minimum edge as stated arithmetic, snapped against IEEE noise so neither door gains a pixel), and ask mark-visibility of the crop alone. Boxless, stumbled, absent, and gibberish answers are never sightings — fail-closed at both doors — and the sighting's box rides the attestation, so the record shows WHERE the warden looked. THE BINARY VERDICT: G16's scalar confidence floors are replaced by three forced binaries (element named from the text and seen, no different deed staged, nothing visible denying the words); the scalar is logged to the yellow ledger as a diagnostic and decides nothing. THE CALIBRATION PROBE: teeth 11 and 12 sit before the amended courts may — thirteen sealed pairs (true pairs beside their own prose; crossings, a false caption, beheaded and crown-band control crops) demanding PERFECT separation, the question texts pinned byte-stable by hash, every phrasing iteration ledgered: p2 fell to literalism (a still tableau read as a filmed deed), p3 to a lookalike denial (a wayside blaze read as denying a told banked hearth), p4 separated 13/13. THE SPLIT STREAM BAR: G5's stall assertion names its phase (first byte vs growth) and an out-of-band SSE probe witnesses the server pipe every iteration (first narration byte ≤417ms in all five) — which pinned 54.6's stall class where it lives: the game sequences the prologue pour behind genesis media (~21s solo), a game-side finding REPORTED in test-results/report-54B.md and deliberately left unfixed, outside this task's sanction. The loop closed: 54B.1 red (fresh-paint dice, the ratified anchored-plate bar fired as written), 54B.2 red (p2 literalism; the G5 stall under full-repaint contention), then 54B.3, 54B.4, 54B.5 — three consecutive greens, 61/61 courts, at exactly the ceiling of five. Warden–judge mark agreement 5/5 with all three control crops refused; the contradiction class fired zero times; protocol bumps re-judged affected plates exactly once and replays ran verbatim.

*Gates 92 → 93 (`magnifierEye` — clamp arithmetic quoted as a table,
byte-stable sharp pipeline, fail-closed composition, both doors wired
to the one instrument). The §9 report rides
test-results/report-54B.md; the phrasing ledger rides LOOP_LOG.md.*

## 0.6.3 — The Terminal Answer

**The harvest learns to read refusal (Task 54).** Task 53 closed red on a category error: a lawful refusal leaves NO media row — the refused bytes are hashed into the sealed record and dropped — and the harvest polled the SHELF, so refusal's lawful silence read as eternal pending and starved a measured cap. No marker rows, no synthetic media (the shelf is content-addressed and the vault chain-verifies; a marker would be a forgery): the record itself now names the ask it answers — every paint attestation carries cacheKey, label, variant, and subtype — and the harvest reads BOTH terminals from the journal: FULFILLED (bytes on the shelf under the attested hash) or REFUSED, which fails the run in the same poll that reads it, by name, as the game defect it is. The top manifest binds every plate to its minting attestation (a plate without one is a provenance hole that fails the build) and carries the refusals ledger; judge courts refuse REFUSED needs by name — never "missing", never silence. The recognition poison that MADE refusals routine is swept whole: eight prompt clauses restated in the form-and-silhouette register (0.6.2 cured one; the sweep found seven siblings), and a new keyless gate, `poisonSweep`, builds every prompt the app owns and reds on any recognition, visibility-adverb, or lettering demand — proving its teeth on the eight retired relics first. Teeth 8b and 9 join: every paint-dependent court refuses a planted refusal BY NAME, and the terminality wait proves refusal-in-seconds / starvation-only-at-the-cap against a copy of the real record. The keyless floor is PINNED at **92** PASS lines as a literal in the law (65/66 was the donor trunk's own tally; 101→102 a retired prose ledger; 91 the measured tail at Task 53's close — plus this task's one sanctioned gate).

*Gates 91 → 92. The proving loop's verdict now requires zero skips and
every court EXECUTED — its ledger rides LOOP_LOG.md.*

## 0.6.2 — The Spent Ceiling

**One clause behind three reds (Task 53 §6, the closing review).** The proving loop's final three iterations starved the same shelf three ways, and the post-mortem found one author: the beat brief's recognition-demand wording — "large, unmistakable, and prominent enough to identify at a glance" — added to cure hedged obedience. By LENGTH it pushed the lawful scene ask past the paint door's 4000-char abuse ceiling (a 413 the request log betrayed only by its position after the parsers — the watchtower's word, not the parser's). By CONTENT, once the ceiling was righted, it plausibly summoned the text plague THE UNLETTERED WORLD now refuses — and a refused scene leaves lawful silence (0.6.1: bytes hashed into the record, then dropped) that the harvest mistook for pending work. Three cures, no law weakened: the paint prompt ceiling rises 4000 → 12000 (`MAX_PAINT_PROMPT_CHARS`; a lawful scene brief runs 4–6k and the DM body cap dwarfs either), with the oversized-probe eval re-sized to stay oversized; `/api/paint` gains route-scoped body headroom (`MAX_PAINT_BYTES`, 80mb) before the global parser for reference-laden asks; and the beat brief now demands prominence through **form and silhouette alone** — the momentBrief judging in kind — never through recognition words that invite lettering. One new keyless gate, `refusalTerminal`, pins what refusal must mean: the job resolves to the lawful fallback, the refusal rides the sealed record under the dropped bytes' hash, those bytes are stored NOWHERE (the shelf is content-addressed and the vault chain-verifies — a marker row would be a forgery), and the lane advances.

*Gates 90 → 91 as enrolled here. The loop itself closed red at its
ceiling — LOOP_LOG.md and the Section-6 report say so plainly.*

## 0.6.1 — The Unlettered World

**One clause instead of seven nouns (Task 53 §2).** The paint law's accumulated silence vocabulary — smudges, monuments, waymarks, epitaphs, gathered one iteration at a time — is retired for a single general clause, THE UNLETTERED WORLD (`fatescript/unlettered`), riding every prompt builder exactly once via `scrubPrompt`: no letters, signatures, watermarks, glyphs, runes, sigils, labels, maps, charts, inscriptions, epitaphs, or any legible or decorative writing on a surface that faces the viewer; story-required written matter exists only as an object with its face turned away, in shadow, or beyond legibility. **The warden now asks the text question of every delivered plate** — `contains_text_or_watermark` rides the likeness verdict where an anchor stands, and a single-image brief (`unletteredBrief`) judges the plates that never had one: covers, regions, first busts. On a sighting: ONE repaint with the clause reinforced. On a second: the plate is **REFUSED** — the surface keeps its lawful textless fallback (the blessed anchor where one exists; silence elsewhere), the refused bytes are hashed into the sealed record and then dropped, never stored, never shipped. Identity still outranks text: a fallen face anchors, never refuses. One new keyless gate, `unletteredWorld`, pins the clause's coverage, its exactly-once seating, the retired noun-pile, the ruling ladder, and the refusal's note in the record.

*Gates 65 → 66 on the letter's native trunk; 101 → 102 as enrolled here,
where the engine keeps its own house under packages/engine.*

## 0.6.0 — The Hooked World

Directive V, four founder questions answered as law. **The Atlas**: the wiki now tracks places (citing the turn each entered the tale) and stated allegiances (a deterministic lexicon over the written station — never inference), alongside souls and threads. **The Thread Ledger**: promises, debts, mysteries, and sworn goals become additive protocol ops (`thread_add` / `thread_resolve`), validated at two layers, replayed pure with citations — the narrative economy, honestly scoped (no coin exists in the engine; a currency reducer is future rules work). **The Calendar**: story time as a pure fold over sealed advances; ticks and strikes move nothing. **The Briefing Law**: one deterministic object per turn — calendar line first, scene-first pack, open threads riding inside, stated allegiances trimmed first under a hard budget; same campaign, same bytes. **The Visual Bible**: every image prompt derives identity from the card — noun by stated presentation and age, mark verbatim, canon whole — across all three lawful soul shapes. **The Three Sparks**: three ready worlds lead the forge; spark, voice, begin — three taps to the table. Codex gains the Day chip, the Open Threads panel, and tappable place pages with sworn-soul chips. Gates 58 → 65; the capstone `hookedWorld` gate proves the six laws agree on one record.

*Grafted into this line, where the engine keeps its own house under
packages/engine and later directives already stand: the gates enroll at
94 → 101 here; the cut’s own tally read 58 → 65 on its native trunk.*

## 0.5.1 — Story Beats Land in Order (2026-07-15)
Presentation law over the sealed record: nothing in this cut writes a log or
a journal entry, and no tick is touched. TIME PASSES VISIBLY — sealed ticks
now render as a quiet divider (the phrase read from the neighboring turn's
own time_advance, up to two whispers QUOTING the tick's sealed ops) instead
of the empty turn rows they silently were; the book and the Chronicler still
never hear them. RETURNS RE-ORIENT — reopening a tale stages "the tale so
far" from sealed material only: the latest lawful chronicle page when one
exists, the mast alone (act · chapter · goal) when none does, honest silence
for fresh or finished tales; struck pages and struck anchors are never
shown; once per sitting, in memory only. CHOICES ARRIVE ON THE BEAT —
suggestion chips fade in staggered after a short reading beat, instantly
under reduced motion, never gating voice or typing. PAGES SIT WHERE
CHAPTERS CLOSE — the feed's seat order is now a pure, gated function:
closing turn → chronicle page → time-passes divider → next chapter; a page
whose anchor was struck falls back to its chapter's true boundary, and a
quiet "the Chronicler is writing…" row holds the page's exact seat while
the court deliberates — held only when a real retelling is possible, so a
keyless table never sees it, by construction. One gate joins the
constitution (sequencing); the count stands at 58 and may only grow.

## 0.5.0 — The Living World Cut (2026-07-15)
The world gains a memory with a shape. THE TENOR LAW ends voice misgendering
forever: every soul carries an explicit voice_card (gender / age / timbre),
the hero states a presentation at the forge, casting reads stated identity
before any lexicon and never coin-flips across registers — the playtest
mother now speaks in her own voice, sealed by gate. THE CARD LAW gives every
soul, hero included, one Character Card: derived state, produced by a pure
reducer replaying the validated log — locked identity, lawful state, cited
chronicle, kin / enemy / ally / met ties. THE CHRONICLEGRAPH rebuilds [STORY]
as a budgeted, scene-first context pack (GraphRAG's query shape without its
extraction pipeline — no Python, no embeddings, no indexing spend). THE
LIVING WIKI turns the Codex into soul pages: story-worded voices, first and
last sealed words, tie-chips as backlinks, an appearances timeline with
replays; the book's dramatis personae now quotes each soul's first and last
words. THE LIVING WORLD ticks offscreen when story time passes or an act
turns: budgeted, ops-only, deterministic, sealed as its own record — visible
to the wiki, silent to the book. THE TWO-SPEED FORGE opens three doors on
each side — Spin the World / the Oracle / Deep Forge, and Cast the Bones /
the Oracle / Forge by Hand — with a die beside every deep field and a voice
audition whose blessing rides the hero forever. Six new gates; the PASS
count only grows.

## 0.4.0 — The Brand Cut (2026-07-15)
The storefront learns to sell the fantasy: a reel of epic frames behind foil
type, the Icosahedron Rose as the mark, a House Style for all marketing art
with a one-command brand shoot, seats set quietly at the end. The Quiet Record
begins — no service worker, a human colophon, the notary unlisted. Directive
III (The Audience Cut) charts the next program: open door, app shell, the
Sitting and the Warden, the tenor law, the finished book, the Audiobook, and
the share layer.

## 0.2.1 — The Anchor Law (2026-07-13)
Faces and places converge on their canon: first bust / first plate become
permanent reference anchors carried into every later render across image and
video providers, regions repaint anchored as they degrade, and every anchor
is sealed into the attestation chain.

## 0.2.0 — The Engine Cut (2026-07-13)
The brain and the pipeline. The DM remembers its own prose (rolling
conversation history + static craft prompt + working cache); narration streams
for real; the Foundry runs three lanes and briefs the next beat before it
lands; cinematics climb Film → Animatic → procedural; Sora/Replicate video
adapters; adaptive score and voice casting; the chrome speaks fantasy, not
protocol.

## 0.1.0 — Cinematic foundation
- Added the complete local-first PWA shell and Replit production server.
- Added world and hero forging, four story spines, canon-lock reducers, client dice, conditions, slots, initiative, and zones.
- Added forced-tool DM proxy with deterministic keyless mode and strict completed-payload validation.
- Added append-only hash-chain journal, Ed25519 device signing where supported, redaction events, restores, and linked forks.
- Added offline verifier, local lexical memory, procedural art and score, provider adapters, Foundry budgets, and content-addressed media.
- Added Codex, character sheet, cinematic archive, storybook HTML, Playwright PDF route, five-persona eval bench, and CI.
