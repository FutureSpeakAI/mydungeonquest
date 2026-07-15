// THE BRAND SHOOT — generates the landing reel in the House Style
// through the game's own paint adapter. Run with live keys:
//   PAINT_PROVIDER=gemini GEMINI_API_KEY=... npm run brand-shoot
// Refuses politely on mock — placeholder art must never wear the brand.
import { mkdirSync, writeFileSync } from 'node:fs';
import { adapters } from '../server/adapters/index.js';
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
for (const [index, shot] of SHOTS.entries()) {
  const name = `reel-${String(index + 1).padStart(2, '0')}`;
  try {
    const art = await set.paint.paint({ prompt: `${HOUSE_STYLE}. 16:9 cinematic frame. ${shot}.`, kind: 'scene', size: '1536x1024' });
    const ext = (art.mime || 'image/png').includes('jpeg') ? 'jpg' : (art.mime || '').includes('webp') ? 'webp' : 'png';
    writeFileSync(new URL(`../public/reel/${name}.${ext}`, import.meta.url), art.bytes);
    images.push(`/reel/${name}.${ext}`);
    console.log(`✦ ${name} — ${shot.slice(0, 48)}…`);
  } catch (error) { console.error(`✕ ${name}: ${error.message}`); }
}
writeFileSync(new URL('../public/reel/manifest.json', import.meta.url), JSON.stringify({ images }, null, 2));
console.log(`The reel holds ${images.length} frames.`);
