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
