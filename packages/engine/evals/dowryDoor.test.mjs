// ---- THE DOWRY DOOR (Directive XX, Article Five, Law XV) ----
//
// The engine twin over the one door where outside lore may enter:
//   1. THE FLOOR: the deterministic reader — same pages, same bytes;
//      every proposal cited to the page's own line VERBATIM; nothing
//      invented (no role, no voice, no gloss the page never wrote);
//      bullets outside a recognized section propose nothing.
//   2. THE CITATION COURT: a doctored quote is refused by the
//      no-invention law; a citation naming a page not on the table is
//      refused; a citeless proposal is refused.
//   3. THE VALIDATOR'S COURT: every proposal is judged as a TURN —
//      the same op seams, unweakened — and refusals speak in the
//      door's own words (region name bounds, stranger keys).
//   4. THE COLLISION COURTS: a locked-canon collision is refused BY
//      NAME through the one canon road (an epithet is its soul, never
//      a twin); two pages may not both forge one newborn; the forged
//      hero's own name outranks every page.
//   5. BLESSED-ONLY APPLY AS PURE LAW: unblessed never folds and
//      leaves no trace; blessed folds through the ordinary reducer at
//      turn 0 — the tale's threshold; a refused row folds nothing;
//      the input codex is never mutated (deep-frozen walk).
//   6. THE AMENDED SHAPE: the player's amendment is judged as the
//      FINAL shape — an amendment into a collision is refused, an
//      amendment into lawful ground folds under the amended name.
//   7. THE GROUNDING COURT: a quote grounds ONLY what it names WHOLE —
//      an invented name riding an unrelated verbatim line is refused
//      by name, and an embedded substring (`ella` inside "Sella
//      Marrow") passes for nothing: naming is whole-phrase, bounded by
//      non-letters. The one lawful bypass is TWO-HANDED: playersHand
//      (caller code — ceremony and threshold alone, never a reading
//      door) AND the row's own amended mark (minted only by the
//      ceremony's amend hands); an unamended row keeps its grounding
//      belt at every seat.
// Convicted red at birth (standing law): (α) a field-by-field rebuild
// of the region op laundered a smuggled stranger key past the world
// court — the op now rides WHOLE and the stranger meets the
// validator's own refusal (the row-roundtrip family's fourth strike);
// (β) a judge blind to the batch's own newborns let two pages forge
// one soul — the newborn court now seats accepted names as it walks;
// (γ) same-page presence passed for grounding — an invented soul rode
// an unrelated but perfectly verbatim line through every court (the
// architect's round convicted it against the living engine) — the
// grounding court now refuses the unrelated quote by name;
// (δ) substring presence passed for naming — `ella` hid inside "Sella
// Marrow" and a clipped "Hollow Mark" inside the market's line (the
// architect's second round convicted both) — naming is now whole-
// phrase, boundary to boundary, and the bypass knob is two-handed
// (playersHand AND the row's amended mark), so unamended rows keep
// their grounding belt at the threshold itself.
import assert from 'node:assert/strict';
import { readPagesFloor, judgeProposals, applyDowry } from '../src/dowryDoor.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- The fixture pages — an elder table's session notes ----
const PAGES = [
  {
    name: 'The Vale Sessions',
    text: [
      'Notes from the old table, third winter.',
      '',
      '## People',
      '- Sella Marrow — a grave-quiet apothecary with ash-stained hands',
      '- Old Wick — the lamplighter who knows every alley by its smell',
      '',
      '## Places',
      '- The Hollow Market — stalls sunk waist-deep in old floodwater',
      '',
      '## Facts',
      '- Sella Marrow — she once traded a year of silence for a map',
      '',
      'Stray thoughts:',
      '- This bullet stands outside any recognized section and proposes nothing'
    ].join('\n')
  },
  {
    name: 'Dead Campaign Ledger',
    text: [
      'PEOPLE:',
      '- Sella Marrow — the same soul, written twice across two pages',
      '- Mira — the healer of the well',
      '- The Rowan Witch — some called her by the older name',
      '- Aldric — a wanderer sharing the hero\u2019s name',
      'PLACES:',
      '- Xy — too short a name for any map',
      '- Larkspur Vale — the vale that already stands'
    ].join('\n')
  }
];

// The standing canon: Mira holds her epithet through the Alias Ledger.
const STANDING = deepFreeze([
  { name: 'Mira', role: 'healer', status: 'active', known_as: ['The Rowan Witch'] }
]);
const HERO = 'Aldric';

// ---- 1. THE FLOOR: deterministic, byte-stable, cited, honest ----
const first = readPagesFloor(PAGES);
const again = readPagesFloor(JSON.parse(JSON.stringify(PAGES)));
assert.equal(JSON.stringify(first), JSON.stringify(again), 'the same pages always read to the same bytes');
const byId = new Map(first.proposals.map((row) => [row.id, row]));
assert.deepEqual(
  first.proposals.map((row) => [row.kind, row.op.name]),
  [
    ['cast', 'Sella Marrow'], ['cast', 'Old Wick'], ['region', 'The Hollow Market'], ['fact', 'Sella Marrow'],
    ['cast', 'Sella Marrow'], ['cast', 'Mira'], ['cast', 'The Rowan Witch'], ['cast', 'Aldric'],
    ['region', 'Xy'], ['region', 'Larkspur Vale']
  ],
  'the floor reads sections and bullets in page order — and ONLY inside recognized sections'
);
assert.ok(!JSON.stringify(first.proposals).includes('outside any recognized section'), 'a stray bullet proposes nothing');
for (const row of first.proposals) {
  const page = PAGES.find((candidate) => candidate.name === row.citation.source);
  assert.ok(page && page.text.includes(row.citation.quote), `every citation is the page's own line, verbatim (${row.id})`);
  assert.ok(row.citation.quote.includes(row.op.name), `the floor grounds by construction — the cited line names what it proposes (${row.id})`);
  assert.ok(!('role' in row.op) && !('voice_card' in row.op) && !('goal' in row.op) && !('secret' in row.op), 'the floor invents nothing — no role, no voice, no goal, no secret');
  assert.equal(row.blessed, false, 'the floor blesses nothing — that hand is the player\u2019s alone');
}
assert.ok(first.proposals.find((row) => row.op.name === 'Sella Marrow' && row.kind === 'cast').op.visual.includes('grave-quiet apothecary'), 'the visual is the page\u2019s own words, not a gloss');

// ---- 2. THE JUDGE over the fixture batch, hero seated ----
const context = { cast: STANDING, regions: [{ name: 'Larkspur Vale' }], hero: HERO, pages: PAGES };
const verdicts = judgeProposals(first.proposals, context);
const verdictOf = (id) => verdicts[first.proposals.findIndex((row) => row.id === id)];
const idOf = (kind, name, nth = 0) => first.proposals.filter((row) => row.kind === kind && row.op.name === name)[nth].id;

assert.equal(verdictOf(idOf('cast', 'Sella Marrow')).ok, true, 'a fresh soul with a true citation passes every court');
assert.equal(verdictOf(idOf('fact', 'Sella Marrow')).ok, true, 'a fact finds its soul among the batch\u2019s own newborns');
{ // same-batch newborn collision — the first claim holds
  const twice = verdictOf(idOf('cast', 'Sella Marrow', 1));
  assert.equal(twice.ok, false, 'two pages may not both forge one soul');
  assert.match(twice.errors.join(' '), /two pages may not both forge "Sella Marrow" — the first claim holds/, 'and the refusal names the soul');
}
{ // locked canon, by name
  const mira = verdictOf(idOf('cast', 'Mira'));
  assert.equal(mira.ok, false, 'a locked soul cannot be re-forged');
  assert.match(mira.errors.join(' '), /"Mira" already stands in the canon as Mira/, 'the refusal is BY NAME');
}
{ // the epithet is its soul, never a twin — the one canon road
  const witch = verdictOf(idOf('cast', 'The Rowan Witch'));
  assert.equal(witch.ok, false, 'an epithet cannot be reborn as a twin');
  assert.match(witch.errors.join(' '), /"The Rowan Witch" already stands in the canon as Mira/, 'the Alias Ledger adjudicates: the epithet belongs to Mira');
}
{ // the forged hero outranks every page
  const usurper = verdictOf(idOf('cast', 'Aldric'));
  assert.equal(usurper.ok, false, 'the hero\u2019s name cannot be re-forged from pages');
  assert.match(usurper.errors.join(' '), /"Aldric" is the forged hero's own name/, 'and the refusal says so');
}
{ // the validator's own words — the same op seams, unweakened
  const short = verdictOf(idOf('region', 'Xy'));
  assert.equal(short.ok, false, 'a two-letter region falls at the turn law itself');
  assert.match(short.errors.join(' '), /world\.region_add\.name must be 3-100/, 'refused in the door\u2019s own words');
  const vale = verdictOf(idOf('region', 'Larkspur Vale'));
  assert.equal(vale.ok, false, 'a standing region cannot be redrawn');
  assert.match(vale.errors.join(' '), /the region "Larkspur Vale" already stands on the map/, 'and the map court names it');
}

// ---- 3. THE CITATION COURT: misquotes and strange pages refused ----
{
  const doctored = JSON.parse(JSON.stringify(first.proposals.filter((row) => row.op.name === 'Old Wick')));
  doctored[0].citation.quote = doctored[0].citation.quote.replace('alley', 'boulevard');
  const [verdict] = judgeProposals(doctored, context);
  assert.equal(verdict.ok, false, 'a doctored quote is refused');
  assert.match(verdict.errors.join(' '), /the citation is not the page's own words[\s\S]*no-invention law/, 'by the no-invention law, named as such');
}
{
  const strayPage = [{ id: 'x1', kind: 'cast', op: { name: 'Nix' }, citation: { source: 'A Book Nobody Brought', quote: '- Nix' }, blessed: false }];
  const [verdict] = judgeProposals(strayPage, context);
  assert.equal(verdict.ok, false, 'a citation naming a page not on the table is refused');
  assert.match(verdict.errors.join(' '), /names a page not on the table/, 'and says which law it fell at');
}
{
  const citeless = [{ id: 'x2', kind: 'cast', op: { name: 'Nix' }, blessed: false }];
  const [verdict] = judgeProposals(citeless, context);
  assert.equal(verdict.ok, false, 'a citeless proposal is refused');
  assert.match(verdict.errors.join(' '), /every claim must quote its page/, 'every claim must quote its page');
}

// ---- 4. THE STRANGER KEY rides whole to the validator's court (conviction α) ----
{
  // Judged as the player's own amended shape (playersHand + amended):
  // the whole-op law is hand-independent — even the player's renamed
  // shape may not carry a stranger key past the validator. Grounding is
  // 5b's court, and it convicts separately; here it must not outrun the
  // validator.
  const smuggler = [{ id: 'x3', kind: 'region', op: { name: 'The Sunken Stair', state: 'burned' }, citation: { source: 'The Vale Sessions', quote: '## Places' }, blessed: false, amended: true }];
  const [verdict] = judgeProposals(smuggler, { ...context, playersHand: true });
  assert.equal(verdict.ok, false, 'a smuggled stranger key is refused, never laundered');
  assert.match(verdict.errors.join(' '), /stranger key "state"/, 'by the validator\u2019s own stranger-key court');
}

// ---- 5. Facts: unresolvable and hero-bound subjects refuse honestly ----
{
  const ghost = [{ id: 'x4', kind: 'fact', op: { name: 'Nobody Marrow', fact_add: 'a fact for no one' }, citation: { source: 'The Vale Sessions', quote: '## Facts' }, blessed: false }];
  const [verdict] = judgeProposals(ghost, context);
  assert.equal(verdict.ok, false, 'a fact without its soul is refused');
  assert.match(verdict.errors.join(' '), /no such soul stands in the canon — a fact needs its soul/, 'and asks for the soul by law');
  const heroFact = [{ id: 'x5', kind: 'fact', op: { name: 'Aldric', fact_add: 'claims about the hero' }, citation: { source: 'The Vale Sessions', quote: '## Facts' }, blessed: false }];
  const [heroVerdict] = judgeProposals(heroFact, context);
  assert.equal(heroVerdict.ok, false, 'the hero\u2019s tale is not written from pages');
  assert.match(heroVerdict.errors.join(' '), /the hero's own tale is not written from dowry pages/, 'refused in the threshold\u2019s own words');
}

// ---- 5b. THE GROUNDING COURT (conviction γ) — a quote grounds ONLY what it names ----
{
  // The architect's own attack: an invented soul riding an unrelated —
  // but perfectly verbatim — line of the page. Same-page presence is
  // not grounding; the cited line must NAME the thing it carries, or
  // the no-invention law is a doorframe with no door.
  const impostor = [{ id: 'g1', kind: 'cast', op: { name: 'Vel the Unwritten' }, citation: { source: 'The Vale Sessions', quote: '- The Hollow Market — stalls sunk waist-deep in old floodwater' }, blessed: false }];
  const [smuggled] = judgeProposals(impostor, context);
  assert.equal(smuggled.ok, false, 'an invented name cannot ride an unrelated verbatim quote');
  assert.match(smuggled.errors.join(' '), /the cited line does not name "Vel the Unwritten"/, 'refused by the grounding court, by name');
  // A fact about a standing soul, citing a true line that never names them.
  const misbound = [{ id: 'g2', kind: 'fact', op: { name: 'Mira', fact_add: 'a truth pinned to the wrong line' }, citation: { source: 'The Vale Sessions', quote: '- Sella Marrow — a grave-quiet apothecary with ash-stained hands' }, blessed: false }];
  const [wrongLine] = judgeProposals(misbound, context);
  assert.equal(wrongLine.ok, false, 'a fact cannot cite a line that never names its soul');
  assert.match(wrongLine.errors.join(' '), /does not name "Mira"/, 'the subject must stand in the quoted words');
  // THE EMBEDDED SUBSTRING (conviction δ): `ella` hides inside
  // "Sella Marrow" — substring presence is not naming. The name must
  // stand WHOLE in the quote, bounded by non-letters on both sides.
  const embedded = [{ id: 'g3', kind: 'cast', op: { name: 'ella' }, citation: { source: 'The Vale Sessions', quote: '- Sella Marrow — a grave-quiet apothecary with ash-stained hands' }, blessed: false }];
  const [hidden] = judgeProposals(embedded, context);
  assert.equal(hidden.ok, false, 'an embedded substring cannot pass for a name — naming is whole-phrase, boundary to boundary');
  assert.match(hidden.errors.join(' '), /does not name "ella"/, 'refused by the grounding court, by name');
  const clipped = [{ id: 'g4', kind: 'region', op: { name: 'Hollow Mark' }, citation: { source: 'The Vale Sessions', quote: '- The Hollow Market — stalls sunk waist-deep in old floodwater' }, blessed: false }];
  assert.equal(judgeProposals(clipped, context)[0].ok, false, 'a name clipped from a longer one is refused the same — the boundary law cuts both ways');
  // THE BOUNDARY READS UNICODE (the architect's hardening, taken on the
  // spot): letters are \p{L}, not ASCII — an accented tail is still a
  // letter, so a clipped stem cannot ground against it; the accented
  // name itself, quoted whole, grounds cleanly. This court BINDS the
  // Unicode choice: bent to [A-Za-z0-9], the stem slips through and
  // this red catches it.
  // (The stem is collision-free by construction — no standing soul, no
  // batch twin — so the ok verdict rides the GROUNDING court alone and
  // never greens by coincidence off the collision court's back.)
  const accentPage = { name: 'Northern Annex', text: '## People\n- Soraé Vell — a cartographer of the drowned coast' };
  const accentContext = { ...context, pages: [...context.pages, accentPage] };
  const accentLine = '- Soraé Vell — a cartographer of the drowned coast';
  const [accentWhole] = judgeProposals([{ id: 'g5', kind: 'cast', op: { name: 'Soraé Vell' }, citation: { source: 'Northern Annex', quote: accentLine }, blessed: false }], accentContext);
  assert.equal(accentWhole.ok, true, 'an accented name quoted whole grounds cleanly — Unicode letters are letters');
  const [accentStem] = judgeProposals([{ id: 'g6', kind: 'cast', op: { name: 'Sora' }, citation: { source: 'Northern Annex', quote: accentLine }, blessed: false }], accentContext);
  assert.equal(accentStem.ok, false, 'a stem clipped before an accented tail is refused — é is a letter, not a boundary');
  assert.match(accentStem.errors.join(' '), /does not name "Sora"/, 'refused by the grounding court, by name');
  // THE KNOB IS TWO-HANDED: playersHand (caller code) AND the row's own
  // amended mark (minted only by the ceremony's amend hands, dropped at
  // the wire boundary). A row the player never renamed keeps its
  // grounding belt at EVERY seat — including the threshold — so
  // upstream strictness is never a single point of failure.
  const [belted] = judgeProposals(impostor, { ...context, playersHand: true });
  assert.equal(belted.ok, false, 'playersHand alone lifts nothing — an unamended row keeps its grounding belt at every seat');
  const [byHand] = judgeProposals([{ ...impostor[0], amended: true }], { ...context, playersHand: true });
  assert.equal(byHand.ok, true, 'the player\u2019s own renamed shape may carry a name beyond the quoted line — the amend law\u2019s sovereignty, never the reader\u2019s');
}

// ---- 6. BLESSED-ONLY APPLY as pure law, over a deep-frozen codex ----
const codex = deepFreeze({
  cast: [{ name: 'Mira', role: 'healer', status: 'active', known_as: ['The Rowan Witch'], known_facts: [], introduced_turn: 1 }],
  regions: [{ name: 'Larkspur Vale', visual: 'lavender terraces' }],
  threads: [], trove: [], notes: [], party: []
});
const gift = JSON.parse(JSON.stringify(first.proposals));
const bless = (id) => { gift.find((row) => row.id === id).blessed = true; };
bless(idOf('cast', 'Sella Marrow'));
bless(idOf('fact', 'Sella Marrow'));
bless(idOf('region', 'The Hollow Market'));
bless(idOf('cast', 'Mira')); // blessed, but the canon court still refuses — blessing outranks nothing
// THE AMENDED SHAPE: the player renames Old Wick; the FINAL shape is
// judged. The rename wears the ceremony's own amended mark — without
// it, the threshold's grounding belt would refuse the off-page name.
{
  const wick = gift.find((row) => row.id === idOf('cast', 'Old Wick'));
  wick.blessed = true;
  wick.amended = true;
  wick.op = { ...wick.op, name: 'Wick the Elder', role: 'lamplighter' };
}
const frozenGift = deepFreeze(gift);
const fold = applyDowry(codex, frozenGift, { hero: HERO, pages: PAGES });

assert.deepEqual(fold.applied.map((row) => [row.kind, row.op.name]), [['cast', 'Sella Marrow'], ['cast', 'Wick the Elder'], ['region', 'The Hollow Market'], ['fact', 'Sella Marrow']], 'blessed-and-lawful folds, in proposal order, the amended name among them');
assert.deepEqual(fold.refused.map((row) => row.id), [idOf('cast', 'Mira')], 'a blessed collision is still refused — blessing outranks no court');
assert.ok(fold.unblessed.includes(idOf('cast', 'The Rowan Witch')), 'the unblessed are named, never folded');
const sella = fold.codex.cast.find((soul) => soul.name === 'Sella Marrow');
assert.ok(sella, 'the dowry-born soul stands in the codex');
assert.equal(sella.introduced_turn, 0, 'introduced at the tale\u2019s threshold — turn zero');
assert.ok((sella.known_facts || []).some((fact) => String(fact).includes('a year of silence')), 'the blessed fact rides the newborn\u2019s own card');
assert.ok(fold.codex.cast.find((soul) => soul.name === 'Wick the Elder'), 'the amendment folds under the amended name');
assert.ok(!fold.codex.cast.find((soul) => soul.name === 'Old Wick'), 'and never under the page\u2019s old one');
assert.ok(fold.codex.regions.find((region) => region.name === 'The Hollow Market'), 'the blessed region stands on the map');
assert.equal(fold.codex.cast.filter((soul) => soul.name === 'Mira').length, 1, 'the locked soul stands once, untouched');
assert.equal(codex.cast.length, 1, 'the input codex was never mutated — the fold is pure');

// An amendment INTO a collision is refused — the final shape is judged.
{
  const collide = JSON.parse(JSON.stringify(first.proposals.filter((row) => row.id === idOf('cast', 'Old Wick'))));
  collide[0].blessed = true;
  collide[0].amended = true; // the player's own hand — grounding steps aside, the collision court does NOT
  collide[0].op = { ...collide[0].op, name: 'Mira' };
  const crash = applyDowry(codex, collide, { hero: HERO, pages: PAGES });
  assert.equal(crash.applied.length, 0, 'an amendment into a locked name folds nothing');
  assert.match(crash.refused[0].errors.join(' '), /"Mira" already stands in the canon/, 'and is refused by name');
}

// Unblessed-only gift: nothing folds, nothing traces.
{
  const idle = applyDowry(codex, JSON.parse(JSON.stringify(first.proposals)), { hero: HERO, pages: PAGES });
  assert.equal(idle.applied.length, 0, 'an unblessed gift folds nothing');
  assert.equal(JSON.stringify(idle.codex.cast.map((soul) => soul.name)), JSON.stringify(['Mira']), 'and the canon stands exactly as it stood');
}

// ---- 7. Fail-closed: junk proves nothing and never crashes ----
assert.deepEqual(readPagesFloor(null), { proposals: [], notes: [] }, 'junk pages read as an honest empty');
assert.deepEqual(readPagesFloor([{ name: 'x' }, 42, 'y']), { proposals: [], notes: [] }, 'pageless rows and rot prove nothing');
assert.deepEqual(judgeProposals(null, context), [], 'a rowless judge sits over nothing');
assert.equal(judgeProposals([null, 7, []], context).every((verdict) => verdict.ok === false), true, 'rot rows are refused, never read');
assert.equal(applyDowry(null, frozenGift, { hero: HERO, pages: PAGES }).codex, null, 'no codex on the table — the dowry has nowhere to land, and says so without crashing');

console.log('PASS — the dowry door: the floor reads the same pages to the same bytes and invents nothing, every claim quotes its page verbatim or falls to the no-invention law, a quote grounds only what it names WHOLE (an embedded substring passes for nothing, the reader may not invent, and only the row the player\u2019s own hand renamed sheds its grounding belt), the validator judges every proposal as a turn in its own words, collisions refuse BY NAME through the one canon road (the epithet is its soul, the batch\u2019s first claim holds, the forged hero outranks every page), blessing outranks no court, the unblessed leave no trace, the fold is the ordinary reducer at the tale\u2019s threshold over a codex never mutated, and junk proves nothing');
