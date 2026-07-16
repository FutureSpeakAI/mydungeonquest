// ------------------------------------------------------------
// THE ANNALS GATE (game) — Directive V, Phase 3, the Long Memory Law.
//
// Proves the Chronicler's seat at the table: an act's close composes a
// digest from the record alone, the court holds it (a lying digest is
// never sealed — honest silence, not contraband), the annal seals as
// journal type 'annal' with its hash on the log row (the tick
// pattern), and the LADDER feeds [MEMORY] so a secret planted in act
// one is still reachable two hundred turns later while the budget
// holds. Zero keys, zero providers, deterministic throughout.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { db } = await import('../src/lib/db.js');
const { makeEnvelope } = await import('../src/lib/seal.js');
const { actSlice, composeActAnnal, chronicleActClose, memoryLadder } = await import('../src/lib/memoir.js');
const { assertAnnalLawful } = await import('fatescript/memoir');

// ---- the fixture: two acts, a secret planted early, long road after.
const turnLog = (i, beatIndex, text, story = null) => ({
  id: `log-${i}`, kind: undefined, player: `deed ${i}`, sent: `deed ${i}`, deed: null, ts: 1700000000000 + i, resolution: null, redacted: false, beatIndex,
  dm: { narration_blocks: [{ speaker: 'Mira', text }], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] },
  turn: i,
});
const codex = {
  completed: false, beatIndex: 3, notes: ['The ford ran red at dusk.'], memoir: [],
  spine: { acts: [{ name: 'Embers' }, { name: 'Ashfall' }], beats: [{ act: 1 }, { act: 1 }, { act: 2 }, { act: 2 }] },
  cast: [
    { name: 'Mira', role: 'ally', status: 'active', bond: 3, visual: 'grey-eyed ferrywoman', voice: 'low and even', goal: 'keep the crossing open', secret: 'the bell under the ford is cracked', last_seen: 'the ford', known_facts: ['the bell under the ford is cracked'] },
    { name: 'Torvald', role: 'villain', status: 'active', bond: 0, visual: 'iron-masked reeve', voice: 'cold', goal: 'close the crossing', secret: '', last_seen: 'the toll house', known_facts: [] },
  ],
  regions: [{ name: 'The Ford', description: 'a stone crossing', state: 'uneasy' }],
};
const logs = [
  turnLog(0, 0, 'The ferry waits.', { cast_add: [{ name: 'Mira', role: 'ally', visual: 'grey-eyed ferrywoman', voice: 'low and even', goal: 'keep the crossing open' }] }),
  turnLog(3, 0, 'Mira leans close.', { cast_update: [{ name: 'Mira', fact_add: 'the bell under the ford is cracked' }] }),
  ...Array.from({ length: 40 }, (_, k) => turnLog(5 + k, 2, `The road wears on, mile ${k}.`)),
];
const campaign = { id: 'annal-tale', title: 'The Ford', hero: { name: 'Alden' }, codex, logs, turnNumber: 45, headHash: null, turnCount: 0, signatureStatus: 'hash-only' };

// ---- injected hands: a bench sealer (hash-only, crypto OUTSIDE any tx),
// a save that mirrors the table's, a reload from the shelf.
await db.campaigns.put({ ...campaign });
let prevHash = null; let sealIndex = 0;
const seal = async (campaignId, type, payload) => {
  const envelope = await makeEnvelope({ type, i: sealIndex, prevHash, payload, ts: 1700000100000 + sealIndex });
  prevHash = envelope.recordHash; sealIndex += 1;
  await db.journal.put({ campaignId, ...envelope });
  await db.campaigns.update(campaignId, { headHash: envelope.recordHash, turnCount: sealIndex, signatureStatus: 'hash-only' });
  return envelope;
};
const save = async (next) => { await db.campaigns.put(next); };
const reload = async (id) => db.campaigns.get(id);

// 1. THE SLICE knows its act — redactions out, spoken rows only.
{
  assert.equal(actSlice(campaign, 1).length, 2, 'act one holds its two spoken turns');
  assert.equal(actSlice(campaign, 2).length, 40, 'act two holds the long road');
  const struck = { ...campaign, logs: campaign.logs.map((l, i) => (i === 1 ? { ...l, redacted: true } : l)) };
  assert.equal(actSlice(struck, 1).length, 1, 'a struck turn feeds no digest — the redaction law outranks memory');
}

// 2. THE COMPOSITION is deterministic and passes its own court.
{
  const one = composeActAnnal(campaign, 1);
  const two = composeActAnnal(campaign, 1);
  assert.equal(one.text, two.text, 'the digest is deterministic in the record');
  assert.equal(one.verdict.ok, true, 'the template never smuggles');
  assert.ok(one.text.includes('Act 1'), 'the head names its act');
}

// 3. THE COURT refuses invention — and the seat seals nothing refused.
{
  const lying = assertAnnalLawful('Act 1 — Embers. Zorblax the Undying rose from the ford.', { entries: actSlice(campaign, 1), codex, hero: campaign.hero });
  assert.equal(lying.ok, false, 'a smuggled name is contraband');
  const liar = () => ({ text: 'Act 1. Zorblax the Undying rose.', verdict: { ok: false, errors: ['name not in the record: Zorblax'] } });
  const refused = await chronicleActClose(campaign, 1, { seal, save, reload, compose: liar });
  assert.equal(refused.annal, null, 'the refusal is honest silence');
  assert.ok(Array.isArray(refused.refused) && refused.refused.length, 'the refusal names its errors');
  assert.equal(await db.journal.where('campaignId').equals('annal-tale').count(), 0, 'nothing refused is ever sealed');
  assert.equal((refused.campaign.logs || []).filter((l) => l.kind === 'annal').length, 0, 'no annal row rides the book');
}

// 4. THE SEAT — an act closes; the annal seals by the tick pattern.
let after = null;
{
  const closed = await chronicleActClose(campaign, 1, { seal, save, reload });
  after = closed.campaign;
  assert.ok(closed.annal && closed.annal.includes('Act 1'), 'the digest landed');
  const rows = await db.journal.where('campaignId').equals('annal-tale').toArray();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'annal', 'sealed as its own type');
  assert.equal(rows[0].payload.annal, closed.annal, 'the sealed text is the spoken text');
  const tail = after.logs[after.logs.length - 1];
  assert.equal(tail.kind, 'annal');
  assert.equal(tail.recordHash, rows[0].recordHash, 'the record hash rides the log row');
  assert.equal(tail.dm.narration_blocks.length, 0, 'silent in the book — nothing downstream mistakes it for a spoken turn');
  assert.equal(after.headHash, rows[0].recordHash, 'the head settled onto the campaign');
}

// 5. THE LADDER — the secret from turn 3 reaches turn 200 through the
//    annal chain, newest-first, elders compressed, budget held.
{
  // Close act two as well, then pad the road to turn 200.
  const closedTwo = await chronicleActClose(after, 2, { seal, save, reload });
  let long = closedTwo.campaign;
  long = { ...long, logs: [...long.logs, ...Array.from({ length: 155 }, (_, k) => turnLog(46 + k, 3, `Winter mile ${k}.`))], turnNumber: 200 };
  const ladder = memoryLadder(long, { budget: 1400 });
  assert.ok(ladder.length >= 2, 'both annals ride');
  assert.equal(ladder[0], closedTwo.annal, 'newest first, in full');
  assert.ok(JSON.stringify(ladder).includes('cracked'), 'the secret planted at turn 3 is reachable at turn 200');
  assert.ok(JSON.stringify(ladder).length <= 1400, 'the budget holds');
  // Elders compress to the headline line once two fresher annals stand.
  const third = { ...long, logs: [...long.logs, { id: 'a3', kind: 'annal', annal: 'Act 3. The pass held. More followed after the thaw.', redacted: false, ts: 2, beatIndex: 3, dm: { narration_blocks: [] } }] };
  const taller = memoryLadder(third, { budget: 1400 });
  assert.equal(taller[2], (closedTwo.campaign.logs.filter((l) => l.kind === 'annal')[0].annal.trim().split('. ')[0] + '.'), 'the eldest annal stands as its headline');
  // A tight budget drops elders, never the newest.
  const tight = memoryLadder(third, { budget: 80 });
  assert.equal(tight.length, 1, 'under famine only the freshest rides');
  assert.equal(tight[0], taller[0], 'the newest annal is the floor');
  // Redacted annals never feed memory.
  const allStruck = { ...third, logs: third.logs.map((l) => (l.kind === 'annal' ? { ...l, redacted: true } : l)) };
  assert.deepEqual(memoryLadder(allStruck), [], 'struck annals are gone from memory too');
}

// 6. THE WIRING — the seat is the engine's law; the socket it feeds
//    already exists in the DM's prompt, unchanged.
{
  const lib = read('src/lib/memoir.js');
  assert.ok(lib.includes('fatescript/memoir'), 'the engine\u2019s law is the only law of digests');
  const app = read('src/App.jsx');
  assert.ok(app.includes('chronicleActClose('), 'the table chronicles the closed act');
  assert.ok(app.includes('memoryLadder('), 'the table feeds [MEMORY] from the ladder');
  const dm = read('server/dm.js');
  assert.ok(dm.includes('input.memory'), 'the [MEMORY] socket stands where it always stood');
}

// 7. THE SEAT IS IDEMPOTENT — closing the same act twice seals once,
//    and a no-op is not a refusal.
{
  const countBefore = await db.journal.where('campaignId').equals('annal-tale').count();
  const again = await chronicleActClose(after, 1, { seal, save, reload });
  assert.equal(again.annal, null, 'a chronicled act is not chronicled twice');
  assert.equal(again.refused, null, 'idempotence is not refusal');
  assert.equal(await db.journal.where('campaignId').equals('annal-tale').count(), countBefore, 'nothing new sealed');
  assert.equal(again.campaign.logs.filter((l) => l.kind === 'annal' && l.actIndex === 0).length, 1, 'one annal per act, ever');
}

console.log('PASS \u2014 the annals gate (game): the Chronicler digests a closed act from the record alone, the court refuses invention with honest silence, the annal seals by the tick pattern with its hash on the log row, and the ladder carries a turn-three secret to turn two hundred — newest in full, elders as headlines, budget held, redactions out.');
