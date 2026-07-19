// THE BREADTH GATE (Directive XII §V, §VII.1) — nine spines whole and
// threshold-true, the forge pools doubled and counted in numbers, every
// pool entry clearing the standing poison lexicon and the covenant's
// rating, and THREE REFERENCE TALES verified and law-exercising: chain
// whole, head agreed, the six §V.4 laws on the record, and the twins
// byte-equal — one export, shipped twice. Keyless, deterministic.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPINES, getSpine } from 'fatescript/spines';
import { milestoneThresholds } from 'fatescript/rules';
import {
  ANCESTRIES, CLASSES, COVENANTS, FIRST_NAMES, LAST_NAMES, MARKS,
  ORACLE_HERO, ORACLE_WORLD, REGION_NAMES, SIGILS, TITLES, TONES, oracleHero
} from 'fatescript/forgeRolls';
import { PG_LEXICON, POISON_DEMANDS } from 'fatescript/smith';
import { verifyJournal } from '../src/lib/seal.js';

let courts = 0;
const court = (name, fn) => Promise.resolve(fn()).then(() => { courts += 1; console.log(`  ✓ ${name}`); });

// ---------------------------------------------------------------
// I. NINE SPINES, WHOLE AND THRESHOLD-TRUE (§V.1, §I.3).
// ---------------------------------------------------------------
const TABLE = [
  ['classic-epic', 15, 5, 8, 10, 14],
  ['mystery', 13, 4, 9, 10, 12],
  ['heist', 12, 4, 8, 9, 11],
  ['horror-survival', 14, 4, 9, 10, 13],
  ['redemption-road', 14, 4, 8, 10, 13],
  ['siege-of-home', 13, 4, 7, 9, 12],
  ['long-voyage', 14, 4, 9, 10, 13],
  ['crown-intrigue', 13, 4, 8, 9, 12],
  ['pilgrim-lie', 12, 4, 7, 9, 11]
];

await court('nine spines, a closed set, each whole', () => {
  assert.equal(SPINES.length, 9);
  assert.deepEqual(new Set(SPINES.map((s) => s.id)), new Set(TABLE.map((r) => r[0])));
  for (const spine of SPINES) {
    const acts = new Set(spine.beats.map((beat) => beat.act));
    assert.deepEqual([...acts].sort(), [1, 2, 3], `${spine.id} holds three acts`);
    assert.equal(spine.beats[0].act, 1, `${spine.id} opens in Act I`);
    assert.ok(Number.isInteger(spine.revealIdx), `${spine.id} names its Revelation`);
    assert.equal(spine.beats[spine.revealIdx].act, 2, `${spine.id}: the Revelation sits inside Act II`);
    assert.ok(Array.isArray(spine.deadlines) && spine.deadlines.length >= 2, `${spine.id} carries role deadlines`);
    for (const deadline of spine.deadlines) {
      assert.ok(Number.isInteger(deadline.byBeat) && deadline.byBeat >= 0 && deadline.byBeat < spine.beats.length, `${spine.id}: a deadline sits on a real beat`);
      assert.ok(Array.isArray(deadline.roles) && deadline.roles.length, `${spine.id}: a deadline names its roles`);
    }
    assert.ok(typeof spine.label === 'string' && spine.label.length >= 3, `${spine.id} bears a label`);
  }
});

await court('every spine is threshold-true to the ratified table', () => {
  for (const [id, beatCount, l2, l3, l4, l5] of TABLE) {
    const spine = getSpine(id);
    assert.equal(spine.beats.length, beatCount, `${id}: ${beatCount} beats`);
    assert.deepEqual(milestoneThresholds(spine), { act2: l2, reveal: l3, act3: l4, final: l5 }, `${id} thresholds`);
  }
});

await court('the fallback law stands: an unknown id answers with the first spine, never nothing', () => {
  assert.equal(getSpine('no-such-spine').id, SPINES[0].id);
  assert.equal(getSpine(undefined).id, SPINES[0].id);
});

// ---------------------------------------------------------------
// II. THE POOLS, DOUBLED AND COUNTED (§V.2) — exact numbers, no
// duplicates, every entry a real string; every path answers a calling.
// ---------------------------------------------------------------
const POOLS = [
  ['TITLES', TITLES, 24], ['COVENANTS', COVENANTS, 20], ['TONES', TONES, 16],
  ['REGION_NAMES', REGION_NAMES, 20], ['MARKS', MARKS, 20],
  ['FIRST_NAMES', FIRST_NAMES, 32], ['LAST_NAMES', LAST_NAMES, 32], ['SIGILS', SIGILS, 16],
  ['ORACLE_WORLD.places', ORACLE_WORLD.places, 10], ['ORACLE_WORLD.wounds', ORACLE_WORLD.wounds, 10],
  ['ORACLE_WORLD.hopes', ORACLE_WORLD.hopes, 10],
  ['ORACLE_HERO.paths', ORACLE_HERO.paths, 10], ['ORACLE_HERO.virtues', ORACLE_HERO.virtues, 10],
  ['ORACLE_HERO.keepsakes', ORACLE_HERO.keepsakes, 10]
];

await court('the pools are pinned at their doubled counts', () => {
  for (const [name, pool, size] of POOLS) {
    assert.ok(Array.isArray(pool), `${name} is a pool`);
    assert.equal(pool.length, size, `${name} holds ${size}`);
    assert.equal(new Set(pool).size, size, `${name} holds no duplicate`);
    for (const entry of pool) assert.ok(typeof entry === 'string' && entry.trim().length, `${name} holds only real words`);
  }
  assert.equal(ANCESTRIES.length, 8, 'ANCESTRIES stays a kind set of 8 — rules surface, not prose');
  assert.equal(new Set(ANCESTRIES).size, 8);
});

await court('every path answers with a calling from the eight standing classes', () => {
  const standing = new Set(CLASSES.map((cls) => cls.className));
  assert.equal(standing.size, 8, 'eight standing classes');
  for (const path of ORACLE_HERO.paths) {
    const dealt = oracleHero({ path, virtue: ORACLE_HERO.virtues[0], keepsake: ORACLE_HERO.keepsakes[0] });
    assert.ok(standing.has(dealt.className), `${path} answers with ${dealt.className}, a standing calling`);
    assert.ok(dealt.hitDie >= 6, `${path} carries the calling's die`);
  }
});

// ---------------------------------------------------------------
// III. THE PG LEXICON LAW (§V.3) — every pool entry, old and new,
// clears the standing poison lexicon and the covenant's rating.
// ---------------------------------------------------------------
await court('every counted pool clears the lexicon and the rating', () => {
  const offenders = [];
  for (const [name, pool] of POOLS) {
    for (const entry of pool) {
      for (const { name: family, pattern } of PG_LEXICON) if (pattern.test(entry)) offenders.push(`pg:${family} in ${name}: ${entry}`);
      for (const { name: family, pattern } of POISON_DEMANDS) if (pattern.test(entry)) offenders.push(`poison:${family} in ${name}: ${entry}`);
    }
  }
  assert.deepEqual(offenders, [], 'no pool entry carries the plague-words or a recognition demand');
});

// ---------------------------------------------------------------
// IV. THREE REFERENCE TALES (§V.4) — parsed, chain-verified, head
// agreed, six laws on the record, twins byte-equal, manifest honest.
// ---------------------------------------------------------------
const FIXTURES = new URL('../tests/e2e/fixtures/tales/', import.meta.url);
const SHELF = new URL('../public/demo-tales/', import.meta.url);
const EXPECTED_SPINES = ['redemption-road', 'long-voyage', 'crown-intrigue'];

const manifest = JSON.parse(readFileSync(new URL('manifest.json', SHELF), 'utf8'));

await court('the shelf manifest names exactly the three ratified spines', () => {
  assert.ok(Array.isArray(manifest) && manifest.length === 3);
  assert.deepEqual(manifest.map((row) => row.spineId).sort(), [...EXPECTED_SPINES].sort());
  for (const row of manifest) {
    assert.ok(typeof row.file === 'string' && row.file.endsWith('.chronicle.json'));
    assert.ok(typeof row.campaignId === 'string' && row.campaignId.length >= 8);
    assert.ok(typeof row.headHash === 'string' && row.headHash.length === 64);
    assert.ok(typeof row.title === 'string' && row.title.length >= 3);
    assert.ok(typeof row.hero === 'string' && row.hero.includes(' '), 'the hero bears a full name');
    assert.ok(Number.isInteger(row.turns) && row.turns >= 30, 'a whole tale, not a sketch');
  }
});

await court('the twins are byte-equal: one export, shipped twice', () => {
  for (const row of manifest) {
    const underCourt = readFileSync(new URL(row.file, FIXTURES));
    const onShelf = readFileSync(new URL(row.file, SHELF));
    assert.ok(underCourt.equals(onShelf), `${row.spineId}: fixture and shelf are the same bytes`);
  }
});

// The six laws, proven independently of the forge that wrote them.
const proveTale = (data, spineId) => {
  const turns = data.journal.filter((row) => row.type === 'turn').map((row) => row.payload);
  const stories = turns.map((payload) => payload?.dm?.story || {});
  assert.equal(data.header.format, 'mydungeon.chronicle', `${spineId}: the header speaks the format`);
  assert.equal(data.campaign.spineId, spineId, `${spineId}: the tale rides its own spine`);
  assert.ok(data.campaign.sealedAt && data.campaign.completed, `${spineId}: played to seal`);
  assert.ok(data.campaign.readOnly !== true || data.campaign.forkOf, `${spineId}: shipped as a sealed original`);
  assert.ok(stories.some((story) => (story.item_transfer || []).length), `${spineId}: a possession moves hands`);
  assert.ok(stories.some((story) => story.party_join?.name), `${spineId}: a companion joins`);
  assert.ok(stories.some((story) => story.party_leave?.remains_at), `${spineId}: a travel leaves a companion behind, with remains_at`);
  assert.ok(stories.some((story) => (story.thread_add || []).length), `${spineId}: a thread is sworn`);
  assert.ok(stories.some((story) => (story.thread_resolve || []).length), `${spineId}: the thread is answered`);
  assert.ok(stories.some((story) => story.item_equip?.name), `${spineId}: a thing is equipped`);
  const purse = stories.flatMap((story) => story.purse || []);
  assert.ok(purse.some((move) => move.delta > 0) && purse.some((move) => move.delta < 0), `${spineId}: the purse moves both directions`);
  assert.ok(turns.some((payload) => payload?.dm?.combat?.op === 'start'), `${spineId}: a battle opens on the record`);
  const companionAsk = turns.find((payload) => payload?.dm?.roll_request && String(payload.dm.roll_request.actor_id || '').toLowerCase() !== 'hero');
  assert.ok(companionAsk, `${spineId}: a sheeted companion's die is asked`);
  const closing = turns[turns.indexOf(companionAsk) + 1];
  assert.ok(closing?.resolution && String(closing.resolution.actorId || '') !== 'hero', `${spineId}: the companion's die falls on the record`);
  assert.ok(closing?.dm?.combat?.op === 'end', `${spineId}: the battle closes in its turn`);
  assert.ok((closing?.dm?.story?.sheet_condition?.add || []).length, `${spineId}: the fall is addressed in its turn`);
};

for (const row of manifest) {
  await court(`${row.spineId}: chain whole, head agreed, six laws on the record`, async () => {
    const data = JSON.parse(readFileSync(new URL(row.file, FIXTURES), 'utf8'));
    assert.equal(data.header.campaignId, row.campaignId, 'the manifest speaks the tale\u2019s own id');
    assert.equal(data.header.headHash, row.headHash, 'the manifest speaks the tale\u2019s own head');
    assert.equal(data.campaign.title, row.title, 'the manifest speaks the tale\u2019s own title');
    assert.equal(data.journal.filter((r) => r.type === 'turn').length, row.turns, 'the manifest counts the turns honestly');
    const verdicts = await verifyJournal(data.journal);
    assert.equal(verdicts.length, data.journal.length, 'every record faced the court');
    const broken = verdicts.find((verdict) => !verdict.ok);
    assert.ok(!broken, `record ${broken?.i} fails the chain`);
    assert.equal(data.header.headHash, data.journal[data.journal.length - 1].recordHash, 'the head seal agrees with the last record');
    proveTale(data, row.spineId);
  });
}

console.log(`PASS — BREADTH GATE: ${courts} courts sat, all green. Nine spines, doubled pools, three tales that prove their laws.`);
