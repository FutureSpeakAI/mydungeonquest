# THE FEATURES — the muster roll

*Generated from `tools/muster/features.mjs` by `pnpm run muster -- --write-doc` (2026-07-16). The document and the acceptance tests share one source; they cannot drift. Statuses below are live.*

**Standing: 44 present · 12 pending wiring · 0 regressed · 7 charted.** The law suite beneath all of this is `pnpm run check` — the gates, always green — and they only grow.

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

## VI. The Saga groundwork (Directive V)

### Sagas — the world outlives its tale — PRESENT

A sealed tale hands a legacy packet to the next volume: exact voices, locked canon, the dead arriving dead, interludes bridging the years. Module and gate stand; opening Volume II at the table is a Directive V phase.

### The Hearth — many chairs, one fire — PENDING (wiring 0/1)

Multi-device sync where the record is home: rows land once by hash, stale heads and broken chains are refused, and a losing fork hands back its deed unsent instead of losing anything.

*Awaiting: 'fatescript/hearth' under artifacts/mydungeon-quest/src.*

### The annals — long memory — PENDING (wiring 0/1)

Deterministic annals spoken in the record’s own words, quotes verbatim or contraband, feeding [MEMORY] without ever inventing.

*Awaiting: 'fatescript/memoir' under artifacts/mydungeon-quest/src.*

### The ravens — absence recaps — PENDING (wiring 0/1)

Come back after days away and the world reports what moved: absence counted honestly and capped, batches deterministic and ops-only, every recap line tracing to a sealed fact.

*Awaiting: 'fatescript/ravens' under artifacts/mydungeon-quest/src.*

### The shared sky — PENDING (wiring 0/1)

One seasonal sky over every world — an omen entering the pack as a bounded hook, never a command; the off-switch is silence.

*Awaiting: 'skyNote' under artifacts/mydungeon-quest/src.*

### Per-line voice direction — PENDING (wiring 0/1)

Delivery tags derived from the record (‘wounded’, ‘warm, close’) riding each speak call — the Tenor Law’s second half, begun.

*Awaiting: 'directionFor' under artifacts/mydungeon-quest/src/lib/cinema.*

### Share cards & the public shelf — PENDING (wiring 0/1)

A chapter’s public face: secrets struck, quotes verbatim, plates through the strict door; a fork carries the covenant, never another patron’s journal.

*Awaiting: 'shareCard' under artifacts/mydungeon-quest/src.*

## VII. The World groundwork (Directive VI)

### The World Clock — the Calendar Law — PRESENT

Time derived from the record, never stored: time_advance and sealed spans fold to day and hour; watches name the light; the age ladder walks souls forward (child 8y → young 14y → adult 25y → elder) and the dead are outside time.

### The Ledger — coin & goods conserved — PENDING (wiring 0/1)

Double-entry trades, atomic and cause-bearing; wallets and inventories are projections, byte-identical on replay; the world gives nothing without a cause; refusals are receipts. Progression, loot, and shops all stand on this.

*Awaiting: 'buildLedger' under artifacts/mydungeon-quest/src.*

### The Market — witnessed prices — PENDING (wiring 0/1)

The first quote locks; an uncaused change is a price attack refused by name; caused change is cited history; drift is deterministic, one notch per tick, toward the pressure the region’s scars show.

*Awaiting: 'buildMarket' under artifacts/mydungeon-quest/src.*

### The Living Atlas — geography with fog — PENDING (wiring 0/1)

Placement phrases (‘half a day north of Harrow Ford’) become deterministic coordinates in days of travel; positions lock like faces; the chart shows only the witnessed; a world event’s zone is a geometry query; and the world may move souls — missing, marked, displaced — while only the table may end them.

*Awaiting: 'buildAtlas' under artifacts/mydungeon-quest/src.*

### Bearing, Signature & the paint roster — PRESENT

The card is the prompt: locked visual verbatim, one trackable signature item per soul (the ledger moves it, the paint follows), wounds from the record, age from the clock, the dead never aging — and at most three painted subjects per plate: speaker, then villain, then bond.

### The Sitting — a face is accepted, not assigned — PENDING (wiring 0/2)

After the forge, three portrait candidates of one unvarying identity sit for the player; one is blessed, once, finally — and NO SHEET BEFORE THE BLESSING: the six-view turnaround (five for places, in context) mints only from the accepted anchor. Parchment is exempt; the Floor owes no sitting.

*Awaiting: 'openSitting' in artifacts/mydungeon-quest/src/components/Forge.jsx; 'blessCandidate' under artifacts/mydungeon-quest/src.*

### The Scriptorium — the room plans, the door speaks — PENDING (wiring 0/1)

Agents’ Room under house law: four scribes (plot, character, setting, conflict), each briefed to one domain, planning in notes and directives, never prose; a keyless mock room as the Floor; a court that refuses any plan that tries to speak.

*Awaiting: 'mockRoom' under artifacts/mydungeon-quest/src.*

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
