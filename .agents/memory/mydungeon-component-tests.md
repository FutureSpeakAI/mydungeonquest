---
name: MyDungeon.Quest component tests in the pure-node eval harness
description: How to render/test React components (onError fallbacks etc.) in MyDungeon.Quest's node eval harness with no bundler, jsdom, or AI keys.
---

# Testing React components in the keyless node eval harness

The MyDungeon.Quest eval harness (`evals/run.mjs`, `npm run eval`) is plain
`node` — no bundler, no jsdom, no DOM. To render real components (e.g. assert a
`<video>` `onError` falls back to a keyframe) inside it:

- **JSX transform**: plain `node` cannot import `.jsx`. Register an ESM load
  hook that runs esbuild `transform` with `jsx: 'automatic'` (the app components
  never `import React`, matching @vitejs/plugin-react). Register it *before*
  dynamically importing any `.jsx`.
- **Renderer**: `react-test-renderer` works with React 19 (prints a deprecation
  warning — harmless). Set `globalThis.IS_REACT_ACT_ENVIRONMENT = true` and wrap
  create / onError / effect-flush in `act`.
- **IndexedDB**: components that read Dexie need `import 'fake-indexeddb/auto'`
  as the **first** import, before anything touches `db.js`. Because run.mjs (and
  its graph) may open Dexie first, run component tests as a **separate node
  process** (chained in the `eval` script), not appended to run.mjs.
- **Object URLs**: stub `URL.createObjectURL`. Blobs round-tripped through
  IndexedDB come back as *new* object identities, so key the stub on
  `blob.type` (survives structured clone), not identity, to match a stored blob
  to its URL.
- Keep running the harness with AI keys unset (see mydungeon-quest-eval.md) or
  run.mjs's `provider === 'mock'` assertion fails before your tests run.

**Why:** these five gotchas each cost a failed run to discover; a future agent
adding component/UI tests here will hit the same wall without them.
