# EXPERIENCE DIRECTIVE V — The Saga Cut

*To the agent who takes this up: you will not speak with the agents who came before you. Their directives sit beside this one in `docs/directives/`, and the gates they left behind are your inheritance. Read the laws, run `npm run check`, and begin only when the suite is green.*

---

## Why this cut exists

Four cuts built a machine that can tell one true story. This cut builds a house where a story can live for years.

The founder's charge, translated into intent: the game must be fun, engaging, and sharable; the art and the voices must be good; the consistency must hold under the weight of time; and a patron should be able to dwell in one generative story for months or years — literally. Every law below serves that charge:

| The charge | The laws that carry it |
|---|---|
| Play for months or years | Hearth, Saga, Raven, Long Toll |
| Consistency that holds | Long Memory, Likeness, Choir |
| World building that deepens | Saga, Shared Sky, Long Memory |
| Sharable, cool, alive | Commons, Shared Sky, Raven |
| Art and voices that are good | Likeness, Choir |

**One amendment rides with this cut, stated plainly per the protocol.** The sermon retires; the plumbing stays. The Quiet Record remains exactly as built — the hash chain and the device signature are how the Hearth syncs without duplication and how replay stays byte-true — but the house stops preaching cryptography to players. Every touched document that says the record *proves* shall say the record *keeps*. `seal.js` does not change; the language around it does. Sync those documents in the same commits that touch them. The gates guarding the chain do not weaken by one assertion.

**One boast to defend across all ten phases:** this entire cut ships without a single change to `protocol.js` or to the shape of `dm_turn`. The world grows around the model; the model's door does not move.

---

## The New Laws

Each law is stated here, enforced in named code, and held by a named gate. Any document a law touches — CLAWS.md, README, ARCHITECTURE, wiki text — is synchronized in the same change that lands the law.

**I. Hearth Law.** The record's home is the house; a device is a chair by the hearth. Every seal streams to the vault as it lands; any signed-in device pulls the head and resumes the tale mid-sentence. Append-only makes conflict a fork, and a fork has one rule: the hearth's head wins, and the losing turn returns to its device as an unsent deed — never as a lost one. The local Dexie cache remains for speed and for the keyless Floor.
*Enforcement:* `src/lib/hearth.js` (client sync), MDQ vault routes (extending the existing server vault sync). *Gate:* `hearth`.

**II. Saga Law.** A world outlives its tales. Sealing a tale no longer ends the world — it closes a volume and writes a **legacy packet**: every soul with its exact voiceId, locked canon, bond, and status; every region's locked descriptions; blight; the world's standing facts. A new tale opens inside the same world, consumes the packet, and the years between are bridged by **interlude ticks**. The dead of volume one do not speak in volume three. Legacy souls keep their exact legacy voices — the Cast Law already promised this; the Saga Law collects on the promise.
*Enforcement:* `src/lib/saga.js` (`buildLegacyPacket`, `openNextTale`), seal type `'legacy'`. *Gate:* `saga`.

**III. Long Memory Law.** Year two must remember year one, and memory is derived from the record alone. At each act and tale seal the Chronicler composes a **memoir** — a digest bound by its three laws (no invention, no contradiction, no embellishment; quotes verbatim) — sealed as type `'memoir'`. The context pack becomes a ladder: the scene floor (never trimmed), recent turns verbatim, memoirs newest-first, then card retrieval by relevance to the souls present. The budget still governs; nothing enters `[STORY]` or `[MEMORY]` that cannot be traced to a sealed op.
*Enforcement:* `src/lib/memoir.js` (`composeMemoir`, `assertMemoirLawful`), `graph.js` ladder extension. *Gate:* `longMemory`.

**IV. Raven Law.** The world moves while the player is away, and on return it accounts for itself. Absence scales the Living World: one tick batch per elapsed day, capped, still deterministic, still ops-only, still zero tokens at the Floor. The return opens with **What the Ravens Bring** — a recap composed only from unseen ticks and the latest memoir; a keyed model may gloss it, but every sentence must trace to a sealed op. Dispatches (a raven line by mail or push) are the house's whisper, flagged, MDQ only.
*Enforcement:* `src/lib/ravens.js` (`absenceBatches`, `composeRecap`), App hook on campaign open. *Gate:* `ravens`.

**V. Shared Sky Law.** One sky hangs over every world. Each season the house publishes an **omen** — a motif, a hook, a palette accent — and every world may see the same comet and read it by its own covenant. The omen enters the context pack as an additive `sky` note, a hook and never a command: the covenant remains supreme, canon lock is untouched, and no omen text enters the codex unless the DM writes it through ordinary story ops. A world may close its sky with one setting. What the comet meant in *your* world is the question players carry to each other.
*Enforcement:* `graph.js` additive `sky` note; FateScript reads `server/seasons/seasons.json`; MDQ publishes from the house. *Gate:* `sharedSky`.

**VI. Likeness Law.** A face is blessed, warded, and allowed to age — never to reset. **The Sitting:** at an illuminated forge, three anchor candidates; the patron blesses one; the blessed hash becomes the anchor. **The Warden:** every later render of a soul is checked against its anchor by a vision judge; a failing render is retried once with the anchor's conditioning reinforced, then ships with the anchor as fallback — the Warden may delay a plate, never a turn. **The Second Sitting:** at a tale's seal the patron may sit again; the successor anchor seals citing its parent, and age moves elder-ward only. Scars accumulate; time runs one way.
*Enforcement:* Foundry pipeline; `src/lib/cinema/warden.js`; anchor lineage as an additive cache-key component. *Gates:* `sitting`, `warden`.

**VII. Choir Law.** Twelve premade voices cannot carry a sixty-soul saga. A soul that becomes major — bond ≥ 2, or arc-major by role — receives a **minted voice**, designed from its own voice_card and sealed to its card exactly once; the ensemble remains the floor for minor souls and for keyless play, labeled as ever. Legacy souls are never re-minted. And the Tenor Law completes its second half: every spoken line carries a **direction tag** derived deterministically from the record — wounds, blight, bond, the resolution just rolled — riding the speak call so a dying friend sounds like one.
*Enforcement:* `casting.js` mint path (idempotent, capped, watchtower-counted), `src/lib/cinema/direction.js`; `/api/speak` body gains additive `direction`. All routed through the Audio Director. *Gate:* `choir`.

**VIII. Commons Law.** A sealed chapter may be placed on the public shelf, and a shelf is a place of honor with rules. The shelf page renders from the record alone: chronicle excerpt, attested plates only (Binder's Door holds in public), the cast with every secret struck, the covenant, and the lineage line. Quotes are verbatim or absent — the quote court sits in public too. **Forking is lawful and credited:** a fork copies covenant and world genesis, never another patron's journal or souls' secrets, and "forked from" seals into the child's genesis. At each chapter seal the engine composes a **share card** — plate, best line by deterministic pick (highest-DC resolved deed), world title — and, behind the video flag, a **reel**: twenty vertical seconds of a turning point, plate in motion, one voiced line, one music swell. And the shelf shows text as text: every string from the record is escaped on render; a soul named `<script>` walks the shelf inert.
*Enforcement:* `src/lib/shareCard.js`, `src/lib/cinema/reel.js` (flagged); MDQ shelf routes rendering server-side from the vault. *Gate:* `commons`.

**IX. Long Toll Law** *(MDQ only)*. Patrons who dwell for years deserve a door built for them, and the house must survive their appetite. A third tier joins the toll-house — the **Patron of the Long Road** — with ceilings sized for illuminated sagas: more plates, minted voices included, second sittings included, reels included, dispatches on. The tier table is one table; every ceiling in the watchtower reads from it; the house sets the figures, the code never hardcodes them. The watch keeps its ledger through the night: ceiling counters persist restarts, atomically. Refusal receipts still reach the window. A keyless fork still never learns money exists.
*Enforcement:* MDQ toll-house tier table; `watchtower.js` durable counters. *Gate:* `longToll` (MDQ chain).

---

## The Phases

One phase per checkpoint. Each phase ends when its named gate prints `PASS —` keyless, the neighboring gates still pass, and `npm run check` is green.

### Phase 1 — The Hearth *(MDQ primary; FateScript behind `VAULT_URL`)*

Extend the existing server vault sync from backup to primacy. On every seal, the envelope queues to the vault (fire-and-forget with retry; the envelope hash is the idempotency key). On campaign open, pull the vault head, fetch missing rows by index, verify the chain, hydrate Dexie. Implement the fork rule: a device appending against a stale head is refused; its deed is restored to the input as unsent. FateScript ships `src/lib/hearth.js` plus an in-memory mock vault adapter; the door opens only when `VAULT_URL` is set, and the Floor never needs it.

**Gate `hearth`:** two simulated devices against the mock vault — interleaved appends converge to one chain; replay is byte-identical on both; a stale-head append is refused and the deed survives as unsent; a tampered row is refused by the existing chain check. Zero keys, zero network.

### Phase 2 — The Saga *(both trees)*

Additive campaign schema: `saga: { id, worldTitle, covenant, taleIndex, legacy }`. Sealing a tale writes the legacy packet (seal type `'legacy'`) and marks the volume closed. `openNextTale(campaign)` forges a new tale inside the world: the world door is skipped, the packet is consumed, legacy souls arrive with exact voiceIds and locked canon, and the interlude runs as client-generated ticks bridging the stated span ("three winters pass") — interludes never come from the model, so the protocol does not move. The validator's cast snapshot reads legacy: the dead of prior volumes cannot speak.

**Gate `saga`:** seal a fixture tale, open volume two — legacy voiceIds byte-equal; a dead legacy soul offered as a speaker is rejected; the interlude is deterministic in `(codex, span)`; the world's locked canon survives the crossing.

### Phase 3 — The Long Memory *(both trees)*

`composeMemoir(entries, codex)`: the keyless path is a deterministic template over sealed ops; the keyed path may write literary prose but must pass `assertMemoirLawful(memoir, record)` — every proper noun present in the record, every quote verbatim (reuse the quote court), no claim without a source op. Memoirs seal as `'memoir'`. Extend `buildContextPack` with the ladder: scene floor → recent verbatim turns → memoirs newest-first (older memoirs compress to their headline line) → relevant cards. Default budget for saga campaigns rises to 9,000; the parameter already exists.

**Gate `longMemory`:** a 200-turn, two-volume fixture — a secret planted at turn 3 is reachable in the pack at turn 200 through the memoir chain; the budget holds; the scene floor is never trimmed; a memoir containing an invented name fails `assertMemoirLawful`.

### Phase 4 — The Ravens *(both trees; dispatches MDQ only)*

`absenceBatches(codex, lastSealTs, now)`: one batch per elapsed day, capped at six; each batch obeys the existing TICK_BUDGET and ordering; deterministic in `(codex, turn, elapsedDays)`. `composeRecap(ticks, memoir)`: keyless deterministic; keyed gloss composed per-op so tracing is by construction. The App hook surfaces What the Ravens Bring on campaign open after absence. MDQ wires dispatches through the herald behind a patron setting.

**Gate `ravens`:** a 30-day fixture — batch count capped and deterministic; every recap fact is a subset of sealed ops; keyless mode makes zero provider calls; the recap after zero absence is empty and silent.

### Phase 5 — The Shared Sky *(both trees; the feed is the house's)*

Season shape: `{ id, name, omen, motif, palette, hook }`. FateScript reads `server/seasons/seasons.json`; MDQ serves the live season from the house. `buildContextPack` gains the additive `sky` note, ≤ 200 characters, under budget, suppressed entirely when the world's `sky` setting is off. The omen is prompt-side flavor only: it enters canon exclusively through ordinary `story` ops if the DM chooses to write it.

**Gate `sharedSky`:** same season and world yield the same note; the off-switch removes it; the budget holds; after a turn in which the DM ignores the omen, the codex contains no omen text.

### Phase 6 — The Sitting and the Warden *(both trees, Foundry)*

The Sitting at illuminated forge: three candidates through the existing paint chain (within session caps), presented; the blessed hash seals as the anchor; declining to bless defaults to the first candidate, labeled. The Warden after each soul render: keyed judges (vision model — same person, yes or no, one drift note); the keyless mock returns pass iff the render's conditioning hash matches the anchor, so the retry path is testable to the byte. One retry with reinforced conditioning, then ship with fallback and a watchtower note. The Second Sitting at tale seals mints a successor anchor citing its parent; `age_band` transitions are monotone elder-ward. Cache keys gain an additive lineage component; existing keys are untouched.

**Gates:** `sitting` — three deterministic mock candidates; blessing seals the anchor; the unblessed path labels honestly. `warden` — mock verdicts drive retry and fallback exactly once each; successor anchors cite parents; age never regresses.

### Phase 7 — The Choir *(both trees, audio)*

Mint trigger in `casting.js`: bond ≥ 2 or arc-major, minted at most once per soul (idempotent flag on the card), at most six mints per tale, watchtower-counted. The minted voiceId writes to the card and is thereafter governed by the Cast Law verbatim — cast once, kept for the tale's life, exact for legacy. Keyless play falls to the ensemble, labeled. `direction.js`: a deterministic table from `(status, bond, blight, last resolution)` to a short direction tag; the speak call body becomes `{ text, voiceId, direction }`; providers that accept prosody receive it, providers that do not ignore it, and silence stays silence. Everything routes through the Audio Director — the interlock does not open.

**Gate `choir`:** the mint fires exactly once per qualifying soul and never past the cap; a legacy soul is never re-minted; keyless falls to ensemble with the label; direction is deterministic in state; the Director remains the only door to the mix.

### Phase 8 — The Commons *(engine composers in both trees; the shelf is MDQ's)*

Engine: `composeShareCard(campaign, chapterSeal)` — deterministic plate and line selection, verbatim quote, rendered card; `composeReel` behind `FATESCRIPT_VIDEO`, using the existing Sora/Veo chains with the poster fallback keyless, capped at two reels per act. House: shelf routes render a public tale page server-side from the vault record — attested plates only, secrets struck per the redaction law, quotes verbatim, lineage credited; the fork endpoint copies covenant and world genesis only and seals the credit into the child. Every record string is escaped at the shelf boundary.

**Gate `commons`:** the share card is deterministic in the record and its quote matches the sealed turn byte-for-byte; a fixture shelf render strikes every secret; a soul named `<script>alert(1)</script>` renders inert; a fork's genesis carries the credit and none of the parent's journal.

### Phase 9 — The Long Toll *(MDQ only)*

One tier table drives every ceiling: images, music, mints, reels, sittings, dispatches, per tier. The taste (six turns) is unchanged. Watchtower counters move to durable storage with atomic increments; a restart forgets nothing. The figures ship as configuration for the founder to set — the directive names the tier, not the price.

**Gate `longToll` (MDQ chain):** ceilings read from the table and differ by tier; a simulated restart preserves the day's counts against a mock store; the taste still pours exactly six; the keyless fork's suite contains no reference to money.

### Phase 10 — The Binding *(both trees; release)*

The wiki gains the saga view — volumes on a shelf, souls threading through them. What the Ravens Bring surfaces in the opening flow. The documentation sweep lands: CLAWS.md gains the nine laws; every *prove* becomes *keeps*; this directive ships unedited in `docs/directives/EXPERIENCE-DIRECTIVE-V.md`, in the tradition of the second proof. Versions: FateScript **1.2.0 — "The Long Road"**; MyDungeon.Quest **0.6.0 — Saga Cut**.

**Gate `longRoad`:** an end-to-end fixture — two volumes, one thirty-day absence, one season, one second sitting — replays with cards, graph, memoirs, and recap byte-identical; the full suite is green.

**The trees meet at sixty-eight.** FateScript: 58 + `hearth`, `saga`, `longMemory`, `ravens`, `sharedSky`, `sitting`, `warden`, `choir`, `commons`, `longRoad` = 68. MyDungeon.Quest: 57 + the same ten + `longToll` = 68. If a phase must split a gate, the count may exceed sixty-eight; it may never fall short.

---

## Constraints

- **Protected modules:** `server/dm.js` core; `protocol.js` (additive-only — and this cut touches it not at all); `seal.js`; `rules.js`; the Audio Director interlock; Foundry cache keys (additive components only); the Chronicler's three laws (memoirs, recaps, and shelf text are all bound by them).
- **PASS only grows.** Evals are append-only. The one forbidden move remains forbidden: no gate is weakened, reordered, or deleted to get green.
- **Keyless first.** Every gate above passes with zero keys — mock vault, fixture seasons, template memoirs, deterministic wardens, ensemble voices, poster reels. The Floor holds under every new law.
- **One phase per checkpoint.** Recon exact anchors first; anchored patches with uniqueness asserts; `node --check` for non-JSX, `npx vite build` for JSX; run the phase's gate, then its neighbors, then `npm run check`.
- **App.jsx gains hooks, never logic.** Every new behavior lands in its own module — `hearth.js`, `saga.js`, `memoir.js`, `ravens.js`, `warden.js`, `direction.js`, `shareCard.js` — and App.jsx receives only the call sites. The hub stops growing with this cut.
- **Ports between trees:** brand-neutral files copy; any file bearing FateScript branding patches in place. House-only phases (the shelf, the toll, dispatches, the live season feed) do not port to the engine; the engine ships their flags and mocks.
- **Media parameters of this cut** (adjustable, never hardcoded at call sites): absence batches cap 6; mints per tale 6; reels per act 2; sky note ≤ 200 chars; saga pack budget 9,000. Existing caps stand: images 80, music 8, tick budget 4.

---

## The road beyond

Charted for future cuts, not begun in this one: **The Table** — guests at a patron's tale, watching live, whispering suggestions the player may take up; **The Audiobook** — the sealed record read verbatim, chaptered, in the tale's own voices; **The Living Atlas** — region plates stitched into a world map that fills in as it is walked. This cut clears most of Directive IV's remaining road — the memoirs are the graph-fed Chronicler, the Choir is Tenor's second half, the Sitting and the Warden take their long-promised posts, the Commons is the Share Layer, and the reels put the video pipeline on the table at last.

Build well. The suite is watching.
