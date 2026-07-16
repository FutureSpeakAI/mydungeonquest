# THE FOLIO — the codex, presented

*Design spec for the player-facing codex. The interactive mockup lives
beside this file: `codex-folio.html` — open it on a phone; it was
designed there first.*

---

## The presentation law

The codex is not a menu. It is **the book the table keeps**, opened —
vellum on ink, the mark at its head, the world clock under the title.
Three rules govern everything on its pages:

1. **Every fact wears its seal.** Facts, prices, scars, ripples, and
   ledger lines end in a marginal citation chip (`t.41`). Tapping the
   seal opens the sealed line it cites, verbatim, in the ink-black
   drawer at the foot of the page. Nothing in the book is unsourced —
   the folio makes the notary visible.
2. **The folio is a projection.** It renders reducer output and
   nothing else: `buildCards` for souls, `worldClock` for the head,
   `chartModel` for the atlas, `buildMarket` for the slate,
   `buildLedger` for the purse and lines, the annals for the
   chronicle. No fetches, no derived state of its own, no writes.
3. **Gold is glory; ember is threat; they never trade jobs.** Signature
   items, bonds, seals, and blessed marks are gold. Wounds, scars,
   `missing`, and scarcity's ▲ are ember. The dead are neither — they
   are wax: the `AT REST` seal, the page at ease.

## The sections (stitched ribbons, in this order)

| Ribbon | Feeds from | What the player sees |
| --- | --- | --- |
| **Hero** | hero card + ledger + sitting | Bearing, signature, purse, carried goods, the accepted face and its six views, the spoken ledger |
| **Souls** | `buildCards` + bearing | One card per soul: locked visual, signature, bond as tally strokes, cited facts; the dead under wax |
| **Atlas** | `chartModel` + scars | The witnessed chart in day-units with a travel scale bar; fog is honest absence plus one italic admission; scars listed with seals |
| **Market** | `buildMarket` + `slateLine` | The slate: good, price with ▲▼ and cause, locked words remembered aloud |
| **Chronicle** | annals | The volume's annals, drop-capped, each line sealed |
| **Ripples** | consequence index (Directive VI) | "Because of you —" lines, each tracing a player deed to a world change |

## Type & surface (from BRAND.md, exactly)

Cinzel 700–900 tracked uppercase for names and ribbons; Cinzel
Decorative for drop caps and bond tallies; Crimson Pro for body;
Cormorant Italic for whispers (fog admissions, slate preamble, ripple
opening). Vellum `#e9dfc8` page on ink `#0d0b14` table; foil gradient
reserved for the tale's title and selected-ribbon text. Tap targets
≥44px; visible gold focus rings; `prefers-reduced-motion` collapses
the page-turn and drawer transitions.

## Wiring plan (a Directive VI phase — not this groundwork)

- The `Codex` component in
  `artifacts/mydungeon-quest/src/components/Overlays.jsx` is rebuilt to
  this spec as `Folio` (same overlay slot, same open/close contract).
  App.jsx gains **one hook** — the reducer bundle passed as props — and
  no logic.
- The sealed-turn drawer resolves `t.N` against the campaign's entries
  (already in memory at the table); a struck row answers with the
  strike, honestly.
- Atlas pins tap through to the region's page; a soul's `last_seen`
  links to its pin when the place is witnessed.

## The gate that will guard it

`folio` (game eval, react-test-renderer, keyless): renders from the
fixture world; asserts every fact node carries a citation chip; asserts
ember classes never appear on signature/bond/seal nodes and gold never
on wound/missing nodes; asserts the unwitnessed count is spoken, not
mapped; asserts the drawer opens the verbatim sealed line for a known
`t.N`. PASS only grows.
