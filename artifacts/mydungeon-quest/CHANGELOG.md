# Changelog

## 0.7.2 — The Party and the Elsewhere

**The party rides (Experience-Directive VIII, ratified).** The fellowship is sealed canon now, not narration's habit: `party_join {name}` seats a living cast soul whose last lawful ground is the current scene — or one walked on by the same turn's `cast_add` — and the hero is never joined, the party is hers already; `party_leave {name, remains_at?}` releases a member onto a named ground the record holds (or one built by the same turn's `region_add`), and omitted, the leaver remains honestly at the standing scene. The membership courts refuse joining the absent and releasing the never-joined; the fold lands at row END, so the presence witness answers mid-turn questions from the record as it stood when the words were spoken. The party travels as one when the scene moves — `traveling_with` rides every briefing and NEVER trims — while the elsewhere line rations famine-first to six souls, and `presence_state` stays trim-immune beside them. The table shows what the record holds: a party strip with joined-turn cites, and when no one rides, the plain truth — "The hero travels alone."

**The fixtures seal (the third op).** `fixture_add {place, name, visual}` plants a permanent thing on a permanent ground: the place must stand in the atlas or be built by the same turn's `region_add` (the court honors the same breath, as the ground law always has), the duplicate court refuses a second sealing of the same name on the same ground, and the `visual` — 8 to 160 characters of paintable truth — is written ONCE and never rewritten: the painter reads it forever. Scene prompts carry the standing ground's sealed fixtures as a rider so the Waystation's bell hangs in every plate painted there; portrait prompts never take the rider — a face is not furniture. Every place page lists its fixtures with sealed-turn cites.

**The watch of day.** A new engine calendar (`fatescript/calendar`) cuts the day into six watches of four hours — deep night, dawn, morning, afternoon, dusk, night — and the story's clock now has a face to read: the briefing's calendar byte names the watch, the scene prompt gains a watch-of-day line so the painted light obeys the story's own hour, and the day chip at the table speaks it plainly. The mock walk advances time on a deterministic chain and seals THE WAYSTATION BELL on the genesis turn alone, so the keyless tier exercises every new court with no provider in the house.

**Nobody teleports.** The speaker-ground law closes the last soft door: a narration speaker the record can place must stand where the scene stands — party members ride with the scene and a soul walked on by the same turn is exempt — and a voice thrown from another ground is refused by name. The Dungeon Master's own law grew rules 31 through 33 (the calendar, the fixtures, nobody teleports), and the tool schema declares every new op with the validator's exact bounds — the lockstep law, never loosened.

**The landing seated whole (the review's one finding).** The architect's sitting confirmed both mid-loop instrument re-aims honest and raised one blocking mismatch, verified by direct read before the cut: the client landing court seated only the older evidence — cast, threads, trove, purses, regions, scene — while the server bench seated hero, party, presence, and fixtures besides; the validator convenes a court iff its evidence is seated, so Directive VIII's courts sat on the road and were silent at the landing. The landing now seats hero from the pre-turn record and party, presence, and fixtures from the same story briefing the request itself carried — both benches convene identical courts on identical bytes, or identically none.

*Gates 92 → 95 (party, fixture, watch — keyless, mock-sovereign). The
proving loop closed GREEN at the ceiling's edge: four reds taught, four
greens sealed (56B.5 through 56B.8, the last carrying the review's
cure) — 68 courts each, zero skips, every court EXECUTED, G21a and
G21b now demanded by name. Two instruments re-aimed mid-loop, both
logged, nothing weakened: the harvest scalpel probes for a clean wound
— a hole the sealed record explains is answered with the record's
word, never "missing" — and the calibration's crossed-prose control is
retired for synthetic sealed-canon lies, because the pinned binaries
never ask WHO or WHERE, and a same-genre crossing tested the judge's
clairvoyance rather than its honesty. The ledger rides LOOP_LOG.md.*

## 0.7.1 — The Presence Cut

**The standing scene (Experience-Directive VII, fourteen laws, ratified).** The story now owns WHERE it stands the way it owns days and coin: one additive op — `scene_set {region}`, an object of exactly one key, 3–100 characters — judged at the door by three courts that seat only when the record can testify (the presence law again: the atlas court seats only when the context carries the regions list, the travel court only when it carries the scene key, and a bare context gets shape law alone). The ground must already stand in the codex or be built by the same turn's `region_add`; MOVING it costs that same turn a `time_advance` — travel costs time — while restating the standing ground is free, and the offscreen tick may not move the stage at all, refused with a note by name. The fold lands AFTER the world, so a region can be built and stood upon in one breath; it backfills `scene: null` into old codexes, holds `sinceTurn` across restatements, writes a note on every refusal, and sends `scene_state` riding the story block to the server court. The Dungeon Master's own law grew rules 29 and 30, and the tool schema declares `scene_set` with the same bounds the validator enforces — the lockstep law, never loosened.

**The witness stand: presence replayed pure.** A new engine witness (`fatescript/presence`) answers who stands where from the sealed journal alone, no inference: a soul stands somewhere because a non-struck, non-tick row staged it there — it walked on, spoke, was updated onstage, or was named a hand in possession or coin — the hero is sighted by every player row, and a sighting before any scene stands lands honestly on no ground. Struck rows vanish whole (the redaction law outranks presence), and cites are journal row indices — a different clock from `sinceTurn`, never cross-asserted. Fail-closed under the architect's ruling: a list that is not an array, a name that is not a string, a row that is not even an object — each proves nothing and is skipped whole; the replay never throws on a legacy or imported record, and the codex panels hold a last-door catch that would say "The presence record cannot be read." rather than crash or stay silent. The briefing carries the ground as its second byte — `The scene stands in {name} — {visual}`, byte-exact, name-only when the region has left the codex, absent when nothing stands, famine-immune — and the standing region rides the context pack full, immune to the touched heuristic and the slim trim both. The Codex speaks it: every place page seats STANDING HERE and HAVE STOOD HERE with row cites, and every soul page carries its last known ground or says plainly "Whereabouts unknown."

**Two new keyless gates and a new court (96 → 98; G20 THE GROUND).** `presence` and `ground` join the chain — the three courts, the fold's answers, the closed tick op set, the replay matrix with its mangled-record section, and the briefing line down to the byte — and the hooked-world capstone now proves the fold, the replay, and the ground line agree on the same standing. The proving fixture opens with a genesis `scene_set` and seals a new fifth turn of lawful travel to The Duchy with the struck turn untouched; G20 (a: protocol — the door's refusals by name, and the fold and the pure replay agreeing on the sealed record read back from the shelf; b: DOM — the place and soul pages speak it) is enrolled by name in the verdict beside G00-RT, the read-back mapper's round-trip law: every journal byte survives the harness verbatim, derived conveniences beside it, never instead of it. The loop ran .1 ✗ .2 ✗ .3 ✓ .4 ✓ .5 ✓; the architect's round then found the replay trusting row shapes on faith — cured fail-closed, proven keyless at the held pin of 98 — and .6 ✓ .7 ✓ .8 ✓ re-proved the final tree: three consecutive greens at exactly the ceiling of eight, 66 courts each, zero skips, zero flakes. The two reds were the fixture's own calendar speaking truth (Day 3 → Day 4, one floor TIGHTENED) and two G8 selectors re-aimed at the elements they always meant; no assertion weakened.

## 0.7.0 — The Possessions Cut

**The trove and the purse (Experience-Directive VI, thirteen laws, ratified).** The story now owns possessions the way it owns threads: four additive ops — `item_add`, `item_transfer`, `item_remove`, `purse` — judged at the door against the pre-turn record when the court is seated (the presence law: a bare context gets shape-and-counting law only), folded into the codex with a note on every refusal, and replayed pure from the sealed journal (`fatescript/trove`: `troveOf`, `purseOf`, `heldBy`) citing log indices, struck rows contributing nothing. Two ledgers, never one: the mechanical lane (hero gold, the pack) is untouched; the narrative lane lives beside it. Limits are law: three item movements a turn (a refused op still spends its slot), two coin movements, deltas ±999 and never zero, every movement carrying its reason in 3–90 characters; the purse folds sequentially within the turn and clamps at zero with the clamp written into the record. The hero walks out of the forge with a keepsake and the codex agrees from the first word — new chronicles, next volumes, and the proving shelf all seed the same way, chained `carried from the forge`.

**The wealth line and the trove page.** The briefing carries `hero_wealth` between the pack and the stated allegiances — "Maren carries 18 coin. Holds: …" — up to four holdings, most-recently-moved first, trimmed only after the allegiances are gone; the calendar stays the first byte. The Codex gains THE TROVE: coin in bold with every movement's delta, reason, and turn cite (a purse held at zero says so); each held thing with its kind chip, its chain of hands joined in order, and its note; gone things marked with how they went. The Dungeon Master's own law grew rules 26–28, and the tool schema declares the four ops with the same enums and bounds the validator enforces — a schema looser than the court teaches the model to write turns the court refuses.

**Two new keyless gates and a new court (94 → 96; G19 THE TROVE).** `trove` and `coinPurse` join the chain — validator, reducer, state blocks, replay, and the briefing court, down to the byte — and the hooked-world capstone now proves the fold, the replay, and the wealth line agree on the same coin and the same hands. The proving fixture seals THE FERRY LEDGER through two hands to an 18-coin standing with the struck turn untouched; G19 (a: protocol — the codex fold and the pure replay agree on the sealed record read back from the shelf; b: DOM — the trove page speaks it) is enrolled by name in the verdict. The loop ran .1 ✗ .2 ✓ .3 ✓ .4 ✓ of a ceiling of eight — the sole red was the court's own read-back mapper silently dropping the story from the journal (the same family as the mapper once dropping `kind`), cured additively, no assertion weakened.

## 0.6.5 — The First Word

**The prologue pours before the paint (Task 54C §1).** At genesis — a new chronicle or a next volume — the Dungeon Master's request now leaves the page BEFORE any paint request, always: a pure sequencer (`src/lib/genesis.js`) dispatches the pour, kicks the easel on the wire signal itself (never on the pour's completion), and lets both genesis doors (`beginCampaign`, `openNext`) walk through it. Narration streams on first byte; key art and the hero's bust mint in parallel and take as long as they take; late anchors merge into the LATEST telling by functional update; the turn's own media holds at the bench until the easel settles, so the hero's face exists before any scene cites it and the act's cover is never asked for twice. A snagged pour never starves the easel; a fallen easel never starves the bench; the caller owns the pour's outcome, never the paint's. **Measured:** solo first byte 21.5s → ~250ms (the sampler's floor); dm on the wire +90–203ms after the Begin tap, first genesis paint trailing it by 10–15ms.

**The meter settles once, as a delta.** Two foundries now count in parallel lanes at genesis, so the spend meter — absolute before, and able to clobber the prologue's tally — was rebuilt under architect review: `queueMedia` merges ONE delta over its foundry's construction base after EVERY lane in the batch lands or falls (riding the scene landing lost counts on cache-hit and refused-scene paths); the prologue easel merges its delta unconditionally (a refused anchor still cost its mint — hashes, though, only land with an asset); and the sequencer contains a pour that throws at the very door, so the easel and the media gate are never starved by a synchronous fall.

**One new keyless gate, one stricter court.** `firstWord` (gates 93 → 94) drives the real sequencer through 25 deterministically-jittered rounds against an ordered request ledger — the pour leads every one — plus snagged, silent, and fallen lanes, and renders the app's own turn group mid-paint to prove a late plate slots BELOW its words, byte-for-byte untouched, wearing no entrance animation. G5 gained the wire ledger (every /api/dm and /api/paint at initiation), a forge-lane drain before the tap (iteration 54C.3 caught a preview straggler reading as a false paint — the court's defect, not the cure's), the ABSOLUTE first-word law (no paint of any lane between tap and dm), a pinned first-byte bound (12s ≈ 48× the solo median, 2.5× tighter than the 30s window it always owned), and an easel-settled re-read of the order law over the live feed.

*Gates 93 → 94 as enrolled here. The original ceiling was four and ran
.1 ✓ .2 ✓ .3 ✗ .4 ✓ (the sole red: the court's own instrumentation,
amended stricter); the house granted .5–.7 by ruling under THE
EXTENSION LAW — verification window, code freeze, one strike — and the
loop CLOSED GREEN on three consecutive fully green runs inside it,
61/61 courts each. LOOP_LOG.md and test-results/report-54C.md carry
the whole record.*

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
