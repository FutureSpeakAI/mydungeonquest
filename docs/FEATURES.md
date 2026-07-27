# THE FEATURES — the muster roll

*Generated from `tools/muster/features.mjs` by `pnpm run muster -- --write-doc` (2026-07-27). The document and the acceptance tests share one source; they cannot drift. Statuses below are live.*

**Standing: 65 present · 6 pending wiring · 0 regressed · 7 charted.** The law suite beneath all of this is `pnpm run check` — the gates, always green — and they only grow.

**THE TRIAGE (wire first):** Bearing, Signature & the paint roster.

## I. The Table — the core loop

### The covenant & world forge — PRESENT

A world begins as one player-spoken sentence — the covenant — which becomes the law of the setting; or the player spins one, consults the oracle, or goes deep. Three doors: spin / oracle / deep.

### The hero forge — bones, oracle, or hand — PRESENT

A hero is forged by dice (the standard array, always summing 72), by oracle (path, virtue, keepsake), or by hand. The forge ends with a voice audition: a blessed audition voiceId always wins over the casting session.

### The dice belong to the player — PRESENT

Every player roll generates on the player’s device; the DM may request a roll but never make one. Resolutions (total, DC, success) are sealed with the turn.

### The committed entropy pool — PRESENT

World randomness comes from a pre-committed pool the model must consume in order and account for — no retroactive luck. The validator audits every entropy_use.

### One Door — the dm_turn protocol — PRESENT

The model answers only through the forced dm_turn tool with a strict schema; violations go back once for self-repair, then an honest fallback turn. Protocol changes are additive-only.

### The story spine — acts, chapters, beats — PRESENT

Every tale walks a beat structure: acts and chapters on a spine, with beat briefs prepared ahead and act turns marked. The spine travels in the payload every turn.

### Canon Lock — and the dead do not speak — PRESENT

Descriptions lock at first introduction; contradiction or re-introduction is a canon attack, blocked by name. No resurrection retcons. The dead may speak their dying words the turn they fall (pre-turn snapshot), and never after.

### Combat & permadeath — PRESENT

Real combat as explicit ops with ids, applied by reducer; real stakes — a fallen hero stays fallen, a fallen soul is sealed dead.

### Blight & bonds — PRESENT

A 0–5 world-corruption meter and 0–4 bonds per soul with bond arcs — the two dials the tale turns.

### The villain advances offscreen — PRESENT

The evil design is minted at session zero (arc: title, evil_plot, stakes, style_bible) and advances between chapters whether or not the hero is watching.

### Time advance — PRESENT

The DM may move the clock in whole hours or days through the protocol; act changes and time_advance trigger the living world.

## II. The Living Record

### The Quiet Record — hash chain & device signature — PRESENT

Every turn is hash-chained and Ed25519-signed on the player’s device, journal row and head-hash updated in one transaction. Client is law; the server is a stateless broker.

### Redaction — struck, not erased — PRESENT

A player may strike a turn; the strike is journal law. Struck rows stay in the chain, excluded from every projection: cards, ledger, market, tells, retellings.

### The Living World — offscreen ticks — PRESENT

On time_advance or an act turn, up to four goal-bearing, non-villain, active souls advance one step — ops-only, deterministic, zero token spend, sealed as ‘tick’, silent to the book and DM history, alive in the wiki and graph.

### Character Cards — one per soul, byte-identical on replay — PRESENT

A pure reducer over the log yields each soul’s card: locked identity, cited chronicle, typed ties (kin/enemy/ally/met), first and last words. The hero included.

### ChronicleGraph & the context pack — PRESENT

A knowledge graph rebuildable from the record alone; [STORY] is a budgeted, scene-first pack (scene full, one-hop ties full, villain always, the rest slims) with contract keys preserved.

### The Web of Souls — the chronicle drawn — PRESENT

Directive XX Article Five Law XIV: the ChronicleGraph drawn as a web — every KNOWN soul a node weighted by bond (the dead marked at rest, the hero centred), every sealed tie a strand (kin, enemy, ally, met) citing the sealed turn that establishes it; zero model calls. The engine builder (fatescript/soulsWeb) walks the unstruck rows through the card fold and takes the known world AS AN ARGUMENT — the wiki’s own reveals seat hands it down, so the unmet are filtered at the source and their strands are absence, aliased souls stand as one node on the one name road, junk fails closed to the empty web. The surface rides the Book’s lazy chunk on the People page (no manifest row, the Chart’s precedent); the entry’s closure pinned EXACT — nine examined bytes of lending glue, cross-pointed with the lean door’s kB pin, both courts reading the one closure walk. Twin gates red-first; four reds convicted at birth (α order court, β leaked strand, γ private reading, δ sync seating).

### The Dowry Door — outside lore, judged and blessed — PRESENT

Directive XX Article Five Law XV: pages from an elder table (plain text/markdown ONLY — a PDF has no seat) enter as PROPOSALS through the World Forge’s fourth door, never as ink. Each proposal cites its source line VERBATIM (the no-invention law); the engine’s own court judges every one exactly as a turn — locked-canon and epithet collisions refused BY NAME, the batch’s first claim holds, the forged hero outranks every page, stranger keys meet the validator because ops ride WHOLE. Blessing bows to the court; amendments are re-judged as the FINAL shape with the hero seated. Blessed gifts fold through the ordinary reducers at turn zero and seal as ONE dowry journal row (ops + verbatim citations + page sha256 fingerprints) through the app’s own seal door; refused and unblessed leave NO trace. The server lane /api/dowry stands NAMED, clocked, schema-mirrored, spend-guarded; keyless the ceremony falls to the engine’s deterministic floor reader, LABELED as the floor. Mid-campaign import deferred by name. THE GROUNDING COURT (conviction γ, the architect’s round): a quote grounds ONLY what it names WHOLE (whole-phrase, boundary to boundary — an embedded substring passes for nothing) — an invented name riding an unrelated verbatim line is refused by name; the bypass knob is two-handed — playersHand (ceremony and threshold, never a reading door) AND the row’s amended mark, minted only by the ceremony’s rename hand — so unamended rows keep the belt at every seat and may amend beyond the page only by that hand; wire rows re-seat at the boundary with blessed forced false; a blessed row that turns refused keeps its walk-back hands.

### The wiki codex — surfaces speak story — PRESENT

The in-game world record is a living wiki whose every player-facing line is story ("A warm elder woman’s voice"), never machinery.

### Memory & the Seen Ledger — PRESENT

A [MEMORY] block travels with every turn; the Seen Ledger (reveals) tracks what the player has actually witnessed, so nothing is spoiled and nothing is forgotten.

### The Census — nobody speaks who isn’t counted — PRESENT

The court against op decay: a narration block attributed to a name the record does not know is an unrecorded soul, and the turn goes back through the one-repair door demanding the cast_add (voice_card and all) or the removal of the attribution. A soul added this turn may speak this turn. Born of the July 15 playtest, where NPCs vanished from the codex a dozen turns in.

## III. The Foundry — sight & sound

### Two Foundry tiers — parchment & illuminated — PRESENT

Parchment: procedural woodcut art, instant, free, silent. Illuminated: painted stills, voiced narration, music at turning points. Session caps: 80 images, 8 music.

### The Anchor Law — PRESENT

The first portrait or plate becomes the permanent visual anchor, conditioning every later render; anchor and conditioning hashes are recorded with each asset.

### Cast Law & Tenor Law — PRESENT

A voice is cast once and kept for the tale’s life; casting derives from stated identity (voice_card on every cast_add; hero presentation/pronouns/mark) with the station lexicon over the soul’s own role and name. Born of the misgendered-mother playtest.

### Multivoice narration — PRESENT

A twelve-voice ensemble; the narrator is George; every cast soul speaks in its own kept voice through the /api/speak door.

### The Audio Director — PRESENT

One director owns the mix — music, SFX, narration concurrency; silence is the floor; keyless audio never reaches players as real.

### Cinematics at turning points — PRESENT

Turning points earn cinematic treatment — sequenced plates, music, narration — cued by the protocol, budgeted by the watchtower.

### Attestation of every asset — PRESENT

Every generated asset’s hash is recorded, and every anchored render records its conditioning hashes — the media provenance chain beside the story’s.

### The Floor — everything runs keyless — PRESENT

Mock DM, procedural plates, honest silence and tones — clearly labeled, never billed, never mistaken for real. Every gate in the house passes with zero keys.

### The face on the sheet — PRESENT

The character sheet shows the hero’s own face: the blessed anchor (post-Sitting), else the first attested anchor, else the procedural bust on parchment — rendered as an AnchorBust at the head of the sheet, sourced from the media store by asset hash, never re-rendered for the occasion. A sheet without its face is a form, not a leaf. From the July 15 playtest.

## IV. Keepsakes & public faces

### The sealing ceremony — PRESENT

A finished tale seals with wax; a sealed spine opens straight to its keepsakes. Sealing is a ceremony, not a save.

### The storybook & the Binder’s Door — PRESENT

A bound, illustrated book (HTML/PDF, Letter or A5) with drop caps and plates — and only attested data:image plates pass the Binder’s Door.

### The podcast episode — PRESENT

A fully voiced episode of the sealed tale — every soul in its kept voice, the narrator carrying the frame.

### The Chronicler’s three laws — PRESENT

Retellings may not invent, contradict, or embellish; quotes match the sealed record verbatim or are contraband — enforced by the quote court.

### The notary — PRESENT

An unlisted verification page where any sealed chronicle proves its chain and signatures to a stranger.

## V. Stewardship — providers, limits, commerce

### Provider plans & fallback chains — PRESENT

Ordered provider chains per media kind with wall-clock budgets; the mock floor ends every chain; explicit local never silently bills a cloud.

### The watchtower — PRESENT

Durable limits, abuse caps, per-provider daily spend ceilings, structured log lines, herald pings — the house’s own conscience about money and misuse.

### The toll-house — PRESENT

A six-turn lifetime free taste; $5/week or $129.99/year; paid seats pour unmeasured; refusal receipts reach the window; a keyless fork never learns money exists.

### Sign-in & the vault — PRESENT

Named patrons sign in (Clerk); chronicles sync to the server vault with chain-law preserved — tampering refused, deletion owner-scoped (the pyre).

### The Proving Ground — PRESENT

The whole suite — engine gates, game gates, the salon — runs keyless in CI on every push. PASS only grows; weakening a gate is the one forbidden move.

### The Push Lane — the Proving Ground rides every push — PRESENT

The keyless chain runs on every push and every pull_request: both suites whole (engine via `pnpm --filter fatescript run check`, table via `npm run check` in its own house), Node 22, corepack-enabled pnpm 10.26.1, frozen lockfile, not one AI key. Directive XX, Phase 0; gate `pushLane`.

### The Pen's Clock — the easel's clock reaches the pen — PRESENT

Every model call the writer's room makes — the Director's sitting, each DM attempt, the Editor's judged pass, the redraft's attempts — is wall-clock bounded through DM_TIMEOUT_MS (75s) and, for genesis DM attempts alone, DM_TIMEOUT_GENESIS_MS (120s), both read at call time. A timeout is that attempt's plain failure; the ladder advances to the deterministic floor — the room never crawls. The clock rides ONLY the transport; the shaped request is untouched (promptCache stands witness). Directive XX, Phase 1; gate `pensClock`.

### The Honest Tally — a page tallies once — PRESENT

The ledger of use knows the natural key of a pour — patron, kind, campaign, turn — under a PARTIAL unique guard added by a purely additive bootstrap walk (nullable columns; legacy and keyless rows never collide). A second landing of the same page — a closed wire's retry, a double click, a receipt replay — is a no-op that answers 'once' and never empties the taste; the doors pass only the keys their payloads truly hold, never inventing identity the wire does not carry. Directive XX, Phase 2; gate `tally`.

### The Tempo Law — the brush paints where the story turns — PRESENT

A pure court in the engine judges the per-turn scene plate from sealed evidence alone — this turn's validated dm_turn, the codex, the turn index, the player's setting — no clock, no randomness, no model, every reason cited to the very turn it judges. Three cadences: every (byte-faithful to today), turning (boundaries, cues, introductions, movement, first blood, cinematics, genesis), sparse (the marked three alone). The easel consults one bridge for the scene job and only that job; a held frame is display, not a minting — no plate row, no attestation. Existing campaigns read absence as every; fresh forges open at turning; the surface speaks house words. Directive XX, Phase 3; gate `tempo`.

### The Lean Door — the table arrives before the shelves — PRESENT

The turn pipeline loads with the entry; every other surface arrives lazily on its own road — seventeen chunks where one 1020 kB entry stood. The pin binds the SYNCHRONOUS CLOSURE — entry plus every statically imported chunk, summed raw on disk — at 610 kB, movable only downward: the closure is the sum however the graph is arranged, so vendor-split laundering is structurally impossible. 520 was aspiration; 600 measured honest on ruling day. The Book carries the Chart; the atelier rides as pipeline timber; the veils speak house words. Directive XX, Phase 4; gate `leanDoor`.

### The Waypost Law — replay is truth; the shortcut must prove itself — PRESENT

Every twenty-fifth sealed turn, both turn roads (the live table and the proving walk, ONE helper) fold the covered record’s pure cursors — cards, presence, world clock and pack, tells, standings — and seal them as a waypost row in the journal chain, signed like any record. Readers resume from the NEWEST post that proves itself (digest, state hash) and stands against the living record (last-row pin, hero canon, struck-set equality), byte-identical to the full walk or silently refused — the full walk stands in; strikes fall back to the elder post, then to the full walk. Wayposts never render and never touch the played record; elder tales read untouched. Directive XX, Law VI, Phase 5; gate `waypost` (engine twin + table gate).

### The Second Chair — cheaper minds on the smaller seats — PRESENT

DM_MODEL_DIRECTOR, DM_MODEL_EDITOR, and DM_MODEL_REDRAFT seat the Director’s sitting, the Editor’s judged pass, and the redraft’s DM attempts on their own models — ONE pure seat-plan (chairSeats) resolved at call time, each chair defaulting to exactly today’s model so unset environments are byte-identical. Genesis never follows a chair down and the first telling keeps the primary seat; an absent key still seats the mock floor — a seat env never conjures a key. The room ledger attributes every call to its chair with the seated model named, so a keyed audition reads real counts; defaults move ONLY on a verdict recorded in docs/dm-model-audition.md. Directive XX, Law XI, Phase 6; gate `secondChair` (table-only — the room is server law; the engine keeps no provider seats).

### The Elder Memory — epochs before elders — PRESENT

When an act closes, the same close that writes the annal distills the act into a sealed EPOCH row — the illuminated Chronicler when a real voice answers and the engine’s citation and quote courts seat it (one guided repair; a second refusal declines honestly), the deterministic keyless floor otherwise — always labeled for which voice wrote it. Every claim ends with the turn citations that prove it, judged against the cited turns’ OWN corpus; quotes verbatim or contraband; at most 900 characters an act. The memory ladder reads epochs before elders — the freshest act raw, every earlier act by its sealed summary (its annal standing in where no epoch does) — under ONE fixed total budget, so year three remembers year one at the same price. Epoch rows are machinery: never the book, the podcast, the ravens, or the feed; the mixed journal stays chain-lawful; a pre-epoch save walks today’s road byte-identical, the standing ladder module byte-untouched. Directive XX, Law VII, Phase 7; gate `elderMemory` (engine twin + table gate).

### The Kinship Immunity — the horizon never starves the bound — PRESENT

The [STORY] pack’s recency famine may never drop a bound soul: any ACTIVE soul at bond three or higher, or carrying a kin or enemy tie to the hero, rides every pack at least slim regardless of last_seen — the hero’s mother, silent sixty turns, is never reintroduced as a stranger. The dead and the departed earn no immunity. The famine eats the unbound exactly as before (byte-identical whenever no bound soul stands in the rest); when the bound alone overflow the budget they seat by the tick-target precedent — bond descending, kin and enemy ties before the merely bound, introduced ascending — byte-stable on every repeat. Scene floor untrimmed, contract keys exact, the 7,000-character default unchanged, the rider inside the dynamic tail so the cache posture never moves. Directive XX, Law VIII, Phase 8; gate `kinship` (engine twin + table gate).

### The Alias Ledger — one soul, many names, one card — PRESENT

A soul may earn epithets — "The Gray Warden," a title, a nom de guerre — sealed one per op by cast_update.known_as_add onto the card’s append-ordered, case-blind-deduped known_as ledger. Every sealed name answers as the ONE soul on the one name road (names.js): cards attribution, the scene graph, presence replay, the census, the dead-speak and ground courts, the wiki’s "Also called" line. The validator refuses, by name, any claim another soul already holds — sealed name or ledger, the hero included, same-turn cast_add counted, claims binding sequentially — while re-sealing an own claim is a quiet no-op. Ledgers are born on first seal, so every pre-alias record replays byte-identical. Directive XXI, Phase 9; gate `alias` (engine twin + table gate).

### The Cellar Sweep — the shelf keeps only its treasures — PRESENT

Pixels are cache; the record is law. At every act close (after the annal and the epoch) and by hand from Settings & Care, a pure deterministic plan walks the media shelf against the sealed journal and the standing act; one Dexie transaction on the shelf alone then executes it exactly. Kept, each row naming its immunity: anchors, composite sheets, book-attested plates, standing region states, the tempo law’s held frame, everything within the two-act horizon, house furniture, unattributable and unreadable rows (fail-closed), and every audio row — plates only this season, spoken plainly. Evicted, naming horizons: elder scenes and superseded region states. The journal, chain, and attestations are never touched; where an evicted plate hung, the replay speaks the honest cleared frame over its own procedural art — never a wrong image, never a silent re-bill. Directive XXII, Phase 10; gate `cellar`.

### The Pyre and the Parcel — the owner’s two standing rights — PRESENT

Server law behind the named door, and neither door reads any owner parameter — a cross-owner ask is unexpressible, not merely refused. GET /api/vault/parcel bales the owner-complete archive in deterministic order: all nine shelves, journal envelopes WHOLE (a rider field no schema ever named arrives intact), media by hash with a short-lived signed fetch, key halves public only. POST /api/account/pyre burns the account whole: the phrase spoken back or refused by name; blobs first under the owner’s holdings alone (every hash the living still cite is kept; one gutter aborts before any row burns, honestly retryable); then every table in ONE transaction, counts honest, the name last, the Clerk step named in the answer. THE STRONG TOOTH: the table roll derives from the schema’s own exported DDL — a shelf born tomorrow without its rights clauses reds the gate and both doors at birth. Directive XX Law XII, Phase 11; gate `pyreParcel`.

### The One Ledger Seam — standing folded through a single predicate — PRESENT

Directive XX Law XIII: the standing rows carry their source (plan_source, additive DDL with DEFAULT ’stripe’ — no UPDATE, nothing rewritten; existing rows read stripe by decree), and one pure predicate — entitledStanding, the single seat — folds a patron’s rows into the seat they hold: highest lawful seat wins, malformed rows seat nothing beyond the taste, and the source is NEVER consulted (storefront-blind by construction, courted at the gate against the predicate’s own text). Every pour, taste, and seat door asks it and no other — innkeeper, standing page, checkout comp court, reconciler — proven by a consultation counter; the Stripe writer’s verse grew by exactly its one stamped column, pinned whole against the pre-seam golden. Store receipts (appstore, play) will write rows and touch nothing else — Directive XXI hangs that door. Gate `oneLedger`, whole-verse benched from birth; four reds convicted at birth (α bypass, β dropped default, γ dropped stamp, δ source-bent predicate).

## VI. The Saga groundwork (Directive V)

### Sagas — the world outlives its tale — PRESENT

A sealed tale hands a legacy packet to the next volume: exact voices, locked canon, the dead arriving dead, interludes bridging the years. Module and gate stand; opening Volume II at the table is a Directive V phase.

### The Hearth — many chairs, one fire — PRESENT

Multi-device sync where the record is home: rows land once by hash, stale heads and broken chains are refused, and a losing fork hands back its deed unsent instead of losing anything.

### The annals — long memory — PRESENT

Deterministic annals spoken in the record’s own words, quotes verbatim or contraband, feeding [MEMORY] without ever inventing.

### The ravens — absence recaps — PRESENT

Come back after days away and the world reports what moved: absence counted honestly and capped, batches deterministic and ops-only, every recap line tracing to a sealed fact.

### The shared sky — PRESENT

One seasonal sky over every world — an omen entering the pack as a bounded hook, never a command; the off-switch is silence.

### Per-line voice direction — PRESENT

Delivery tags derived from the record (‘wounded’, ‘warm, close’) riding each speak call — the Tenor Law’s second half, begun.

### Share cards & the public shelf — PRESENT

A chapter’s public face: secrets struck, quotes verbatim, plates through the strict door; a fork carries the covenant, never another patron’s journal.

## VII. The World groundwork (Directive VI)

### The World Clock — the Calendar Law — PENDING (wiring 0/1)

Time derived from the record, never stored: time_advance and sealed spans fold to day and hour; watches name the light; the age ladder walks souls forward (child 8y → young 14y → adult 25y → elder) and the dead are outside time.

*Awaiting: 'worldClock' under artifacts/mydungeon-quest/src.*

### The Ledger — coin & goods conserved — PENDING (wiring 0/1)

Double-entry trades, atomic and cause-bearing; wallets and inventories are projections, byte-identical on replay; the world gives nothing without a cause; refusals are receipts. Progression, loot, and shops all stand on this.

*Awaiting: 'buildLedger' under artifacts/mydungeon-quest/src.*

### The Market — witnessed prices — PENDING (wiring 0/1)

The first quote locks; an uncaused change is a price attack refused by name; caused change is cited history; drift is deterministic, one notch per tick, toward the pressure the region’s scars show.

*Awaiting: 'buildMarket' under artifacts/mydungeon-quest/src.*

### The Living Atlas — geography with fog — PENDING (wiring 0/1)

Placement phrases (‘half a day north of Harrow Ford’) become deterministic coordinates in days of travel; positions lock like faces; the chart shows only the witnessed; a world event’s zone is a geometry query; and the world may move souls — missing, marked, displaced — while only the table may end them.

*Awaiting: 'buildAtlas' under artifacts/mydungeon-quest/src.*

### Bearing, Signature & the paint roster — PENDING (wiring 0/1)

The card is the prompt: locked visual verbatim, one trackable signature item per soul (the ledger moves it, the paint follows), wounds from the record, age from the clock, the dead never aging — and at most three painted subjects per plate: speaker, then villain, then bond.

*Awaiting: 'bearingBlock' under artifacts/mydungeon-quest/src.*

### The Sitting — a face is accepted, not assigned — PRESENT

After the forge, three portrait candidates of one unvarying identity sit for the player; one is blessed, once, finally — and NO SHEET BEFORE THE BLESSING: the six-view turnaround (five for places, in context) mints only from the accepted anchor. Parchment is exempt; the Floor owes no sitting.

### The Scriptorium — the room plans, the door speaks — PRESENT

Agents’ Room under house law: four scribes (plot, character, setting, conflict), each briefed to one domain, planning in notes and directives, never prose; a keyless mock room as the Floor; a court that refuses any plan that tries to speak.

### The Human Hand — the tell court — PENDING (wiring 0/1)

StoryScope’s measurable fingerprints (the stated moral, the borrowed body, the tidy bow, the hushed register) counted per thousand words over sealed narration, with capped, ordered counter-directives pushed into the pack’s directives the moment a family runs hot. The court measures; it never rewrites.

*Awaiting: 'tellReport' under artifacts/mydungeon-quest/src.*

### The Warden — machine vision keeps the face — PRESENT

The Likeness Law’s second half: every post-blessing soul render is judged by a vision model beside the blessed anchor under a deterministic ruling — pass with the verdict attested, repaint once with the drift notes appended to the prompt, then fall back to the anchor itself. The house never ships a stranger. The keyless floor admits it has no eyes and attests every pass as unjudged; parchment is exempt. From the July 15 playtest, where faces drifted as turns accumulated.

### The Salon — the human shelf — PRESENT

The Tell Me A Story corpus (Agents’ Room, CC-BY) opened with zero dependencies — RSA-OAEP unwrap, pure-node Fernet — into an untracked shelf the house calibrates against. Read, respected, never committed.

### The Folio — the codex, presented — PRESENT

The codex as the book the table keeps: vellum on ink, ribbon tabs (Hero · Souls · Atlas · Market · Chronicle · Ripples), and the signature move — every fact wears its turn seal in the margin, and the seal opens the sealed record. The hero’s leaf shows the Sitting: three faces sat, one blessed, the sheet minted only after acceptance. Spec and interactive mockup stand; rebuilding the Codex overlay to them is Phase 7.

## VIII. Charted — named, not yet begun

### Ripples & the Loom — CHARTED

A consequence index of raised threads the DM must eventually pay — and deliberately never all of them: loose ends are law, and the next volume inherits them. Directive VI, Phase 8.

### The Scriptorium convened (real scribes) — CHARTED

Model-backed scribes drawing their briefs at act edges, scratchpad to codex.notes, directives to the pack — mock room as the keyless Floor. Directive VI, Phase 9; gate `scribes`.

### The Human Hand at the table — CHARTED

tellReport each turn, styleDirectives into the pack, pressure landing on the next turn. Directive VI, Phase 10; gate `humanHand`.

### The Tell Bench — CHARTED

StoryScope’s released feature court run offline over sealed chronicles, judged only against the Salon’s human shelf. Keys and corpus required — a bench, not a gate.

### Horizons, renown, almanac, roads, institutions, works — CHARTED

Gossip horizons as hard pack limits; renown; weather from the clock; roads as cost functions on atlas distance; institutions with clocks; player-built permanence.

### The audiobook — CHARTED

The sealed tale read verbatim, chaptered, in the cast’s kept voices — the keepsake between storybook and podcast.

### Local DM door & video generation — CHARTED

Standing in the FateScript OSS tree: any OpenAI-compatible endpoint in the DM’s chair (never silently billing a cloud), and flagged video chains (Sora, Veo) with a posterOnly floor. Porting here and surfacing playback on the table are charted.
