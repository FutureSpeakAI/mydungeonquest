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
- Generated media only upgrades the procedural floor — except sound: the audio floor is silence. Mock or unattested audio is refused at delivery, never played.
- THE SOUND LAW: one voice at a time; music and SFX are punctuation (short phrases at structural moments, one-shot accents in the gaps), never beds, never loops, never under a voice. All non-narration sound passes through the Audio Director. `speechSynthesis` is banned.
- Never expose provider keys to the client.
- Keep `npm run build` and `npm run eval` green.
