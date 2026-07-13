---
name: /api path conflict between artifacts at the shared proxy
description: A self-serving web app and an api artifact both claiming /api silently 404s the app's own API
---

# Two artifacts fighting over /api at the shared proxy

**Rule:** In this multi-artifact monorepo, only ONE artifact may own a given
path prefix at the shared proxy. If a web app self-serves its backend under
`/api` (e.g. via its vite `server.proxy` forwarding `/api` to its own Express),
no other artifact may declare `/api`.

**Why:** MyDungeon.Quest's protected `foundry.js` hardcodes `/api/...` for
dm/paint/video, and its vite dev server proxies `/api` -> its Express on
127.0.0.1:3001. A scaffold `api-server` artifact also claimed `paths=["/api"]`
at the proxy and intercepted every `/api/*` call in the preview pane, so the
game got 404s (direct curl to :3001 worked; proxied :80 did not). Symptom: app
loads but all API calls 404 only through the preview/deployment proxy.

**How to apply:** Give the self-serving app the conflicting prefix and repath
the other artifact. Here api-server was moved off `/api` to `/_apiserver`
(previewPath + paths + health) via `verifyAndReplaceArtifactToml`, and its
Express mount changed to match. After repathing, restart BOTH workflows so the
gateway re-registers routing, then verify proxied `:80/api/...` returns 200.
Test at the `:80` proxy origin, not just the vite dev origin — the conflict only
manifests through the shared proxy.
