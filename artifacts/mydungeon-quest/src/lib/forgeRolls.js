// Compat seat — the Hooked World cut addresses the engine by its old
// in-game path; the engine answers from its true home.
export * from 'fatescript/forgeRolls';

// THE LOOK DIE (G3) — the deep forge promises a die beside every field;
// the style bible now has its own table. Same contract as the other rolls:
// a seed in, a value out, deterministic for the proving rig.
const LOOKS = [
  'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.',
  'Woodcut-and-watercolor storybook: heavy ink outlines, muted earth pigments, candlelit interiors, weather always about to turn.',
  'High-clarity fresco style — sun-bleached plaster tones, long shadows, heroic silhouettes, dust hanging in cathedral light.',
  'Smoky charcoal-and-ember palette: soot blacks, forge oranges, faces lit from below, edges that fray into darkness.',
  'Tapestry-woven epic: flattened perspective, jewel-tone thread colors, borders of vine and rune, every scene a panel.',
  'Moonlit gouache — silver-blue nights, lantern golds, soft edges, mist pooling in valleys, stars sharp as needles.'
];
export function rollLook(seed) {
  const at = Math.abs(Math.trunc(Number(seed) || 0)) % LOOKS.length;
  return LOOKS[at];
}
