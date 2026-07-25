---
name: Ghost sweeps grep content, not envelopes
description: No-trace assertions over sealed/journal rows must scope to payload bytes, never whole-row JSON
---
- Asserting `!JSON.stringify(rows).includes(ghost)` over envelope rows FLAKES: recordHash/prevHash/signature fields are run-varying base64, and a short alphabet-only ghost (`Xy`) lands inside a hash by dice. Scope the sweep to content: `JSON.stringify(rows.map(({ payload }) => payload))`.
- **Why:** a no-trace court greened standalone, then redded minutes later inside the same check with zero source changes between runs — the "leak" was a hash roll, not a leak. One crossing was material here because the root cause was identified, not merely observed.
- **How to apply:** every no-trace/leak court over sealed or hashed rows; seat the positive `.includes` proofs on the same payload bytes too — same scope, documented intent.
