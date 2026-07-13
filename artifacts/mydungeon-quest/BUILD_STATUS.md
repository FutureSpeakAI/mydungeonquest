# Build status

## Delivered vertical slice
- Playable title → world forge → hero forge → adventure table flow.
- Deterministic keyless Dungeon Master and media mocks.
- Client-authoritative roll resolution and reducers.
- Story spine, cast canon, region state, blight, and role deadlines.
- Procedural cinematic floor with generated-media upgrade queue.
- IndexedDB persistence, sealed journal, redaction, export/import, and fork semantics.
- Offline verification page and illuminated HTML/PDF storybook path.
- Mock headless bench and GitHub Actions workflow.

## Deliberate limitations of 0.1.0
- Commercial video providers remain behind the adapter boundary; the default video adapter produces a deterministic cinematic keyframe and the UI uses its procedural animatic.
- Anthropic live mode is implemented, but the UI uses completed tool payloads rather than reconstructing arbitrary partial JSON from upstream fine-grained tool deltas.
- The SRD-compatible action catalog is a foundation rather than an exhaustive spell and monster compendium.
- Playwright Chromium must be installed in the deployment image for server-side PDF binding; offline HTML binding always works.

## Next engineering tranche
- Full action catalog and attack/damage resolution handshake.
- Native live adapters for selected image/video providers with reference conditioning.
- Chronicler utility-model compaction and richer world ticks.
- End-to-end browser tests for installation, restore, tamper audit, and PDF binding.

## Verification evidence — 2026-07-13
- `npm run build`: PASS
- `npm run eval`: PASS — 90/90 schema-valid turns across five personas; 30 client rolls; 15 cinematics
- Production Express boot on `0.0.0.0:3001`: PASS
- `/api/health`, mock image bytes, async mock video polling, and video asset retrieval: PASS
- `/api/bind-pdf` with system Chromium: PASS — valid PDF 1.4 output
