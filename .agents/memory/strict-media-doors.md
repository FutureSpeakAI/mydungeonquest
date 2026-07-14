---
name: Strict media doors
description: Client-supplied strings that become markup, CSS, ffmpeg graphs, or file names must pass a whitelist regex at the boundary.
---

**The rule:** any client-controlled value that will be interpolated into HTML/CSS, fed to a media pipeline, or used as a file name passes a strict whitelist gate at the trust boundary — never sanitized after the fact.

- Images into HTML/CSS or server-decoded covers: `^data:image/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$` (narrow the subtype list to what the sink actually supports; covers are png/jpeg only).
- Refs that become temp file names: `^[a-z][a-z0-9-]{0,31}$`, duplicates refused, plan items may only cite refs that arrived in the same payload.
- Belt on top: `esc()` all attribute interpolations anyway; sandbox preview iframes.

**Why:** two architect-found holes of the same class in one project — a crafted blob MIME (`image/png" onerror=…`) smuggled through IndexedDB into Storybook HTML (XSS), and `../` in a clip ref escaping the podcast forge's temp dir (path traversal / arbitrary write). The stored value looked trustworthy because "we wrote it" — but blobs and refs are client-writable.

**How to apply:** every new exporter/binder/endpoint (book, podcast, PDF, any future keepsake) that touches stored media or client payloads gets the whitelist at its own door, plus hard resource caps (item counts, per-item size/duration) before any work is done.
