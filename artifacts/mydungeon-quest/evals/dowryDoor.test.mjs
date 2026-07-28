// ---- THE DOWRY DOOR, table side (Directive XX, Article Five, Law XV) ----
//
// The game's court over the one door where outside lore enters, twinned
// with the engine's dowryDoor gate (which judges the floor, the courts,
// and the pure fold on the same laws):
//   1. THE CEREMONY SOURCE: the fourth Forge door rides the one road —
//      the engine's own reader and judge, never a private resolver; the
//      wire is asked first and the floor answers honestly when it
//      declines, LABELED as the floor; blessing bows to the court
//      (a refused row's bless hand is disabled at the source).
//   2. THE THRESHOLD SOURCE: the fold sits in beginCampaign behind
//      dynamic doors (the entry closure never grows for a door most
//      tales never open); the FINAL shape is re-judged with the forged
//      hero seated; ONE dowry row through the app's own seal door; the
//      fresh head rides the local row so the next seal never forks.
//   3. THE SERVER SOURCE: /api/dowry stands NAMED before the warden;
//      the reader is Pen's-Clock-clocked on read AND repair, carries
//      no retired temperature knob, mirrors every enum and bound the
//      court enforces in its tool schema, judges server-side by the
//      engine's own court, and declines honestly — text-only pages,
//      the watchtower's own byte cap.
//   4. THE SHELF: ceremony and engine module ride lazy chunks; the
//      entry chunk is denylist-clean of the ceremony's words (the byte
//      pin itself has ONE seat, at the soulsWeb gate — mirrors law).
//   5. THE TABLE, END TO END (keyless): floor-read pages, blessed by
//      hand, fold at turn zero and seal as ONE dowry row through the
//      real seal door over fake-indexeddb; the desk verifies the chain
//      whole (a turn row after the dowry row); refused and unblessed
//      leave NO trace in the sealed bytes; the dowry-born stand in the
//      wiki's own reveals seat with no log row at all.
//   6. THE ELDER SAVE: a dowryless elder chain, deep-frozen fixtures,
//      verifies green and walks untouched — the law is additive.
//   THE GROUNDING SEATS (convictions γ and δ, the architect's two
//      sittings): the reading doors are STRICT — the server judge
//      never turns playersHand, so a reader's invention (a name its
//      cited line never wrote, or an embedded substring passing for
//      one — naming is whole-phrase) dies before the player sees it;
//      the ceremony alone judges under the player's own hand (amend
//      sovereignty, the hero forge precedent), and the knob is
//      two-handed: the amended mark is minted by the RENAME hand
//      alone, dropped at the wire boundary, sealed as provenance in
//      the dowry row itself. THE WALK-BACK (5b): a blessed row
//      that turns refused keeps its unbless and amend hands. THE
//      WIRE'S HAND (5c): wire rows re-seat at the boundary from known
//      fields with blessed FORCED false, ops riding WHOLE so a
//      smuggled stranger key meets the live court, never a launderer.
// Headless — no AI keys, no browser. Convicted red at birth (standing
// law): (α) the named-door array bent to drop '/api/dowry' — the
// wiring court refused it; (β) the floor's label bent to plain
// provider words — the honest-floor court refused the unlabeled read;
// (γ-table) the ceremony's disabled= bent back to the trap form and
// the strict-door needles bent — the walk-back and strict-door courts
// refused both (the engine's own γ — the invented name on an
// unrelated verbatim quote — redded first at the engine gate).
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire, register } from 'node:module';
import { entryClosureOf } from './manifestClosure.mjs';

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

// The wire DECLINES by fixture — the keyless house — so the ceremony
// must fall to the engine's floor and say so.
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: true, json: async () => ({ declined: true, provider: 'none', proposals: [] }) };
};

const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(GAME_ROOT, 'dist');

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

// ---- Court 1 — THE CEREMONY SOURCE ----
const dowrySrc = readFileSync(path.join(GAME_ROOT, 'src/components/Dowry.jsx'), 'utf8');
assert.match(dowrySrc, /from 'fatescript\/dowryDoor'/, 'the ceremony rides the one road — the engine\u2019s own reader and judge');
assert.match(dowrySrc, /readPagesFloor\(/, 'the keyless floor is the engine\u2019s deterministic reader');
assert.match(dowrySrc, /judgeProposals\(/, 'the court sits live at the surface');
assert.match(dowrySrc, /fetch\('\/api\/dowry'/, 'the wire is the named lane');
assert.doesNotMatch(dowrySrc, /codex\s*\??\.\s*cast/, 'no private reading of the canon at the surface');
assert.match(dowrySrc, /disabled=\{!verdict\.ok && !blessed\}/, 'blessing bows to the court — a refused row\u2019s bless hand is disabled, and ONLY the unblessed one: a blessed row that turns refused keeps its unbless hand (the walk-back law)');
assert.match(dowrySrc, /\{blessed && <div className="dowry-amend/, 'the amend hands stay on every blessed row, refused or not — the player can always amend back out');
assert.match(dowrySrc, /playersHand: true/, 'the ceremony judges under the player\u2019s own hand — the grounding court steps aside HERE alone, never at a reading door');
assert.match(dowrySrc, /key === 'name' \? \{ op, amended: true \} : \{ op \}/, 'the amended mark is minted by the RENAME hand alone — a voice or role edit lifts no grounding belt');
assert.match(dowrySrc, /blessed: false \}\)\);/, 'wire rows are re-seated at the boundary with blessed FORCED false — that hand is never the wire\u2019s');
assert.match(dowrySrc, /provider === 'floor'/, 'the floor is told apart from the illuminated read');
assert.ok(dowrySrc.includes('house\u2019s own floor reader'), 'and labeled in house words, honestly');
const forgeSrc = readFileSync(path.join(GAME_ROOT, 'src/components/Forge.jsx'), 'utf8');
assert.match(forgeSrc, /import \{ Dowry \} from '\.\/Dowry\.jsx'/, 'the ceremony rides the Forge\u2019s own chunk by static import');
assert.match(forgeSrc, /\['dowry', 'Import a world',/, 'the fourth door hangs beside spin, oracle, and deep');
assert.match(forgeSrc, /door === 'dowry'/, 'and opens to the ceremony');
assert.match(forgeSrc, /, dowry \}\);/, 'the world bundle carries the dowry through the hero forge untouched');

// ---- Court 2 — THE THRESHOLD SOURCE ----
const appSrc = readFileSync(path.join(GAME_ROOT, 'src/App.jsx'), 'utf8');
assert.match(appSrc, /let codex = initCodex\(/, 'the codex can take the fold');
assert.match(appSrc, /await import\('fatescript\/dowryDoor'\)/, 'the fold rides a dynamic door — the entry closure never grows');
assert.match(appSrc, /await import\('fatescript\/canonical'\)/, 'and the page fingerprints ride the same manner');
assert.match(appSrc, /applyDowry\(codex, dowryGift\.proposals, \{ hero: hero\.name/, 'the FINAL shape is re-judged with the forged hero seated');
assert.match(appSrc, /row && row\.blessed === true/, 'only a blessed gift opens the door at all');
assert.match(appSrc, /seal\(id, 'dowry',/, 'ONE dowry row through the app\u2019s own seal door');
assert.match(appSrc, /pageHashes\.push\(\{ name: page\.name, sha256: await sha256\(page\.text\) \}\)/, 'the sealed row carries the pages\u2019 own sha256 fingerprints');
assert.match(appSrc, /\.\.\.\(amended === true \? \{ amended: true \} : \{\}\)/, 'the sealed op record carries the player\u2019s own amended mark — provenance rides the row, absence stays absent');
assert.match(appSrc, /The canon held at the threshold/, 'a refusal at the threshold is spoken, never swallowed');
assert.match(appSrc, /const sealedRow = await db\.campaigns\.get\(id\);/, 'the fresh head is re-read after the seal — a stale head would fork the next record');

// ---- Court 3 — THE SERVER SOURCE ----
const indexSrc = readFileSync(path.join(GAME_ROOT, 'server/index.js'), 'utf8');
assert.match(indexSrc, /app\.use\(\s*\[[^\]]*'\/api\/dowry',\s*'\/api\/warden'\]\s*,\s*namedOnly\(\)/, 'the dowry door stands NAMED, before the warden, in the one array');
assert.match(indexSrc, /abuseCaps\('dowry'\)/, 'the watchtower\u2019s own cap guards the lane');
assert.match(indexSrc, /'\/api\/dowry'[\s\S]{0,1200}spendAllowed\('anthropic'\)[\s\S]{0,600}getDowryProposals/, 'the spend ceiling degrades the lane to an honest decline before the reader is ever woken');
assert.match(indexSrc, /if \(!result\.declined\) recordSpend\('anthropic'\);/, 'a real read is debited; a decline never is');
const readerSrc = readFileSync(path.join(GAME_ROOT, 'server/dowryReader.js'), 'utf8');
assert.ok((readerSrc.match(/withClock\(/g) || []).length >= 2, 'the Pen\u2019s Clock sits over the read AND the repair');
assert.doesNotMatch(readerSrc, /temperature/, 'the retired temperature knob never returns');
assert.match(readerSrc, /judgeProposals\(/, 'the server judges by the engine\u2019s own court before anything returns');
assert.match(readerSrc, /is_error: true/, 'one guided repair, the court\u2019s words riding back whole');
for (const word of ["'feminine', 'masculine', 'neutral'", "'child', 'young', 'adult', 'elder'", 'maxLength: 24', 'maxLength: 360', 'maxLength: 160', "required: ['source', 'quote']", "required: ['kind', 'op', 'citation']"]) {
  assert.ok(readerSrc.includes(word), `the tool schema mirrors the court it must satisfy (missing: ${word})`);
}
assert.match(readerSrc, /CONTROL_BYTES/, 'text-only pages — control bytes are refused at the door');
assert.match(readerSrc, /declined: true, provider: 'none'/, 'the decline is honest JSON, never mock prose');
// The tooth bites the TURNED knob — `playersHand:` seated in a context
// object — while the reader's own comment may still speak of never
// turning it (prose is not a bend; a seated key is).
assert.doesNotMatch(readerSrc, /playersHand\s*:/, 'the server door is STRICT — it never turns the player\u2019s knob, so a reader\u2019s invention dies before the player sees it (conviction γ, the grounding law)');
assert.match(readerSrc, /did not survive the court — the floor reads instead/, 'a reading refused WHOLE declines honestly — never an empty triumph under an illuminated label');
assert.ok(readerSrc.includes('a quote grounds only what it names'), 'the tool schema teaches the grounding law it will be judged by (the schema-mirror law)');
const watchtowerSrc = readFileSync(path.join(GAME_ROOT, 'server/watchtower.js'), 'utf8');
assert.match(watchtowerSrc, /dowry: \{ body: Number\(process\.env\.MAX_DOWRY_BYTES \|\| 1800000\) \}/, 'the dowry\u2019s byte cap sits in the watchtower\u2019s one registry');
const homonymSrc = readFileSync(path.join(GAME_ROOT, 'server/dowry.js'), 'utf8');
assert.ok(homonymSrc.includes('assetlinks') && !homonymSrc.includes('propose_dowry'), 'the elder homonym server/dowry.js is still the Android door, untouched — the reader lives at dowryReader.js');

// ---- Court 4 — THE SHELF: lazy chunks, denylist-clean entry ----
const manifest = JSON.parse(readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'));
const { entryKeys, closure } = entryClosureOf(manifest);
assert.equal(entryKeys.length, 1, `no new synchronous entry — the manifest names ${entryKeys.length}`);
assert.ok(![...closure].some((k) => k.includes('dowryDoor') || k.includes('components/Dowry')), 'neither the engine\u2019s dowry module nor the ceremony is reachable in the entry\u2019s synchronous closure');
assert.ok(Object.keys(manifest).some((k) => k.includes('dowryDoor')), 'the engine module stands in the dynamic rolls — a chunk of its own, behind the door');
// The byte pin has ONE seat (soulsWeb's gate) — this court carries the
// denylist tooth instead: the ceremony's words must never ride entry.
const entryChunk = readFileSync(path.join(DIST, manifest[entryKeys[0]].file), 'utf8');
for (const word of ['dowry-proposal', 'dowry-bless', 'Lay the page on the table', 'Read by the illuminated reader', 'readPagesFloor', 'judgeProposals', 'propose_dowry']) {
  assert.ok(!entryChunk.includes(word), `the entry chunk is denylist-clean of the ceremony's words (found: ${word})`);
}
const forgeKey = Object.keys(manifest).find((k) => k.endsWith('components/Forge.jsx'));
const forgeChunk = readFileSync(path.join(DIST, manifest[forgeKey].file), 'utf8');
for (const word of ['dowry-proposal', 'Lay the page on the table', 'Import a world']) {
  assert.ok(forgeChunk.includes(word), `the ceremony rides the Forge's lazy shelf (missing: ${word})`);
}

// ---- The fixture pages ----
const PAGES = deepFreeze([{
  name: 'The Vale Sessions',
  text: [
    '## People',
    '- Sella Marrow — a grave-quiet apothecary with ash-stained hands',
    '- Old Wick — the lamplighter who knows every alley by its smell',
    '## Places',
    '- The Hollow Market — stalls sunk waist-deep in old floodwater',
    '- Xy — too short a name for any map',
    '## Facts',
    '- Sella Marrow — she once traded a year of silence for a map'
  ].join('\n')
}]);

// ---- Court 5 — THE RENDER: declined wire → labeled floor; bless bows to the court ----
const { Dowry } = await import('../src/components/Dowry.jsx');
let state = null;
const spy = (next) => { state = next; };
let root;
const rerender = async () => act(async () => { root.update(h(Dowry, { dowry: state, onDowry: spy })); });
await act(async () => { root = TestRenderer.create(h(Dowry, { dowry: null, onDowry: spy })); });
{
  const tree = root.toJSON();
  const nameInput = collectWhere(tree, (n) => n.type === 'input')[0];
  const textArea = collectWhere(tree, (n) => n.type === 'textarea')[0];
  await act(async () => { nameInput.props.onChange({ target: { value: 'The Vale Sessions' } }); });
  await act(async () => { textArea.props.onChange({ target: { value: PAGES[0].text } }); });
}
{
  const layButton = collectWhere(root.toJSON(), (n) => n.type === 'button' && textOf(n).includes('Lay the page'))[0];
  await act(async () => { layButton.props.onClick(); });
  assert.equal(state.pages.length, 1, 'the page lies on the table');
  assert.equal(state.pages[0].name, 'The Vale Sessions', 'under its own name');
  await rerender();
}
{
  const readButton = collectWhere(root.toJSON(), (n) => n.type === 'button' && textOf(n).includes('Read the pages'))[0];
  await act(async () => { await readButton.props.onClick(); });
  assert.ok(fetchLog.some((url) => url === '/api/dowry'), 'the wire was asked first');
  assert.equal(state.provider, 'floor', 'the declined wire fell to the floor, not to silence');
  assert.ok(state.proposals.length >= 4, 'and the floor read the pages');
  await rerender();
}
{
  const tree = root.toJSON();
  assert.ok(textOf(tree).includes('house\u2019s own floor reader'), 'the floor read is LABELED in house words');
  const refused = collectByClass(tree, 'dowry-refused');
  assert.equal(refused.length, 1, 'one proposal stands refused (the two-letter map name)');
  assert.match(textOf(collectByClass(refused[0], 'dowry-refusal')[0]), /world\.region_add\.name must be 3-100/, 'refused in the validator\u2019s own words, at the surface');
  const refusedBless = collectWhere(refused[0], (n) => n.type === 'input' && n.props.type === 'checkbox')[0];
  assert.equal(refusedBless.props.disabled, true, 'a refused row\u2019s bless hand is disabled');
  const cite = collectByClass(tree, 'dowry-cite')[0];
  assert.ok(textOf(cite).includes('- Sella Marrow \u2014 a grave-quiet apothecary with ash-stained hands'), 'the citation hangs VERBATIM — the page\u2019s own line');
  assert.ok(textOf(cite).includes('The Vale Sessions'), 'with its page named');
}
{
  const lawful = collectByClass(root.toJSON(), 'dowry-proposal').find((card) => !String(card.props.className).includes('dowry-refused'));
  const blessBox = collectWhere(lawful, (n) => n.type === 'input' && n.props.type === 'checkbox')[0];
  await act(async () => { blessBox.props.onChange({ target: { checked: true } }); });
  assert.equal(state.proposals.filter((row) => row.blessed === true).length, 1, 'the bless tap marks exactly one gift');
  await rerender();
  const blessedCard = collectByClass(root.toJSON(), 'dowry-blessed')[0];
  assert.ok(blessedCard, 'the blessed card wears its blessing');
  const amendName = collectWhere(blessedCard, (n) => n.type === 'input' && n.props.type !== 'checkbox')[0];
  await act(async () => { amendName.props.onChange({ target: { value: 'Sella of the Ash' } }); });
  assert.equal(state.proposals.find((row) => row.blessed).op.name, 'Sella of the Ash', 'the player\u2019s amendment lands on the op itself — the final shape the court will judge');
  assert.equal(state.proposals.find((row) => row.blessed).amended, true, 'and the rename mints the ceremony\u2019s own amended mark — the second hand of the grounding knob');
  await rerender();
  assert.ok(collectByClass(root.toJSON(), 'dowry-blessed')[0], 'an off-page name under the player\u2019s OWN hand stands at the ceremony — the amend law\u2019s sovereignty (playersHand + amended), never the reader\u2019s');
}

// ---- Court 5b — THE WALK-BACK: a blessed row that turns refused keeps its hands ----
{
  const blessedCard = collectByClass(root.toJSON(), 'dowry-blessed')[0];
  const amendName = collectWhere(blessedCard, (n) => n.type === 'input' && n.props.type !== 'checkbox')[0];
  await act(async () => { amendName.props.onChange({ target: { value: '' } }); }); // an emptied name — the op sheds its key, the court refuses
  await rerender();
  const wounded = collectByClass(root.toJSON(), 'dowry-blessed')[0];
  assert.ok(String(wounded.props.className).includes('dowry-refused'), 'the blessed row turned refused wears its refusal openly');
  assert.match(textOf(collectByClass(wounded, 'dowry-refusal')[0]), /carries no name/, 'and the court speaks the why');
  const unblessHand = collectWhere(wounded, (n) => n.type === 'input' && n.props.type === 'checkbox')[0];
  assert.equal(unblessHand.props.disabled, false, 'the unbless hand STAYS — the player can always walk back out');
  const amendBack = collectWhere(wounded, (n) => n.type === 'input' && n.props.type !== 'checkbox')[0];
  assert.ok(amendBack, 'and the amend hands stay on the refused-but-blessed row');
  await act(async () => { amendBack.props.onChange({ target: { value: 'Sella of the Ash' } }); });
  await rerender();
  const mended = collectByClass(root.toJSON(), 'dowry-blessed')[0];
  assert.ok(!String(mended.props.className).includes('dowry-refused'), 'the amendment walked back — the row stands lawful again');
}

// ---- Court 5c — THE WIRE'S HAND NEVER BLESSES: boundary re-seat, op riding whole ----
{
  const declinedStub = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchLog.push(String(url));
    return { ok: true, json: async () => ({ declined: false, provider: 'anthropic', proposals: [
      { id: 'w0', kind: 'cast', op: { name: 'Sella Marrow', visual: 'ash-stained hands' }, citation: { source: 'The Vale Sessions', quote: '- Sella Marrow \u2014 a grave-quiet apothecary with ash-stained hands' }, blessed: true, amended: true },
      { id: 'w1', kind: 'region', op: { name: 'The Hollow Market', state: 'burned' }, citation: { source: 'The Vale Sessions', quote: '- The Hollow Market \u2014 stalls sunk waist-deep in old floodwater' }, blessed: true }
    ] }) };
  };
  const readButton = collectWhere(root.toJSON(), (n) => n.type === 'button' && textOf(n).includes('Read the pages'))[0];
  await act(async () => { await readButton.props.onClick(); });
  globalThis.fetch = declinedStub;
  assert.equal(state.provider, 'anthropic', 'the doctored wire was read as an illuminated read');
  assert.ok(state.proposals.every((row) => row.blessed === false), 'blessed rides the wire — and is FORCED false at the boundary: that hand is the player\u2019s alone');
  assert.deepEqual(Object.keys(state.proposals[0]).sort(), ['blessed', 'citation', 'id', 'kind', 'op'], 'the row is re-seated from known fields alone — a wire\u2019s stranger row-key never lands');
  await rerender();
  const cards = collectByClass(root.toJSON(), 'dowry-proposal');
  const market = cards.find((card) => textOf(card).includes('The Hollow Market'));
  assert.ok(String(market.props.className).includes('dowry-refused'), 'the op rode WHOLE through the boundary — its smuggled stranger key meets the live court, never a launderer');
  assert.match(textOf(collectByClass(market, 'dowry-refusal')[0]), /stranger key "state"/, 'refused in the validator\u2019s own words');
}

// ---- Court 6 — THE TABLE, END TO END: fold, ONE seal, the desk, no trace ----
const { db } = await import('../src/lib/db.js');
const { appendEvent, verifyJournal } = await import('../src/lib/seal.js');
const { readPagesFloor, applyDowry } = await import('fatescript/dowryDoor');
const { sha256 } = await import('fatescript/canonical');
const { introducedCast } = await import('../src/lib/unmet.js');

const CAMPAIGN_ID = 'c-dowry-e2e';
await db.campaigns.put({ id: CAMPAIGN_ID, title: 'The Carried Vale', hero: { name: 'Aldric' }, codex: null, logs: [], turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', createdAt: Date.now(), updatedAt: Date.now() });
const floorRead = readPagesFloor(PAGES);
const gift = JSON.parse(JSON.stringify(floorRead.proposals));
for (const row of gift) {
  if (row.op.name === 'Sella Marrow' || row.op.name === 'The Hollow Market') row.blessed = true; // Old Wick stays unblessed; Xy stays refused
}
const codexBefore = deepFreeze({ cast: [], regions: [], threads: [], trove: [], notes: [], party: [] });
const fold = applyDowry(codexBefore, deepFreeze(gift), { hero: 'Aldric', pages: PAGES });
assert.deepEqual(fold.applied.map((row) => [row.kind, row.op.name]), [['cast', 'Sella Marrow'], ['region', 'The Hollow Market'], ['fact', 'Sella Marrow']], 'the blessed gifts fold — soul, place, and truth');
assert.equal(fold.codex.cast[0].introduced_turn, 0, 'the dowry-born are introduced at the tale\u2019s threshold — turn zero');
const pageHashes = [];
for (const page of PAGES) pageHashes.push({ name: page.name, sha256: await sha256(page.text) });
const sealedRecord = await appendEvent(CAMPAIGN_ID, 'dowry', { ops: fold.applied.map(({ kind, op, citation }) => ({ kind, op, citation })), pageHashes });
assert.ok(sealedRecord && sealedRecord.recordHash, 'the dowry sealed through the real seal door');
// A turn follows — the chain must carry the dowry row as a lawful elder link.
await appendEvent(CAMPAIGN_ID, 'turn', { text: 'The chronicle begins over a carried vale.' });
const journal = await db.journal.where('campaignId').equals(CAMPAIGN_ID).toArray();
journal.sort((a, b) => a.i - b.i);
assert.equal(journal.filter((row) => row.type === 'dowry').length, 1, 'EXACTLY ONE dowry row — the whole gift in one record');
assert.equal(journal[0].type, 'dowry', 'sealed before the first word: the chain reads dowry, then genesis');
const verdicts = await verifyJournal(journal);
assert.ok(verdicts.every((verdict) => verdict.ok), 'the desk verifies the chain whole — the dowry row is a lawful link');
const campaignRow = await db.campaigns.get(CAMPAIGN_ID);
assert.equal(campaignRow.headHash, journal[1].recordHash, 'the head rides the newest seal');
// CONTENT bytes only — payloads, not envelopes: recordHash/prevHash/
// signature machinery is run-varying base64, and two innocent alphabet
// characters ('Xy') can land inside a hash by chance. The no-trace law
// binds what was SEALED AS CONTENT, and the court must not flake on a
// hash's dice.
const contentBytes = JSON.stringify(journal.map(({ payload }) => payload));
assert.ok(contentBytes.includes('a year of silence'), 'the sealed row carries the citation VERBATIM');
assert.ok(contentBytes.includes(pageHashes[0].sha256), 'and the page\u2019s own fingerprint');
assert.match(pageHashes[0].sha256, /^[0-9a-f]{64}$/, 'a true sha256, hex and whole');
for (const ghost of ['Old Wick', 'Xy']) {
  assert.ok(!contentBytes.includes(ghost), `refused and unblessed leave NO trace in the sealed content (leaked: ${ghost})`);
}
// The wiki's own reveals seat knows the dowry-born with no log row at all.
const known = introducedCast({ codex: fold.codex, logs: [] }).map((soul) => soul.name);
assert.ok(known.includes('Sella Marrow'), 'the dowry-born stand in the Book\u2019s People page by the introduction law alone');

// ---- Court 7 — THE ELDER SAVE: dowryless chains walk untouched ----
const ELDER_ID = 'c-elder-dowryless';
await db.campaigns.put(deepFreeze({ id: ELDER_ID, title: 'The Elder Vale', hero: { name: 'Wren' }, turnCount: 0, headHash: null, signatureStatus: 'pending', createdAt: 1, updatedAt: 1 }) && { id: ELDER_ID, title: 'The Elder Vale', hero: { name: 'Wren' }, turnCount: 0, headHash: null, signatureStatus: 'pending', createdAt: 1, updatedAt: 1 });
await appendEvent(ELDER_ID, 'turn', { text: 'An elder tale, before the dowry law.' });
await appendEvent(ELDER_ID, 'turn', { text: 'It walks as it always walked.' });
const elderJournal = await db.journal.where('campaignId').equals(ELDER_ID).toArray();
elderJournal.sort((a, b) => a.i - b.i);
const elderVerdicts = await verifyJournal(elderJournal);
assert.ok(elderVerdicts.every((verdict) => verdict.ok) && elderJournal.every((row) => row.type === 'turn'), 'a dowryless elder chain verifies green, no dowry machinery in its path');

console.log('PASS — the dowry door, table side: the fourth Forge door rides the engine\u2019s one road and labels its floor honestly, blessing bows to the live court at the surface, the reading doors are STRICT while the player\u2019s own hand alone amends beyond the page (a quote grounds only what it names), the wire never blesses and its rows re-seat at the boundary with ops riding whole, a blessed row that turns refused keeps its walk-back hands, the threshold folds only the blessed FINAL shape with the hero seated and seals ONE dowry row through the app\u2019s own door (citations verbatim, pages fingerprinted, refusals spoken), the named server lane is clocked, capped, schema-mirrored, and honest when it declines, the ceremony rides lazy chunks with the entry denylist-clean, the desk verifies the chain whole, refused and unblessed leave no trace, and elder saves walk untouched');
