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

## v0.2.0 — The Engine Cut (2026-07-13)
- DM conversation memory: rolling history in every call; static per-campaign
  system prompt with narrative craft and session-zero orchestration; prompt
  cache breakpoints that actually hold.
- Real streaming narration end to end (Anthropic partial tool-JSON → SSE →
  weaving render), with mock-mode streaming parity for keyless testing.
- Foundry v2: three independent lanes, explicit cache keys, race-safe cache,
  beat lookahead briefing film/still/stinger for the next beat.
- Cinematic v2: Film → Animatic → procedural ladder consuming Foundry assets;
  generated stinger or score swell; cast-voiced dialogue line.
- Live video adapters: OpenAI Sora and Replicate, safe mock degradation.
- Adaptive WebAudio score engine and deterministic per-soul voice casting,
  with Settings toggles.
- Player-facing chrome de-teched (no hashes, providers, or protocol words on
  screen); `verify.html`, the colophon, and the journal keep full precision.
- `npm run check` green: build + 90/90 bench + new engine assertions
  (static prompt, partial-JSON extraction, streaming parity).

### Still deliberately open (visual phases → HANDOFF-REPLIT.md)
- Prologue Render, image-first table, title-screen key art, card covers,
  wax-seal animation, storybook film-strip spread.
- Chronicler utility-model compaction remains fallback-only.
- SRD action catalog remains a foundation, not a compendium.

## v0.2.1 — The Anchor Law (2026-07-13)
- Reference conditioning end to end: souls anchor to their first bust, regions
  to their first plate; anchors resolve lazily by label at generation time and
  ride to providers (gpt-image-1 edits, Sora input_reference, Replicate
  image input) with mock parity for keyless proof.
- Degraded regions now repaint on state change, anchored to the original
  plate — the land sickens without moving.
- Deterministic name-hash seeds on portraits and plates for seed-honoring
  providers.
- Anchor hashes sealed into media attestations and stored on media rows
  (`referenceAssetHashes`) — the book can prove which reference produced
  which image.


## v0.3.0 — Cinematic Edition (2026-07-13)
Visual phases delivered on the v0.2.1 Anchor Law engine ("film poster, not book
page"). Engine files (dm/foundry/lookahead/score/voice/systemPrompt/protocol/
seal/story/rules/canonical) untouched; all work confined to the presentation
layer (App.jsx, components, cinema/prompts, storybook, styles, prologue).

- Phase 1 — Prologue Render: world key art + hero bust anchor painted and
  sealed before Chapter I; live paint previews in both forges.
- Phase 3 — Image-first table: full-bleed illustration panels, region-strip
  parallax that darkens with blight, soul/region gallery in the Codex.
- Phase 5 — The Living Seal: nav "book" replaced with a wax-seal glyph that
  pulses (re-embosses) whenever the chronicle head hash advances.
- Phase 6 — The Face: title screen is full-bleed Ken-Burns key art with an
  attract mode; chronicle cards wear their own key-art covers.
- Phase 7 — The Bound Chronicle: storybook renders in an iframe with embedded
  book fonts, a key-art cover, and "The Reel" film-strip of paint keyframes.
- Default media tier is now `illuminated` (stills) so new campaigns open
  cinematic-first; `parchment` stays user-selectable.

### Fixes this cut
- Routing: the api-server artifact was claiming `/api` at the shared proxy and
  shadowing the game's own `/api/*` (dm/paint/video). api-server repathed to
  `/_apiserver` so the game (served at `/`) owns `/api` via its vite proxy.
- Seal transaction: appendEvent (seal.js) awaits crypto.subtle *inside* a Dexie
  rw transaction, which real IndexedDB premature-commits ("Transaction
  committed too early") once a rich tier fires several attestations around a
  turn. App.jsx now seals via a serialized wrapper that rebuilds the identical
  record through the engine's exported makeEnvelope, running all crypto OUTSIDE
  the transaction and writing only sync Dexie ops inside.
- Forge portrait: portraitPrompt read `campaign.codex.arc` unguarded and threw
  for the World-forge draft (no codex), silently killing the Hero-forge live
  portrait; now null-safe like keyArtPrompt.

### Media + DM providers (real, auto-selected)
- Providers now auto-select the best *configured* option per kind via ordered
  fallback chains ending in mock (no need to set `*_PROVIDER`):
  - paint: **Gemini** (`gemini-2.5-flash-image`) → OpenAI → mock
  - video: **Gemini/Veo** (`veo-3.1-fast-generate-preview`) → OpenAI (Sora) → mock
  - voice/music/sfx: **ElevenLabs** → (voice: OpenAI) → mock
  - DM: **Anthropic** → OpenAI (same tool schema + validator) → safe fallback
- A per-kind `*_PROVIDER` env still FORCES one provider (chain becomes
  `[forced, mock]`); leave unset to keep the full chain, or set `=mock` to force
  placeholders. `DM_FALLBACK=off` disables the OpenAI DM fallback.
- Every non-mock provider attempt is bounded by a per-kind wall-clock budget
  (`runChain`), so a stalled upstream call degrades to the next provider / mock
  instead of hanging; Gemini fetches also carry abort timeouts.
- Verified live end-to-end: Gemini paint (PNG) + Veo video (mp4), ElevenLabs
  voice + music (mp3), Anthropic DM. Keyless `npm run check` stays green (no
  keys → all mock; eval asserts DM provider === 'mock').

## The Brand Cut (2026-07-15)
- New landing (`public/welcome.html`): full-bleed rotating reel with Ken Burns
  and ember layer (keyart fallback, `public/reel/manifest.json` when shot),
  foil display type (Cinzel 900 + Cinzel Decorative + Cormorant Italic),
  selling copy, guided CTAs, quiet seats, reduced-motion honored.
- The mark: the Icosahedron Rose (`public/brand/mark.svg`) + simplified
  `public/icon.svg` favicon/app icon.
- `HOUSE_STYLE` exported as a brand asset; `npm run brand-shoot` generates the
  20-frame reel through the live paint adapter (refuses on mock).
- The Quiet Record begins: service worker retired (web app, not installable),
  the storybook colophon speaks human, the notary's desk is unlisted (file and
  its eval stand; no player-facing road leads there).
- Brand tokens in `styles.css` (`--ember`, `.foil`, display scale, `.voice-italic`);
  BRAND.md at the repo root; superseded directives archived to `docs/archive/`;
  EXPERIENCE-DIRECTIVE-III (The Audience Cut) added as the next program.
- Integration notes (landed by this house, diverging from the cut where law
  required): the retired service worker is *served as a self-destructor*
  rather than deleted — a missing file leaves already-installed workers
  pinned to stale caches; and `brand-shoot` walks the Watchtower's toll gate
  (per-frame `spendAllowed` check, a mark on the tally per frame, stands down
  at the ceiling) and refuses to write a manifest for a short reel unless
  `ALLOW_PARTIAL_REEL=1` — the landing keeps its keyart fallback instead.

