// ------------------------------------------------------------
// THE NAME ROAD (Directive XXI — THE ALIAS LEDGER): one soul, many
// names, one card. This is the ONE seat every surface consults when a
// name might be a sealed alias: the cards, the presence replay, the
// pack builder's scene walk, the census, the validator's courts, the
// wiki. No surface grows a private resolver — a byte-for-byte mirror
// WILL drift (the standing one-seat law).
//
// A soul's CLAIMS are its sealed name plus every entry on its
// known_as ledger, judged case-blind with inner whitespace folded;
// display strings ride unaltered. A claim two souls contest resolves
// to NOBODY — the road never guesses (the witness law: junk proves
// nothing). No imports — safe for the headless bench and the browser.
// ------------------------------------------------------------

// The road's one canon: case-blind, trimmed, inner whitespace folded.
export function canonName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// A soul's ledger, read with the witness law: an absent, rotten, or
// non-string row proves nothing and never crashes a reader.
export function ledgerOf(soul) {
  const raw = soul?.known_as;
  if (!Array.isArray(raw)) return [];
  return raw.filter((alias) => typeof alias === 'string' && alias.trim());
}

// Every name a soul may answer to: its sealed name first, then its
// ledger in append order — display strings, deduped case-blind.
export function soulClaims(soul) {
  const claims = [];
  const seen = new Set();
  const name = typeof soul?.name === 'string' ? soul.name : '';
  for (const claim of [name, ...ledgerOf(soul)]) {
    const key = canonName(claim);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    claims.push(String(claim).replace(/\s+/g, ' ').trim());
  }
  return claims;
}

// The full claims index: canon claim -> the ONE sealed name holding it.
// Names AND aliases both claim; a contested claim maps to null and
// resolves to nobody. The validator's collision court reads this.
export function claimsIndex(souls = []) {
  const index = new Map();
  for (const soul of Array.isArray(souls) ? souls : []) {
    const owner = typeof soul?.name === 'string' ? soul.name.replace(/\s+/g, ' ').trim() : '';
    if (!owner) continue;
    for (const claim of soulClaims(soul)) {
      const key = canonName(claim);
      if (!index.has(key)) index.set(key, owner);
      else if (canonName(index.get(key) ?? '') !== canonName(owner)) index.set(key, null);
    }
  }
  return index;
}

// The alias-only index: canon ALIAS -> owner sealed name, sealed names
// themselves excluded. Resolution surfaces that already answer names by
// their standing statutes (exact, unique first name) take ONLY the
// epithet hop from this map — so a ledgerless cast adds nothing and
// every pre-alias walk stays byte-identical.
export function aliasIndex(souls = []) {
  const index = new Map();
  for (const soul of Array.isArray(souls) ? souls : []) {
    const owner = typeof soul?.name === 'string' ? soul.name.replace(/\s+/g, ' ').trim() : '';
    if (!owner) continue;
    const own = canonName(owner);
    for (const alias of ledgerOf(soul)) {
      const key = canonName(alias);
      if (!key || key === own) continue;
      if (!index.has(key)) index.set(key, owner);
      else if (canonName(index.get(key) ?? '') !== canonName(owner)) index.set(key, null);
    }
  }
  return index;
}

// The resolve road: a raw name answers with the one soul's sealed name,
// or null. Works over either index; ambiguity touches nobody.
export function resolveByClaims(rawName, index) {
  if (!(index instanceof Map)) return null;
  const owner = index.get(canonName(rawName));
  return typeof owner === 'string' && owner ? owner : null;
}

// THE SEAL — the one append law every reducer folds with: append-
// ordered, case-blind deduped, capped at the door's own 60 characters;
// the soul's own name is never re-sealed (a quiet no-op, never an
// error). Returns the SAME array when nothing changes — so replays are
// byte-stable and a chronicle line can trust the reference. Never
// mutates its input (the deep-freeze law: copies only).
export function sealAlias(ledger, alias, ownName = '') {
  const list = Array.isArray(ledger) ? ledger : [];
  const value = typeof alias === 'string' ? alias.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  if (!value) return list;
  const key = canonName(value);
  if (key === canonName(ownName)) return list;
  if (list.some((held) => canonName(held) === key)) return list;
  return [...list, value];
}
