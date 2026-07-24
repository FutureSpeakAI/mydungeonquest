---
name: MyDungeon muster roll
description: Where the feature muster lives, how to add a row, and how to read its exit code.
---

The muster roll is `tools/muster/features.mjs` at the MONOREPO ROOT (runner `pnpm run muster`; doc `pnpm run muster -- --write-doc` regenerates root `docs/FEATURES.md` — the doc is GENERATED, never hand-edit it). LOOP_LOG prose like "the muster gains the X row" means a row in features.mjs.

**Why this is easy to lose:** nothing under artifacts/mydungeon-quest matches "muster" — searching the game tree finds only prose mentions. Go to the repo root.

**How to apply:** new feature → add a row (id / category / tier / name / detail, plus `probes` or `contract`+`wiring` arrays of `{file}` / `{src, needle}` / `{grep, needle}` / `{mod, check}`); probes may be added or strengthened, NEVER weakened to make a row pass. Then run the roll call and regenerate the doc in the same change.

**Exit-code law:** `pnpm run muster` exits 1 while ANY feature is pending wiring ("the muster is short — pending features are the work order") — that posture is by design and predates you. The real alarm is `regressed > 0` (a wired row's probe failing). Do not "fix" the exit code, and do not mistake it for your own regression.
