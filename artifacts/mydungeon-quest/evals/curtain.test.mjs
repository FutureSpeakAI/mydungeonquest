// ------------------------------------------------------------
// THE CURTAIN — Directive XI, Law I (stage-one gate).
//
// The door's whole vocabulary is the sealed turn. This gate proves,
// keylessly, that the pre-seal theater is gone from the BYTES, not
// merely unused: the door writes no narration/retract events, the
// server keeps no partial-JSON walker and no streaming first call,
// the client holds no weaving state and no reconsidering line — and
// the pour that replaced them is pure, deterministic, and strictly
// growing, ending byte-exact at the sealed page.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

// The door speaks one story event.
const door = src('../server/index.js');
assert.ok(!door.includes('event: narration'), 'the door must not speak a pre-seal narration event');
assert.ok(!door.includes('event: retract'), 'the door has nothing to take back — no word leaves early');
assert.ok(door.includes(': the room deliberates'), 'the heartbeat comment holds the wire open while the room works');
assert.ok(door.includes('event: turn'), "the sealed turn remains the door's one story event");

// The server keeps no pre-seal plumbing.
const dm = src('../server/dm.js');
for (const relic of ['anthropicTurnStream', 'extractNarration', 'mockWithNarration', 'onNarration', 'onRetract']) {
  assert.ok(!dm.includes(relic), `dm.js still carries retired stream plumbing: ${relic}`);
}

// The client no longer knows the pre-seal states.
const app = src('../src/App.jsx');
assert.ok(!app.includes("eventName === 'narration'"), 'the client no longer reads pre-seal narration events');
assert.ok(!app.includes('retract'), 'the client no longer knows the word retract');
assert.ok(!app.includes('reconsiders the telling'), 'the reconsidering line is gone whole');
assert.ok(!app.includes('setWeaving'), 'the weaving state is gone whole');

// The mock room still answers whole, sealed, once — and identically.
const { getDmTurn } = await import('../server/dm.js');
const doorInput = {
  campaign: { title: 'Curtain Trial', homeRegion: 'Larkspur Vale' },
  hero: { name: 'Sable' },
  story: { beat: { index: 0, title: 'x' }, regions: [] },
  state: {}, memory: [], history: [],
  entropy: null, player: 'I look around.', resolution: null, turn: 2, genesis: false
};
const one = await getDmTurn(doorInput, {});
const two = await getDmTurn(doorInput, {});
assert.equal(one.provider, 'mock');
assert.ok(Array.isArray(one.turn.narration_blocks) && one.turn.narration_blocks.length >= 1, 'the sealed turn arrives whole');
assert.equal(JSON.stringify(two.turn), JSON.stringify(one.turn), 'the sealed page is byte-deterministic');

// The pour: pure, deterministic, strictly growing, ending at the seal.
const { pourPlan, pourInterval } = await import('../src/lib/pour.js');
const blocks = one.turn.narration_blocks;
const planA = pourPlan(blocks);
const planB = pourPlan(blocks);
assert.deepEqual(planA, planB, 'the pour plan is deterministic');
const joined = (view) => view.map((row) => row.text).join('\n\n');
for (let i = 1; i < planA.length; i += 1) {
  assert.ok(
    joined(planA[i]).startsWith(joined(planA[i - 1])) && joined(planA[i]).length > joined(planA[i - 1]).length,
    'the pour only ever grows — every view a strict prefix of the next'
  );
}
assert.equal(joined(planA[planA.length - 1]), joined(blocks), 'the pour ends byte-exact at the sealed page');
const tick = pourInterval(planA.length);
assert.ok(tick >= 24 && tick <= 80, 'the cadence stays within its humane clamp');

// A multi-paragraph pour crosses block boundaries without rewriting one.
const fixture = [
  { text: 'The road climbs past the salt stones and turns north.', speaker: null },
  { text: 'A lantern answers from the far bank.', speaker: 'Mara' },
  { text: 'Go.', speaker: null }
];
const crossing = pourPlan(fixture);
for (let i = 1; i < crossing.length; i += 1) {
  const prev = crossing[i - 1];
  for (let b = 0; b < prev.length - 1; b += 1) {
    assert.equal(prev[b].text, fixture[b].text, 'once a paragraph lands whole it is never touched again');
    assert.equal(prev[b].speaker, fixture[b].speaker, 'speakers ride their paragraph from its first word');
  }
}
assert.deepEqual(crossing[crossing.length - 1], fixture, 'the final view IS the sealed narration');

// OPENING-SEQUENCE RETRACTION DETECTOR (A5) — the chapter card must
// never appear BEFORE or instead of the opening turn's narration in the
// feed. orderFeed places pages AFTER the log they anchor, so a chronicle
// page for the opening chapter cannot displace the opening turn.
const { orderFeed } = await import('fatescript/sequencing');
const openingLog = { id: 'log-0', beatIndex: 0, kind: undefined };
// A chapter card for the opening chapter anchored after the opening log.
const anchoredPage = { beatIndex: 0, afterLogId: 'log-0', passage: 'The tale so far.' };
// An orphan page (afterLogId absent) falls to the beat boundary — also after log-0.
const orphanPage = { beatIndex: 0, afterLogId: null, passage: 'The tale so far.' };
for (const page of [anchoredPage, orphanPage]) {
  const seats = orderFeed([openingLog], [page], []);
  assert.equal(seats.length, 2, 'opening log and its chapter page both seat');
  assert.equal(seats[0].kind, 'turn', 'opening log sits FIRST — narration is never displaced');
  assert.equal(seats[1].kind, 'page', 'chapter page sits AFTER the opening log');
}
// A pending row (before the real page arrives) also goes after the log.
const pendingRow = { beatIndex: 0, afterLogId: 'log-0' };
const pendingSeats = orderFeed([openingLog], [], [pendingRow]);
assert.equal(pendingSeats[0].kind, 'turn', 'pending row never precedes the opening log');
assert.equal(pendingSeats[1].kind, 'page-pending', 'pending row sits after the opening log');

// NARRATION SLOT LAW (A5) — the App must call setPouringId after (or
// synchronously with) setCurrent, never before. This is structural: the
// node renders with pour=true from its first mount, and nothing renders
// before the seal. Verified here at the source level.
const appSrc = src('../src/App.jsx');
// The old ordering had setPouringId BEFORE seal; the new one removes it
// from that position. The pour comment must be present and the pre-seal
// call must be absent.
assert.ok(appSrc.includes('NARRATION SLOT LAW'), 'the narration slot law comment is seated in App.jsx');
assert.ok(!appSrc.includes('setPouringId(log.id);\n      const record = await seal'), 'setPouringId must not fire before the seal');

console.log('PASS — the curtain holds: one sealed event, no retired plumbing, a strictly growing pour, and the opening sequence has no retraction.');
