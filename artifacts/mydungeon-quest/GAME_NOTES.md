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

## THE STORYBOOK, SECOND BINDING (the Experience Cut, Phase 4)

One compiler (`src/lib/storybook.js`), three lives for the same HTML:

- **The page-turn reader.** A self-contained script pages the book leaf by leaf — arrows, page count, a gold progress hairline. Progressive: with no JS (or under the PDF binder's webdriver) every leaf simply flows. `prefers-reduced-motion` stills the turn.
- **The print folio.** `@page` CSS binds Letter or A5 on request; the overlay's folio toggle rebinds in place and `/api/bind-pdf` prints whichever is loaded.
- **The keepsake.** The standalone HTML carries an EMBEDDED PROOF — the hash-chained journal in the exact `mydungeon.chronicle` format the notary at `/verify.html` accepts, plus a "Save the proof" button. A shared book testifies for itself.

The model inside: cover under the wax → covenant → dramatis personae with one-line fates → one chapter per walked beat (opener plate from the journey's reel, the Chronicler's sealed retelling under an illuminated drop cap — or, honestly, the raw sealed record when no lawful page exists — dice in the margins with sealed totals, portraits at entrances) → the world's wounds → the reel → memoir → the seal page ("Sealed, and true").

Laws it keeps: every image a `data:` URI (the binder's law); redacted content never bound (windows span redacted positions so entrances aren't lost, but the words stay out); no mock prose — a pageless chapter says so and binds its sealed words. Keyless the book still exists: procedural plates, raw text, honest colophon. Evals: `evals/storybook.test.mjs`.

The door is strict: only `data:image/*;base64` plates enter — a crafted blob MIME from an imported chronicle (`data:image/png" onerror=…`) is refused at the compiler, the overlay iframe is sandboxed (`allow-scripts allow-downloads`, opaque origin) so even a hostile book cannot reach the table's vault, and redaction is journal law first — a turn struck in the sealed record stays out even when a snapshot flag goes missing (turn record k ↔ logs\[k]; the log flag is the advisory belt).
