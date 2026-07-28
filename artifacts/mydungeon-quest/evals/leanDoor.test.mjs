// evals/leanDoor.test.mjs — THE LEAN DOOR (Task 65, Phase 4; Experience Directive XX, Law V).
//
// The table arrives before the shelves: the turn pipeline loads with the
// entry, and every other surface arrives lazily on its own road. This court
// reads dist/.vite/manifest.json (the check builds before it evals) and
// proves the door's weight aloud on every run. Keyless, network-free.
//
// THE PIN, as ruled by the owner (2026-07-23; movement ledger below): the
// directive's 520 kB was aspiration; the measured honest floor on ruling day
// was 602 kB — react-dom ~223k min, the engine's turn law ~189k, the table's
// own surface ~64k, dexie ~41k, pipeline libs ~50k. The pin binds the
// SYNCHRONOUS CLOSURE — the entry chunk plus every chunk statically imported
// from it, transitively, summed raw bytes on disk — never the entry file
// alone. The closure is the honest quantity: however the sync graph is
// arranged, the sum is the sum, so vendor-split laundering (a second
// synchronous chunk that changes the measured number and not one byte the
// player downloads before the table breathes) is structurally impossible
// rather than banned by words.
//
// THE MOVEMENT LEDGER — every seat the pin has taken, one line each:
//   2026-07-23 — measured 602 kB; ruled 610 kB. First seat: ten of headroom
//     so the court reds on growth, not on a dependency sliver.
//   2026-07-24 — measured 614 kB; ruled 624 kB. The alias ledger's turn-law:
//     the name road and collision court ride the client entry because turns
//     validate on the device — law growing, not a surface creeping back.
//     Headroom mirrors ruling day at ten.
//   2026-07-27 — measured 625 kB; ruled 625 kB. A3 substance floors: the
//     NARRATION_FLOOR constant, validatePresenceDialogue, expanded
//     safeFallbackTurn text, systemPrompt floor-as-requirement prose, and
//     EDITOR_ADDENDUM measure-word ranges — all turn-law that validates on
//     the device. Law growing, not a surface creeping back. No headroom;
//     ratchet binds at the measured value.
//   2026-07-27 — measured 626 kB; ruled 626 kB. B2 opening flow: the four
//     named genesis labels, step map, PAINT_BUDGET_MS, OVER_BUDGET_MESSAGE
//     (openingFlow.js module), plus genesisStep/overBudget state, onTurnSealed
//     hook wiring in both genesis paths, and streaming-div label swap in
//     App.jsx. All behavioral law for the first sixty seconds — no new
//     surface, no ceremony word. Law growing, not a surface creeping back.
//   2026-07-28 — measured 628 kB; ruled 628 kB. D5 house controls: HcSwitch
//     (role=switch, aria-checked, 44×44 hit area) and HcSlider (role=slider,
//     keyboard arrows, discrete pips) with TEXT_SCALE_STOPS added to
//     Overlays.jsx — a direct static import from App.jsx, so it rides the
//     synchronous road. Accessible controls replacing native browser inputs
//     — UI law growing, not a surface creeping back.
//   2026-07-28 — measured 629 kB; ruled 629 kB. D7 surface parity: currentClock
//     and canonicalNames selectors added to waypost.js; heroName const +
//     hero-synthetic entry added to Book.jsx (cast grid); knownCount useMemo
//     added to App.jsx; all surfaces route through one clock and one name gate.
//     Law growing, not a surface creeping back.
//
// THE STANDING RULE: the pin moves upward only on the owner's word with a
// named turn-law justification — any unjustified growth is a red, not a
// negotiation. Between rulings the ratchet stays downward-only, and the pin
// tightens the day the engine's turn law slims.
//
// Two deviations stand lawful and PINNED here, not merely tolerated: the
// atelier rides sync as pipeline timber (the prologue's own import road),
// and the Chart rides inside the Book's lazy chunk rather than holding its
// own row — this court asserts the Chart keeps no row of its own and that
// neither the Book nor the Chart is reachable in the entry's synchronous
// closure.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { entryClosureOf, closureBytesOf } from './manifestClosure.mjs';

const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(GAME_ROOT, 'dist');
const PIN_KB = 629; // ruled 2026-07-28 — see the movement ledger in this header
// CROSS-POINTER: the web-of-souls seating court (soulsWeb.test.mjs) pins the
// closure's EXACT bytes; a ruled move of the closure re-seats BOTH pins in
// the same ruling. Both courts read the ONE walk in manifestClosure.mjs.

const manifest = JSON.parse(
  readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'),
);

// ── Court 1 — one entry, and its synchronous closure weighs under the pin ──
const { entryKeys, closure } = entryClosureOf(manifest);
assert.equal(
  entryKeys.length,
  1,
  `the table keeps exactly one entry — the manifest names ${entryKeys.length}: ${entryKeys.join(', ')}`,
);

const closureBytes = closureBytesOf(manifest, closure, DIST);
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
// The census is load-bearing for the WHOLE dynamic roll, not only the named
// surfaces: no dynamic entry may also ride the entry's synchronous closure,
// so the only road onto the table is the lawful one — argued to the owner.
// One identity exemption: the entry chunk itself may wear the dynamic mark
// (a lazy road importing a module the table already carries resolves to the
// entry chunk, and Rollup marks the target) — the table cannot be a shelf.
for (const key of Object.keys(manifest)) {
  if (!manifest[key].isDynamicEntry || manifest[key].isEntry) continue;
  assert.ok(
    !closure.has(key),
    `${key} stands in the dynamic rolls yet rides the entry's synchronous closure — a shelf bolted to the table's road`,
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
