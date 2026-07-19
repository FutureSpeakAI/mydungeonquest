// ---------------------------------------------------------------------------
// THE HOUSE'S OWN WORD (Experience-Directive XVII, Article VII) — one
// config-gated promo slot exists on the threshold rite, for the house
// speaking of itself, and it ships DARK: no VITE_HOUSE_PROMO chalked,
// nothing renders. No third-party advertising surface exists in this cut —
// no network, no script, no iframe; that question waits for the toll design
// where it belongs.
// ---------------------------------------------------------------------------
export const HOUSE_PROMO = String(import.meta.env?.VITE_HOUSE_PROMO || '').trim() || null;

// The cut's own version, one seat — the beta door's report reads it.
export const HOUSE_VERSION = '1.0.1-beta';
