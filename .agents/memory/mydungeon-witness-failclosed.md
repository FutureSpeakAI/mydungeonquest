---
name: Pure replay witnesses are born fail-closed
description: Engine journal-replay modules (presence, trove, future witnesses) must guard every shape before walking it; UI panels reading them carry an explicit last-door catch.
---

The rule: any pure witness that replays the sealed journal (presenceOf/visitorsOf, troveOf/purseOf, and every future sibling) must be fail-closed from birth — every list walks behind `Array.isArray` (a helper like `rows(list)`), every name must be a string or it proves nothing, a row that is not even an object proves nothing (not even the hero), and top-level inputs (campaign, logs, hero) are guarded the same. The replay never throws on a legacy, imported, or mangled record; it answers with what the record lawfully proves. Codex panels that call a witness during render hold a try/catch whose fallback renders an EXPLICIT line ("The … record cannot be read.") — never a crash, never silence.

**Why:** The 0.7.1 architect round returned FAIL on exactly this: the presence replay trusted row shapes on faith (`for...of` over story lists), so one malformed legacy row would throw mid-render and fell the whole codex panel — proven by invoking it with a mangled cast_add. The house laws already demanded fail-closed (Vault law) and explicit failure (no silent fallbacks); this extends them to the witness stand.

**How to apply:** When writing or reviewing any journal-replay module, add a mangled-record section to its keyless gate (lists as objects, names as numbers, story as a string, a null row, logs-as-object, a null campaign — assert non-throwing, byte-deterministic on a second pass, lawful rows still counted). Extend the EXISTING gate's sections rather than adding a new eval file when the pin should hold. Suspect the same hole in older witnesses when touching them.
