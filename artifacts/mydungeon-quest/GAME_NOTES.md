# MyDungeon.Quest — Cinematic Edition

## Architecture
- React/Vite PWA in `src/`
- Express ESM server in `server/`
- IndexedDB/Dexie local persistence
- Pure reducers and protocol code in `src/lib/`
- Keyless deterministic mock providers are the baseline

## Non-negotiable laws
- The client computes all mechanics.
- The journal is append-only and hash chained.
- Canon prompts are assembled client-side.
- Generated media only upgrades the procedural floor.
- Never expose provider keys to the client.
- Keep `npm run build` and `npm run eval` green.
