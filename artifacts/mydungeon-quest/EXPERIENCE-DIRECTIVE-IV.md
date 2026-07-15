# EXPERIENCE-DIRECTIVE IV — THE LIVING WORLD CUT

The engine tells true stories and the Audience Cut gives them an audience. This cut gives the world a **memory with a shape**: one living card per soul, a knowledge graph built lawfully from the sealed journal, a Codex that reads like a wiki of the player's own world, voices that can never mistake a mother for a man, and a forge with three doors for every kind of player. EXPERIENCE-DIRECTIVE.md and III remain law beneath this one.

## Design position, stated once
We do not adopt Microsoft GraphRAG's extraction pipeline, and we do not add Python, embeddings, or any indexing dependency. GraphRAG extracts structure from unstructured prose; our facts are **already structured** — every truth of the world enters through a validated op in the sealed journal. Extraction would be probabilistic recovery of deterministic data and would break provenance. What we adopt is its **query shape** (local entity-neighborhood context, global community summaries) and the Karpathy LLM-Wiki **page discipline** (one living page per entity, merge never duplicate, backlinks, provenance on every claim). The graph is a deterministic reducer over the journal. The model proposes ops; only ops move the graph.

## Law amendments (sync GAME_NOTES.md and READMEs in the same change)
1. **The Card Law.** Every soul — the hero included — has exactly one Character Card. Its identity block (name, role, written canon, voice card, anchor hash, distinguishing mark) locks at first introduction under Canon Lock. Its state, ties, and chronicle change only when validated ops land. No system may read gender, age, or any identity fact from prose inference when a card field exists.
2. **The Tenor Law (voice half, hotfixed in Phase 0).** Voice selection keys on explicit card fields, never regex over canon. A soul with a cast `voiceId` keeps it forever (Cast Law holds); the dead do not speak.
3. **The Graph Law.** ChronicleGraph is derived state: rebuildable from the journal alone, byte-identical on replay. Its state hash is sealed with each chapter. The model never writes a node or edge directly.
4. **Surfaces speak story.** Cards render as story ("Voice: a warm elder woman"), never as machinery ("gender: F, bin 3"). Banned words from prior law still apply.

## Phase 0 — The Voice Hotfix (ship first, alone)
**Protocol (additive):** `story.cast_add` and `cast_update` gain an optional `voice` object: `{ gender: 'feminine'|'masculine'|'neutral', age: 'child'|'young'|'adult'|'elder', timbre: <one free word> }`. The system prompt instructs the DM to ALWAYS write it for speaking souls; the validator accepts its absence (older saves) but rejects malformed values.
**Hero identity:** the Hero Forge gains a presentation field (feminine / masculine / neutral, with a free pronoun line), stored on the hero and passed to `castHeroVoice`.
**Casting rewrite (`src/lib/cinema/casting.js`):** a curated typed roster — real ElevenLabs voice IDs binned by gender × age, at least two per bin, each with a written timbre note. Selection order: (1) explicit card fields; (2) role-lexicon prior applied ONLY to the soul's own name and role string (mother, queen, sister, daughter, widow → feminine; father, king, brother, son → masculine), never to the full canon prose; (3) the neutral bin, deterministic by name hash. The prose-regex inference is deleted. Souls already carrying a `voiceId` are grandfathered and never recast; replays of sealed turns keep their voices.
**Gate `tenor.test.mjs`:** a fixture card "Mira, her mother, a widow who lost her son to the king's war" casts feminine; a hero with bearing "a scarred knight" and presentation feminine casts feminine; a card with explicit voice fields overrides all priors; a dead soul draws no voice; a legacy soul's stored voiceId is unchanged; the deleted regex path is asserted absent.

## Phase 1 — The Character Card
One card per soul, hero included, stored in the codex and synced by the vault:
- **identity** (locked at introduction): name, role, canon text, voice card, anchorHash, mark.
- **state** (mutable by ops only): status (alive/dead/missing), whereabouts (region ref), condition, bond score, goals with progress notches.
- **chronicle**: an append-only list of journal turn refs that touched this soul, each with a five-word gloss.
- **ties**: typed, weighted edges to other cards — kin, ally, enemy, debt, oath, secret-known, romance — each edge citing the journal ref that created or last changed it.
Cards are produced by a pure reducer (`src/lib/cards.js`) replaying validated story/state ops; rebuilding from the journal must be byte-identical (that determinism is the gate). Region cards get the same treatment with their own fields.
**Gate `cards.test.mjs`:** replay determinism; identity immutability after intro; a cast_update moves state but never identity; every tie cites a real journal ref; the hero has a card by end of the forge.

## Phase 2 — ChronicleGraph and the Context Pack
Edges plus cards form the graph. Two query shapes, both deterministic:
- **Local (every turn):** the [STORY] block is rebuilt as a context pack — souls present in the scene, their 1-hop ties, open threads that reference them, and the region card — assembled under a hard token budget with priority order scene > kin/enemy ties > threads > world. This replaces flat codex dumps and is what keeps hundred-turn tales coherent without growing the prompt.
- **Global (per chapter):** at each chapter seal, the Chronicler writes a one-paragraph community summary per connected cluster of cards (verbatim-quote court applies); summaries are cached on the chapter and feed act recaps and the DM's [MEMORY] for long tales.
**Gate `graph.test.mjs`:** pack respects budget and priority; a soul off-scene with no tie to the scene never enters the pack; graph hash is stable across replay and rides the chapter seal; summaries quote only sealed words.

## Phase 3 — The Living Wiki (the Codex, reborn)
Every card renders as a wiki page: portrait (anchored), canon, voice line in story words, fate line, ties as tappable backlinks, and an appearances timeline linking straight into the tale's moments. Region and thread pages likewise. Pages update the moment ops land; nothing is ever duplicated; a contradiction between ops is impossible by construction, so the lint the wiki pattern needs is already the validator. The storybook's dramatis personae reads from cards (portrait, fate, first and last sealed words).
**Gate `wiki.test.mjs`:** every rendered claim carries a journal ref; backlinks resolve both directions; a dead soul's page shows its fate and stops accruing appearances.

## Phase 4 — The Living World (offscreen ticks)
On each chapter seal (and on `time_advance`), every major NPC card with an active goal advances it one bounded step: a constrained DM call ("advance this goal one step, twenty words or fewer") whose output is validated ops only, and which may not kill a soul onscreen, contradict canon, or spend player resources. Results land as world ops, so the graph, the wiki, and the next chapter's context pack all inherit them. Budget: at most N souls per seal (default 4), watchtower-countable. The villain's design clock is generalized, not duplicated.
**Gate `livingWorld.test.mjs`:** ticks produce only validated ops; forbidden effects are rejected; a tale replayed without ticks still seals identically (ticks are ops in the journal, not hidden state).

## Phase 5 — The Two-Speed Forge
**World, three doors:** *Spin the World* (one sentence or nothing; covenant, tone, spine, and naming style rolled and shown for one-tap acceptance) · *The Oracle* (three questions: what kind of place, what's wrong with it, what do you hope to find) · *Deep Forge* (covenant editor, factions, pantheon, lines & veils, style bible, seed cast).
**Hero, three doors:** *Cast the Bones* (full random, including presentation and voice) · *The Oracle* (three questions to a sheet) · *Forge by Hand* (stats, background, presentation and pronouns, distinguishing mark, voice audition: three samples spoken aloud, one blessed).
Every field in every door wears a small dice glyph for single-field rerolls. Both forges end at the Sitting: bless the portrait, bless the voice. Time to first turn through the fast doors: under sixty seconds.
**Gate `forge.test.mjs`:** each door produces a complete lawful campaign/hero; fast doors never block on optional fields; the blessed voice is the cast voice; per-field reroll changes only its field.

## Phase 6 — Graph-Fed Chronicler and Keepsakes
Act retellings and the finale consume community summaries plus card fates; the Audiobook and Episode pull speaker voice cards from the cards themselves; the book's dramatis is card-driven end to end.
**Gate:** extend `chronicler.test.mjs` and `storybook.test.mjs` — retellings cite summaries that exist; dramatis fates match card state at seal.

## Constraints
Protected as ever: `server/dm.js` core, `protocol.js` (additive fields only), `seal.js`, `rules.js`, the Audio Director interlock, Foundry cache keys, the Chronicler's three laws. No Python, no GraphRAG dependency, no embedding service; the graph is a reducer. Evals are append-only and the PASS count only grows. Keyless first: every phase's gate runs with zero keys. One phase per checkpoint, in order; `npm run check` green at every close. Phase 0 may ship alone and immediately.
