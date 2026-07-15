# THE BRAND — MyDungeon.Quest

**Thesis: an illuminated blockbuster.** Manuscript × movie poster. Drama comes from scale, texture, and real product art — never from stock fantasy or placeholder renders.

## The mark — the Icosahedron Rose
A d20 face-on, drawn as a cathedral rose window: die, window, and seal in one. Files: `artifacts/mydungeon-quest/public/brand/mark.svg` (full, 20 beads for 20 faces, stained-glass facets, four-point pip at heart), `public/icon.svg` (simplified for favicon/app-icon sizes). Gold on ink only; never recolored; clear space = one bead-ring width; the pip may pulse (the wax press animation) but the mark never spins during play.

## The lockup
`MYDUNGEON ✦ QUEST` in Cinzel 700, tracked +0.34em, the separator set in foil. Stacked: mark above lockup. The dot in prose ("MyDungeon.Quest") stays a dot.

## Palette
Ink `#0d0b14` · Vellum `#e9dfc8` · Gold `#d4a24e` (foil gradient `#f3d489 → #8a5f24`) · Dim `#a99f8c` · **Ember `#c8502e`** — danger, wounds, combat. Gold is glory; ember is threat; they never trade jobs.

## Type
Display: **Cinzel** 700–900, uppercase, tracked, fluid (`clamp` up to ~9vw), foil fill + letterpress for hero moments. Numerals & initials: **Cinzel Decorative**. Body: **Crimson Pro**. The emotional voice — whispers, epigraphs, tenor lines: **Cormorant Italic** (`.voice-italic`). Drop caps 4–5 lines; the Foundry may paint illuminated panels behind chapter initials.

## The House Style (all marketing art)
Exported as `HOUSE_STYLE` from `src/lib/cinema/prompts.js`:
> Painterly epic fantasy in deep ink and candle-gold: chiaroscuro light, ember-rimmed silhouettes, weathered heroes against monumental scale, visible brushwork, no text, no borders.

## The reel
`public/reel/` + `manifest.json`, consumed by the landing (falls back to `public/keyart/`). Generate with live keys: `npm run brand-shoot` (20 frames, House Style, refuses on mock). Motion: ~19s Ken Burns, 1.8s cross-dissolve, ember layer above, ink letterbox for legibility, sequenced dawn → battle → ruin → triumph. `prefers-reduced-motion`: one still, no embers.

## Voice of the brand
Mythic but wry. Second person. Short blade sentences. Sell the fantasy, never the machinery — no AI-jargon, no architecture words on player surfaces.
