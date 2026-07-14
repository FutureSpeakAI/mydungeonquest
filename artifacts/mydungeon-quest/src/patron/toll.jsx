// THE TOLL-HOUSE, client side — where a patron reads their own ledger.
//
// Same opt-in doctrine as the door and the paints: if the door was never
// built, or the house answers that the gateway is dormant, this file renders
// NOTHING and the game is byte-for-byte the free table. All knowledge of
// money lives server-side; this is only the window where a patron reads
// their standing and, if they choose, takes a better seat.
//
// The house menu (owner's directive, July 2026): six turns on the house —
// the taste, counted for life, never resetting — then two seats for sale:
// $5 by the week or $129.99 by the year, both without measure.
//
// No new dependencies — plain fetch against the house, and redirects to
// Stripe-hosted rooms for anything that touches a card. No card ever crosses
// this table.
import { useEffect, useState } from 'react';
import { doorBuilt } from './door.jsx';

const SEAT_WORDS = {
  guest: 'Guest at the fire',
  free: 'The taste',
  weekly: 'Patron by the week',
  yearly: 'Patron by the year',
};

const SEAT_RANK = { guest: -1, free: 0, weekly: 1, yearly: 2 };

const KIND_WORDS = {
  dm: 'turns at the table',
  retell: 'retellings',
  paint: 'painted plates',
  speak: 'spoken lines',
  music: 'musical phrases',
  sfx: 'stings',
  podcast: 'forged episodes',
  pdf: 'bound books',
};

// A price in the house voice: whole dollars stay whole ($5), split coins are
// spoken in full ($129.99). Interval as Stripe speaks it: week, year.
export const priceWords = (seat) =>
  `$${(seat.amount / 100).toFixed(seat.amount % 100 ? 2 : 0)}/${seat.interval}`;

// The latest standing, module-held so the table can ask "is this kind worth
// asking for?" without threading React state through the media queue.
// Advisory only — the house clamp is the law; this merely spares the road a
// doomed request. Unknown standing always answers yes.
let lastStanding = null;

export function tollAllows(kind) {
  if (!lastStanding?.live || !lastStanding.quotas) return true;
  const quota = lastStanding.quotas[kind];
  if (quota === null || quota === undefined) return true;
  if (quota === 0) return false;
  return (lastStanding.used?.[kind] || 0) < quota;
}

async function readToll() {
  const res = await fetch('/api/toll');
  if (!res.ok) return null;
  const body = await res.json();
  lastStanding = body;
  return body;
}

// Settle a return from the Stripe rooms: the ?toll= mark on the URL says how
// the visit ended. Ask the house to re-read its ledger, wipe the mark from
// the bar, and hand back a line for the status ribbon (null when no mark).
export async function settleTollReturn() {
  // A doorless build never learns money exists — a stray ?toll= mark on a
  // shared link is left exactly where it lies, unspoken.
  if (!doorBuilt) return null;
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const mark = params.get('toll');
  if (!mark) return null;
  params.delete('toll');
  const rest = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  try {
    await fetch('/api/toll/refresh', { method: 'POST' });
  } catch {
    /* the webhook settles it regardless */
  }
  lastStanding = null;
  if (mark === 'paid') return '✦ The seat is yours — the house lights it within the minute.';
  if (mark === 'kept') return 'The coin stayed in your purse. The fire is warm all the same.';
  if (mark === 'seen') return 'The ledger closes its cover.';
  return null;
}

async function visitRoom(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) {
    window.location.assign(data.url);
    return null;
  }
  return data.error || 'The toll-house door is stuck — try again in a moment.';
}

// The patron's current standing, fetched once per mount. On a doorless
// build it never fetches and stays null forever — a keyless fork never
// learns money exists.
export function useToll() {
  const [toll, setToll] = useState(null);
  useEffect(() => {
    if (doorBuilt) readToll().then(setToll).catch(() => {});
  }, []);
  return toll;
}

// The standing line under the seat name. Three honest voices: the taste
// (lifetime tallies, no page-turn — it never resets), a paid seat (no
// measure; billing lives in Stripe's portal, so no invented dates), and
// the guest at a standing page (signed out — the door does the asking).
function standingWords(toll) {
  if (toll.plan === 'guest') {
    return ' — the house asks your name at the door. Six turns on the house once the book knows you.';
  }
  if (toll.lifetime) {
    return ' — six turns on the house, poured once and never reset. A seat at the table pours without measure.';
  }
  return ' — the seat pours without measure. Receipts, changes, and leaving live in the ledger below.';
}

// The Settings panel's toll block. Renders nothing on a doorless build or a
// dormant gateway.
export function TollSection({ toll }) {
  const [word, setWord] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!doorBuilt || !toll?.live) return null;

  const rank = SEAT_RANK[toll.plan] ?? 0;
  const seats = (toll.prices || [])
    .filter((seat) => (SEAT_RANK[seat.plan] ?? 99) > rank)
    .sort((a, b) => a.amount - b.amount);
  const metered = Object.entries(toll.quotas || {}).filter(([, quota]) => typeof quota === 'number' && quota > 0);
  const act = async (fn) => {
    setBusy(true);
    const out = await fn();
    if (typeof out === 'string') setWord(out);
    setBusy(false);
  };

  return <>
    <h3>The toll-house</h3>
    <p className="toll-standing"><b>{SEAT_WORDS[toll.plan] || toll.plan}</b>{standingWords(toll)}</p>
    {toll.plan !== 'guest' && metered.length > 0 && <div className="toll-tallies">{metered.map(([kind, quota]) => {
      const used = Math.min(toll.used?.[kind] || 0, quota);
      return <span key={kind} className={used >= quota ? 'spent' : ''}><b>{used}/{quota}</b> {KIND_WORDS[kind] || kind}</span>;
    })}</div>}
    {toll.plan !== 'guest' && <div className="toll-seats">
      {seats.map((seat) => <button key={seat.plan} className="secondary-button" disabled={busy}
        onClick={() => act(() => visitRoom('/api/toll/checkout', { plan: seat.plan }))}>
        Take a seat {SEAT_WORDS[seat.plan]?.replace('Patron ', '') || seat.plan} — {priceWords(seat)}
      </button>)}
      {toll.portal && <button className="text-button" disabled={busy} onClick={() => act(() => visitRoom('/api/toll/portal'))}>
        Open the ledger — change or leave your seat
      </button>}
      {/* The small print at the point of coin: every seat is bound by the house rules. */}
      <p className="toll-legal">Seats are bound by the <a href="/terms.html">house rules</a> and the <a href="/privacy.html">privacy of the table</a>. The weekly seat renews each week, the yearly each year — leave any time from the ledger.</p>
    </div>}
    {word && <p className="muted">{word}</p>}
  </>;
}
