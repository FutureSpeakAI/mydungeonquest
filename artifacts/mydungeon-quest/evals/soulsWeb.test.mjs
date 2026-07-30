// ---- THE WEB OF SOULS SEATING (Directive XX, Article Five, Law XIV) ----
//
// The table-side court over the drawn web, twinned with the engine's
// soulsWeb gate (which judges the pure fraction on the same fixture
// tale):
//   1. THE SHELF: the surface rides the Book's OWN lazy chunk — no
//      manifest row of its own (the Chart's precedent), no new
//      synchronous entry, the built Book chunk carrying the web's
//      words, and the entry's closure UNMOVED at its exact bytes,
//      pinned to the measured build of the morning the web was seated.
//      Cross-pointed with the lean door's kB pin; both courts read the
//      ONE closure walk in manifestClosure.mjs.
//   2. THE SEAT: the surface asks the canonical gate (canonicalNames,
//      D7) and hands the answer to the engine builder — hero + introduced
//      cast + party companions; a private reading of the canon is a red,
//      by the alias lesson's sibling law; the Seen Ledger is never consulted.
//   3. THE RENDER: house words — bound by blood, sworn enemies — never
//      machinery; the dead rest marked; the unmet absent from every
//      rendered byte; a soul opens toward their page in the Book's
//      manner, by tap and by key.
//   4. THE ELDER SAVE: a pre-web record, deep-frozen, renders its web
//      lawfully from whatever it holds — the grandfather bench seats,
//      canon without record stays absence, loading writes nothing.
// Headless — no AI keys, no browser — react-test-renderer + esbuild
// loader + fake-indexeddb. Convicted red at birth (standing law):
// (α) a private reading planted in the surface — the source court
// refused it; (β) the surface seated on the entry's synchronous road —
// the closure court refused the moved bytes.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire, register } from 'node:module';
import { entryClosureOf, closureBytesOf } from './manifestClosure.mjs';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

// The web is a reading: nothing in it may reach for the wire.
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: false, blob: async () => new Blob([], { type: 'application/octet-stream' }), headers: { get: () => null } };
};

const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(GAME_ROOT, 'dist');

// THE EXACT-BYTES PIN: the entry's synchronous closure, measured
// 2026-07-25. Before the web was seated the closure weighed 635164
// bytes; seating it moved the sum to 635173 — NINE bytes, examined
// before they were ruled lawful: the entry's export tail grew because
// it now LENDS its own engine folds to the Book's chunk (the walk law
// the web draws already rides sync for turn validation; rollup shares
// the one copy rather than minting a second into the lazy shelf). The
// entry file was proven clean of every web string — the surface, its
// words, and the builder live in the Book's chunk alone. Nine bytes of
// lending glue beats a duplicated law by thousands, so the pin seats
// at the measured bytes and binds EXACTLY: any future move — even one
// byte — is argued to the owner at the lean door's movement ledger and
// re-seats this pin in the SAME ruling.
//
// RE-SEATED 2026-07-25 (Phase 14, THE DOWRY DOOR, Directive XX Art. Five
// Law XV — the standing directive is the ruling): 635173 → 636414, a
// move of 1241 bytes, examined byte by byte before it was ruled lawful.
// The growth is the threshold GLUE in the entry's own App.jsx — the
// blessed-gift guard, two dynamic-import call sites (whose destructured
// property names applyDowry/sha256 and the rewritten chunk URL lawfully
// print in entry bytes), the seal payload builder, the refusal status
// line, and the fresh-head re-read. The ceremony, the engine module,
// and every court word were PROVEN absent: the entry chunk is denylist-
// clean of the ceremony's words (the dowry gate's own tooth walks that
// list every run) and the dowry module rides the dynamic rolls. The
// lean door stands uncrossed at 621.5 kB against its 624 kB pin.
//
// RE-SEATED 2026-07-25, same day, second sitting (Phase 14, THE
// GROUNDING COURT — the architect's δ conviction; the standing
// directive is the ruling): 636414 → 636450, a move of 36 bytes,
// examined before it was ruled lawful. The growth is the provenance
// rider in the seal payload builder — the threshold glue already ruled
// lawful above now carries the player's own amended mark into the
// sealed dowry row (`amended` in the destructure, the conditional
// spread that keeps absence absent). It is the SAME seat as the 1241-
// byte ruling, grown by one honest field; no ceremony word, no court
// word, no engine module entered the entry — the dowry gate's denylist
// tooth walked its list green on the very build that measured 636450.
// The lean door stands uncrossed, 621.6 kB against its 624 kB pin.
// Task 66 A1 (plateTrace instrumentation): plateroad.js gained the
// PLATE_TRACE_LOG array and plateTrace() emitter; App.jsx gained the
// mint/arrive trace calls and logId on admitPlate. All additions are
// diagnosis-only pure functions and console emits — no new surfaces.
// 636450 → 637654, a move of 1204 bytes. Owner ruling: A1 diagnosis.
// Task 67 A2 (plate binding fix): admitPlate gained the logId-first
// branch with hash fallback; App.jsx stamps logId: job.logId in
// imagePapers at plate arrival. All changes are pure routing logic in
// the render door and the setCurrent callback — no new surfaces.
// 637654 → 637723, a move of 69 bytes. Owner ruling: A2 fix.
// Task 68 A3 (substance floors): NARRATION_FLOOR constant and its
// byMeasure bands, validatePresenceDialogue (client-side validator),
// expanded safeFallbackTurn text (~50 words up from ~34), systemPrompt
// floor-as-requirement prose (the constant's values interpolated at
// call time), and EDITOR_ADDENDUM measure-word ranges. All are turn-law
// additions that validate on the device — no new surfaces, law growing.
// 637723 → 639550, a move of 1827 bytes. Owner ruling: A3 substance floors.
// Landing bench parity fix (A3, same ruling): App.jsx now seats beatMeasure
// from beat_intent before calling validateDmTurn at the client landing — a
// 190-word standard turn refused by the legacy ceiling (180) is accepted when
// beatMeasure rides the context, matching the server bench exactly. The new
// seat is one conditional assignment and one comment — pure routing glue.
// 639550 → 639605, a move of 55 bytes. Owner ruling: A3 parity fix.
// 639605 → 639583, a move of -22 bytes. Owner ruling: A4 curtain — the
// storyBlock beat spread now strips the player-facing `opening` field
// (added to spines.js as a structural curtain) from the model context.
// The beats helper defaults opening to title so no new string literals
// ride the sync road; the closure shrank because spines.js now carries
// only one beat field instead of a spread-all.
// Task B2 (opening flow — the first sixty seconds): openingFlow.js added
// to the entry's sync closure (four named genesis labels, step map,
// PAINT_BUDGET_MS, OVER_BUDGET_MESSAGE); App.jsx gained genesisStep and
// overBudget state, onTurnSealed hook wiring in both genesis paths, and
// the streaming-div label swap. All are behavioral law for the opening
// sixty seconds — no new surface, no ceremony word, law growing.
// 639583 → 640325, a move of 742 bytes. Owner ruling: B2 opening flow.
// 640325 → 640040, a move of -285 bytes. Owner ruling: C1 creation step router
//   (WorldForge export + world/hero two-page route removed; CreationRouter and
//    single creation route replace them; net closure shrink).
// 640040 → 640089, a move of +49 bytes. Owner ruling: C1 — Dowry secondary
//   section added to World step (the ceremony stays reachable; door==='dowry'
//   state + WORLD_SECONDARY array + Dowry render). Net still -236 vs pre-C1.
// 640089 → 640080, a move of -9 bytes. Owner ruling: C2 — keyArtUrlRef ref
//   and its revokeObjectURL cleanup removed (key-art preview paint retired;
//   deck uses bundled assets). Ratchet tightens downward.
// 640080 → 640186, a move of +106 bytes. Owner ruling: D4 — pack-head
//   restructured to vertical framed card at 4:5 (pack-portrait class,
//   pack-identity wrapper, pack-portrait-placeholder; soul-face retired from
//   pack context).
// 640186 → 642106, a move of +1920 bytes. Owner ruling: D5 house controls
//   — HcSwitch (role=switch, aria-checked, 44×44 hit) and HcSlider
//   (role=slider, keyboard arrows, discrete pips) with TEXT_SCALE_STOPS
//   added to Overlays.jsx, which is a static import from App.jsx (rides
//   the synchronous road). Accessible controls replacing native browser
//   inputs — UI law growing on the sync road, not a surface creeping back.
// 645967 → 645871, a move of -96 bytes. Owner ruling: E5 narration law fix.
//   The hardcoded 20-180 legacy validator fallback was retired and replaced
//   with NARRATION_FLOOR.byMeasure.none (60-160 words), removing the
//   unsatisfiable 200-word rich floor vs 180-word ceiling conflict. The
//   safeFallbackTurn text was extended (+60 chars for playerText path,
//   +100 chars for empty path) but the protocol.js validator block shrank
//   by more (replaced the conditional if/else with one unified block).
//   fitToMeasure in mockDm.js gained word-count padding (to clear the
//   60-word none floor for mock turns stripped of beat_intent during
//   validation), which added code but the net bundle change is -96 bytes.
//   No surface words entered the entry; no ceremony word. Ratchet tightens.
// 645871 → 645880, a move of +9 bytes. Owner ruling: E6 beat-split fix (P4).
//   chapterInfo (story.js) now returns `opening: beat.opening` instead of
//   `goal: beat.goal`. App.jsx mast renders chapter.opening (player-facing
//   chapter hook), never chapter.goal (model-facing design directive). The
//   property name grew by 3 chars (goal→opening); minifier emits +9 bytes.
//   No new surface entered the entry; P4 bug closed, view boundary enforced.
// 645880 → 646228, a move of +348 bytes. Owner ruling: E7 Chrome regressions
//   T6-T11. CSS: scroll-snap-type on .suggestions, scroll-snap-align on
//   .chip-item, object-position:left top on .sigil-portrait, background-repeat:
//   no-repeat on .region-strip. App.jsx: party chip rewritten to "Traveling
//   alone" + separate chip-known span; plateNumeral switched from romanNumeral()
//   to String(); cueCaption() helper added (subjects+region, skips cue.mood).
//   Two new evals: chromeRegressions, captionDistinct. UI and caption law only.
// 646228 → 646337, a move of +109 bytes. Owner ruling: Stage 3 G1+G3 fixes.
//   G3 scene plate cacheKey: ternary `? ... : undefined` replaced with
//   `|| logId` fallback + explanatory comment block (E3 isolation rule).
//   G1 onOpen guard: inline one-liner callback wrapped in try/catch with a
//   `let opened` local so setCurrent is always called even on shape drift.
//   No new surfaces. Law growing (Rule 21 campaign isolation, Rule 24 record
//   survives the code). Three new evals added: plateBindingLive, loadNeverThrows,
//   harnessHonest. soulsWeb pin and leanDoor KB ceiling both re-seated.
// 646337 → 647496, a move of +1159 bytes. Owner ruling: Stage 4 H1–H3.
//   H1: narrator.js play() rejection catch gains console.error with segment
//   index and error name (Rule 27 — refusal logging, not suppression).
//   H2: refusalLog.js (new sync module) + logRefusal calls in audioDirector.js,
//   smithClient.js, foundry.js, proving.js — Rule 27 compliance. Every
//   previously silent refusal door now emits a structured record. Permanent
//   developer observability, not a surface or ceremony word.
//   H3: plateKey.js (new sync module) + scenePlateKey import in App.jsx;
//   cacheKey expression simplified from inline template to shared function call
//   (same net length but plateKey.js adds a small new module). P16 closed.
//   Two new evals added: refusalsAreLoud, plateKeyStable. Law growing.
//   soulsWeb pin and leanDoor KB ceiling both re-seated.
// 647496 → 647664, a move of +168 bytes. Owner ruling: Stage 4 H6.
//   App.jsx startup useEffect gained a dynamic import of sweepUnscoped.js +
//   sweepUnscopedMedia() call with .catch guard (E3 migration wiring). The
//   import is dynamic (not top-level) so sweepUnscoped.js is NOT added to
//   the synchronous closure — the entry closure itself stayed the same size;
//   these +168 bytes are from the import() call expression and comment text
//   added to App.jsx (App.jsx is already on the sync road). No new surface.
//   leanDoor KB ceiling stays 633 (647664 / 1024 = 632.5, ceiling rounds up).
//   soulsWeb pin re-seated only; leanDoor pin unchanged.
// 647664 → 647828, a move of +164 bytes. Owner ruling: Stage 4 H7.
//   App.jsx startup useEffect gained a dynamic import of storageQuota.js +
//   checkStorageQuota() call with .catch guard (H7 storage quota wiring). Same
//   pattern as H6: dynamic import keeps storageQuota.js off the sync closure;
//   +164 bytes are from the import() call expression and comment text added to
//   App.jsx (App.jsx is already on the sync road). No new surface, no ceremony
//   word. Law growing (Rule 27 quota guard). leanDoor KB ceiling stays 633
//   (647828 / 1024 = 632.6, ceiling still rounds to 633). soulsWeb pin only.
// 647828 → 648200, a move of +372 bytes. Owner ruling: Stage 5 J1.
//   foundry.js resolveAnchors() gained a belt-and-suspenders E3 assertion
//   block at the anchor-resolution exit: logRefusal call + throw + comment
//   (37 lines). Makes a regression in the Dexie campaignId index a hard
//   failure instead of silent contamination (E3 item 4). foundry.js is on
//   the sync closure via App.jsx import chain. leanDoor KB ceiling moves
//   from 633 to 634 (648200 / 1024 = 633.008, Math.ceil = 634).
// 648200 → 647977, a move of -223 bytes. Owner ruling: Stage 5 J3.
//   App.jsx cueCaption() gained word-boundary backtracking for the plateMood
//   fallback (P20 fix: replaces a bare return with a raw/capped two-liner).
//   App.jsx is on the sync closure. Closure shrank; leanDoor KB ceiling
//   drops from 634 to 633 (647977 / 1024 = 632.79, Math.ceil = 633).
// 647977 → 648375, a move of +398 bytes. Owner ruling: Stage 5 J4.
//   App.jsx tick invocation gained the P22 time-unit guard block (7 lines:
//   TICK_WORTHY_UNITS constant, tickWorthy predicate, updated condition).
//   App.jsx is on the sync closure. leanDoor KB ceiling returns to 634
//   (648375 / 1024 = 633.18, Math.ceil = 634).
// 648375 → 648343, a move of -32 bytes. Owner ruling: Stage 6 K6.
//   Two recordHash||id conditionals shortened to bare logId/log.id identifiers
//   in App.jsx and narrator.js. The || branch is eliminated by the minifier.
//   Downward ratchet is lawful. leanDoor KB ceiling unchanged: 634
//   (648343 / 1024 = 633.15, Math.ceil = 634).
// 648343 → 649461, a move of +1118 bytes. Owner ruling: Stage 7 Task 145.
//   storageQuota.js gained _proactiveEvictImpl + proactiveEvictIfNeeded +
//   QUOTA_EVICT_THRESHOLD. cellar.js gained evictBlobsOnly + horizon param.
//   App.jsx wired two new import() call-sites (startup + act-close). All new
//   logic rides dynamic imports; the sync-road growth is App.jsx prose and
//   the new call-site wiring. Quota-pressure eviction law growing on the sync
//   road, not a surface creeping back. leanDoor KB ceiling moves to 635
//   (649461 / 1024 = 634.24, Math.ceil = 635).
const CLOSURE_BYTES_PIN = 649461;

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};
function collectWhere(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectWhere(child, pred, out); return out; }
  if (node.props && pred(node)) out.push(node);
  if (node.children) collectWhere(node.children, pred, out);
  return out;
}
const collectByClass = (node, token) => collectWhere(node, (n) => String(n.props?.className || '').split(/\s+/).includes(token));
const textOf = (node) => node == null || typeof node === 'boolean' ? ''
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('')
  : textOf(node.children);

// ---- Court 1 — THE SEAT: the source itself asks the wiki's own reveals seat ----
const surfaceSrc = readFileSync(path.join(GAME_ROOT, 'src/components/SoulsWeb.jsx'), 'utf8');
// D7: the reveals gate is now canonicalNames (waypost.js) — hero + introduced cast + party;
// a surface narrower than this gate disagrees with the cast grid and the party chip.
assert.match(surfaceSrc, /canonicalNames\(/, 'the surface asks the canonical gate (canonicalNames, D7) — the one seat shared by cast, graph, and party');
assert.match(surfaceSrc, /from '\.\.\/lib\/waypost\.js'/, 'the canonical gate lives in waypost.js — the D7 one-road selector home');
assert.match(surfaceSrc, /buildSoulsWeb\(/, 'the web is the engine\u2019s pure fold, drawn — never re-derived here');
assert.match(surfaceSrc, /from 'fatescript\/soulsWeb'/, 'the builder rides the one road from the engine');
assert.doesNotMatch(surfaceSrc, /codex\s*\??\.\s*cast/, 'a private reading of the canon is a red — no surface grows its own reveals resolver');
assert.doesNotMatch(surfaceSrc, /isIntroduced/, 'the introduction law is asked, never re-derived');
assert.doesNotMatch(surfaceSrc, /\/db\.js|listReveals|revealSet/, 'no vault read, and the Seen Ledger (art reveals) is not the story seat');
const bookSrc = readFileSync(path.join(GAME_ROOT, 'src/components/Book.jsx'), 'utf8');
assert.match(bookSrc, /import SoulsWeb from '\.\/SoulsWeb\.jsx'/, 'the web rides the Book\u2019s chunk by a static import from the Book itself');
assert.match(bookSrc, /<h3>The web of souls<\/h3>/, 'the Book hangs the web under its own heading, in house words');
assert.match(bookSrc, /<SoulsWeb campaign=\{campaign\} onNav=\{onNav\} statusWord=\{STATUS_WORD\} \/>/, 'the Book seats the web on the People page with the house\u2019s own status words');

// ---- Court 2 — THE SHELF: the manifest, the closure, the exact bytes ----
const manifest = JSON.parse(readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'));
assert.equal(
  Object.keys(manifest).some((k) => k.includes('SoulsWeb')),
  false,
  'the web keeps no manifest row of its own — it rides inside the Book, as the Chart does',
);
assert.ok(manifest['src/components/Book.jsx']?.isDynamicEntry, 'the Book still stands in the dynamic rolls');
const { entryKeys, closure } = entryClosureOf(manifest);
assert.equal(entryKeys.length, 1, `no new synchronous entry — the manifest names ${entryKeys.length}`);
assert.ok(
  ![...closure].some((k) => k.includes('SoulsWeb') || k === 'src/components/Book.jsx'),
  'neither the Book nor the web is reachable in the entry\u2019s synchronous closure',
);
const closureBytes = closureBytesOf(manifest, closure, DIST);
assert.equal(
  closureBytes,
  CLOSURE_BYTES_PIN,
  `the closure is UNMOVED at its exact bytes — measured ${closureBytes}, pinned ${CLOSURE_BYTES_PIN}; the web rides the Book\u2019s chunk or nowhere, and a lawful move re-seats this pin only in the same owner ruling as the lean door\u2019s`,
);
const bookChunk = readFileSync(path.join(DIST, manifest['src/components/Book.jsx'].file), 'utf8');
assert.ok(bookChunk.includes('The web of souls'), 'the built Book chunk carries the web — the words ride the lazy shelf');
// THE DENYLIST (architect's round, taken on the spot): the manual
// examination that ruled the nine bytes is now the court's own tooth —
// the entry chunk asserted clean of the web's words on EVERY run, so an
// equal-byte substitution can never hide behind the exact pin.
const entryChunk = readFileSync(path.join(DIST, manifest[entryKeys[0]].file), 'utf8');
for (const word of ['The web of souls', 'bound by blood', 'sworn enemies', 'web-strand', 'souls-web']) {
  assert.ok(!entryChunk.includes(word), `the entry chunk is denylist-clean of the web's words (found: ${word}) — the surface rides the Book's shelf or nowhere`);
}

// ---- The fixture tale: the engine twin's own six turns, seated table-side ----
const dmEnvelope = (over = {}) => ({
  narration_blocks: [], suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null,
  time_advance: null, entropy_use: [], ...over
});
const LOGS = [
  { id: 'e1', turn: 1, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Mira', role: 'healer', visual: 'Grey-eyed', voice: 'Warm', goal: 'mend the well', secret: 'SECRET-RING-9Q4X' }] } }) },
  { id: 'e2', turn: 2, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Tam', role: 'brother of Mira', visual: 'Wiry', voice: 'Quick', goal: 'map the road' }] } }) },
  { id: 'e3', turn: 3, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Brannoc', text: 'The vale is already mine.' }, { speaker: 'Mira', text: 'The vale answers to no crown.' }], story: { cast_add: [{ name: 'Brannoc', role: 'villain', visual: 'Crowned in wax', voice: 'Cold', goal: 'drain the vale' }] } }) },
  { id: 'e4', turn: 4, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Mira', text: 'Hold the lantern high.' }, { speaker: 'Tam', text: 'The ford is watching us.' }], story: { cast_update: [{ name: 'Mira', bond_delta: 3, bond_reason: 'Stood between the hero and the arch' }] } }) },
  { id: 'e5', turn: 5, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Edda', role: 'lantern-bearer', visual: 'Ash in her braid', voice: 'Low', goal: 'carry the light' }], cast_update: [{ name: 'Mira', known_as_add: 'The Rowan Witch' }] } }) },
  { id: 'e6', turn: 6, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'The Rowan Witch', text: 'The well remembers.' }], story: { cast_update: [{ name: 'Edda', status: 'dead', last_seen: 'the ford, at rest' }] } }) },
  // D6 — 5th soul raises the node count above the list-fallback threshold so
  // the fixture still exercises the full SVG canvas (Wren has no ties, so
  // strand counts are unchanged and the unmet/secret assertions hold).
  { id: 'e7', turn: 7, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Wren', role: 'guide', visual: 'Sure-footed and quiet', voice: 'Steady', goal: 'find the pass' }] } }) }
];
const fixtureCampaign = deepFreeze({
  id: 'c-web-fixture',
  hero: { name: 'Aldric', className: 'Warden' },
  codex: {
    arc: { evil_plot: 'DESIGN-TOKEN-7M2K drinks the valley dry' },
    cast: [
      { name: 'Mira', role: 'healer', status: 'active', bond: 3, introduced_turn: 1, known_facts: [], bond_arc: [] },
      { name: 'Tam', role: 'scout', status: 'active', bond: 1, introduced_turn: 2, known_facts: [], bond_arc: [] },
      { name: 'Edda', role: 'lantern-bearer', status: 'dead', bond: 2, introduced_turn: 5, known_facts: [], bond_arc: [] },
      { name: 'Brannoc', role: 'villain', secret: 'WEB-BAIT-4Q' },
      { name: 'Wren', role: 'guide', status: 'active', bond: 0, introduced_turn: 7, known_facts: [], bond_arc: [] }
    ]
  },
  logs: LOGS
});

const { default: SoulsWeb } = await import('../src/components/SoulsWeb.jsx');
const { STATUS_WORD } = await import('../src/components/Book.jsx');

// ---- Court 3 — THE RENDER: house words, the dead at rest, the unmet absent ----
const navLog = [];
let root;
await act(async () => { root = TestRenderer.create(h(SoulsWeb, { campaign: fixtureCampaign, onNav: (part) => navLog.push(part), statusWord: STATUS_WORD })); });
{
  const tree = root.toJSON();
  const bytes = JSON.stringify(tree);
  for (const token of ['Brannoc', 'WEB-BAIT-4Q', 'DESIGN-TOKEN-7M2K', 'SECRET-RING-9Q4X', 'The Rowan Witch']) {
    assert.ok(!bytes.includes(token), `the unmet, their secrets, and stray epithets are ABSENT from every rendered byte (leaked: ${token})`);
  }
  const text = textOf(tree);
  // D6: legend is filtered to PRESENT strand types — sworn enemies absent when no
  // enemy tie is sealed; the other three house words (kin, ally, met) are present.
  for (const words of ['bound by blood', 'oath and bond', 'paths crossed', 'sealed at turn', 'tap a soul to open their page']) {
    assert.ok(text.toLowerCase().includes(words.toLowerCase()), `the web speaks house words — missing: ${words}`);
  }
  assert.ok(!text.toLowerCase().includes('sworn enemies'), 'D6: filtered legend — sworn enemies absent when no enemy tie is sealed in the record');
  assert.doesNotMatch(text, /\b(nodes?|edges?|graph)\b/i, 'never machinery words — souls and strands, not nodes and edges');
  const souls = collectByClass(tree, 'web-soul');
  // D6: five known souls (Wren added to push fixture above the list-fallback threshold)
  assert.deepEqual(souls.map((soul) => textOf(soul).replace(/[^A-Za-z]/g, '').match(/Aldric|Mira|Tam|Edda|Wren/)?.[0]), ['Aldric', 'Mira', 'Tam', 'Edda', 'Wren'], 'the five known souls stand, in the record\u2019s own order');
  const heroSeat = collectByClass(tree, 'the-hero');
  assert.equal(heroSeat.length, 1, 'the hero alone holds the centre');
  assert.ok(textOf(heroSeat[0]).includes('Aldric'), 'and the centre is the hero');
  const atRest = collectByClass(tree, 'at-rest');
  assert.equal(atRest.length, 1, 'one soul rests');
  assert.ok(textOf(atRest[0]).includes('Edda') && textOf(atRest[0]).includes('Fallen'), 'the dead render marked, in the record\u2019s own word — Fallen');
  assert.equal(collectByClass(tree, 'web-strand-kin').length, 1, 'one kin strand — bound by blood');
  assert.equal(collectByClass(tree, 'web-strand-ally').length, 1, 'one oath strand');
  assert.equal(collectByClass(tree, 'web-strand-met').length, 1, 'one crossing — the strand toward the unmet is absence');
  assert.equal(collectByClass(tree, 'web-strand-enemy').length, 0, 'no enemy strand — the unrevealed tie does not tease');
  const miraSeat = collectWhere(tree, (n) => String(n.props?.['aria-label'] || '').startsWith('Mira')); 
  assert.equal(miraSeat.length, 1, 'Mira holds one seat');
  await act(async () => { miraSeat[0].props.onClick(); });
  assert.deepEqual(navLog.at(-1), { chapter: 'people', place: null, soul: 'Mira' }, 'a tapped soul opens toward their page in the Book\u2019s own manner');
  await act(async () => { miraSeat[0].props.onKeyDown({ key: 'Enter', preventDefault() {} }); });
  assert.deepEqual(navLog.at(-1), { chapter: 'people', place: null, soul: 'Mira' }, 'and the key opens the same door');
  assert.equal(navLog.length, 2, 'two asks, two doors — nothing self-opens');
}

// ---- Court 4 — THE ELDER SAVE: pre-web, deep-frozen, lawful ----
const elder = deepFreeze({
  id: 'c-elder',
  hero: { name: 'Aldric' },
  codex: {
    cast: [
      { name: 'Mira', known_facts: ['Tended the wound'] },
      { name: 'Edda', status: 'dead' },
      { name: 'Brannoc' }
    ]
  },
  logs: LOGS.slice(0, 4)
});
{
  let elderRoot;
  await act(async () => { elderRoot = TestRenderer.create(h(SoulsWeb, { campaign: elder, onNav: () => {}, statusWord: STATUS_WORD })); });
  const bytes = JSON.stringify(elderRoot.toJSON());
  assert.ok(bytes.includes('Mira'), 'the grandfather bench seats — a stampless soul the record has moved still stands');
  assert.ok(bytes.includes('Aldric'), 'the hero stands the centre of an elder web');
  assert.ok(!bytes.includes('Tam'), 'a soul the elder canon never registered is absence, even with a card in the log');
  assert.ok(!bytes.includes('Brannoc'), 'canon without record stays absence on an elder save');
  // D6: the elder save has only 2 nodes (Aldric + Mira) — list fallback renders.
  // The ally bond shows as text ('oath and bond') rather than an SVG strand class.
  assert.ok(bytes.includes('oath and bond') || bytes.includes('web-strand-ally'), 'the elder record\u2019s own proven bond renders — as a list tie or SVG strand');
}

// ---- Court 5 — the lone soul and the empty loom speak, never crash ----
{
  let loneRoot;
  await act(async () => { loneRoot = TestRenderer.create(h(SoulsWeb, { campaign: deepFreeze({ hero: { name: 'Aldric' }, codex: { cast: [] }, logs: [] }), onNav: () => {}, statusWord: STATUS_WORD })); });
  assert.match(textOf(loneRoot.toJSON()), /The web waits/, 'one known soul: the web says so, plainly');
  let bareRoot;
  await act(async () => { bareRoot = TestRenderer.create(h(SoulsWeb, { campaign: null, onNav: () => {}, statusWord: STATUS_WORD })); });
  assert.match(textOf(bareRoot.toJSON()), /No soul has entered the record yet/, 'no record: the loom stands honestly empty');
}

// ---- Court 6 — the reading reached for no wire ----
assert.equal(fetchLog.length, 0, `the web commissions nothing — zero fetches (saw: ${fetchLog.join(', ')})`);

console.log('PASS — the web of souls seating: the web rides the Book\u2019s own chunk (no row of its own, no new entry, the closure unmoved at its exact bytes), the surface asks the wiki\u2019s own reveals seat and grows no private reading, the render speaks house words with the dead at rest and the unmet absent from every byte, a soul opens toward their page by tap and by key, and a pre-web save renders deep-frozen — the grandfather bench seats, canon without record stays absence, zero fetches');
