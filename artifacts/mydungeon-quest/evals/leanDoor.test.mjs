// evals/leanDoor.test.mjs — THE LEAN DOOR (Task 65, Phase 4; Experience Directive XX, Law V).
//
// The table arrives before the shelves: the turn pipeline loads with the
// entry, and every other surface arrives lazily on its own road. This court
// reads dist/.vite/manifest.json (the check builds before it evals) and
// proves the door's weight aloud on every run. Keyless, network-free.
//
// THE PIN, as ruled by the owner (2026-07-23): the directive's 520 kB was
// aspiration; the measured honest floor on ruling day was 600 kB — react-dom
// ~223k min, the engine's turn law ~189k, the table's own surface ~64k,
// dexie ~41k, pipeline libs ~50k. The pin seats at 610 kB and binds the
// SYNCHRONOUS CLOSURE — the entry chunk plus every chunk statically imported
// from it, transitively, summed raw bytes on disk — never the entry file
// alone. The closure is the honest quantity: however the sync graph is
// arranged, the sum is the sum, so vendor-split laundering (a second
// synchronous chunk that changes the measured number and not one byte the
// player downloads before the table breathes) is structurally impossible
// rather than banned by words. The ratchet is unchanged: 610 moves only
// DOWNWARD, and it bites on the next real growth.
//
// Two deviations stand lawful and PINNED here, not merely tolerated: the
// atelier rides sync as pipeline timber (the prologue's own import road),
// and the Chart rides inside the Book's lazy chunk rather than holding its
// own row — this court asserts the Chart keeps no row of its own and that
// neither the Book nor the Chart is reachable in the entry's synchronous
// closure.

import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(GAME_ROOT, 'dist');
const PIN_KB = 610; // moves only downward — see the ruling in this header

const manifest = JSON.parse(
  readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'),
);

// ── Court 1 — one entry, and its synchronous closure weighs under the pin ──
const entryKeys = Object.keys(manifest).filter((k) => manifest[k].isEntry);
assert.equal(
  entryKeys.length,
  1,
  `the table keeps exactly one entry — the manifest names ${entryKeys.length}: ${entryKeys.join(', ')}`,
);

const closure = new Set();
const stack = [...entryKeys];
while (stack.length) {
  const key = stack.pop();
  if (closure.has(key)) continue;
  closure.add(key);
  for (const imported of manifest[key].imports ?? []) stack.push(imported);
}

let closureBytes = 0;
for (const key of closure) {
  closureBytes += statSync(path.join(DIST, manifest[key].file)).size;
}
const closureKb = Math.ceil(closureBytes / 1024);
assert.ok(
  closureBytes <= PIN_KB * 1024,
  `the entry's synchronous closure weighs ${closureKb} kB (${closureBytes} bytes) — over the ${PIN_KB} kB pin; the pin moves only downward, so either a surface crept onto the sync road or real growth must be argued to the owner, never laundered into a second sync chunk`,
);

// ── Court 2 — the named surfaces stand in the manifest's dynamic rolls ──
const LAZY_SURFACES = [
  'src/components/Book.jsx', // the Book (the Chart rides within it)
  'src/components/Forge.jsx', // the forge doors
  'src/lib/sitting.js', // the sitting, preloaded beside the forge
  'src/components/Overlays.jsx', // sheet, settings, and their kin
  'src/lib/storybook.js', // the binder
  'src/lib/bookFonts.js', // the binder's fonts
  'src/lib/podcast.js', // the podcast forge
  'src/lib/cinema/questaudio.js', // the podcast forge's bellows
  'src/components/Ceremony.jsx',
  'src/components/PublicTale.jsx', // the commons' reading room
  'src/lib/saga.js',
  'src/lib/proving.js', // the proving hook
  'src/lib/smithClient.js',
  'src/patron/door.jsx', // the patron door and its Clerk timber
];
for (const key of LAZY_SURFACES) {
  assert.ok(
    manifest[key]?.isDynamicEntry,
    `${key} must stand in the manifest's dynamic rolls (isDynamicEntry) — it is a shelf, not the table`,
  );
}

// ── Court 3 — no split surface is statically reachable from the entry ──
for (const key of LAZY_SURFACES) {
  assert.ok(
    !closure.has(key),
    `${key} rides the entry's synchronous closure — a shelf crept onto the table's road`,
  );
}
// The pinned deviation: the Chart keeps no row of its own (it rides inside
// the Book's chunk), and neither the Book nor the Chart touches the closure.
assert.equal(
  Object.keys(manifest).some((k) => k.includes('TravelersChart')),
  false,
  'the Chart must keep no manifest row of its own — it rides inside the Book',
);
assert.ok(
  ![...closure].some((k) => k.includes('TravelersChart') || k === 'src/components/Book.jsx'),
  "neither the Book nor the Chart may be reachable in the entry's synchronous closure",
);

const lazyCount = Object.values(manifest).filter((c) => c.isDynamicEntry).length;
console.log(
  `PASS — the lean door: the table's synchronous closure weighs ${closureKb} kB (pin ${PIN_KB} kB, ratchet downward-only) and ${lazyCount} surfaces arrive lazily — the Book carries the Chart, the atelier rides as pipeline timber, and no split surface touches the entry road.`,
);
