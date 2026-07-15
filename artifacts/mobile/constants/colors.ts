/**
 * Semantic design tokens for the Android shell.
 *
 * The house is always night: ink surfaces, vellum text, gold foil actions —
 * the same palette the web house wears (see the game's styles.css). Light and
 * dark are deliberately identical so the shell never flashes a white frame,
 * whatever the system theme says.
 */

const house = {
  // Legacy aliases (kept for backward compatibility)
  text: '#efe6d0',
  tint: '#d4a24e',

  // Core surfaces
  background: '#0d0b14',
  foreground: '#efe6d0',

  // Cards / elevated surfaces
  card: '#161225',
  cardForeground: '#efe6d0',

  // Primary action color (buttons, links, active states)
  primary: '#d4a24e',
  primaryForeground: '#1a1206',

  // Secondary / less-emphasis interactive surfaces
  secondary: '#241d38',
  secondaryForeground: '#efe6d0',

  // Muted / subdued elements (dividers, timestamps, placeholders)
  muted: '#241d38',
  mutedForeground: '#9a8f78',

  // Accent highlights (badges, selected items, focus rings)
  accent: '#241d38',
  accentForeground: '#f3d489',

  // Destructive actions (delete, error states)
  destructive: '#a8342a',
  destructiveForeground: '#f5e9e7',

  // Borders and input outlines
  border: '#2c2344',
  input: '#2c2344',
};

const colors = {
  light: house,
  dark: house,

  // Border radius (in px) — matches the house's soft-carved corners.
  radius: 12,
};

export default colors;
