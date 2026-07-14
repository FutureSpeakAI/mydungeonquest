// THE RECEIPT OF REFUSAL — a tiny, React-free ledger of the innkeeper's
// last "no". Lib modules (the foundry, the narrator, the sfx bell) report
// a 402 here without ever importing React or the door; the TollNotice
// component in toll.jsx subscribes and shows the patron a proper receipt.
//
// Doctrine unchanged: a doorless/dormant house never answers 402, so on a
// keyless fork this module simply never fires. Nothing here knows money —
// it only carries the house's own words from the wire to the window.

let current = null;
const listeners = new Set();

export function reportTollRefusal(body) {
  if (!body || body.closed !== true) return;
  current = { ...body, at: Date.now() };
  // Every refusal is also remembered as an intent, so a patron who raises
  // their seat and returns with ?toll=paid can be offered the pour again.
  // Lib-level refusals (a paint, a spoken line) only know their kind; the
  // table's ambient pour context fills in the campaign and the log.
  if (body.kind) rememberRefusedPour({ ...pourContext, kind: body.kind });
  for (const listener of listeners) listener(current);
}

export function dismissTollNotice() {
  current = null;
  for (const listener of listeners) listener(null);
}

export function subscribeTollNotice(listener) {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

// ------------------------------------------------- the remembered intent
// A checkout visit tears the whole page down — module state cannot survive
// the trip to Stripe's rooms and back. The last refused intent (kind plus
// enough context to retry) is kept in sessionStorage, so a ?toll=paid
// return can offer the refused pour again instead of losing it. Marks of
// 'kept' or 'seen' clear it: no upgrade, no offer.
const INTENT_KEY = 'mdq:refused-pour';
const INTENT_TTL = 30 * 60 * 1000; // a stale intent is worse than none

// Ambient context the table sets as it works (campaign id, log id) so a
// refusal reported deep in a lib module can still find its way back to the
// right table — React-free, same doctrine as the rest of this file.
let pourContext = {};
export function setPourContext(context) { pourContext = context || {}; }

export function rememberRefusedPour(intent) {
  if (!intent?.kind) return;
  try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, at: Date.now() })); } catch { /* private mode keeps no memory */ }
}

// Read AND consume the remembered intent (a pour is offered once).
export function takeRefusedPour() {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    sessionStorage.removeItem(INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw);
    if (!intent?.kind || Date.now() - (intent.at || 0) > INTENT_TTL) return null;
    return intent;
  } catch { return null; }
}

export function clearRefusedPour() {
  try { sessionStorage.removeItem(INTENT_KEY); } catch { /* nothing to clear */ }
}

/**
 * Read a response that MAY be the innkeeper's 402. Returns the parsed
 * refusal body (and reports it) or null for anything else. Uses a clone so
 * the caller can still drain the body itself.
 */
export async function tollRefusal(response) {
  if (!response || response.status !== 402) return null;
  const body = await response.clone().json().catch(() => null);
  if (body?.closed === true) {
    reportTollRefusal(body);
    return body;
  }
  return null;
}
