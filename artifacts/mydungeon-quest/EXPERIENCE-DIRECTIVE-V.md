# EXPERIENCE DIRECTIVE V — The Hooked World (0.6.0)

Four questions from the founder, answered as law. Every law below has an
enforcement point in deterministic code and a gate in `evals/`. The suite
grows from 58 to 65, and by amendment law it may only grow.

## Q1. What should the knowledge wiki track, with a graph for relationships?

The wiki tracks four node kinds, and every node and edge derives from sealed
operations. Nothing in the graph is guessed from prose.

**Souls** (existing, 1.1.0): one Character Card per soul, built by a pure
reducer; ties of kin, enemy, ally, and met, each citing its forging turn.

**Places** (new): one page per region, derived by replaying `region_add`
operations — name, appearance canon, state, the turn it entered the tale,
and the words that carried it in. Presence edges (who is AT a place) are
deliberately absent this cut: no sealed operation states location today,
and the Atlas does not infer. A lawful scene operation is roadmap work.

**Stated allegiances** (new): a deterministic lexicon reads each soul's
written role and station for the pattern "of the X" ("envoy of the Duchy")
and records an allegiance edge with provenance `station`, cited to the
introducing turn. Stated text only; never inference.

**Threads** (new, the narrative debt ledger): see Q1a. Threads are the
graph's forward edges — what the tale still owes.

### Q1a. The economy question, answered honestly

The engine tracks no coin, and this cut does not invent a currency reducer.
The economy that keeps a *story* consistent is the economy of obligation:
promises, debts, mysteries, and sworn goals. So 0.6.0 adds the THREAD
LEDGER as additive protocol: `story.thread_add {label, kind, holder}` and
`story.thread_resolve {label, outcome}`, where kind is one of promise,
debt, mystery, goal, and outcome is one of kept, broken, resolved. The
validator enforces: labels 3–90 chars, at most two adds per turn, no
duplicate open label, resolve only what is open. The reducer folds them
into `codex.threads` with opened/closed turns. A coin-and-barter reducer
is future rules-cut work and is noted in the roadmap, not faked here.

## Q2. How is context passed to the text and image models?

**Text — THE BRIEFING LAW.** Every turn's story context is one
deterministic string, assembled in fixed order: the calendar line first
("It is Day N of the tale"), then the scene floor (souls present, in
full), the one-hop ties, the villain and his design, the OPEN THREADS
(oldest first, at most six), stated allegiances, then the slim remainder —
all under one hard byte budget. Trimming order is fixed: allegiances
first, then the slim rest, then the tied ring; the calendar, the scene
floor, the villain, and the three oldest open threads are never trimmed.
Same campaign, same bytes: the briefing is gate-tested byte-identical
across rebuilds. The model is told only sealed facts; anything absent
from the briefing is not canon and must enter through an operation.

**Image — THE VISUAL BIBLE LAW.** Every portrait and scene prompt derives
its identity clause from the Card, never from loose narration: a noun
chosen by stated presentation and age (the same register discipline as the
Tenor Law), the soul's mark verbatim, the written appearance canon, and
the anchor reference when one exists. Every scene and key-art prompt
carries the campaign's own style bible (locked at the forge), the region's
canon and state, and the blight level, so a world looks like itself from
plate one to plate forty. The clause builder is deterministic and gated:
same card, same bytes; the mark always survives; the PG scrubber still
wraps everything.

## Q3. What features should the Codex have?

The Codex is the player's reward for playing, so it reads like a living
book, not a database. This cut adds: a Day chip on the Codex header
(calendar law); THE OPEN THREADS panel ("what the tale owes"), open
threads with their kind and holder, resolved threads struck through with
their honest outcome; tappable PLACE pages for every region, showing the
painted plate, the canon, the state, the turn it entered the tale, and
the souls whose stated station names it; and the existing soul pages
(voice, cited first and last words, two-way tie chips, appearance
timeline) untouched. Everything cites its turn. Nothing is generated to
render the Codex; it is all derivation, at zero token cost.

## Q4. How should onboarding work?

THE THREE SPARKS LAW. The distance from opening the app to hearing the
first narrated sentence of YOUR OWN world must be three choices or fewer.
The world screen leads with three rolled spark cards — title, covenant
sentence, and tone, drawn deterministically from the forge pools — and
one tap adopts a spark whole. Writing your own sentence remains one field
away, and the Deep Forge remains for players who want every lever. The
hero screen offers "cast a ready hero" beside the full forge, and the
blessed-voice audition stays in both paths, because the voice is the
moment players fall in love. The quickstart route is a pure, gated
function: spark, voice, begin. Three taps, then the world speaks.

## The gates (58 → 65)

`atlas` · `threads` · `calendar` · `briefing` · `visualBible` · `spark`
· plus the Codex thread-panel derivations covered inside `threads` and
`atlas`. Each gate runs keyless. PASS count only grows.
