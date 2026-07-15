// ---- THE DOOR LAW OF THE GLASS (pure, testable, dependency-free) ----
//
// House pages stay inside the WebView; every other destination (the
// toll-road's checkout, third-party sign-in parlors that refuse embedded
// glass) opens in the system browser.
//
// Parsing is deliberately manual and WHATWG-aligned where it matters —
// a backslash terminates the authority exactly as Chromium reads it, so
// no crafted userinfo form can dress a stranger's page as the house.
// React Native's own URL has gaps, so no dependency is trusted here.
// Any doubt resolves OUTWARD: the safe failure is a house page opening
// in the system browser, never a stranger's page wearing the house glass.

/** The lowercase host of a URL, or null when no trustworthy host can be read. */
export function hostOf(url) {
  const s = String(url || '');
  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(s);
  if (!scheme) return null;
  const afterScheme = s.slice(scheme[0].length);
  // WHATWG: '\' ends the authority exactly like '/' — Chromium agrees.
  const authority = afterScheme.split(/[/\\?#]/)[0] || '';
  const afterCredentials = authority.includes('@')
    ? authority.slice(authority.lastIndexOf('@') + 1)
    : authority;
  const host = afterCredentials.split(':')[0].replace(/\.+$/, '').toLowerCase();
  if (!host) return null;
  // Percent-escapes, unicode lookalikes, brackets: not a host this shell vouches for.
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  return host;
}

/** True only for the game's own host (or a dot-boundary subdomain) over http(s). */
export function staysInGlass(url, gameHost) {
  const s = String(url || '');
  if (s === 'about:blank') return true; // the WebView's own blank slate
  if (!/^https?:\/\//i.test(s)) return false; // no other scheme keeps the glass
  const host = hostOf(s);
  if (!host || !gameHost) return false; // unreadable → out, never in
  return host === gameHost || host.endsWith(`.${gameHost}`);
}

/** Schemes worth handing to the system; script/data pseudo-URLs are dropped cold. */
export function openableOutside(url) {
  return !/^(javascript|data|blob|about):/i.test(String(url || ''));
}
