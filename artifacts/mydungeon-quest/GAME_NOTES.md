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
- THE CASTING LAW: every soul is cast into its voice once, at first introduction, by reading its card; the choice persists on the cast card (`voiceId`). Souls from before the law keep their legacy name-hash voice — nobody is recast mid-tale.
- THE DEAD DO NOT SPEAK: cast status is an enum (`active|dead|missing`); dialogue attributed to a soul dead in the pre-turn snapshot invalidates the whole `dm_turn` (dying words in the killing turn are lawful). Death is permanent — resurrection retcons are refused.
- THE SEALED ENDING: tales end. Arriving at the final beat is not completing — the epilogue beat must be played (advancing while already on it completes). "Seal the Tale" records a request in the codex that steers the DM into a short, quiet, combat-free denouement via [STORY] directives, completing on its final turn even across `story:null` turns. A completed tale retires the composer; the Sealing ceremony appends one final `sealing` journal event whose counts the verifier can audit.
- Never expose provider keys to the client.
- Keep `npm run build` and `npm run eval` green.

## THE CHRONICLER'S LAWS (the Experience Cut, Phase 3)
Retelling is exactly the kind of work a model will embellish, so the reteller lives in its own smaller harness (`/api/retell`, one forced `chronicle_passage` tool call) under three laws the shared validator enforces in every court — client, server repair path, and the proving ground:
1. **It may not invent.** Every passage cites the sealed turn range it retells; every name it uses must exist in the codex.
2. **It may not contradict.** Dice appear only as margin marginalia with exact sealed totals; the dead are not quoted after the turn that killed them (dying words in the killing turn are honored, as at the table).
3. **It may only retell.** Quoted speech is declared and verbatim from the sealed record; digits stay out of the prose — numbers are written out, or the die speaks from the margin.
When a chapter closes, the Chronicler writes the "tale so far" page and it is countersigned into the journal (`chronicle_page` event) exactly as written — so by the Sealing, most of the book already exists. Keyless, or twice unlawful, the harness declines honestly: **no mock prose is ever sealed** — a placeholder retelling under a wax stamp would be a forgery. The storybook binds the raw sealed text instead; the book always exists. Redacted turns never reach the Chronicler — not their words, not their deaths.
