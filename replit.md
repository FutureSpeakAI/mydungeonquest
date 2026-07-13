# MyDungeon.Quest

An AI-narrated solo tabletop RPG: a Dungeon Master model runs a persistent, locally-stored fantasy campaign for one player, complete with dice rolls, combat, cinematics, and generated art/audio.

## Run & Operate

- `pnpm --filter @workspace/mydungeon-quest run dev` — run the game (Vite dev server + Express API, both on the artifact's routed port)
- `pnpm --filter @workspace/mydungeon-quest run build` — production build (outputs to `artifacts/mydungeon-quest/dist`)
- `pnpm --filter @workspace/mydungeon-quest run eval` — headless bench: validates DM protocol, reducers, canon integrity, PG-13 scrubber, budget caps, seal/tamper invariants. Keep this green.
- `pnpm --filter @workspace/api-server run dev` — run the (separate, unrelated) API server template artifact
- Required secrets: `ANTHROPIC_API_KEY` (real AI Dungeon Master; falls back to a deterministic mock without it), `OPENAI_API_KEY` (real illustration art via the Paint provider), `ELEVENLABS_API_KEY` (voice/music/SFX)
- Provider selection env vars (shared, non-secret): `PAINT_PROVIDER=openai`, `SPEAK_PROVIDER=elevenlabs`, `MUSIC_PROVIDER=elevenlabs`, `SFX_PROVIDER=elevenlabs`, `DM_MODEL`/`DM_MODEL_GENESIS`/`DM_MODEL_UTILITY` (Anthropic model ids)

## Stack

- React 19 + Vite 7, plain JS/JSX (not TypeScript by design)
- Express 5 server (`artifacts/mydungeon-quest/server/`) serving `/api/*` (DM turns, image/voice/music/sfx generation, PDF character sheet binding via Playwright) and, in production, the built static app
- Client-side persistence via Dexie/IndexedDB — no shared Postgres database, fully local-first
- Anthropic Claude (tool-calling) for the Dungeon Master; OpenAI for illustrations; ElevenLabs for voice/music/SFX; video generation is intentionally mocked (no real provider wired)

## Where things live

- `artifacts/mydungeon-quest/` — the whole game (imported wholesale from an external build, not scaffolded from a template)
  - `src/` — React app; `server/` — Express API + adapters; `scripts/dev.mjs` — dev process orchestration; `evals/` — headless bench suite
  - `GAME_NOTES.md`, `BUILD_STATUS.md`, `CHANGELOG.md`, `NOTICE.md`, `README.md` — the game's own original docs, preserved as-is
- `artifacts/api-server/`, `artifacts/mockup-sandbox/` — unrelated template artifacts, not part of the game

## Architecture decisions

- This artifact was imported wholesale from a finished external build rather than adapted to the repo's usual OpenAPI/shared-backend/Postgres conventions — it intentionally keeps its own self-contained Express server and IndexedDB storage.
- Dev mode runs two processes: Vite owns the artifact's single externally-routed port; the game's own Express server runs on an internal-only port (`INTERNAL_API_PORT`, default 3001) and is reached via Vite's `/api` proxy. Production instead builds static assets and lets Express serve everything on the routed port directly.
- Added `@vitejs/plugin-react` (absent from the original project) because Vite 7's default esbuild JSX transform is not "automatic" without it, which broke JSX at runtime ("React is not defined").
- Extended the Anthropic tool JSON schema in `server/dm.js` with the same enums the client-side validator (`src/lib/protocol.js`) already enforces (roll kinds, dice, advantage, cinematic types, combat ops, zones, image cue kinds, time units). Without these, newer Claude models produced structurally valid but semantically out-of-range values that the strict validator rejected, silently falling back to mock narration on every turn.

## Product

- Forge a new world (campaign), play through DM-narrated turns with dice rolls and combat, receive cinematic story beats and generated illustrations, and export/print a character sheet as PDF. Everything is stored locally in the browser; there is no server-side account system.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Real Anthropic/OpenAI/ElevenLabs calls require the corresponding secret to be set — without it, the game gracefully falls back to mock providers rather than failing.
- PDF character sheet export (`/api/bind-pdf`) needs a Playwright Chromium binary (`npx playwright install chromium` inside `artifacts/mydungeon-quest`).
- Anthropic model ids change frequently; if the DM starts silently falling back to mock/fallback narration, check `DM_MODEL`/`DM_MODEL_GENESIS` against `GET /v1/models` for currently valid ids.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- The game's original documentation is preserved at `artifacts/mydungeon-quest/GAME_NOTES.md`, `BUILD_STATUS.md`, `README.md`
