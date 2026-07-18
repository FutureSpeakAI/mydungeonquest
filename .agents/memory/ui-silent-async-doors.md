---
name: UI async doors must catch and speak
description: Player-facing async open/build flows need a catch that surfaces the fall — otherwise one transient rejection wedges the UI in eternal silence.
---
The rule: every player-facing async handler that gates a view mount (open-the-book, bind, export) must sit under a try/catch that surfaces the fall in the status surface; per-item reads (e.g. FileReader over N blobs) should degrade per-item (`.catch(() => null)` and an honest count in the status line) rather than felling the whole flow.

**Why:** a storybook open awaited journal + media rows + N FileReaders with no catch anywhere; one transient rejection meant the seal was pressed and nothing happened, forever — caught only as a 120s court timeout, at the price of a proving iteration. Silent fallbacks and silent falls are both banned: the door speaks or the door opens.

**How to apply:** grep async onClick/open handlers for uncaught awaits that precede the view-mount state set; wrap in catch → status line naming the fall; tolerate single bad rows only where the downstream renderer lawfully handles absence.
