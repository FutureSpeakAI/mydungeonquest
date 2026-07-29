# The Standing Laws (CLAWS.md)

> The laws of the house. Every rule named here is referenced from at
> least one eval or source comment. The number is permanent — a law is
> never renumbered, only clarified. A new law takes the next number.

---

## Rule 18 — One surface, one truth
A data value that must be consistent across surfaces (both sides of an
API, both ends of a chain, the engine and the table) lives in ONE
canonical home. Both sides import from that home; neither mirrors it.
A mirror WILL drift. Drift is a bug the linter cannot find.

**Gate:** `mirrors-need-one-seat` (memory), `soulsWeb.test.mjs` (engine
twin vs table twin byte-check).

## Rule 19 — The provider plan decides
No module invents a key. The provider plan (the ranked fallback chain
in the server's own door) decides which model speaks. A seat env
names the chair; it never conjures the key. An absent key seats the
mock floor exactly as today.

## Rule 20 — The validator and the schema agree
If a tool-calling JSON schema omits an enum that the client-side
validator enforces, the model emits valid-but-rejected turns and
silently falls back. The schema and the validator must mirror every
constraint exactly — field names, types, enums, and ranges.

**Gate:** `llm-toolschema-validation` (memory).

## Rule 21 — Campaign isolation is absolute
No media row from campaign A may serve campaign B. The foundry's
boundary assertion (`[E3] campaign isolation violated`) is a hard
throw, not a warning. Campaign-scoped cacheKeys (prefix `scene:`,
`bust:`, `portrait:`, `region:`, etc.) are the structural guarantee;
bare sha256 hex keys are the pre-E3 bug the E3 migration (H6) cleans.

**Gate:** `e3CampaignIsolation` (source), `sweepUnscoped` (migration).

## Rule 22 — Developer instrumentation is not a surface
`console.warn('[refusal]', …)`, `console.error('[narrator] …')`,
`plateTrace`, and similar developer-observable records are permanent
instrumentation. They never reach the player's screen, never appear in
the journal chain, never enter the model's context. A meter fraction
check, a named refusal, or a trace emit is law growing — not a surface
creeping back.

**Gate:** `sanitizeSurface` (source), `refusalsAreLoud` (H2).

## Rule 24 — The record survives the code
`db.js` must export a raw-read path (`exportRawJournal`) that returns
every row exactly as persisted — no replay, no reduction, no shape
transformation. This path must work even when the campaign's data shape
has drifted and cannot be replayed through the reducers. It must not
throw; it must return a stable envelope with `campaignId`, `rows`, and
`rowCount` even against broken inputs.

**Why:** When a migration changes the campaign shape, players who open
old saves must still be able to recover their raw journal. A raw export
that throws on shape drift is worthless to the player it was meant to
save.

**Gate:** `loadNeverThrows.test.mjs` (Rule 24 + Rule 25 courts).

## Rule 25 — Export always works
`exportRawJournal` returns a stable envelope against every input —
missing campaign, malformed rows, broken IndexedDB. It never throws.
The caller receives `{ campaignId, rows, rowCount, campaignSnapshot,
heroName, worldTitle, exportedAt, note }` regardless of the input
condition.

**Gate:** `loadNeverThrows.test.mjs` courts 2 and 3.

## Rule 26 — Claim only what the tool can see
A Node/react-test-renderer test that asserts CSS source text is not a
geometry assertion. It confirms the law is written; it does not confirm
the law renders. The Node suite's layout courts are labelled as CSS
source verification. Real geometry (bounding boxes, overlap, computed
styles) belongs in the Playwright browser suite.

**Two-suite ledger:** the Node suite (keyless floor, 170+ evals) proves
what can be proven without a browser. The Playwright suite proves what
only a real browser can show. Every gate belongs to exactly one suite
(see BUILD_STATUS.md, Suite ledger section).

**Gate:** `harnessHonest.test.mjs` (G4, Rule 26 caveat), `harnessSplit`
(H4, confirms two-suite structure).

## Rule 27 — A refusal is a loud failure
A refusal that produces only an absence is indistinguishable from a
bug. Every door that closes must announce it. The shared helper
`src/lib/refusalLog.js` → `logRefusal({ what, why, expected, actual,
action })` emits a structured `console.warn('[refusal]', record)`.

**Enumerated refusal paths:**
- Audio Director: mock/no-blob provenance refusal
- Audio Director: expired-queue item drop in `pump()`
- Audio Director: occupied-moment drop
- smithClient: validator rejection in `smithSpin`
- smithClient: validator rejection in `spineSpin`
- Foundry: session cap exceeded
- proving.js: malformed `pendingRoll` shape
- narrator.js: `play()` rejection (H1, `console.error`)

**What is not a refusal:** a mock-floor response, a keyless degradation
to silence, a parchment-tier hold frame. These are correct behavior,
not failures.

**Gate:** `refusalsAreLoud.test.mjs` (H2, 8 courts).

---

## Pin-move law (joint soulsWeb + leanDoor requirement)

The closure's exact bytes are pinned in two gates that CROSS-POINT each
other:
- `evals/soulsWeb.test.mjs` — exact bytes (`CLOSURE_BYTES_PIN`)
- `evals/leanDoor.test.mjs` — KB ceiling (`PIN_KB`)

**Any commit that changes the closure bytes MUST update BOTH pins in
the same commit.** A commit that updates soulsWeb but leaves leanDoor
stale (or vice versa) will pass one gate and fail the other — which is
detected immediately, but was caused by an incomplete ruling.

The pins move upward ONLY on the owner's word with a named law
justification (see movement ledgers in both gate headers). The ratchet
is downward-only between rulings. A ruling must include:
- Byte delta and new measured value
- Named reason (law growing, new module, Rule N compliance, etc.)
- Confirmation that no new lazy surface joined the sync road

**Gate:** `docsCurrent.test.mjs` (verifies this law is documented here).
