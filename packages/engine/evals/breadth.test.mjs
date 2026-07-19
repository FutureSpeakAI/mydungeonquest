// THE BREADTH GATE (engine twin, pure fraction; Directive XII §V.1–3,
// §I.3) — nine spines whole and threshold-true, the forge pools doubled
// and counted in numbers, every pool entry clearing the standing poison
// lexicon and the covenant's rating, and every path answering with a
// standing calling. Keyless, deterministic.
//
// The THREE REFERENCE TALES fraction (§V.4 / §IV: parsed chronicles,
// chain-verified via the sealed journal, head agreed, six laws on the
// record, twins byte-equal, manifest honest) is the table's own impure
// law — it rides fake-indexeddb, reads the game's tests/e2e fixtures and
// public/demo-tales shelf, and leans on verifyJournal from the game's
// db-backed seal seat. That fraction is judged at the table's own gate;
// the engine ships no chronicle shelf and no database.
import assert from 'node:assert/strict';
import { SPINES, getSpine } from '../src/spines.js';
import { milestoneThresholds } from '../src/rules.js';
import {
  ANCESTRIES, CLASSES, COVENANTS, FIRST_NAMES, LAST_NAMES, MARKS,
  ORACLE_HERO, ORACLE_WORLD, REGION_NAMES, SIGILS, TITLES, TONES, oracleHero
} from '../src/forgeRolls.js';
import { PG_LEXICON, POISON_DEMANDS } from '../src/smith.js';

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

console.log(`PASS — the breadth gate (engine twin, pure fraction): ${courts} courts sat, all green. Nine spines, doubled pools; the three reference tales are judged at the table\u2019s own gate.`);
