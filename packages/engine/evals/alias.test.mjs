// THE ALIAS GATE (engine twin) — Directive XXI: one soul, many names,
// one card. The road itself (names.js: the one canon, the claims, the
// two indexes, the seal); the fold (an epithet rides the soul's ledger,
// an op may address the soul by any sealed name); the courts (collision
// refused NAMING the holder — sealed name, ledger name, the hero's own,
// a soul born this same turn, claims binding sequentially, contested
// claims sealing for nobody; the dead cannot slip back onstage under an
// epithet; the elsewhere court answers the epithet with the soul's own
// ground; the frame never calls a sealed epithet a stranger); the
// census counting every claim including the turn's own seal; the
// presence replay landing an alias-addressed sighting on the ONE soul;
// and the pack's scene floor holding a seat for the soul who spoke only
// under her epithet. ADVERSARIAL SEATING by the standing law: the
// road's rider is bond-zero, tie-less, and oldest-introduced, so no
// kinship immunity and no positional luck can green these courts — only
// the name road can. The table strip (judgeTurn, the tool schema, the
// prompt rule, the wiki line) is judged by the game's own alias gate.
import assert from 'node:assert/strict';
import { canonName, ledgerOf, soulClaims, claimsIndex, aliasIndex, resolveByClaims, sealAlias } from '../src/names.js';
import { safeFallbackTurn, validateDmTurn } from '../src/protocol.js';
import { applyStoryUpdates, initCodex } from '../src/story.js';
import { assertCensus } from '../src/census.js';
import { presenceOf } from '../src/presence.js';
import { buildContextPack } from '../src/graph.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- 1. The road itself ----
assert.equal(canonName('  The   GRAY  Warden '), 'the gray warden', 'one canon: case-blind, trimmed, whitespace folded');
const frozenLedger = deepFreeze(['The Gray Warden']);
const grown = sealAlias(frozenLedger, 'Ash-Handed', 'Maren Duskholm');
assert.deepEqual(grown, ['The Gray Warden', 'Ash-Handed'], 'the seal appends in bestowal order and never mutates its input');
assert.equal(sealAlias(grown, 'the gray warden', 'Maren Duskholm'), grown, 'a held claim re-seals as the SAME ledger — byte-stable replays can trust the reference');
assert.equal(sealAlias(grown, 'MAREN DUSKHOLM', 'Maren Duskholm'), grown, 'the soul\u2019s own name is never re-sealed');
assert.deepEqual(sealAlias(undefined, '   ', 'x'), [], 'junk seals nothing');
assert.equal(sealAlias(grown, 'A'.repeat(80), 'Maren Duskholm')[2].length, 60, 'the seal holds the door\u2019s own 60-character cap');
assert.deepEqual(soulClaims(deepFreeze({ name: 'Maren', known_as: ['x1', 7, '   ', 'MAREN'] })), ['Maren', 'x1'], 'claims read with the witness law: rotten rows prove nothing, dedupe is case-blind');
assert.deepEqual(ledgerOf(null), [], 'a missing soul claims nothing and crashes nobody');
const castA = deepFreeze([
  { name: 'Maren Duskholm', known_as: ['The Gray Warden'] },
  { name: 'Tobias Crane' },
  { name: 'Wren', known_as: ['Shadow'] },
  { name: 'Vale', known_as: ['shadow'] }
]);
const claimsA = claimsIndex(castA);
assert.equal(resolveByClaims('the GRAY warden', claimsA), 'Maren Duskholm', 'the road answers a claim case-blind');
assert.equal(resolveByClaims('Maren   Duskholm', claimsA), 'Maren Duskholm', 'the road folds whitespace');
assert.equal(resolveByClaims('Shadow', claimsA), null, 'a contested claim resolves to NOBODY — the road never guesses');
const aliasesA = aliasIndex(castA);
assert.equal(aliasesA.has('maren duskholm'), false, 'sealed names never ride the alias index — a ledgerless cast takes no hop and pre-alias walks stay byte-identical');
assert.equal(resolveByClaims('The Gray Warden', aliasesA), 'Maren Duskholm', 'the epithet hop answers from the alias index');

// ---- 2. The fold: the ledger rides the record ----
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { cast_add: [
  { name: 'Maren Duskholm', role: 'warden', visual: 'a gray-cloaked warden', voice: 'low and even', goal: 'hold the mill' },
  { name: 'Tobias Crane', role: 'clerk', visual: 'ink-stained hands', voice: 'quick', goal: 'balance the books' }
] }, { turn: 1 });
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Maren Duskholm', known_as_add: 'The Gray Warden' }] }, { turn: 2 });
assert.deepEqual(codex.cast.find((s) => s.name === 'Maren Duskholm').known_as, ['The Gray Warden'], 'the fold seals the epithet onto the soul\u2019s own ledger');
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'the gray warden', known_as_add: 'Ash-Handed', last_seen: 'the hall door' }] }, { turn: 3 });
const marenFold = codex.cast.find((s) => s.name === 'Maren Duskholm');
assert.deepEqual(marenFold.known_as, ['The Gray Warden', 'Ash-Handed'], 'an op may address the soul by its epithet — one road, appended in bestowal order');
assert.equal(marenFold.last_seen, 'the hall door', 'the alias-addressed update moved the ONE soul');
assert.equal('known_as' in codex.cast.find((s) => s.name === 'Tobias Crane'), false, 'no ledger is born where no seal ever landed');
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Maren Duskholm', known_as_add: 'the gray warden' }] }, { turn: 4 });
assert.deepEqual(codex.cast.find((s) => s.name === 'Maren Duskholm').known_as, ['The Gray Warden', 'Ash-Handed'], 'a re-seal is the quiet no-op');

// ---- 3. The collision court: one soul, one claim ----
const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const courtCast = deepFreeze([
  { name: 'Maren Duskholm', status: 'active', known_as: ['The Gray Warden'] },
  { name: 'Tobias Crane', status: 'active' }
]);
const ctx = deepFreeze({ cast: courtCast, hero: 'Bram Hollis' });
const seal = (name, alias) => turn({ cast_update: [{ name, known_as_add: alias }] });
assert.equal(validateDmTurn(seal('Tobias Crane', 'The Quiet Hand'), [], ctx).ok, true, 'a free epithet seals');
const nameHit = validateDmTurn(seal('Maren Duskholm', 'tobias crane'), [], ctx);
assert.ok(!nameHit.ok && nameHit.errors.some((e) => /belongs to Tobias Crane/.test(e)), 'a claim on another\u2019s sealed name is refused NAMING the holder');
const ledgerHit = validateDmTurn(seal('Tobias Crane', 'THE GRAY WARDEN'), [], ctx);
assert.ok(!ledgerHit.ok && ledgerHit.errors.some((e) => /belongs to Maren Duskholm/.test(e)), 'a ledger claim is a claim — refused case-blind under the MARSH precedent\u2019s exact-casing walk');
const heroHit = validateDmTurn(seal('Tobias Crane', 'bram hollis'), [], ctx);
assert.ok(!heroHit.ok && heroHit.errors.some((e) => /belongs to Bram Hollis/.test(e)), 'the hero\u2019s own name is a standing claim');
assert.equal(validateDmTurn(seal('Maren Duskholm', 'The Gray Warden'), [], ctx).ok, true, 'an own claim re-seals as the quiet no-op');
assert.equal(validateDmTurn(seal('Maren Duskholm', 'maren duskholm'), [], ctx).ok, true, 'the soul\u2019s own name is the quiet no-op');
assert.equal(validateDmTurn(seal('Tobias Crane', 'X'), [], ctx).ok, false, 'the shape door refuses under 2');
assert.equal(validateDmTurn(seal('Tobias Crane', 'A'.repeat(61)), [], ctx).ok, false, 'the shape door refuses over 60');
assert.equal(validateDmTurn(seal('Tobias Crane', null), [], ctx).ok, true, 'null is the lawful empty seat');
const seq = validateDmTurn(turn({ cast_update: [
  { name: 'Maren Duskholm', known_as_add: 'The Ferry Ghost' },
  { name: 'Tobias Crane', known_as_add: 'the ferry ghost' }
] }), [], ctx);
assert.ok(!seq.ok && seq.errors.some((e) => /belongs to Maren Duskholm/.test(e)), 'claims bind sequentially — an epithet sealed by an earlier patch stands against every later one');
const born = validateDmTurn(turn({
  cast_add: [{ name: 'Petra Vane', role: 'scout', visual: 'a wind-burned scout', voice: 'clipped', goal: 'see the pass' }],
  cast_update: [{ name: 'Tobias Crane', known_as_add: 'petra vane' }]
}), [], ctx);
assert.ok(born.errors.some((e) => /belongs to Petra Vane/.test(e)), 'a soul born this same turn holds its claim from its first breath');
const contestedCtx = deepFreeze({ cast: [...courtCast, { name: 'Wren', known_as: ['Shadow'] }, { name: 'Vale', known_as: ['shadow'] }], hero: 'Bram Hollis' });
const cont = validateDmTurn(seal('Tobias Crane', 'Shadow'), [], contestedCtx);
assert.ok(!cont.ok && cont.errors.some((e) => /more than one soul/.test(e)), 'a contested claim seals for nobody');

// ---- 4. The grave, the ground, the frame — every court walks the road ----
const speech = (speaker) => ({ ...safeFallbackTurn('', 3), narration_blocks: [{ speaker, text: 'The mill wheel turns and the water runs cold beneath the stones while the night holds its breath over the sleeping vale.' }] });
const graveCtx = deepFreeze({ cast: [{ name: 'Maren Duskholm', status: 'dead', known_as: ['The Gray Warden'] }, { name: 'Tobias Crane', status: 'active' }], hero: 'Bram Hollis' });
const grave = validateDmTurn(speech('The Gray Warden'), [], graveCtx);
assert.ok(grave.errors.some((e) => /the dead do not speak/.test(e) && /The Gray Warden/.test(e)), 'the dead cannot slip back onstage under an epithet — the door speaks the turn\u2019s own words');
const livingCtx = deepFreeze({ cast: [{ name: 'Maren Duskholm', status: 'active', known_as: ['The Gray Warden'] }], hero: 'Bram Hollis' });
assert.ok(!validateDmTurn(speech('The Gray Warden'), [], livingCtx).errors.some((e) => /the dead do not speak/.test(e)), 'alive, the epithet speaks freely');
const groundCtx = deepFreeze({ cast: livingCtx.cast, hero: 'Bram Hollis', party: [], presence: [{ name: 'Maren Duskholm', ground: 'The Mill' }], scene: { region: 'The Hall' } });
const ground = validateDmTurn(speech('The Gray Warden'), [], groundCtx);
assert.ok(ground.errors.some((e) => /elsewhere does not speak/.test(e) && /The Gray Warden/.test(e) && /The Mill/.test(e)), 'the elsewhere court answers the epithet with the ONE soul\u2019s own ground');
const partyCtx = deepFreeze({ ...groundCtx, party: ['Maren Duskholm'] });
assert.ok(!validateDmTurn(speech('The Gray Warden'), [], partyCtx).errors.some((e) => /elsewhere does not speak/.test(e)), 'a party member\u2019s epithet travels with the party');
const cueTurn = (subjects) => ({ ...safeFallbackTurn('', 3), image_cue: { kind: 'portrait', subjects, moment: 'A face at the door.', caption: 'A gray-cloaked warden stands at the mill door, lantern raised against the dark.' } });
assert.ok(validateDmTurn(cueTurn(['The Gray Warden']), [], graveCtx).errors.some((e) => /paints the dead/.test(e)), 'the dead are not painted under an epithet');
assert.ok(!validateDmTurn(cueTurn(['The Gray Warden']), [], livingCtx).errors.some((e) => /record does not hold/.test(e)), 'a sealed epithet is a recorded soul — the frame never calls it a stranger');

// ---- 5. The census counts every claim ----
const censusCast = deepFreeze([{ name: 'Maren Duskholm', known_as: ['The Gray Warden'] }]);
assert.equal(assertCensus({ narration_blocks: [{ speaker: 'The Gray Warden', text: 'Hold.' }], story: {} }, censusCast, { hero: { name: 'Bram' } }).ok, true, 'the census counts a sealed claim as its soul');
assert.equal(assertCensus({ narration_blocks: [{ speaker: 'The Quiet Hand', text: 'Hold.' }], story: { cast_update: [{ name: 'Maren Duskholm', known_as_add: 'The Quiet Hand' }] } }, censusCast, { hero: { name: 'Bram' } }).ok, true, 'an epithet sealed THIS turn counts the same breath it lands');
assert.equal(assertCensus({ narration_blocks: [{ speaker: 'Nobody Known', text: 'Hold.' }], story: {} }, censusCast, {}).ok, false, 'a stranger still trips the census');

// ---- 6. The replay: an alias-addressed sighting lands on the ONE soul ----
const plog = (t, story, blocks = []) => ({ turn: t, dm: { narration_blocks: blocks, story } });
const presCampaign = deepFreeze({ hero: { name: 'Bram Hollis' }, logs: [
  plog(1, { world: { region_add: { name: 'The Mill' } }, scene_set: { region: 'The Mill' }, cast_add: [{ name: 'Maren Duskholm', role: 'warden' }] }, [{ speaker: 'Maren Duskholm', text: 'Stones turn.' }]),
  plog(2, { cast_update: [{ name: 'Maren Duskholm', known_as_add: 'The Gray Warden' }] }),
  plog(3, { world: { region_add: { name: 'The Hall' } }, scene_set: { region: 'The Hall' } }),
  plog(4, { cast_update: [{ name: 'The Gray Warden', last_seen: 'at the hall door' }] })
] });
const presRows = presenceOf(presCampaign);
const marenPres = presRows.find((row) => row.name === 'Maren Duskholm');
assert.ok(marenPres, 'the replay knows the soul under her sealed name');
assert.equal(marenPres.ground, 'The Hall', 'the sighting under the epithet moved the ONE soul\u2019s trail');
assert.equal(JSON.stringify(presenceOf(presCampaign)), JSON.stringify(presRows), 'the replay is byte-stable on the repeat');

// ---- 7. The pack: she spoke only under her epithet, and the scene floor holds HER seat ----
// Adversarial seating: bond zero, no ties, introduced FIRST (oldest famine
// food), fillers single-token by the fixture law. Only the name road can
// put her in the scene.
const filler = (i) => ({
  id: `f${i}`, name: `Carter0${i}`, role: 'wayfarer',
  visual: 'a wayfarer in oiled wool with a long stride and a guarded look about the eyes, boots worn to the welt by the vale road',
  voice: 'low', goal: 'the road', secret: '', status: 'active', bond: 0,
  last_seen: 'the road', known_facts: [], bond_arc: [], introduced_turn: 2
});
const graphCodex = initCodex('classic-epic', { arc: { title: 'The Vale', evil_plot: 'The Regent drains the vale', stakes: 'Every hearth', style_bible: 'Iron and candlelight' } });
graphCodex.cast.push(
  { id: 's-maren', name: 'Maren Duskholm', role: 'warden', visual: 'a gray-cloaked warden of the mill, hood drawn low, lantern-light caught in the lines of a weathered face', voice: 'low and even', goal: 'hold the mill', secret: '', status: 'active', bond: 0, last_seen: 'the mill', known_facts: [], bond_arc: [], introduced_turn: 1, known_as: ['The Gray Warden'] },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(filler)
);
const graphLogs = [];
for (let t = 1; t <= 9; t += 1) graphLogs.push(plog(t, {}, []));
graphLogs.push(plog(10, {}, [{ speaker: 'The Gray Warden', text: 'Hold the line at the mill.' }]));
const graphCampaign = deepFreeze({ hero: { name: 'Bram Hollis', className: 'Knight' }, codex: graphCodex, logs: graphLogs });
const packAt = (b) => buildContextPack(graphCampaign, { budget: b, recentTurns: 6 });
let budget = 20000;
while (budget > 400 && packAt(budget).cast.length === graphCodex.cast.length) budget -= 200;
const squeezed = packAt(budget);
assert.ok(squeezed.cast.length < graphCodex.cast.length, 'the squeeze truly bit — the famine ate somebody');
assert.ok(squeezed.cast.some((s) => s.name === 'Maren Duskholm'), 'she spoke only as The Gray Warden, and the scene floor held HER seat — the pack walks the road');
assert.equal(JSON.stringify(squeezed), JSON.stringify(packAt(budget)), 'the squeezed pack is byte-stable on the repeat');

console.log('PASS — the alias gate (engine): the road holds one canon, claims and both indexes read under the witness law, the seal appends without mutation and re-seals as the same ledger; the fold seats an epithet on the soul\u2019s own ledger and answers alias-addressed ops on the one road while elder souls grow no key; the court refuses collisions NAMING the holder — sealed name, ledger name, the hero\u2019s own, a soul born this turn, claims binding sequentially, contested claims sealing for nobody — while own claims re-seal quiet and null keeps its lawful seat; the dead cannot slip back onstage under an epithet, the elsewhere court answers with the soul\u2019s own ground, the frame never calls a sealed name a stranger; the census counts every claim including the turn\u2019s own seal; the presence replay lands the alias-addressed sighting on the one soul, byte-stable; and the squeezed pack\u2019s scene floor keeps the seat of a soul who spoke only under her epithet.');
