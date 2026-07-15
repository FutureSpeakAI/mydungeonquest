# CONTRIBUTING — How Work Lands Here

This repository is built largely by agents working from written directives, and the conventions below are what keep that safe. They apply to everyone — human or agent. Read [`docs/CLAWS.md`](docs/CLAWS.md) first; the laws are the spec.

## The suite is the truth

```bash
pnpm install
pnpm run check        # engine gates, then the game suite — keyless, no network
```

Sixty-five gates. **PASS only grows.** Evals are append-only: a gate may gain assertions, it may never lose them, and fixing a live failure by loosening a validator or deleting a test is the one forbidden move. If your change is right and a gate is wrong, that is an amendment — see below — not an edit-in-passing.

**Keyless first.** Every gate passes with zero keys and zero network. If a test needs a secret to go green, the test is wrong; write the mock. CI enforces this by simply not having any secrets.

## One phase per checkpoint

Work in the smallest complete unit that leaves the suite green:

1. **Recon before surgery.** Read the exact code you'll touch; take exact anchors. No patch is written against a remembered file.
2. **Anchored patches.** Edits target unique strings; a patch that could land twice is rejected before it's tried.
3. **Prove the syntax.** `node --check` for plain modules; the Vite build for JSX.
4. **Prove the behavior.** Run the gate you changed, then its neighbors, then `pnpm run check`.

## Protected modules

Some code is settled law. Touch these only under an explicit directive, and even then within their standing constraints:

- `server/dm.js` **core** — the repair loop and the One Door.
- `fatescript/protocol` — **additive-only**, and schema, prompt, and validator move in lockstep or not at all.
- `src/lib/seal.js` — the Quiet Record. Its language may be reframed; its mechanics may not.
- `fatescript/rules` — the dice do not renegotiate.
- The **Audio Director interlock** — every non-narration sound passes through the single throat.
- **Foundry cache keys** — additive components only; existing keys never change meaning.
- **The Chronicler's three laws** — no invention, no contradiction, retelling only. Annals, recaps, and shelf text are all bound by them.

And one rule of growth: **`App.jsx` gains hooks, never logic.** New behavior lands in its own module with its own gate; the hub receives only the call sites.

## Adding a gate

1. Fixtures first — deterministic, keyless, in `evals/fixtures.mjs` or inline.
2. Assert behavior, not implementation; assert the *refusals* too (what must fail, fails).
3. End with the house line: `PASS — the <name> gate: <what it held>`.
4. Chain it into the package's `eval` script, run its neighbors, run the full check.

## Adding or amending a law

A law is three parts landed in one change: the **statement** (row in `docs/CLAWS.md`), the **enforcement** (named module), and the **gate**. Amendments are stated plainly in the CLAWS amendment log, never weaken an existing gate, and synchronize every document they touch — README, ARCHITECTURE, GLOSSARY — in the same commit. If the docs and the code disagree, that is a failing state even when the suite is green.

## The house voice

Repo artifacts — directives, law tables, gate PASS lines, changelog entries — are written in the house voice: laws are named and capitalized, prose is plain but not beige. Match the room.
