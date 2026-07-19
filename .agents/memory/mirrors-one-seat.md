---
name: Mirrors need one seat
description: Byte-for-byte law text mirrored across files drifts; move it to one imported seat or pin cross-pointers both sides.
---

When a test asserts byte-for-byte equality with prose/law text living in app code (rubrics, system-prompt laws, boundary tables), the mirror WILL drift the first time someone edits one side.

**Why:** a proving-loop iteration burned red because a test's mirrored copy of an app law lagged one edit behind the source; a second family member appeared when a calibration table lived inline in one spec while courts needed the same law.

**How to apply:** prefer ONE seat — a small lib both sides import (e.g. a boundary ledger consulted by bench filters and court recusals alike). Where a true byte mirror is unavoidable (asserting the APP's own bytes), pin cross-pointer comments on BOTH sides naming each other, so no edit lands alone.

**Harness selectors are mirrors too.** A `label:has-text("...")` needle hunting display copy is a byte mirror of the UI's copy table and rots silently when the copy moves — three forge-walk needles rotted invisibly behind a store's freshness door and only bit when a law change forced the walk to re-run. Aim needles with the law's own copy imported from its one seat (e.g. build the selector from the same field-guide `ask` strings the component renders), and refuse loudly by name when the seat holds no entry.
