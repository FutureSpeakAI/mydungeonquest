---
name: Journal machinery rows — seal leads, row follows
description: Ordering law when a machinery row is both sealed in the journal chain and mirrored as a working-record log row; partial-failure semantics and the court to prove them.
---
- **Rule:** when a machinery row (tick/waypost/epoch family) is BOTH sealed into the journal chain AND mirrored as a log row in the working record, the journal seal lands FIRST; the log row is written only afterward, carrying its recordHash, in ONE save.
- **Why:** save-first leaves an unsealed row behind on seal failure — it feeds consumers (e.g. the [MEMORY] ladder) with unchained content, and if idempotence checks the log rows, it bars the lawful retry forever. Seal-first's worst case is an orphan journal row: a re-close reseals it, and duplicate seals resolve newest-wins by ladder law. Found as a severe architect finding in the Elder Memory round (July 2026).
- **How to apply:** any new sealed machinery kind. Court the jammed door in its gate: assert the throw speaks (never a silent half-write), the working record stays clean of the kind, and a healed retry seals exactly once with row-hash == head-hash. Give the caller (act-close and kin) its OWN catch so machinery failure never costs spoken work already landed (the annal must survive the epoch's bad day).
