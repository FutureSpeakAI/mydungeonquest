---
name: Prompt-cache anchored windows
description: Why sliding history windows silently defeat provider prompt caches, and the anchored-window cure + probe hygiene for keyed model auditions.
---

**Rule:** Any provider prompt cache (Anthropic `cache_control`, OpenAI automatic) is defeated by a history window that slides by one item per turn — the prefix changes at its first byte every request, so the cache never reads AND every breakpoint buys a fresh cache-write surcharge. Anchor the window: start advances only in steps of N items (floor F, start = floor((len−F)/N)·N), so between re-anchors requests only append and the prefix stays byte-stable. When two layers window independently (client entries, server messages), the server's floor must equal the client's widest lawful send or the server re-slides what the client anchored.

**Why:** MyDungeon DM resent ~30×6KB messages at full input price every turn; cache_control markers looked right but never read past ~15 turns.

**How to apply:** One shared law both sides import (mirrors-one-seat). Keep every dynamic block in the final never-cached message; repairs append after it so retries read the cache just written. 1-hour TTL needs the `extended-cache-ttl-2025-04-11` beta header. Eval it keylessly: strip cache marks, assert turn t's stable messages are a byte prefix of turn t+1's between anchors.

**Keyed audition probes:** give every wire call an AbortSignal deadline (a stalled socket otherwise wedges the whole run — one did, ~10 min) and write result rows incrementally (JSONL); a nohup'd background node process can be killed at shell-session teardown before its final write. Wrap the strict turn court in try/catch — real models return shapes that make the court itself throw (e.g. narration_blocks as an object).

**Verdict hygiene:** judge models on POST-repair validity and fallback count, not first-pass (the strict court makes first-pass low for everyone); a model that ever falls back on an ordinary turn shape is disqualified regardless of price.
