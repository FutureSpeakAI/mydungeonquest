---
name: Navigator stubbing in Node 21+
description: global.navigator is non-configurable in Node 21+; Object.defineProperty fails silently; use an inner impl function instead.
---

In Node.js 21+, `navigator` is a built-in global and its property descriptor is non-configurable. Attempting to stub it with `Object.defineProperty(global, 'navigator', { value: stub, configurable: true })` silently fails — the old `navigator` is still returned, and tests that rely on the stub see the wrong value.

**Why:** The Node team made `navigator` non-configurable to match browser behavior. Patching it via the global object no longer works as it did in older Node versions.

**How to apply:** For any module that calls `navigator.storage.estimate()` or similar navigator-dependent APIs, export an inner implementation function that accepts the storage-like object as a parameter:

```js
// In the module:
export async function _checkQuotaImpl(storage) {
  if (!storage?.estimate) return null;
  const { quota, usage } = await storage.estimate();
  ...
}
export async function checkStorageQuota() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  return _checkQuotaImpl(nav?.storage ?? null);
}

// In the test:
const stubStorage = { estimate: async () => ({ quota: 100e6, usage: 90e6 }) };
const result = await _checkQuotaImpl(stubStorage);
```

Never rely on `Object.defineProperty(global, 'navigator', ...)` or `global.navigator = ...` to work in Node 21+ tests.
