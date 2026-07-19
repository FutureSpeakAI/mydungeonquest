# fatescript

**The deterministic law layer for AI-governed, player-driven narratives. Give the model all of the talent and none of the authority.**

The model narrates; the client rules. FateScript is the ruling half: a zero-dependency ES module package that validates every model turn against client-owned law, applies state as refusable deltas, keeps canon and memory derived from an append-only record, and moves the world offscreen deterministically. It knows nothing of React, Express, databases, providers, or money — those are a host application's problem. MyDungeon.Quest consumes it as a workspace package; that game's keyless check — 124 green verdicts today — is the engine's end-to-end proving ground.

## The laws it enforces

- **The One Door** — a single forced `dm_turn` tool shape, validated after the fact by `validateDmTurn`: enums, budgets, entropy order, and the pre-turn cast snapshot (**the dead do not speak**).
- **Client-is-law** — dice, reducers, and canon are computed here; model output arrives as deltas the host may refuse.
- **The Chronicler's three laws** — retellings may not invent, may not contradict, may only retell; one validator serves every court.
- **The Living World** — offscreen movement as deterministic, budgeted, ops-only ticks.
- **The Graph Law** — context packs assembled from the sealed record alone, under budget, scene floor never trimmed.
- **The Saga groundwork** *(Directive V)* — sagas and legacy packets, the hearth sync client, annals, ravens, the shared sky, per-line voice direction, and share cards. Modules and gates stand; host wiring lands phase by phase.
- **The World groundwork** *(Directive VI)* — the clock, the ledger, the market, the atlas, bearing & signature, the Sitting, the Scriptorium, the Human Hand, the Census, and the Warden. Modules and gates stand; wiring lands phase by phase.
- **The table's later cuts** *(Directives VII–XIV, shelved in [docs/directives/](docs/directives/))* — presence and the standing ground, the party and the elsewhere, the honest frame, the battle cut, the writer's room, depth, breadth, and the tight door, the two hands, and the open book. The law fractions live here as engine seats; the host keeps its React, database, and provider halves.

## Install & import

Consumed today as a workspace package (`"fatescript": "workspace:*"`); npm publication remains a road for a later cut — 1.0.0 stands stable without it.

```js
import { validateDmTurn, makeEntropy } from 'fatescript/protocol';
import { buildContextPack } from 'fatescript/graph';
import { buildLegacyPacket, openNextTale } from 'fatescript/saga';
```

Every module is also re-exported from the root (`import { ... } from 'fatescript'`).

| Export | What lives there |
|---|---|
| `fatescript/protocol` | `validateDmTurn`, `makeEntropy` — the final word on every turn |
| `fatescript/rules`, `/story` | dice, resolution, reducers, canon |
| `fatescript/cards`, `/graph` | soul cards and record-derived memory packs |
| `fatescript/livingWorld`, `/forgeRolls`, `/spines`, `/sequencing` | offscreen ticks, forging, spines, beat order |
| `fatescript/chronicler`, `/canonical`, `/wikiText` | the retelling court and its render surfaces |
| `fatescript/cinema/casting` | voice casting under the Cast Law |
| `fatescript/mockDm` | the deterministic floor |
| `fatescript/saga`, `/hearth`, `/memoir`, `/ravens`, `/sky`, `/direction`, `/shareCard` | the Saga groundwork (Directive V) |
| `fatescript/clock`, `/ledger`, `/market`, `/atlas`, `/bearing`, `/sitting`, `/scriptorium`, `/tells`, `/census`, `/warden` | the World groundwork (Directive VI) |
| `fatescript/presence`, `/table`, `/threads`, `/trove`, `/chart`, `/calendar`, `/magnifier`, `/unlettered`, `/smith`, `/onboarding`, `/forge`, `/genesis`, `/pour` | the table's later cuts (Directives VII–XIV) |
| `fatescript/room`, `fatescript/cinema/prompts` | the writer's-room law and the easel's prompt law — subpath doors only, kept off the root export deliberately |

## The gates

```bash
npm run check   # fifty-eight gates, keyless, no network, in seconds
```

Each prints its verdict in the house voice — `PASS — the saga gate: …` — and the suite only ever grows. The engine's classical behavior (protocol, rules, chronicler, living world) is additionally exercised end-to-end by the host game's keyless check (124 green verdicts) in this monorepo.

## License

MIT © 2026 FutureSpeak.AI — see [LICENSE](LICENSE). The host game and its assets are licensed separately.
