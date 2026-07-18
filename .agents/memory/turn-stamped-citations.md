---
name: Turn-stamped citations
description: Journal rows must carry their own turn stamp; array indexes lie the moment tick rows land between turns.
---
Any UI or fold that cites a journal row speaks the row's OWN turn stamp, never its array position.

**Why:** Tick rows interleave with turn rows, so indexes shift as the log grows — an index-cited road points at the wrong turn the moment a tick lands. Found building the Traveler's Chart (July 2026).

**How to apply:** Stamp the row at write time, in EVERY writer (the live row build and the proving seeder both). When a new field joins a row that feeds sealed hashing, seat it AFTER any byte-pinned contiguous run and confirm sealed payloads exclude the row object, so no standing hash or pin moves. Legacy rows without stamps cite nothing rather than guess.
