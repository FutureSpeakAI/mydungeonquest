---
name: Anthropic temperature retired
description: Newer Anthropic model families reject requests carrying temperature; silent-degrade chains can swallow the 400.
---

Newer Anthropic model families return 400 for any request carrying a `temperature` parameter.

**Why:** older call sites pass temperature by default; the provider now refuses instead of ignoring it, and a silent-degrade chain can swallow the 400 so the seat quietly falls to a fallback (or mock) with no named refusal.

**How to apply:** never send `temperature` to Anthropic seats unless the specific model is proven to accept it. When an Anthropic-backed seat silently degrades, grep for `temperature` in the request builder first. After any model-family upgrade, probe each seat with one cheap real call and read the actual refusal body — do not trust the chain's fallback to surface it.
