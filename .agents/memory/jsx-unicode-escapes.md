---
name: JSX text ignores \u escapes
description: Unicode escapes like \u2019 render literally in JSX text nodes; only JS string contexts unescape them.
---

**Rule:** Never write `\u2019`, `\u2014`, etc. inside JSX *text* (between tags). They are not processed — the user sees the raw backslash sequence. Use the real character (’ — × ✦) directly in JSX text. `\u` escapes work only in JS string contexts: `'...'`, `"..."`, template literals, and JSX attribute values that are JS expressions.

**Why:** JSX text is not a JS string literal — Babel/esbuild pass the characters through verbatim. Hit this in the Folio (CharacterSheet) purse ribbon: `The record rules\u2019` rendered literally on screen.

**How to apply:** When writing .jsx with tools that escape non-ASCII, paste real Unicode characters into JSX text nodes. In .mjs/.js gate files, `\u` escapes in strings are fine and safer for tooling. If a component shows a literal `\u2019` on screen, this is the cause.
