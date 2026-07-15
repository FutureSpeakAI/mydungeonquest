// THE BRAND SHOOT — generates the landing reel in the House Style
// through the game's own paint adapter. Run with live keys:
//   PAINT_PROVIDER=gemini GEMINI_API_KEY=... npm run brand-shoot
// Refuses politely on mock — placeholder art must never wear the brand.
//
// The shoot walks the Watchtower's toll gate like every other painter:
// each frame checks the day's ceiling first and puts a mark on the tally,
// and when the ceiling is reached the shoot STANDS DOWN — it never burns
// past the bar. Frames already on the wall are kept, not repainted, so a
// rerun finishes an interrupted shoot instead of paying twice (RESHOOT=1
// repaints everything). A reel that comes up short is refused (no manifest,
// the landing keeps its keyart fallback) unless ALLOW_PARTIAL_REEL=1.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { adapters } from '../server/adapters/index.js';
import { spendAllowed, recordSpend } from '../server/watchtower.js';
import { HOUSE_STYLE } from '../src/lib/cinema/prompts.js';

const SHOTS = [
  'lone rider at dawn on a ridge above a burning valley, banner tattered',
  'colossal sea-gate cracked open, moonlit tide pouring through, tiny figure with a lantern',
  'shield-wall bracing in a snow pass as something vast blots the sun',
  'drowned cathedral, choir of candles floating on black water',
  'queen in ash-grey mail crowning herself before an empty throne',
  'dragon shadow crossing a golden wheat sea, farmers frozen mid-harvest',
  'duel on a rope bridge over cloud, two silhouettes, one torch falling',
  'library-tower struck by lightning, pages rising like birds',
  'war-camp at night, a thousand small fires, one tent glowing gold',
  'giant knight kneeling to a child holding a wooden sword',
  'blighted forest parting around a single unburned white tree',
  'armada of lantern-ships entering a fjord of ice',
  'sorcerer holding a doorway of light closed with bare hands',
  'ruined amphitheatre, a bard playing to ghosts in the rain',
  'wounded hero carried on a shield through cheering torchlight',
  'clockwork colossus half-buried in desert, campfire in its palm',
  'oath sworn on a broken sword under a blood eclipse',
  'bridge of chains over a starlit abyss, procession of pilgrims',
  'last stand on a lighthouse stair, sea-beast coiling below',
  'dawn after the battle — banners lowered, one figure walking home'
];

const set = adapters();
if (!set.paint || set.paint.name === 'mock') {
  console.error('The shoot needs a live painter — set PAINT_PROVIDER and its key. Placeholder art must never wear the brand.');
  process.exit(1);
}
mkdirSync(new URL('../public/reel/', import.meta.url), { recursive: true });
const images = [];
let stoodDown = false;
let painted = 0;
for (const [index, shot] of SHOTS.entries()) {
  const name = `reel-${String(index + 1).padStart(2, '0')}`;
  const already = process.env.RESHOOT ? null : ['jpg', 'png', 'webp'].find((ext) => existsSync(new URL(`../public/reel/${name}.${ext}`, import.meta.url)));
  if (already) {
    images.push(`/reel/${name}.${already}`);
    console.log(`✓ ${name} — already on the wall, kept`);
    continue;
  }
  if (!(await spendAllowed(set.paint.name))) {
    console.error(`✕ ${name}: the day's ceiling for the painter is reached — the shoot stands down here. Rerun tomorrow, or raise SPEND_CEILING_${String(set.paint.name).toUpperCase()}.`);
    stoodDown = true;
    break;
  }
  await recordSpend(set.paint.name); // the mark lands before the work, mirroring the game's own law
  try {
    const art = await set.paint.paint({ prompt: `${HOUSE_STYLE}. 16:9 cinematic frame. ${shot}.`, kind: 'scene', size: '1536x1024' });
    const ext = (art.mime || 'image/png').includes('jpeg') ? 'jpg' : (art.mime || '').includes('webp') ? 'webp' : 'png';
    writeFileSync(new URL(`../public/reel/${name}.${ext}`, import.meta.url), art.bytes);
    images.push(`/reel/${name}.${ext}`);
    painted += 1;
    console.log(`✦ ${name} — ${shot.slice(0, 48)}…`);
  } catch (error) { console.error(`✕ ${name}: ${error.message}`); }
}
const complete = images.length === SHOTS.length;
if (!complete && !process.env.ALLOW_PARTIAL_REEL) {
  console.error(`The reel holds ${images.length} of ${SHOTS.length} frames${stoodDown ? ' (the ceiling called time)' : ''} — not enough to wear the brand. No manifest was written; the landing keeps its keyart. Rerun to finish (kept frames are not repainted), or set ALLOW_PARTIAL_REEL=1 to accept a shorter reel.`);
  process.exit(1);
}
writeFileSync(new URL('../public/reel/manifest.json', import.meta.url), JSON.stringify({ images }, null, 2));
console.log(`The reel holds ${images.length} frames (${painted} newly painted).`);
