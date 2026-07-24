// TASK 65 PHASE 5 — THE WAYPOST LAW (Directive XX, Law VI): the engine twin.
//
// Replay is truth; the waypost is a proven shortcut. This twin proves the
// pure seats with no store and no clock: a checkpoint folded over a covered
// stretch resumes byte-identical to the full walk at ANY cut; checkpoint
// bytes are deterministic across independent folds; a strike behind the
// waypost un-seats it and the full walk stands in; a bent fold or a bent
// claim is refused by its own hash; another hero's canon is refused; and
// rot proves nothing. The walk itself is cross-examined against every
// engine direct it shadows — cards, clock, pack, tells, travel, and the
// codex's own standings ledger — so the shortcut can never drift from law.
import assert from 'node:assert/strict';
import {
  foldCheckpoint, resumeFolds, walkFolds, checkpointStands, checkpointProves,
  WAYPOST_STRIDE, WAYPOST_VERSION, WAYPOST_FOLDS
} from '../src/waypost.js';
import { canonicalize } from '../src/canonical.js';
import { buildCards } from '../src/cards.js';
import { rowsOf } from '../src/rows.js';
import { worldClock, packClock } from '../src/clock.js';
import { tellReport } from '../src/tells.js';
import { travelRecord } from '../src/presence.js';
import { applyStoryUpdates, initCodex } from '../src/story.js';

const HERO = {
  name: 'Aldric Vane', ancestry: 'Human', className: 'Warden', pronouns: 'he/him',
  bearing: 'A steady, watchful man in a road-worn cloak', mark: 'a burned left hand', presentation: 'masculine'
};
const NAMES = ['Mira Coll', 'Bren Ashword', 'Sasha Reed', 'Odo Pell', 'Wren Faye', 'Tam Uller'];
const GROUNDS = ['Emberfall', 'Hollowmere', 'Stonegate', 'Ashford Bridge'];
const FACTIONS = ['The Ember Court', 'The River Guild', 'The Grey Watch'];
const STEPS = [1, -1, 2, -2];

// A deterministic 55-turn record — no clock, no randomness — exercising
// every covered lane: births and patches, speakers and tells, grounds and
// party churn, item sightings, lawful and unlawful standing shifts, ticks,
// spans, and rows struck before the waypost ever seals.
function mkRecord() {
  const rows = [];
  const cuts = { after25: -1, after50: -1 };
  for (let t = 0; t < 55; t += 1) {
    const name = NAMES[t % NAMES.length];
    const ground = GROUNDS[Math.floor(t / 6) % GROUNDS.length];
    const story = {};
    if (t % 6 === 0) {
      story.world = { region_add: { name: ground } };
      story.scene_set = { region: ground };
    }
    if (t % 5 === 1) {
      story.cast_add = [{
        name, role: t < NAMES.length * 5 ? `wandering ${['scout', 'chandler', 'reeve'][t % 3]}` : 'villain',
        visual: `Seen on turn ${t} beneath the ${ground} lanterns`, voice: 'low and even',
        voice_card: { gender: ['feminine', 'masculine', 'neutral'][t % 3], age: 'adult', timbre: 'dry' },
        goal: `keep the ${ground} road open`
      }];
    }
    if (t % 4 === 2) {
      story.cast_update = [{ name: NAMES[(t + 1) % NAMES.length], bond_delta: (t % 3) - 1, ...(t === 26 ? { status: 'wounded' } : {}), ...(t === 41 ? { status: 'dead', last_seen: 'beneath the bridge' } : {}) }];
    }
    if (t % 7 === 3) story.party_join = { name: NAMES[t % NAMES.length] };
    if (t % 7 === 5) story.party_leave = { name: NAMES[(t + 3) % NAMES.length], remains_at: ground };
    if (t % 11 === 6) story.item_add = [{ name: `Relic ${t}`, holder: NAMES[t % NAMES.length] }];
    if (t % 9 === 4) {
      story.standing_shift = [{ faction: FACTIONS[t % 3], delta: STEPS[t % 4], reason: `Turn ${t} tilted the scales` }];
      if (t % 18 === 4) story.standing_shift.push(
        { faction: FACTIONS[(t + 1) % 3], delta: STEPS[(t + 1) % 4], reason: `Turn ${t} echoed in the halls` },
        { faction: '', delta: 3, reason: 'an unlawful third that must be sliced away' }
      );
    }
    const dm = {
      narration_blocks: [
        { speaker: 'DM', text: `Turn ${t}: she understood that the ${ground} gate kept its own ledger, and something shifted in the dark beyond the palisade.` },
        { speaker: name, text: `"The road holds, turn ${t}," ${name.split(' ')[0]} said. Her heart pounded against the quiet.` }
      ],
      time_advance: { n: t % 3, unit: 'hours' },
      story
    };
    rows.push({ id: `row-${rows.length}`, turn: t, recordHash: `seal-${rows.length}`, player: `I act on turn ${t}.`, dm });
    if (t % 8 === 7) {
      rows.push({
        id: `row-${rows.length}`, kind: 'tick', turn: t, recordHash: `seal-${rows.length}`,
        dm: { story: { standing_shift: [{ faction: FACTIONS[(t + 1) % 3], delta: -1, reason: `Offscreen murmur after turn ${t}` }] } }
      });
    }
    if (t % 10 === 9) {
      rows.push({ id: `row-${rows.length}`, kind: 'span', recordHash: `seal-${rows.length}`, clock_advance: { n: 1, unit: 'days' } });
    }
    if (t === 24) cuts.after25 = rows.length;
    if (t === 49) cuts.after50 = rows.length;
  }
  // Struck before any waypost seals — the covered struck set must ride.
  rows[11].redacted = true;
  rows[30].redacted = true;
  return { rows, cuts };
}

const { rows, cuts } = mkRecord();
assert.ok(cuts.after25 > 25 && cuts.after50 > 50 && cuts.after50 < rows.length, 'the record must reach past both strides');
const CUTS = [cuts.after25, 37, cuts.after50];

console.log('THE WAYPOST LAW — the engine twin convenes.');

// ── Court 1: the full walk speaks every direct's own bytes ──────────────
const full = walkFolds({ hero: HERO, entries: rows });
assert.equal(JSON.stringify(full.cards), JSON.stringify(buildCards({ hero: HERO, entries: rowsOf(rows) })), 'cards drifted from the direct walk');
assert.equal(JSON.stringify(full.clock), JSON.stringify(worldClock(rows)), 'clock drifted from the direct walk');
assert.equal(JSON.stringify(full.pack), JSON.stringify(packClock(rows)), 'pack clock drifted from the direct walk');
assert.equal(JSON.stringify(full.tells), JSON.stringify(tellReport(rows)), 'tells drifted from the direct walk');
assert.equal(JSON.stringify(full.travel), JSON.stringify(travelRecord({ hero: HERO, logs: rows })), 'travel drifted from the direct walk');
let codex = initCodex('classic-epic');
for (const row of rows) {
  const story = row?.dm?.story;
  if (story && typeof story === 'object' && !Array.isArray(story)) codex = applyStoryUpdates(codex, story, { turn: row.turn });
}
assert.equal(JSON.stringify(full.standings), JSON.stringify(codex.standings ?? []), 'standings drifted from the codex ledger');
// No vacuous greens: every covered lane actually moved.
assert.ok(full.cards.order.length >= NAMES.length, 'the record must birth the cast');
assert.ok(full.travel.stands.length >= 4 && full.travel.ground, 'the record must walk grounds');
assert.ok(full.tells.offenders.length > 0, 'the record must convict tells');

// ── Court 1b: rot proves nothing — in the fold exactly as in every direct ──
// A rotted record (null, a stray string, a number, an empty array seated
// mid-list) folds byte-identical to each direct's own rot law, seals an
// honest checkpoint, and resumes to the same bytes. Absolute indexes hold:
// rot occupies its seat and contributes nothing.
const rotted = [
  ...rows.slice(0, 40),
  null, 'a stray string', 42, [],
  { turn: 998, dm: { narration_blocks: 'a lie shaped like a list' } },
  { turn: 999, dm: { narration_blocks: 42 } },
  { turn: 997, dm: { narration_blocks: [], story: { standing_shift: 42, cast_add: 'nope', cast_update: 7 } } },
  ...rows.slice(40)
];
const rottedFull = walkFolds({ hero: HERO, entries: rotted });
assert.equal(JSON.stringify(rottedFull.cards), JSON.stringify(buildCards({ hero: HERO, entries: rowsOf(rotted) })), 'cards ignore rot — one law');
assert.equal(JSON.stringify(rottedFull.tells), JSON.stringify(tellReport(rotted)), 'tells ignore rot at the ONE seat — the composed court and the fold alike');
assert.equal(JSON.stringify(rottedFull.clock), JSON.stringify(worldClock(rotted)), 'the clock ignores rot');
assert.equal(JSON.stringify(rottedFull.travel), JSON.stringify(travelRecord({ hero: HERO, logs: rotted })), 'travel ignores rot');
const rottedCp = await foldCheckpoint({ hero: HERO, entries: rotted });
assert.ok(checkpointStands(rottedCp, { hero: HERO, entries: rotted }) && (await checkpointProves(rottedCp)), 'a checkpoint seals over a rotted record honestly');
assert.equal(JSON.stringify(resumeFolds(rottedCp, [], { hero: HERO })), JSON.stringify(rottedFull), 'and resumes to the very same bytes');
assert.ok(full.standings.length >= 10, 'the record must tilt standings');
assert.ok(full.clock.totalHours > 24 && full.pack.day > 1, 'the record must spend days');
console.log('  ✓ the full walk is the engine\u2019s own law — cards, clock, pack, tells, travel, and the codex ledger byte for byte');

// ── Court 2: resume is byte-identical at every cut ──────────────────────
const posts = [];
for (const cut of CUTS) {
  const cp = await foldCheckpoint({ hero: HERO, entries: rows.slice(0, cut) });
  posts.push(cp);
  assert.equal(cp.v, WAYPOST_VERSION);
  assert.equal(cp.rows, cut);
  assert.equal(cp.lastLogId, rows[cut - 1].id, 'the checkpoint must pin the row seated at its cut');
  assert.equal(cp.head, rows[cut - 1].recordHash, 'the checkpoint must pin the sealed head at its cut');
  for (const fold of ['cards', 'presence', 'clockHours', 'tells', 'standings']) {
    assert.ok(fold in cp.folds, `the checkpoint must carry the ${fold} fold`);
  }
  assert.ok(await checkpointProves(cp), 'a pristine checkpoint must prove itself');
  assert.ok(checkpointStands(cp, { hero: HERO, entries: rows }), 'a pristine checkpoint must stand against its own record');
  const resumed = resumeFolds(cp, rows.slice(cut), { hero: HERO });
  assert.equal(JSON.stringify(resumed), JSON.stringify(full), `resume from row ${cut} must be byte-identical to the full walk`);
  const again = resumeFolds(cp, rows.slice(cut), { hero: HERO });
  assert.equal(JSON.stringify(again), JSON.stringify(resumed), 'resume must be deterministic on repeat');
}
assert.deepEqual(posts[0].struck, [11], 'the first waypost must carry its covered strike');
assert.deepEqual(posts[2].struck, [11, 30], 'the elder waypost must carry every covered strike');
console.log(`  ✓ checkpoints at rows ${CUTS.join('/')} of ${rows.length} resumed byte-identical to the full walk, struck rows carried`);

// ── Court 3: checkpoint bytes are deterministic ─────────────────────────
const twinA = await foldCheckpoint({ hero: HERO, entries: rows.slice(0, cuts.after25) });
const twinB = await foldCheckpoint({ hero: HERO, entries: rows.slice(0, cuts.after25) });
assert.equal(JSON.stringify(twinA), JSON.stringify(twinB), 'two independent folds must seal identical bytes');
assert.equal(canonicalize(twinA), canonicalize(twinB), 'canonical bytes must agree too');
console.log('  ✓ checkpoint bytes are deterministic across independent folds');

// ── Court 4: a strike behind the waypost un-seats it; the full walk stands in ──
const struckLive = structuredClone(rows);
struckLive[5].redacted = true; // behind the first cut, newly struck
const cp25 = posts[0];
assert.equal(checkpointStands(cp25, { hero: HERO, entries: struckLive }), false, 'a strike at or behind the waypost must un-seat it');
const stale = resumeFolds(cp25, struckLive.slice(cuts.after25), { hero: HERO });
const truth = walkFolds({ hero: HERO, entries: struckLive });
assert.notEqual(JSON.stringify(stale), JSON.stringify(truth), 'the refusal must matter: a stale resume would lie about the struck row');
assert.equal(JSON.stringify(walkFolds({ hero: HERO, entries: struckLive })), JSON.stringify(truth), 'the full walk stands in, deterministic as ever');
console.log('  ✓ a strike behind the waypost un-seats it — the silent refusal is real, and the full walk stands in');

// ── Court 5: tamper is refused by the checkpoint's own hashes ───────────
const bentFold = structuredClone(cp25);
bentFold.folds.tells.corpus += ' bent';
assert.equal(await checkpointProves(bentFold), false, 'a bent fold must fail the state hash');
const bentClaim = structuredClone(cp25);
bentClaim.struck = [];
assert.equal(await checkpointProves(bentClaim), false, 'a bent struck claim must fail the digest');
const bentRows = structuredClone(cp25);
bentRows.rows -= 1;
assert.equal(await checkpointProves(bentRows), false, 'a bent row count must fail the digest');
console.log('  ✓ a bent fold or a bent claim is refused by the checkpoint\u2019s own hashes');

// ── Court 6: the record court refuses every disagreement ────────────────
assert.equal(checkpointStands(cp25, { hero: { ...HERO, name: 'Someone Else' }, entries: rows }), false, 'another hero\u2019s canon must be refused');
assert.equal(checkpointStands(cp25, { hero: HERO, entries: rows.slice(0, cuts.after25 - 1) }), false, 'a shorter record must be refused');
const swapped = structuredClone(rows);
swapped[cuts.after25 - 1].id = 'not-that-row';
assert.equal(checkpointStands(cp25, { hero: HERO, entries: swapped }), false, 'a different row at the cut must be refused');
const reHashed = structuredClone(rows);
reHashed[cuts.after25 - 1].recordHash = 'forged-seal';
assert.equal(checkpointStands(cp25, { hero: HERO, entries: reHashed }), false, 'a re-sealed head must be refused');
console.log('  ✓ the record court refuses another hero, a shorter record, a swapped row, a re-sealed head');

// ── Court 7: rot proves nothing ─────────────────────────────────────────
assert.equal(checkpointStands(null, { hero: HERO, entries: rows }), false);
assert.equal(checkpointStands([], { hero: HERO, entries: rows }), false);
assert.equal(checkpointStands({ v: 99 }, { hero: HERO, entries: rows }), false);
assert.equal(await checkpointProves(null), false);
assert.equal(await checkpointProves({}), false);
const empty = await foldCheckpoint({ hero: HERO, entries: [] });
assert.equal(empty.rows, 0);
assert.equal(checkpointStands(empty, { hero: HERO, entries: rows }), false, 'a waypost over nothing covers nothing');
console.log('  ✓ rot, alien shapes, and empty covers prove nothing');

assert.equal(WAYPOST_FOLDS.length, 5);
assert.equal(WAYPOST_STRIDE, 25);
console.log(`PASS — the waypost law (engine twin, pure seats): stride ${WAYPOST_STRIDE}, ${WAYPOST_FOLDS.length} folds covered (${WAYPOST_FOLDS.join(', ')}); checkpoints at rows ${CUTS.join('/')} of ${rows.length} resumed byte-identical to the full walk with struck rows carried, checkpoint bytes deterministic across independent folds, a strike behind the waypost un-seats it and the full walk stands in, bent folds and bent claims refused by their own hashes, another hero\u2019s canon refused, and rot proves nothing.`);
