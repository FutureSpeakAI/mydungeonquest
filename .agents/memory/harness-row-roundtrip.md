---
name: Harness readers carry rows whole
description: E2E/test readers must spread db rows verbatim, never rebuild field-by-field — a three-strike defect family.
---
The rule: any test-harness reader that returns a stored record (campaign row, journal row, media row) must carry the row WHOLE — `{ ...row }` with derived normalizations layered beside it — never rebuild it field-by-field.

**Why:** three strikes of the same family in one project: a rebuilt reader silently drops every field added after it was written (first a `kind`, then a `dm.story`, then `combat`/`pendingRoll`), and the courts read a lawfully sealed record as absent — red iterations spent on a blind instrument rather than a real defect.

**How to apply:** when adding a new persisted block to a record, grep the test harness for readers that touch that store; when writing any reader, spread first, normalize beside.
