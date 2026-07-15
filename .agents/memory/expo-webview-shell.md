---
name: Expo shell around the web house
description: Durable laws and traps from wrapping the live web game in a native Expo WebView shell (artifacts/mobile).
---

**Door law fails OUTWARD.** The shell decides in-glass vs system-browser by hostname, and every doubtful parse must resolve to the system browser — the safe failure is a house page outside, never a stranger's page inside the glass. Do not trust naive string parsing: Chromium treats `\` as ending the URL authority, so `https://evil.com\@house.tld/` looks in-house to a parser that only splits on `/` while the WebView actually goes to evil.com (a review caught exactly this). The law lives as a pure module with its own node bench; run the mobile package's `check` script after touching it.

**Why external doors:** Google OAuth refuses embedded user agents and Stripe checkout is safest in the system browser; entitlements are server-side, so the shell picks up standing on next load — no deep-link plumbing needed for v1.

**No web arm:** react-native-webview cannot render on web. Guard the module (conditional require) and render an iframe on the web platform — the Expo web preview/screenshot only ever exercises the iframe branch; only a real device proves the native glass.

**Scaffold traps:** keep `app.json` static; the scaffold's `useColors` cast stops typechecking once a real `dark` key sits beside numeric `radius` — read the palette plainly instead. Loading states are themed animation (house law: never a spinner).
