# MyDungeon.Quest — Cinematic Edition

A sovereign, local-first solo RPG PWA. The model narrates. The client owns mechanics, canon, memory, media prompts, and the cryptographic record.

## Run it

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. With no keys, the app uses a deterministic mock Dungeon Master and procedural/mock media, so the entire product is playable and testable offline after installation.

```bash
npm run build
npm run eval
npm start
```

Production serves `dist/` and the API from Express on `0.0.0.0:$PORT`.

## Deploy on Replit

1. Push this folder to a GitHub repository.
2. In Replit, import the repository from GitHub.
3. Add any provider keys as Replit deployment secrets, never as client variables.
4. Use an Autoscale or Reserved VM deployment.
5. Build command: `npm ci && npm run build`
6. Run command: `npm start`
7. The included `.replit` maps local port `3001` to external port `80`.
8. For PDF binding, run `npx playwright install chromium` in the deployment image/build environment.

The app remains useful when no provider is configured. `auto` provider selection degrades to deterministic mocks.

## Architecture

```text
React PWA
  ├─ client-owned rules and story reducers
  ├─ Dexie / IndexedDB campaigns, journal, memory, media, keys
  ├─ deterministic canon → prompt assembly + PG-13 scrubber
  ├─ Foundry queue and procedural cinema floor
  └─ append-only event ledger
        ├─ turn
        ├─ resolution
        ├─ media_attestation
        ├─ redaction
        └─ fork

Express
  ├─ forced-tool DM proxy / deterministic mock
  ├─ image, video, voice, music, and SFX adapter boundary
  ├─ owned-byte normalization
  └─ Playwright storybook PDF binding
```

## The important invariant

A generated asset never mutates a signed turn. The turn commits a media intent; delivery appends a `media_attestation` event. An X-card similarly appends a redaction event rather than deleting history. The visible story is mutable by player consent; the audit trail is not.

## Provider configuration

Copy `.env.example` to `.env`. `ANTHROPIC_API_KEY` enables live DM turns. OpenAI and ElevenLabs adapters are included for image, voice, music, and SFX paths. Video defaults to the mock keyframe adapter while preserving the async job contract.

Never prefix server secrets with `VITE_`.

## Chronicle verification

Export a `.chronicle.json`, open `/verify.html`, and select the file. The verifier runs fully offline and recomputes every record hash, link, and available Ed25519 signature. Altering a past player line, roll, state, story update, or media attestation turns the audit red.

## Storybook

The Codex can bind the current chronicle into self-contained illuminated HTML. Server-side PDF uses Playwright Chromium and forbids external resources during rendering.

## Development laws

- The client computes every player mechanic.
- Model output is untrusted until the full `dm_turn` validates.
- Canon is written once and prompt assembly is deterministic.
- Generated media upgrades the procedural floor; it never blocks play.
- The journal is append-only.
- There are no accounts or telemetry.

## License and SRD notice

See `NOTICE.md`. The application code is provided as a build foundation for the repository owner to license before public distribution.
