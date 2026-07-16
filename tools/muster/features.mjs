// ------------------------------------------------------------
// THE MUSTER ROLL — every feature the game is supposed to have.
//
// One source of truth: this roll drives both the acceptance runner
// (`pnpm run muster`) and the generated document (docs/FEATURES.md).
// A feature answers PRESENT only when every probe passes. Tiers:
//
//   wired      — shipped and reachable; all probes must pass NOW.
//                A failing probe is a REGRESSION and the muster goes red.
//   groundwork — the law stands (module + gate green); the table does
//                not touch it yet. Contract probes must pass now;
//                wiring probes flip it from PENDING to PRESENT.
//   design     — the artifact stands (spec + mockup); wiring pending.
//   tool       — a standing instrument with its own gate.
//   charted    — named on the roadmap; no probes; never counted
//                against the exit condition.
//
// Probe kinds:
//   { file: 'path' }                     — the file exists
//   { src: 'path', needle: 'text' }      — the file contains the text
//   { grep: 'dir', needle: 'text' }      — some file under dir contains it
//   { mod: 'engine/src/x.js', check }    — dynamic import passes check(m)
//
// LAW: probes may be ADDED or STRENGTHENED, never weakened or deleted
// to make a feature pass. The muster is a roll call, not a mirror.
// ------------------------------------------------------------

const GAME = 'artifacts/mydungeon-quest';

export const CATEGORIES = [
  'I. The Table — the core loop',
  'II. The Living Record',
  'III. The Foundry — sight & sound',
  'IV. Keepsakes & public faces',
  'V. Stewardship — providers, limits, commerce',
  'VI. The Saga groundwork (Directive V)',
  'VII. The World groundwork (Directive VI)',
  'VIII. Charted — named, not yet begun'
];

export const FEATURES = [

  // ————— I. THE TABLE —————
  {
    id: 'covenant-forge', category: 0, tier: 'wired',
    name: 'The covenant & world forge',
    detail: 'A world begins as one player-spoken sentence — the covenant — which becomes the law of the setting; or the player spins one, consults the oracle, or goes deep. Three doors: spin / oracle / deep.',
    probes: [{ file: `${GAME}/src/components/Forge.jsx` }, { grep: `${GAME}/src`, needle: 'covenant' }]
  },
  {
    id: 'hero-forge', category: 0, tier: 'wired',
    name: 'The hero forge — bones, oracle, or hand',
    detail: 'A hero is forged by dice (the standard array, always summing 72), by oracle (path, virtue, keepsake), or by hand. The forge ends with a voice audition: a blessed audition voiceId always wins over the casting session.',
    probes: [{ mod: 'packages/engine/src/forgeRolls.js', check: (m) => typeof m.rollHero === 'function' && typeof m.oracleHero === 'function' }, { src: `${GAME}/src/App.jsx`, needle: 'castHeroVoice' }]
  },
  {
    id: 'player-dice', category: 0, tier: 'wired',
    name: 'The dice belong to the player',
    detail: 'Every player roll generates on the player\u2019s device; the DM may request a roll but never make one. Resolutions (total, DC, success) are sealed with the turn.',
    probes: [{ file: `${GAME}/src/components/DiceOverlay.jsx` }, { grep: `${GAME}/src`, needle: 'roll_request' }]
  },
  {
    id: 'entropy-pool', category: 0, tier: 'wired',
    name: 'The committed entropy pool',
    detail: 'World randomness comes from a pre-committed pool the model must consume in order and account for — no retroactive luck. The validator audits every entropy_use.',
    probes: [{ mod: 'packages/engine/src/protocol.js', check: (m) => typeof m.makeEntropy === 'function' }, { src: `${GAME}/src/App.jsx`, needle: 'entropy' }]
  },
  {
    id: 'one-door', category: 0, tier: 'wired',
    name: 'One Door — the dm_turn protocol',
    detail: 'The model answers only through the forced dm_turn tool with a strict schema; violations go back once for self-repair, then an honest fallback turn. Protocol changes are additive-only.',
    probes: [{ src: `${GAME}/server/dm.js`, needle: 'dm_turn' }, { src: `${GAME}/src/App.jsx`, needle: 'validateDmTurn' }]
  },
  {
    id: 'spine-beats', category: 0, tier: 'wired',
    name: 'The story spine — acts, chapters, beats',
    detail: 'Every tale walks a beat structure: acts and chapters on a spine, with beat briefs prepared ahead and act turns marked. The spine travels in the payload every turn.',
    probes: [{ mod: 'packages/engine/src/spines.js', check: (m) => Object.keys(m).length > 0 }, { src: `${GAME}/src/App.jsx`, needle: 'beatIndex' }]
  },
  {
    id: 'canon-lock', category: 0, tier: 'wired',
    name: 'Canon Lock — and the dead do not speak',
    detail: 'Descriptions lock at first introduction; contradiction or re-introduction is a canon attack, blocked by name. No resurrection retcons. The dead may speak their dying words the turn they fall (pre-turn snapshot), and never after.',
    probes: [{ src: 'packages/engine/src/story.js', needle: 'canon' }, { src: `${GAME}/src/App.jsx`, needle: 'presentCast' }]
  },
  {
    id: 'combat-permadeath', category: 0, tier: 'wired',
    name: 'Combat & permadeath',
    detail: 'Real combat as explicit ops with ids, applied by reducer; real stakes — a fallen hero stays fallen, a fallen soul is sealed dead.',
    probes: [{ src: `${GAME}/src/App.jsx`, needle: 'applyCombat' }]
  },
  {
    id: 'blight-bonds', category: 0, tier: 'wired',
    name: 'Blight & bonds',
    detail: 'A 0\u20135 world-corruption meter and 0\u20134 bonds per soul with bond arcs — the two dials the tale turns.',
    probes: [{ grep: `${GAME}/src`, needle: 'blight' }, { src: 'packages/engine/src/story.js', needle: 'bond' }]
  },
  {
    id: 'villain-offscreen', category: 0, tier: 'wired',
    name: 'The villain advances offscreen',
    detail: 'The evil design is minted at session zero (arc: title, evil_plot, stakes, style_bible) and advances between chapters whether or not the hero is watching.',
    probes: [{ src: 'packages/engine/src/story.js', needle: 'evil' }]
  },
  {
    id: 'time-advance', category: 0, tier: 'wired',
    name: 'Time advance',
    detail: 'The DM may move the clock in whole hours or days through the protocol; act changes and time_advance trigger the living world.',
    probes: [{ grep: `${GAME}/src`, needle: 'time_advance' }]
  },

  // ————— II. THE LIVING RECORD —————
  {
    id: 'quiet-record', category: 1, tier: 'wired',
    name: 'The Quiet Record — hash chain & device signature',
    detail: 'Every turn is hash-chained and Ed25519-signed on the player\u2019s device, journal row and head-hash updated in one transaction. Client is law; the server is a stateless broker.',
    probes: [{ file: `${GAME}/src/lib/seal.js` }, { src: `${GAME}/src/App.jsx`, needle: 'seal(' }]
  },
  {
    id: 'redaction', category: 1, tier: 'wired',
    name: 'Redaction — struck, not erased',
    detail: 'A player may strike a turn; the strike is journal law. Struck rows stay in the chain, excluded from every projection: cards, ledger, market, tells, retellings.',
    probes: [{ src: `${GAME}/src/App.jsx`, needle: 'redacted' }]
  },
  {
    id: 'living-world', category: 1, tier: 'wired',
    name: 'The Living World — offscreen ticks',
    detail: 'On time_advance or an act turn, up to four goal-bearing, non-villain, active souls advance one step — ops-only, deterministic, zero token spend, sealed as \u2018tick\u2019, silent to the book and DM history, alive in the wiki and graph.',
    probes: [{ mod: 'packages/engine/src/livingWorld.js', check: (m) => Object.keys(m).length > 0 }, { src: `${GAME}/src/App.jsx`, needle: 'tickUpdates' }]
  },
  {
    id: 'character-cards', category: 1, tier: 'wired',
    name: 'Character Cards — one per soul, byte-identical on replay',
    detail: 'A pure reducer over the log yields each soul\u2019s card: locked identity, cited chronicle, typed ties (kin/enemy/ally/met), first and last words. The hero included.',
    probes: [{ mod: 'packages/engine/src/cards.js', check: (m) => typeof m.buildCards === 'function' }, { grep: `${GAME}/src`, needle: 'cardsForCampaign' }]
  },
  {
    id: 'chronicle-graph', category: 1, tier: 'wired',
    name: 'ChronicleGraph & the context pack',
    detail: 'A knowledge graph rebuildable from the record alone; [STORY] is a budgeted, scene-first pack (scene full, one-hop ties full, villain always, the rest slims) with contract keys preserved.',
    probes: [{ mod: 'packages/engine/src/graph.js', check: (m) => typeof m.buildContextPack === 'function' }, { src: `${GAME}/src/App.jsx`, needle: 'buildContextPack' }]
  },
  {
    id: 'wiki-codex', category: 1, tier: 'wired',
    name: 'The wiki codex — surfaces speak story',
    detail: 'The in-game world record is a living wiki whose every player-facing line is story ("A warm elder woman\u2019s voice"), never machinery.',
    probes: [{ mod: 'packages/engine/src/wikiText.js', check: (m) => Object.keys(m).length > 0 }, { src: `${GAME}/src/components/Overlays.jsx`, needle: 'Codex' }]
  },
  {
    id: 'memory-reveals', category: 1, tier: 'wired',
    name: 'Memory & the Seen Ledger',
    detail: 'A [MEMORY] block travels with every turn; the Seen Ledger (reveals) tracks what the player has actually witnessed, so nothing is spoiled and nothing is forgotten.',
    probes: [{ file: `${GAME}/src/lib/memory.js` }, { file: `${GAME}/src/lib/reveals.js` }]
  },

  {
    id: 'census', category: 1, tier: 'groundwork', triage: true,
    name: 'The Census — nobody speaks who isn’t counted',
    detail: 'The court against op decay: a narration block attributed to a name the record does not know is an unrecorded soul, and the turn goes back through the one-repair door demanding the cast_add (voice_card and all) or the removal of the attribution. A soul added this turn may speak this turn. Born of the July 15 playtest, where NPCs vanished from the codex a dozen turns in.',
    contract: [{ mod: 'packages/engine/src/census.js', check: (m) => m.unrecordedSouls({ narration_blocks: [{ speaker: 'Wren', text: 'x' }] }, []).length === 1 }],
    wiring: [{ src: `${GAME}/src/App.jsx`, needle: 'unrecordedSouls' }]
  },

  // ————— III. THE FOUNDRY —————
  {
    id: 'foundry-tiers', category: 2, tier: 'wired',
    name: 'Two Foundry tiers — parchment & illuminated',
    detail: 'Parchment: procedural woodcut art, instant, free, silent. Illuminated: painted stills, voiced narration, music at turning points. Session caps: 80 images, 8 music.',
    probes: [{ file: `${GAME}/src/lib/cinema/procedural.js` }, { src: `${GAME}/src/App.jsx`, needle: "'illuminated'" }]
  },
  {
    id: 'anchor-law', category: 2, tier: 'wired',
    name: 'The Anchor Law',
    detail: 'The first portrait or plate becomes the permanent visual anchor, conditioning every later render; anchor and conditioning hashes are recorded with each asset.',
    probes: [{ grep: `${GAME}/src/lib/cinema`, needle: 'anchor' }]
  },
  {
    id: 'cast-tenor', category: 2, tier: 'wired',
    name: 'Cast Law & Tenor Law',
    detail: 'A voice is cast once and kept for the tale\u2019s life; casting derives from stated identity (voice_card on every cast_add; hero presentation/pronouns/mark) with the station lexicon over the soul\u2019s own role and name. Born of the misgendered-mother playtest.',
    probes: [{ src: 'packages/engine/src/cinema/casting.js', needle: 'voice_card' }, { mod: 'packages/engine/src/cinema/casting.js', check: (m) => typeof m.castVoiceByCard === 'function' }]
  },
  {
    id: 'multivoice', category: 2, tier: 'wired',
    name: 'Multivoice narration',
    detail: 'A twelve-voice ensemble; the narrator is George; every cast soul speaks in its own kept voice through the /api/speak door.',
    probes: [{ file: `${GAME}/src/lib/cinema/narrator.js` }, { grep: `${GAME}/server`, needle: 'speak' }]
  },
  {
    id: 'audio-director', category: 2, tier: 'wired',
    name: 'The Audio Director',
    detail: 'One director owns the mix — music, SFX, narration concurrency; silence is the floor; keyless audio never reaches players as real.',
    probes: [{ file: `${GAME}/src/lib/cinema/audioDirector.js` }]
  },
  {
    id: 'cinematics', category: 2, tier: 'wired',
    name: 'Cinematics at turning points',
    detail: 'Turning points earn cinematic treatment — sequenced plates, music, narration — cued by the protocol, budgeted by the watchtower.',
    probes: [{ file: `${GAME}/src/components/Cinematic.jsx` }]
  },
  {
    id: 'attestation', category: 2, tier: 'wired',
    name: 'Attestation of every asset',
    detail: 'Every generated asset\u2019s hash is recorded, and every anchored render records its conditioning hashes — the media provenance chain beside the story\u2019s.',
    probes: [{ grep: `${GAME}/src/lib`, needle: 'assetHash' }]
  },
  {
    id: 'keyless-floor', category: 2, tier: 'wired',
    name: 'The Floor — everything runs keyless',
    detail: 'Mock DM, procedural plates, honest silence and tones — clearly labeled, never billed, never mistaken for real. Every gate in the house passes with zero keys.',
    probes: [{ mod: 'packages/engine/src/mockDm.js', check: (m) => Object.keys(m).length > 0 }, { file: `${GAME}/src/lib/cinema/procedural.js` }]
  },

  {
    id: 'hero-avatar', category: 2, tier: 'groundwork', triage: true,
    name: 'The face on the sheet',
    detail: 'The character sheet shows the hero’s own face: the blessed anchor (post-Sitting), else the first attested anchor, else the procedural bust on parchment — rendered as an AnchorBust at the head of the sheet, sourced from the media store by asset hash, never re-rendered for the occasion. A sheet without its face is a form, not a leaf. From the July 15 playtest.',
    contract: [],
    wiring: [{ src: `${GAME}/src/components/Overlays.jsx`, needle: 'AnchorBust' }]
  },

  // ————— IV. KEEPSAKES —————
  {
    id: 'sealing', category: 3, tier: 'wired',
    name: 'The sealing ceremony',
    detail: 'A finished tale seals with wax; a sealed spine opens straight to its keepsakes. Sealing is a ceremony, not a save.',
    probes: [{ file: `${GAME}/src/components/Ceremony.jsx` }, { grep: `${GAME}/src`, needle: 'sealedAt' }]
  },
  {
    id: 'storybook', category: 3, tier: 'wired',
    name: 'The storybook & the Binder\u2019s Door',
    detail: 'A bound, illustrated book (HTML/PDF, Letter or A5) with drop caps and plates — and only attested data:image plates pass the Binder\u2019s Door.',
    probes: [{ src: `${GAME}/src/lib/storybook.js`, needle: 'data:image' }]
  },
  {
    id: 'podcast', category: 3, tier: 'wired',
    name: 'The podcast episode',
    detail: 'A fully voiced episode of the sealed tale — every soul in its kept voice, the narrator carrying the frame.',
    probes: [{ file: `${GAME}/src/lib/podcast.js` }]
  },
  {
    id: 'chronicler', category: 3, tier: 'wired',
    name: 'The Chronicler\u2019s three laws',
    detail: 'Retellings may not invent, contradict, or embellish; quotes match the sealed record verbatim or are contraband — enforced by the quote court.',
    probes: [{ src: 'packages/engine/src/chronicler.js', needle: 'verbatim' }, { file: `${GAME}/server/retell.js` }]
  },
  {
    id: 'notary', category: 3, tier: 'wired',
    name: 'The notary',
    detail: 'An unlisted verification page where any sealed chronicle proves its chain and signatures to a stranger.',
    probes: [{ file: `${GAME}/public/verify.html` }]
  },

  // ————— V. STEWARDSHIP —————
  {
    id: 'provider-plans', category: 4, tier: 'wired',
    name: 'Provider plans & fallback chains',
    detail: 'Ordered provider chains per media kind with wall-clock budgets; the mock floor ends every chain; explicit local never silently bills a cloud.',
    probes: [{ file: `${GAME}/server/adapters/index.js` }]
  },
  {
    id: 'watchtower', category: 4, tier: 'wired',
    name: 'The watchtower',
    detail: 'Durable limits, abuse caps, per-provider daily spend ceilings, structured log lines, herald pings — the house\u2019s own conscience about money and misuse.',
    probes: [{ file: `${GAME}/server/watchtower.js` }]
  },
  {
    id: 'toll-house', category: 4, tier: 'wired',
    name: 'The toll-house',
    detail: 'A six-turn lifetime free taste; $5/week or $129.99/year; paid seats pour unmeasured; refusal receipts reach the window; a keyless fork never learns money exists.',
    probes: [{ file: `${GAME}/server/toll.js` }, { file: `${GAME}/src/patron/tollNotice.js` }]
  },
  {
    id: 'patron-vault', category: 4, tier: 'wired',
    name: 'Sign-in & the vault',
    detail: 'Named patrons sign in (Clerk); chronicles sync to the server vault with chain-law preserved — tampering refused, deletion owner-scoped (the pyre).',
    probes: [{ file: `${GAME}/server/vault.js` }, { file: `${GAME}/src/lib/vault.js` }, { file: `${GAME}/server/clerkProxy.js` }]
  },
  {
    id: 'proving-ground', category: 4, tier: 'wired',
    name: 'The Proving Ground',
    detail: 'The whole suite — engine gates, game gates, the salon — runs keyless in CI on every push. PASS only grows; weakening a gate is the one forbidden move.',
    probes: [{ file: '.github' }, { src: 'package.json', needle: 'check:salon' }]
  },

  // ————— VI. SAGA GROUNDWORK (Directive V) —————
  {
    id: 'saga', category: 5, tier: 'groundwork',
    name: 'Sagas — the world outlives its tale',
    detail: 'A sealed tale hands a legacy packet to the next volume: exact voices, locked canon, the dead arriving dead, interludes bridging the years. Module and gate stand; opening Volume II at the table is a Directive V phase.',
    contract: [{ mod: 'packages/engine/src/saga.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'openNextTale' }]
  },
  {
    id: 'hearth', category: 5, tier: 'groundwork',
    name: 'The Hearth — many chairs, one fire',
    detail: 'Multi-device sync where the record is home: rows land once by hash, stale heads and broken chains are refused, and a losing fork hands back its deed unsent instead of losing anything.',
    contract: [{ mod: 'packages/engine/src/hearth.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'fatescript/hearth' }]
  },
  {
    id: 'annals', category: 5, tier: 'groundwork',
    name: 'The annals — long memory',
    detail: 'Deterministic annals spoken in the record\u2019s own words, quotes verbatim or contraband, feeding [MEMORY] without ever inventing.',
    contract: [{ mod: 'packages/engine/src/memoir.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'fatescript/memoir' }]
  },
  {
    id: 'ravens', category: 5, tier: 'groundwork',
    name: 'The ravens — absence recaps',
    detail: 'Come back after days away and the world reports what moved: absence counted honestly and capped, batches deterministic and ops-only, every recap line tracing to a sealed fact.',
    contract: [{ mod: 'packages/engine/src/ravens.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'fatescript/ravens' }]
  },
  {
    id: 'shared-sky', category: 5, tier: 'groundwork',
    name: 'The shared sky',
    detail: 'One seasonal sky over every world — an omen entering the pack as a bounded hook, never a command; the off-switch is silence.',
    contract: [{ mod: 'packages/engine/src/sky.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'skyNote' }]
  },
  {
    id: 'voice-direction', category: 5, tier: 'groundwork',
    name: 'Per-line voice direction',
    detail: 'Delivery tags derived from the record (\u2018wounded\u2019, \u2018warm, close\u2019) riding each speak call — the Tenor Law\u2019s second half, begun.',
    contract: [{ mod: 'packages/engine/src/direction.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src/lib/cinema`, needle: 'directionFor' }]
  },
  {
    id: 'share-cards', category: 5, tier: 'groundwork',
    name: 'Share cards & the public shelf',
    detail: 'A chapter\u2019s public face: secrets struck, quotes verbatim, plates through the strict door; a fork carries the covenant, never another patron\u2019s journal.',
    contract: [{ mod: 'packages/engine/src/shareCard.js', check: (m) => Object.keys(m).length > 0 }],
    wiring: [{ grep: `${GAME}/src`, needle: 'shareCard' }]
  },

  // ————— VII. WORLD GROUNDWORK (Directive VI) —————
  {
    id: 'world-clock', category: 6, tier: 'groundwork',
    name: 'The World Clock — the Calendar Law',
    detail: 'Time derived from the record, never stored: time_advance and sealed spans fold to day and hour; watches name the light; the age ladder walks souls forward (child 8y \u2192 young 14y \u2192 adult 25y \u2192 elder) and the dead are outside time.',
    contract: [{ mod: 'packages/engine/src/clock.js', check: (m) => m.worldClock([]).day === 1 && m.agedBand('child', 8) === 'young' }],
    wiring: [{ grep: `${GAME}/src`, needle: 'worldClock' }]
  },
  {
    id: 'ledger', category: 6, tier: 'groundwork',
    name: 'The Ledger — coin & goods conserved',
    detail: 'Double-entry trades, atomic and cause-bearing; wallets and inventories are projections, byte-identical on replay; the world gives nothing without a cause; refusals are receipts. Progression, loot, and shops all stand on this.',
    contract: [{ mod: 'packages/engine/src/ledger.js', check: (m) => m.buildLedger({ entries: [m.tradeEntry({ from: 'a', to: 'b', coin: 5, turn: 1 })], opening: { a: { coin: 1 } } }).refusals[0].reason === 'purse too light' }],
    wiring: [{ grep: `${GAME}/src`, needle: 'buildLedger' }]
  },
  {
    id: 'market', category: 6, tier: 'groundwork',
    name: 'The Market — witnessed prices',
    detail: 'The first quote locks; an uncaused change is a price attack refused by name; caused change is cited history; drift is deterministic, one notch per tick, toward the pressure the region\u2019s scars show.',
    contract: [{ mod: 'packages/engine/src/market.js', check: (m) => { const q = m.priceEntry({ region: 'x', item: 'y', price: 2, turn: 1 }); const bad = m.priceEntry({ region: 'x', item: 'y', price: 5, turn: 2 }); return m.buildMarket({ entries: [q, bad] }).refusals[0].reason.includes('price attack'); } }],
    wiring: [{ grep: `${GAME}/src`, needle: 'buildMarket' }]
  },
  {
    id: 'atlas', category: 6, tier: 'groundwork',
    name: 'The Living Atlas — geography with fog',
    detail: 'Placement phrases (\u2018half a day north of Harrow Ford\u2019) become deterministic coordinates in days of travel; positions lock like faces; the chart shows only the witnessed; a world event\u2019s zone is a geometry query; and the world may move souls — missing, marked, displaced — while only the table may end them.',
    contract: [{ mod: 'packages/engine/src/atlas.js', check: (m) => !m.assertAftermathLawful({ soulOps: [{ name: 'x', status: 'dead' }], regionOps: [] }).ok }],
    wiring: [{ grep: `${GAME}/src`, needle: 'buildAtlas' }]
  },
  {
    id: 'bearing', category: 6, tier: 'groundwork', triage: true,
    name: 'Bearing, Signature & the paint roster',
    detail: 'The card is the prompt: locked visual verbatim, one trackable signature item per soul (the ledger moves it, the paint follows), wounds from the record, age from the clock, the dead never aging — and at most three painted subjects per plate: speaker, then villain, then bond.',
    contract: [{ mod: 'packages/engine/src/bearing.js', check: (m) => m.ROSTER_CAP === 3 && typeof m.bearingBlock === 'function' }],
    wiring: [{ grep: `${GAME}/src`, needle: 'bearingBlock' }]
  },
  {
    id: 'sitting', category: 6, tier: 'groundwork',
    name: 'The Sitting — a face is accepted, not assigned',
    detail: 'After the forge, three portrait candidates of one unvarying identity sit for the player; one is blessed, once, finally — and NO SHEET BEFORE THE BLESSING: the six-view turnaround (five for places, in context) mints only from the accepted anchor. Parchment is exempt; the Floor owes no sitting.',
    contract: [{ mod: 'packages/engine/src/sitting.js', check: (m) => m.sheetBrief(m.openSitting({ subject: 'x', bearingText: 'y' })).ok === false }],
    wiring: [{ src: `${GAME}/src/components/Forge.jsx`, needle: 'openSitting' }, { grep: `${GAME}/src`, needle: 'blessCandidate' }]
  },
  {
    id: 'scriptorium', category: 6, tier: 'groundwork',
    name: 'The Scriptorium — the room plans, the door speaks',
    detail: 'Agents\u2019 Room under house law: four scribes (plot, character, setting, conflict), each briefed to one domain, planning in notes and directives, never prose; a keyless mock room as the Floor; a court that refuses any plan that tries to speak.',
    contract: [{ mod: 'packages/engine/src/scriptorium.js', check: (m) => !m.assertRoomSilent({ directives: [], narration_blocks: [] }).ok }],
    wiring: [{ grep: `${GAME}/src`, needle: 'mockRoom' }]
  },
  {
    id: 'human-hand', category: 6, tier: 'groundwork',
    name: 'The Human Hand — the tell court',
    detail: 'StoryScope\u2019s measurable fingerprints (the stated moral, the borrowed body, the tidy bow, the hushed register) counted per thousand words over sealed narration, with capped, ordered counter-directives pushed into the pack\u2019s directives the moment a family runs hot. The court measures; it never rewrites.',
    contract: [{ mod: 'packages/engine/src/tells.js', check: (m) => Object.keys(m.TELL_FAMILIES).length === 4 && typeof m.styleDirectives === 'function' }],
    wiring: [{ grep: `${GAME}/src`, needle: 'tellReport' }]
  },
  {
    id: 'warden', category: 6, tier: 'groundwork', triage: true,
    name: 'The Warden — machine vision keeps the face',
    detail: 'The Likeness Law’s second half: every post-blessing soul render is judged by a vision model beside the blessed anchor under a deterministic ruling — pass with the verdict attested, repaint once with the drift notes appended to the prompt, then fall back to the anchor itself. The house never ships a stranger. The keyless floor admits it has no eyes and attests every pass as unjudged; parchment is exempt. From the July 15 playtest, where faces drifted as turns accumulated.',
    contract: [{ mod: 'packages/engine/src/warden.js', check: (m) => m.wardenRuling(m.parseVerdict('{"same":false,"confidence":0.9}'), { attempt: 2 }).action === 'anchor' }],
    wiring: [{ grep: `${GAME}/src`, needle: 'wardenRuling' }, { grep: `${GAME}/server`, needle: 'warden' }]
  },
  {
    id: 'salon', category: 6, tier: 'tool',
    name: 'The Salon — the human shelf',
    detail: 'The Tell Me A Story corpus (Agents\u2019 Room, CC-BY) opened with zero dependencies — RSA-OAEP unwrap, pure-node Fernet — into an untracked shelf the house calibrates against. Read, respected, never committed.',
    contract: [{ file: 'tools/salon/salon.mjs' }, { file: 'tools/salon/fernet.mjs' }, { src: 'package.json', needle: 'check:salon' }],
    wiring: []
  },
  {
    id: 'folio', category: 6, tier: 'design',
    name: 'The Folio — the codex, presented',
    detail: 'The codex as the book the table keeps: vellum on ink, ribbon tabs (Hero \u00b7 Souls \u00b7 Atlas \u00b7 Market \u00b7 Chronicle \u00b7 Ripples), and the signature move — every fact wears its turn seal in the margin, and the seal opens the sealed record. The hero\u2019s leaf shows the Sitting: three faces sat, one blessed, the sheet minted only after acceptance. Spec and interactive mockup stand; rebuilding the Codex overlay to them is Phase 7.',
    contract: [{ src: 'docs/design/codex-folio.html', needle: 'Blessed at the Sitting' }, { file: 'docs/design/CODEX-FOLIO.md' }],
    wiring: [{ src: `${GAME}/src/components/Overlays.jsx`, needle: 'ribbon' }]
  },

  // ————— VIII. CHARTED —————
  { id: 'loom', category: 7, tier: 'charted', name: 'Ripples & the Loom', detail: 'A consequence index of raised threads the DM must eventually pay — and deliberately never all of them: loose ends are law, and the next volume inherits them. Directive VI, Phase 8.' },
  { id: 'scribes-live', category: 7, tier: 'charted', name: 'The Scriptorium convened (real scribes)', detail: 'Model-backed scribes drawing their briefs at act edges, scratchpad to codex.notes, directives to the pack — mock room as the keyless Floor. Directive VI, Phase 9; gate `scribes`.' },
  { id: 'hand-live', category: 7, tier: 'charted', name: 'The Human Hand at the table', detail: 'tellReport each turn, styleDirectives into the pack, pressure landing on the next turn. Directive VI, Phase 10; gate `humanHand`.' },
  { id: 'tell-bench', category: 7, tier: 'charted', name: 'The Tell Bench', detail: 'StoryScope\u2019s released feature court run offline over sealed chronicles, judged only against the Salon\u2019s human shelf. Keys and corpus required — a bench, not a gate.' },
  { id: 'society', category: 7, tier: 'charted', name: 'Horizons, renown, almanac, roads, institutions, works', detail: 'Gossip horizons as hard pack limits; renown; weather from the clock; roads as cost functions on atlas distance; institutions with clocks; player-built permanence.' },
  { id: 'audiobook', category: 7, tier: 'charted', name: 'The audiobook', detail: 'The sealed tale read verbatim, chaptered, in the cast\u2019s kept voices — the keepsake between storybook and podcast.' },
  { id: 'local-video', category: 7, tier: 'charted', name: 'Local DM door & video generation', detail: 'Standing in the FateScript OSS tree: any OpenAI-compatible endpoint in the DM\u2019s chair (never silently billing a cloud), and flagged video chains (Sora, Veo) with a posterOnly floor. Porting here and surfacing playback on the table are charted.' }
];
