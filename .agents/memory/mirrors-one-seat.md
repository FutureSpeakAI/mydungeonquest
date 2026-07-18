---
name: Mirrors need one seat
description: Byte-for-byte law text mirrored across files drifts; move it to one imported seat or pin cross-pointers both sides.
---

When a test asserts byte-for-byte equality with prose/law text living in app code (rubrics, system-prompt laws, boundary tables), the mirror WILL drift the first time someone edits one side.

**Why:** a proving-loop iteration burned red because a test's mirrored copy of an app law lagged one edit behind the source; a second family member appeared when a calibration table lived inline in one spec while courts needed the same law.

**How to apply:** prefer ONE seat — a small lib both sides import (e.g. a boundary ledger consulted by bench filters and court recusals alike). Where a true byte mirror is unavoidable (asserting the APP's own bytes), pin cross-pointer comments on BOTH sides naming each other, so no edit lands alone.
