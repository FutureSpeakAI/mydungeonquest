---
name: One court crossing is not a conviction
description: A dom court that reds once under parallel load, with a probe-clean isolated walk, is judged on its second sitting — not theorized to death.
---
When an e2e court fails once under the full parallel suite but a plain-chromium probe (same server, same seed, same clicks, pageerror/console listeners attached) walks clean, stop theorizing: carry the deterministic fixes you already have, rerun, and treat only a SECOND crossing as material — the same two-sitting law the vision bench earned.

**Why:** A navigation court froze once with the click provably landed (button focused, therefore enabled) and the old DOM intact in the snapshot; hours of structural theories all died against the evidence; the probe was clean and the court crossed green every sitting after. Parallel-load re-render races produce single crossings that static reading will never find.

**How to apply:** Build the probe OUTSIDE tests/ with the harness's own boot/seed mechanics; take the browser executable from the court's own env var (nix-patched chromium — downloaded builds cannot link). Run server+probe in ONE shell invocation — background servers are reaped between shell calls. Delete the probe after. If the second sitting crosses too, instrument under load; if it greens, log the race and move on.
